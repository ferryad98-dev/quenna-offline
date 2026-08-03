/* ============================================================
   Modul Cetak — Web Bluetooth + ESC/POS (printer thermal)
   ------------------------------------------------------------
   STRUK TANPA LOGO (teks saja, simpel & anti-dobel):
   - Header: nama toko, alamat, telepon — semua dari DATA TOKO
     di Pengaturan, dicetak rata tengah.
   - Dipaksa pakai FONT A (12x24) agar teks full selebar kertas.
   - Alignment per baris: kiri (item/total), tengah (header/footer).
   Catatan: Web Bluetooth hanya tersedia di Chrome Android.
   ============================================================ */
const Print = (() => {
  let _device = null;      // BluetoothDevice
  let _server = null;      // GATT server
  let _char = null;        // karakteristik tulis

  // UUID service umum pada printer thermal BLE
  const PRINTER_SERVICES = [
    '0000ff00-0000-1000-8000-00805f9b34fb', // Zjiang / PST / printer 58mm umum
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // HM-10 / CC2541 serial module
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000e781-0000-1000-8000-00805f9b34fb',
    '0000ffb0-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '0000ff10-0000-1000-8000-00805f9b34fb',
  ];

  const fmtRp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

  function truncate(s, n) {
    let t = String(s || '');
    if (t.length > n) t = t.slice(0, Math.max(0, n - 1)) + '~';
    return t;
  }

  /* Baris kiri-kanan: pasti PAS selebar kertas (tidak meluber) */
  function padLine(left, right, width) {
    const l = String(left), r = String(right);
    if (l.length + r.length >= width) {
      return l.slice(0, Math.max(1, width - r.length - 1)) + ' ' + r;
    }
    return l + ' '.repeat(width - l.length - r.length) + r;
  }

  /* Bersihkan karakter non-latin (aman untuk printer murah) */
  function clean(s) {
    return String(s).normalize('NFKD').replace(/[^\x20-\x7E]/g, '');
  }

  /* ============ PENYUSUN BARIS STRUK ============
     Rapat, tanpa gap kosong. Header dari Data Toko
     (nama toko, alamat, telepon) selalu rata tengah. */
  function buildLines(sale, st) {
    const W = CONFIG.PRINTER_CHARS || 32;
    const sep = '-'.repeat(W);
    const lines = [];
    const add = (t, o) => lines.push(Object.assign({ t }, o));
    const center = (t, o) => add(t, Object.assign({ c: 'center' }, o));
    const kv = (k, v, o) => add(padLine(k, v, W), o);

    // Nama toko: BOLD biasa (TANPA double-height).
    // Mode dblH sering menggandakan LEBAR huruf di banyak printer →
    // nama panjang ("Kedai Pisang Queena") bisa patah jadi 2 baris.
    // Dengan bold normal, nama selalu muat 1 baris rapi di semua printer.
    add(truncate((st && st.namaToko) || CONFIG.APP_NAME, W), { c: 'center', b: true });
    if (st && st.alamat) center(truncate(st.alamat, W));
    if (st && st.telepon) center(truncate('Telp. ' + st.telepon, W));
    add(sep);
    kv('No', '#' + (sale.no || '-'));
    kv('Tgl', ((sale.tanggal || '') + '  ' + (sale.jam || '')).trim());
    add(sep);

    const items = sale.items || [];
    items.forEach(it => {
      add((it.qty || 1) + '  ' + truncate(it.nama, W - 4));
      add(padLine('    ' + (it.qty || 1) + ' x ' + fmtRp(it.harga), fmtRp(it.harga * (it.qty || 1)), W));
    });
    if (!items.length) add(truncate('(transaksi kosong)', W - 4));

    add(sep);
    kv('Subtotal', fmtRp(sale.subtotal));
    if (Number(sale.diskon)) kv('Diskon', '-' + fmtRp(sale.diskon));
    kv('TOTAL', fmtRp(sale.total), { b: true });
    kv('Tunai', fmtRp(sale.bayar));
    kv('Kembali', fmtRp(sale.kembali));
    add(sep);
    // Footer bisa MULTI-BARIS (enter = baris baru)
    if (st && st.footer) {
      String(st.footer).split(/\r?\n/).slice(0, 6).forEach(line => {
        const t = line.trim();
        if (t) center(truncate(t, W));
      });
    } else {
      center('Terima kasih!');
    }
    return lines;
  }

  /* ============ ESC/POS ============ */
  const ESC = {
    init: '\x1b\x40',
    fontA: '\x1b\x4d\x00',   // paksa font A (12x24) — kunci biar full lebar
    center: '\x1b\x61\x01',
    left: '\x1b\x61\x00',
    boldOn: '\x1b\x45\x01',
    boldOff: '\x1b\x45\x00',
    dblH: '\x1d\x21\x10',   // tinggi x2, lebar normal (judul)
    normal: '\x1d\x21\x00',
    feed: n => '\x1b\x64' + String.fromCharCode(n),
    cut: '\x1d\x56\x42\x00',
  };

  const strBytes = s => new TextEncoder().encode(s);

  function concatParts(parts) {
    const total = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    parts.forEach(p => { out.set(p, off); off += p.length; });
    return out;
  }

  /* ============ GAMBAR RASTER (GS v 0) ============ */
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = url;
    });
  }

  /* Logo toko di tengah paling atas struk.
     Ukuran pas & proporsional: maks 42% lebar kertas &
     100 titik tinggi — biar teks Data Toko tetap terbaca
     jelas di bawahnya. */
  async function buildHeaderRaster(logoUrl) {
    const W = CONFIG.PRINTER_DOTS || 384;
    const img = await loadImage(logoUrl);
    const pad = 6;
    const maxW = Math.round(W * 0.42);
    const maxH = 100;
    let lw = Math.min(maxW, img.width);
    let lh = Math.round(lw * img.height / img.width);
    if (lh > maxH) { lh = maxH; lw = Math.round(lh * img.width / img.height); }
    const H = Math.ceil((lh + pad * 2) / 8) * 8;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);
    c.drawImage(img, Math.round((W - lw) / 2), pad, lw, lh);

    const id = c.getImageData(0, 0, W, H);
    const d = id.data;
    const px = new Uint8Array(W * H);
    for (let i = 0; i < px.length; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      px[i] = (0.299 * r + 0.587 * g + 0.114 * b) < 150 ? 1 : 0;
    }
    return { w: W, h: H, px };
  }

  /* Raster logo aplikasi pesan-antar (ShopeeFood, GoFood, GrabFood,
     ACI Bisnis).
     Layout cerdas:
     - Jika muat 1 baris → 1 baris (tinggi seragam).
     - Jika terlalu lebar → otomatis 2 baris: baris 1 = logo lebar
       (ShopeeFood, GoFood), baris 2 = logo tinggi/persegi (GrabFood,
       ACI Bisnis) dengan ukuran lebih besar — semua tetap terbaca. */
  async function buildFooterRaster() {
    if (typeof FOOD_LOGOS === 'undefined') return null;
    const W = CONFIG.PRINTER_DOTS || 384;
    const keys = ['shopee', 'go', 'grab', 'aci'];
    const imgs = [];
    for (const k of keys) {
      const u = FOOD_LOGOS[k];
      if (!u) continue;
      try { imgs.push(await loadImage(u)); } catch (e) { /* lewati yang gagal */ }
    }
    if (!imgs.length) return null;

    const pad = 6, gapX = 16, rowGap = 10;
    const avail = W - pad * 2;

    // Susun baris: >2 logo dengan lebar total berlebih → 2 baris
    let rows;
    if (imgs.length <= 2) {
      rows = [imgs];
    } else {
      rows = [imgs.slice(0, 2), imgs.slice(2)];
    }
    const rowH = rows.length > 1 ? [62, 92] : [64];

    const placed = rows.map((rowImgs, ri) => {
      const h = rowH[ri] || 64;
      let items = rowImgs.map(img => ({ w: Math.max(10, Math.round(h * img.width / img.height)), h, img }));
      const totalW = items.reduce((s, it) => s + it.w, 0) + gapX * (items.length - 1);
      if (totalW > avail) {
        const f = avail / totalW;
        items = items.map(it => ({
          w: Math.max(8, Math.round(it.w * f)),
          h: Math.max(8, Math.round(it.h * f)),
          img: it.img,
        }));
      }
      const rowW = items.reduce((s, it) => s + it.w, 0) + gapX * (items.length - 1);
      return { items, rowW, h: Math.max.apply(null, items.map(i => i.h)) };
    });

    const totalH = pad * 2 + placed.reduce((s, r) => s + r.h, 0) + rowGap * (placed.length - 1);
    const H = Math.ceil(totalH / 8) * 8;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);

    let y = pad;
    placed.forEach((r, ri) => {
      let x = Math.max(0, Math.round((W - r.rowW) / 2));
      r.items.forEach(it => {
        c.drawImage(it.img, x, y + Math.round((r.h - it.h) / 2), it.w, it.h);
        x += it.w + gapX;
      });
      y += r.h + (ri < placed.length - 1 ? rowGap : 0);
    });

    const id = c.getImageData(0, 0, W, H);
    const d = id.data;
    const px = new Uint8Array(W * H);
    for (let i = 0; i < px.length; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      px[i] = (0.299 * r + 0.587 * g + 0.114 * b) < 150 ? 1 : 0;
    }
    return { w: W, h: H, px };
  }

  /* bitmap 1-bit → byte GS v 0 (bit MSB = titik paling kiri) */
  function rasterBytes(bmp) {
    const bytesPerRow = Math.ceil(bmp.w / 8);
    const rows = bmp.h;
    const data = new Uint8Array(bytesPerRow * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < bmp.w; x++) {
        if (bmp.px[y * bmp.w + x]) {
          data[y * bytesPerRow + (x >> 3)] |= (0x80 >> (x & 7));
        }
      }
    }
    const head = new Uint8Array([0x1d, 0x76, 0x30, 0x00,
      bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
      rows & 0xff, (rows >> 8) & 0xff]);
    return concatParts([head, data]);
  }

  /* Susun seluruh byte struk.
     ops.logoUrl → raster logo toko di tengah paling atas,
     lalu teks Data Toko (nama/alamat/telp) di bawahnya.
     ops.showFoodLogos → baris "Tersedia juga di:" + raster
     logo ShopeeFood/GoFood/GrabFood di paling bawah. */
  async function buildESC(sale, st, ops) {
    const parts = [strBytes(ESC.init + ESC.fontA + ESC.normal + ESC.left)];
    if (ops && ops.logoUrl) {
      try {
        parts.push(rasterBytes(await buildHeaderRaster(ops.logoUrl)));
        parts.push(strBytes(ESC.feed(1)));
      } catch (e) { /* logo gagal → struk tetap jalan */ }
    }
    buildLines(sale, st).forEach(ln => {
      if (ln.gap) { parts.push(strBytes(ESC.feed(ln.gap))); return; }
      const align = ln.c === 'center' ? ESC.center : ESC.left;
      const style = (ln.d ? ESC.dblH : ESC.normal) + (ln.b ? ESC.boldOn : ESC.boldOff);
      parts.push(strBytes(align + style + clean(ln.t) + '\x0a'));
    });
    if (ops && ops.showFoodLogos) {
      try {
        const bmp = await buildFooterRaster();
        if (bmp) {
          parts.push(strBytes(ESC.feed(1) + ESC.center + ESC.normal + 'Tersedia juga di:' + '\x0a'));
          parts.push(rasterBytes(bmp));
        }
      } catch (e) { /* gagal → struk tetap jalan */ }
    }
    parts.push(strBytes(ESC.feed(2) + ESC.cut));
    return concatParts(parts);
  }

  /* ============ KONEKSI & PENEMUAN KARAKTERISTIK ============ */
  async function findWritable(server, device) {
    const services = new Set();
    try { (await server.getPrimaryServices()).forEach(s => services.add(s)); } catch (e) { /* abaikan */ }
    for (const uuid of PRINTER_SERVICES) {
      try { services.add(await server.getPrimaryService(uuid)); } catch (e) { /* tidak ada */ }
    }
    for (const svc of services) {
      let chars = [];
      try { chars = await svc.getCharacteristics(); } catch (e) { continue; }
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) return ch;
      }
    }
    try { if (device && device.gatt.connected) device.gatt.disconnect(); } catch (e) {}
    throw new Error('Karakteristik tulis tidak ditemukan. Pastikan printer mendukung ESC/POS via BLE.');
  }

  async function connectNew() {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });
    const server = await device.gatt.connect();
    const ch = await findWritable(server, device);
    _device = device; _server = server; _char = ch;
    return ch;
  }

  async function ensureConnection() {
    if (!navigator.bluetooth) {
      throw new Error('Browser tidak mendukung Web Bluetooth. Gunakan Chrome di Android.');
    }
    if (_device) {
      try {
        if (!_device.gatt.connected) await _device.gatt.connect();
        if (_char) return _char;
      } catch (e) { _device = null; _server = null; _char = null; }
    }
    return connectNew();
  }

  /* ============ KIRIM BYTES (chunk aman + retry) ============ */
  async function write(bytes) {
    const noResp = !!(_char && _char.properties.writeWithoutResponse);
    const sizes = noResp ? [100, 20] : [20];
    let lastErr = null;

    for (let idx = 0; idx < sizes.length; idx++) {
      const size = sizes[idx];
      try {
        for (let i = 0; i < bytes.length; i += size) {
          const chunk = bytes.slice(i, i + size);
          if (noResp) await _char.writeValueWithoutResponse(chunk);
          else await _char.writeValueWithResponse(chunk);
          await new Promise(r => setTimeout(r, noResp ? 15 : 30));
        }
        return; // berhasil
      } catch (e) {
        lastErr = e;
        if (idx < sizes.length - 1) {
          try { if (_device && _device.gatt.connected) _device.gatt.disconnect(); } catch (e2) {}
          await new Promise(r => setTimeout(r, 400));
          try {
            const server = await _device.gatt.connect();
            _char = await findWritable(server, _device);
            _server = server;
          } catch (e3) { break; }
        }
      }
    }
    throw new Error('Gagal kirim data ke printer: ' + (lastErr && lastErr.message || 'kesalahan tak diketahui'));
  }

  /* ============ API PUBLIK ============ */
  return {
    buildLines,
    buildESC,
    buildFooterRaster,
    isSupported() { return !!(navigator.bluetooth); },

    async printReceipt(sale, st, onStatus, ops) {
      if (onStatus) onStatus('Menghubungkan printer…');
      await ensureConnection();
      if (onStatus) onStatus('Menyiapkan struk…');
      const bytes = await buildESC(sale, st, ops);
      if (onStatus) onStatus('Mengirim ke printer…');
      await write(bytes);
      if (onStatus) onStatus('Selesai ✓');
      return _device ? (_device.name || 'Printer') : 'Printer';
    },

    async testPrint(st, onStatus, ops) {
      const sale = {
        no: '001',
        tanggal: new Date().toISOString().slice(0, 10),
        jam: new Date().toTimeString().slice(0, 5),
        items: [{ nama: 'TES CETAK STRUK', harga: 1, qty: 1 }],
        subtotal: 1, diskon: 0, total: 1,
        metode: 'Tunai', bayar: 1, kembali: 0,
      };
      return this.printReceipt(sale, st, onStatus, ops);
    },

    disconnect() {
      try { if (_device && _device.gatt.connected) _device.gatt.disconnect(); } catch (e) {}
      _device = null; _server = null; _char = null;
    },
  };
})();
