/* ============================================================
   PISANG MADU QUEENA — Logika Utama Aplikasi Kasir
   v1.1: + kelola kategori, + foto menu asli (Drive / demo)
   ============================================================ */
'use strict';

/* ================= UTIL ================= */
const $  = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const fmtRp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const uid = () => 'M' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nowDate = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const nowTime = () => { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };

let toastTimer = null;
function toast(msg, type, ms) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show toast-' + (type || 'info');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2800);
}

/* URL tampil foto: data URL / URL biasa / ID file Google Drive */
function photoUrl(foto) {
  if (!foto) return null;
  const f = String(foto);
  if (f.indexOf('data:') === 0 || f.indexOf('http') === 0) return f;
  return 'https://drive.google.com/thumbnail?id=' + f + '&sz=w320';
}

/* Baca file gambar → kecilkan → data URL JPEG (hemat storage) */
function fileToDataUrl(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('File bukan gambar valid'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/* ================= DATA DEMO (contoh 3 kategori pisang) ================= */
const DEMO_CATS = [
  { id: 'k1', nama: 'Pisang Goreng', emoji: '🍌', urutan: 1 },
  { id: 'k2', nama: 'Pisang Bakar',  emoji: '🔥', urutan: 2 },
  { id: 'k3', nama: 'Pisang Katsu',  emoji: '🍢', urutan: 3 },
];

/* [ID, NAMA, HARGA, KATEGORI, EMOJI] — sesuai foto menu asli (39 varian) */
const DEMO_MENU_FULL = [
  ['m01', 'Pisang Goreng Original',         10000, 'Pisang Goreng', '🍌'],
  ['m02', 'Pisang Goreng Madu',             11000, 'Pisang Goreng', '🍯'],
  ['m03', 'Pisang Goreng Gula Palm',        11000, 'Pisang Goreng', '🍬'],
  ['m04', 'Pisang Goreng Keju',             12000, 'Pisang Goreng', '🧀'],
  ['m05', 'Pisang Goreng Coklat',           12000, 'Pisang Goreng', '🍫'],
  ['m06', 'Pisang Goreng Coklat Keju',      13000, 'Pisang Goreng', '🍫🧀'],
  ['m07', 'Pisang Goreng Strawberry',       12000, 'Pisang Goreng', '🍓'],
  ['m08', 'Pisang Goreng Tiramisu',         12000, 'Pisang Goreng', '🍰'],
  ['m09', 'Pisang Goreng Greentea',         12000, 'Pisang Goreng', '🍵'],
  ['m10', 'Pisang Goreng Capucino',         12000, 'Pisang Goreng', '☕'],
  ['m11', 'Pisang Goreng Crumble Oreo',     14000, 'Pisang Goreng', '🍪'],
  ['m12', 'Pisang Goreng Crumble Matcha',   14000, 'Pisang Goreng', '🍵'],
  ['m13', 'Pisang Goreng Crumble Redvelvet', 14000, 'Pisang Goreng', '🧁'],
  ['m14', 'Pisang Bakar Susu',              12000, 'Pisang Bakar', '🥛'],
  ['m15', 'Pisang Bakar Gula Palm',         12000, 'Pisang Bakar', '🍬'],
  ['m16', 'Pisang Bakar Keju',              13000, 'Pisang Bakar', '🧀'],
  ['m17', 'Pisang Bakar Coklat',            13000, 'Pisang Bakar', '🍫'],
  ['m18', 'Pisang Bakar Coklat Keju',       14000, 'Pisang Bakar', '🍫🧀'],
  ['m19', 'Pisang Bakar Strawberry',        13000, 'Pisang Bakar', '🍓'],
  ['m20', 'Pisang Bakar Tiramisu',          13000, 'Pisang Bakar', '🍰'],
  ['m21', 'Pisang Bakar Greentea',          13000, 'Pisang Bakar', '🍵'],
  ['m22', 'Pisang Bakar Capucino',          13000, 'Pisang Bakar', '☕'],
  ['m23', 'Pisang Bakar Crumble Oreo',      15000, 'Pisang Bakar', '🍪'],
  ['m24', 'Pisang Bakar Crumble Matcha',    15000, 'Pisang Bakar', '🍵'],
  ['m25', 'Pisang Bakar Crumble Redvelvet', 15000, 'Pisang Bakar', '🧁'],
  ['m26', 'Pisang Katsu Original',          12000, 'Pisang Katsu', '🍌'],
  ['m27', 'Pisang Katsu Saus Vanila',       13000, 'Pisang Katsu', '🍦'],
  ['m28', 'Pisang Katsu Saus Coklat',       13000, 'Pisang Katsu', '🍫'],
  ['m29', 'Pisang Katsu Saus Karamel',      13000, 'Pisang Katsu', '🍮'],
  ['m30', 'Pisang Katsu Saus Strawberry',   13000, 'Pisang Katsu', '🍓'],
  ['m31', 'Pisang Katsu Susu',              13000, 'Pisang Katsu', '🥛'],
  ['m32', 'Pisang Katsu Keju',              14000, 'Pisang Katsu', '🧀'],
  ['m33', 'Pisang Katsu Coklat Keju',       15000, 'Pisang Katsu', '🍫🧀'],
  ['m34', 'Pisang Katsu Tiramisu',          15000, 'Pisang Katsu', '🍰'],
  ['m35', 'Pisang Katsu Greentea',          15000, 'Pisang Katsu', '🍵'],
  ['m36', 'Pisang Katsu Capucino',          15000, 'Pisang Katsu', '☕'],
  ['m37', 'Pisang Katsu Crumble Oreo',      16000, 'Pisang Katsu', '🍪'],
  ['m38', 'Pisang Katsu Crumble Matcha',    16000, 'Pisang Katsu', '🍵'],
  ['m39', 'Pisang Katsu Crumble Redvelvet', 16000, 'Pisang Katsu', '🧁'],
].map(r => ({ id: r[0], nama: r[1], harga: r[2], kategori: r[3], emoji: r[4], aktif: true, foto: '' }));

const DEMO_SETTINGS = {
  namaToko: 'PISANG MADU QUEENA',
  alamat: 'Candirenggo, Singosari - Malang',
  telepon: '0819-4534-8703',
  footer: 'Terima kasih! Sampai jumpa lagi.',
};

/* ================= STATE ================= */
const State = {
  menu: [],
  categories: DEMO_CATS.slice(),
  settings: Object.assign({}, DEMO_SETTINGS),
  cart: new Map(),
  cash: 0,
  sales: [],
  editingId: null,      // id menu yang sedang diedit
  editingCatId: null,   // id kategori yang sedang diedit
  currentSale: null,
  currentFoto: '',      // foto yang sedang dipilih di form menu
};

let searchQ = '';
let catQ = 'Semua';
let menuCatQ = 'Semua';   // filter kategori di tab kelola menu
let menuSearchQ = '';     // pencarian di tab kelola menu

/* ================= LOCAL STORAGE ================= */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* ================= ANTRIAN TRANSAKSI LOKAL ================= */
const Pending = {
  all() { return LS.get(CONFIG.PENDING_KEY, []); },
  add(s) { const a = this.all(); a.unshift(s); LS.set(CONFIG.PENDING_KEY, a); },
  remove(no) { LS.set(CONFIG.PENDING_KEY, this.all().filter(x => x.no !== no)); },
  unsavedCount() { return this.all().filter(x => !x.saved).length; },
};

/* ================= LAPISAN DATA (GAS / demo) ================= */
const Data = {
  isDemo() { return !String(CONFIG.GAS_URL || '').trim(); },

  /* ---------- MENU ---------- */
  async getMenu() {
    if (this.isDemo()) return LS.get('pq_demo_menu', DEMO_MENU_FULL);
    try {
      const r = await Api.getMenu();
      LS.set('pq_menu_cache', r.menu);
      return r.menu;
    } catch (e) {
      const c = LS.get('pq_menu_cache', null);
      if (c) { toast('Server tidak terjangkau — memakai data tersimpan', 'warn'); return c; }
      throw e;
    }
  },

  async saveMenu(item) {
    if (this.isDemo()) {
      const it = Object.assign({}, item);
      // Di mode demo tidak ada backend Drive: foto base64 disimpan
      // langsung sebagai data URL di item.foto (tidak hilang).
      if (it.fotoData) {
        it.foto = 'data:image/jpeg;base64,' + it.fotoData;
      }
      delete it.fotoData;
      const list = LS.get('pq_demo_menu', DEMO_MENU_FULL);
      const i = list.findIndex(x => x.id === it.id);
      if (i >= 0) list[i] = it; else list.push(it);
      LS.set('pq_demo_menu', list);
      return it;
    }
    const r = await Api.saveMenu(item);
    this.refreshMenuCache();
    return r.item;
  },

  async deleteMenu(id) {
    if (this.isDemo()) {
      LS.set('pq_demo_menu', LS.get('pq_demo_menu', DEMO_MENU_FULL).filter(x => x.id !== id));
      return;
    }
    await Api.deleteMenu(id);
    this.refreshMenuCache();
  },

  async refreshMenuCache() {
    try { const r = await Api.getMenu(); LS.set('pq_menu_cache', r.menu); } catch (e) {}
  },

  /* ---------- KATEGORI ---------- */
  async getCategories() {
    if (this.isDemo()) return LS.get('pq_demo_cats', DEMO_CATS);
    try {
      const r = await Api.getCategories();
      LS.set('pq_cats_cache', r.categories);
      return r.categories;
    } catch (e) {
      return LS.get('pq_cats_cache', DEMO_CATS);
    }
  },

  async saveCategory(cat) {
    if (this.isDemo()) {
      const list = LS.get('pq_demo_cats', DEMO_CATS);
      const i = list.findIndex(x => x.id === cat.id);
      if (i >= 0) {
        const oldNama = list[i].nama;
        list[i] = cat;
        // rename kategori di menu
        if (oldNama !== cat.nama) {
          const menu = LS.get('pq_demo_menu', DEMO_MENU_FULL);
          menu.forEach(m => { if (m.kategori === oldNama) m.kategori = cat.nama; });
          LS.set('pq_demo_menu', menu);
        }
      } else {
        list.push(cat);
      }
      LS.set('pq_demo_cats', list);
      return cat;
    }
    const r = await Api.saveCategory(cat);
    this.refreshMenuCache();
    return r.category;
  },

  async deleteCategory(id) {
    if (this.isDemo()) {
      const list = LS.get('pq_demo_cats', DEMO_CATS);
      const c = list.find(x => x.id === id);
      LS.set('pq_demo_cats', list.filter(x => x.id !== id));
      if (c) {
        const menu = LS.get('pq_demo_menu', DEMO_MENU_FULL);
        menu.forEach(m => { if (m.kategori === c.nama) m.kategori = 'Umum'; });
        LS.set('pq_demo_menu', menu);
      }
      return;
    }
    await Api.deleteCategory(id);
    this.refreshMenuCache();
  },

  /* ---------- SETTINGS ---------- */
  async getSettings() {
    if (this.isDemo()) return Object.assign({}, DEMO_SETTINGS, LS.get('pq_demo_settings', {}));
    try {
      const r = await Api.getSettings();
      LS.set('pq_settings_cache', r.settings);
      return r.settings;
    } catch (e) {
      const c = LS.get('pq_settings_cache', null);
      if (c) return c;
      throw e;
    }
  },

  async saveSettings(s) {
    if (this.isDemo()) {
      LS.set('pq_demo_settings', Object.assign({}, LS.get('pq_demo_settings', {}), s));
      return s;
    }
    await Api.saveSettings(s);
    LS.set('pq_settings_cache', s);
    return s;
  },

  /* ---------- TRANSAKSI ---------- */
  async saveSale(sale) {
    // Nomor lokal per hari: L001, L002, dst (L = belum sync ke server)
    const localNo = () => {
      const today = sale.tanggal;
      const count = Pending.all().filter(p => p.tanggal === today).length + 1;
      return 'L' + String(count).padStart(3, '0');
    };
    if (this.isDemo()) {
      const s = Object.assign({}, sale, { no: localNo(), ts: Date.now(), saved: true });
      Pending.add(s);
      return { saved: true, sale: s };
    }
    try {
      const r = await Api.saveSale(sale);
      const s = Object.assign({}, sale, { no: r.sale.no, ts: Date.now(), saved: true });
      return { saved: true, sale: s };
    } catch (e) {
      const s = Object.assign({}, sale, { no: localNo(), ts: Date.now(), saved: false });
      Pending.add(s);
      return { saved: false, sale: s, error: e.message };
    }
  },

  async getSales() {
    if (this.isDemo()) return Pending.all();
    const r = await Api.getSales(200);
    return r.sales.map(s => Object.assign({}, s, { saved: true, ts: Date.parse(s.tanggal + 'T' + (s.jam || '00:00') + ':00') || 0 }));
  },

  async syncPending() {
    if (this.isDemo()) return 0;
    const list = Pending.all();
    let ok = 0;
    for (const p of list) {
      if (p.saved) continue;
      try {
        await Api.saveSale({
          tanggal: p.tanggal, jam: p.jam, items: p.items,
          diskon: 0, metode: p.metode, bayar: p.bayar,
        });
        Pending.remove(p.no);
        ok++;
      } catch (e) { /* biarkan di antrian */ }
    }
    return ok;
  },
};

/* ================= LEBAR PRINTER ================= */
function applyPrinterWidth() {
  const w = LS.get('pq_printer_w', '58');
  const s = (CONFIG.PRINTER_SIZES && CONFIG.PRINTER_SIZES[w]) || CONFIG.PRINTER_SIZES['58'];
  CONFIG.PRINTER_CHARS = s.chars;
  CONFIG.PRINTER_DOTS = s.dots;
}

function fillPrinterWidthChips() {
  const w = LS.get('pq_printer_w', '58');
  $$('#printerWidthChips .cash-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.w === w);
  });
}

/* ================= KERANJANG ================= */
const Cart = {
  add(item) {
    const cur = State.cart.get(item.id);
    if (cur) cur.qty++;
    else State.cart.set(item.id, Object.assign({}, item, { qty: 1 }));
    renderCartBar(); renderCartItems();
  },
  inc(id) { const c = State.cart.get(id); if (c) { c.qty++; renderCartBar(); renderCartItems(); } },
  dec(id) {
    const c = State.cart.get(id); if (!c) return;
    c.qty--; if (c.qty <= 0) State.cart.delete(id);
    renderCartBar(); renderCartItems();
  },
  remove(id) { State.cart.delete(id); renderCartBar(); renderCartItems(); },
  clear() {
    State.cart.clear();
    // Reset input uang → transaksi baru selalu mulai dari nol
    State.cash = 0;
    const ci = $('#cashInput');
    if (ci) ci.value = '';
    renderCartBar(); renderCartItems();
  },
  list() { return Array.from(State.cart.values()); },
  count() { return this.list().reduce((s, i) => s + i.qty, 0); },
  subtotal() { return this.list().reduce((s, i) => s + i.harga * i.qty, 0); },
};

/* ================= RENDER: KASIR ================= */
function activeMenu() { return State.menu.filter(m => m.aktif !== false); }

/* Gabungkan kategori dari daftar KATEGORI + kategori yang dipakai menu */
function mergeCategories() {
  const map = new Map();
  State.categories.forEach(c => map.set(c.nama, c));
  State.menu.forEach(m => {
    const k = m.kategori || 'Umum';
    if (!map.has(k)) map.set(k, { id: '', nama: k, emoji: '🍽️', urutan: 999 });
  });
  State.categories = Array.from(map.values()).sort((a, b) => (a.urutan || 999) - (b.urutan || 999));
}

function renderCategories() {
  const chips = ['Semua'].concat(State.categories.map(c => c.nama));
  $('#catChips').innerHTML = chips.map(c => {
    const cat = State.categories.find(x => x.nama === c);
    const label = cat ? cat.emoji + ' ' + c : c;
    return `<button class="chip ${c === catQ ? 'active' : ''}" data-cat="${esc(c)}">${esc(label)}</button>`;
  }).join('');
}

function menuCardHtml(m) {
  const u = photoUrl(m.foto);
  return `<button class="menu-card" data-id="${m.id}">
     <span class="mc-photo-wrap">${
       u ? `<img src="${u}" alt="${esc(m.nama)}" loading="lazy">`
         : `<span class="mc-emoji">${esc(m.emoji || '🍌')}</span>`
     }</span>
     <span class="mc-name">${esc(m.nama)}</span>
     <span class="mc-price">${fmtRp(m.harga)}</span>
   </button>`;
}

function renderMenuGrid() {
  const q = searchQ.toLowerCase();
  const list = activeMenu().filter(m =>
    (catQ === 'Semua' || (m.kategori || 'Umum') === catQ) &&
    (!q || m.nama.toLowerCase().indexOf(q) >= 0)
  );
  const grid = $('#menuGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty">🍌 Tidak ada menu.<br>Tambahkan lewat menu <b>Menu</b> di bawah.</div>`;
    return;
  }
  grid.innerHTML = list.map(menuCardHtml).join('');
}

/* ================= RENDER: KERANJANG ================= */
function renderCartBar() {
  const n = Cart.count();
  $('#cartBar').classList.toggle('hidden', n === 0);
  if (n) {
    $('#cartCount').textContent = n + ' item';
    $('#cartTotal').textContent = fmtRp(Cart.subtotal());
  }
}

function renderCartItems() {
  const wrap = $('#cartItems');
  const list = Cart.list();
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">Keranjang kosong. Pilih menu dulu ya 🍌</div>`;
  } else {
    wrap.innerHTML = list.map(i =>
      `<div class="cart-item">
         <div class="ci-info">
           <div class="ci-name">${esc(i.nama)}</div>
           <div class="ci-price">${fmtRp(i.harga)}</div>
         </div>
         <div class="ci-qty">
           <button class="qty-btn" data-act="dec" data-id="${i.id}">−</button>
           <span>${i.qty}</span>
           <button class="qty-btn" data-act="inc" data-id="${i.id}">+</button>
         </div>
         <div class="ci-total">${fmtRp(i.harga * i.qty)}</div>
         <button class="ci-del" data-act="del" data-id="${i.id}" title="Hapus">✕</button>
       </div>`
    ).join('');
  }
  $('#sumSubtotal').textContent = fmtRp(Cart.subtotal());
  updateCashUI();
}

function updateCashUI() {
  const total = Cart.subtotal();
  const cash = Number(State.cash) || 0;
  $('#changeVal').textContent = fmtRp(Math.max(0, cash - total));
  const ok = total > 0 && cash >= total;
  $('#btnPay').disabled = !ok;
}

/* ================= CHECKOUT (tunai saja) ================= */
async function doPay() {
  const items = Cart.list().map(i => ({ id: i.id, nama: i.nama, harga: i.harga, qty: i.qty }));
  const total = Cart.subtotal();
  const metode = 'Tunai';
  const bayar = Number(State.cash) || 0;
  const sale = {
    tanggal: nowDate(), jam: nowTime(),
    items, subtotal: total, diskon: 0, total,
    metode, bayar,
    kembali: Math.max(0, bayar - total),
  };

  const btn = $('#btnPay');
  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan…';
  const res = await Data.saveSale(sale);
  btn.disabled = false;
  btn.textContent = '💳 Bayar & Cetak Struk';

  State.currentSale = res.sale;
  Cart.clear();
  closeSheet('cartSheet');
  openSheet('receiptModal');
  await renderReceiptPaper(res.sale);
  $('#printStatus').textContent = res.saved
    ? '✔ Tersimpan ke spreadsheet'
    : '⚠ Server offline — struk disimpan lokal, akan disinkronkan nanti';
  if (res.saved) toast('Pembayaran dicatat ✔', 'ok');
  else toast('Server offline — transaksi masuk antrian', 'warn');

  loadSales();
  updatePendingBadge();

  if (LS.get('pq_autoprint', false) === true) doPrint();
}

/* ================= STRUK ================= */
/* Logo toko (embedded) dicetak di tengah paling atas, lalu
   nama toko/alamat/telepon dari DATA TOKO di bawahnya.
   Sumber teks satu-satunya = Data Toko → tidak pernah dobel. */
function getLogo() {
  return CONFIG.LOGO_DEFAULT || null;
}

async function renderReceiptPaper(sale) {
  const lines = Print.buildLines(sale, State.settings);

  // Lebar kertas preview disesuaikan dengan lebar kolom printer
  // (32 kolom=58mm / 48 kolom=80mm) agar teks FULL selebar kertas.
  const paper = $('#receiptPaper');
  const charPx = 7.0; // lebar 1 kolom monospace pada font preview
  const w = Math.min(CONFIG.PRINTER_CHARS * charPx + 20, (window.innerWidth || 380) - 36);
  paper.style.width = Math.max(w, 170) + 'px';

  // Logo toko di paling atas (sesuai hasil cetak)
  const logo = getLogo();
  const logoHtml = logo
    ? `<div class="rp-head"><img class="rp-logo" src="${logo}" alt="logo"></div>`
    : '';

  // Logo aplikasi pesan-antar di bagian paling bawah struk
  // (mirip hasil cetak: 1 baris jika muat, 2 baris jika tidak)
  let foodHtml = '';
  if (LS.get('pq_show_food_logos', true) !== false && typeof FOOD_LOGOS !== 'undefined') {
    const keys = ['shopee', 'go', 'grab', 'aci'].filter(k => FOOD_LOGOS[k]);
    if (keys.length) {
      const img = k => `<img src="${FOOD_LOGOS[k]}" alt="logo">`;
      let rowsHtml;
      if (keys.length <= 2) {
        rowsHtml = `<div class="rp-food-row">${keys.map(img).join('')}</div>`;
      } else {
        const mid = Math.ceil(keys.length / 2);
        rowsHtml = `<div class="rp-food-row">${keys.slice(0, mid).map(img).join('')}</div>
          <div class="rp-food-row rp-food-row-tall">${keys.slice(mid).map(img).join('')}</div>`;
      }
      foodHtml = `<div class="rp-center rp-food-note">Tersedia juga di:</div>
        ${rowsHtml}`;
    }
  }

  paper.innerHTML = logoHtml + lines.map(ln => {
    if (ln.gap) return `<div class="rp-gap"></div>`;
    let cls = 'rp-line';
    if (ln.c) cls += ' rp-' + ln.c;
    if (ln.b) cls += ' rp-b';
    if (ln.d) cls += ' rp-dbl';
    return `<div class="${cls}">${esc(ln.t)}</div>`;
  }).join('') + foodHtml;
}

async function doPrint() {
  const sale = State.currentSale;
  if (!sale) return;
  const statusEl = $('#printStatus');
  const btn = $('#btnPrint');
  btn.disabled = true;
  try {
    const ops = {
      showFoodLogos: LS.get('pq_show_food_logos', true) !== false,
      logoUrl: getLogo(),
    };
    await Print.printReceipt(sale, State.settings, msg => { statusEl.textContent = msg; }, ops);
    statusEl.textContent = '🖨 Struk terkirim ke printer ✓';
    toast('Struk terkirim 🖨', 'ok');
  } catch (e) {
    statusEl.textContent = '❌ ' + e.message;
    toast('Cetak gagal: ' + e.message, 'err', 4200);
  } finally {
    btn.disabled = false;
  }
}

/* ================= RIWAYAT ================= */
function mergeSales(server, local) {
  const map = new Map();
  server.forEach(s => map.set(s.no, Object.assign({ source: 'server' }, s)));
  local.forEach(s => map.set(s.no, Object.assign({ source: 'local' }, s)));
  return Array.from(map.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

async function loadSales() {
  let server = [];
  if (!Data.isDemo()) {
    try { server = await Data.getSales(); } catch (e) { /* offline — pakai lokal */ }
  }
  State.sales = mergeSales(server, Pending.all());
  renderSales();
}

function renderSales() {
  const list = State.sales;
  const today = nowDate();
  const t = list.filter(s => String(s.tanggal || '').slice(0, 10) === today);
  $('#statCount').textContent = String(t.length);
  $('#statOmset').textContent = fmtRp(t.reduce((s, x) => s + (Number(x.total) || 0), 0));

  const wrap = $('#salesList');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">Belum ada transaksi.<br>Transaksi yang sudah dibayar muncul di sini.</div>`;
    return;
  }
  wrap.innerHTML = list.map(s =>
    `<button class="sale-card" data-no="${esc(s.no)}">
       <div class="sc-left">
         <div class="sc-no">#${esc(s.no)}${s.saved ? '' : ' <span class="badge warn">ANTRE</span>'}</div>
         <div class="sc-time">${esc(s.tanggal || '')} ${esc(s.jam || '')} · ${esc(s.metode || 'Tunai')}</div>
         <div class="sc-items">${(s.items || []).length} item</div>
       </div>
       <div class="sc-right"><b>${fmtRp(s.total)}</b></div>
     </button>`
  ).join('');
}

/* ================= KELOLA MENU & KATEGORI ================= */
function menuRowHtml(m) {
  const u = photoUrl(m.foto);
  return `<div class="menu-row ${m.aktif === false ? 'off' : ''}">
       <span class="mr-photo">${
         u ? `<img src="${u}" alt="" loading="lazy">`
           : `<span class="mc-emoji">${esc(m.emoji || '🍌')}</span>`
       }</span>
       <div class="mr-info">
         <div class="mr-name">${esc(m.nama)}</div>
         <div class="mr-sub">${esc(m.kategori || 'Umum')} · ${fmtRp(m.harga)}</div>
       </div>
       <label class="switch" title="Aktif / nonaktif">
         <input type="checkbox" data-act="toggle" data-id="${m.id}" ${m.aktif !== false ? 'checked' : ''}><span></span>
       </label>
       <button class="icon-btn" data-act="edit" data-id="${m.id}" title="Edit">✏️</button>
       <button class="icon-btn danger" data-act="del" data-id="${m.id}" title="Hapus">🗑</button>
     </div>`;
}

/* Chips filter kategori di tab kelola menu (dengan jumlah menu) */
function renderMenuCatChips() {
  const wrap = $('#menuCatChips');
  const count = catName => State.menu.filter(m => (m.kategori || 'Umum') === catName).length;
  const chips = [{
    nama: 'Semua',
    label: 'Semua (' + State.menu.length + ')',
  }].concat(State.categories.map(c => ({
    nama: c.nama,
    label: c.emoji + ' ' + c.nama + ' (' + count(c.nama) + ')',
  })));
  wrap.innerHTML = chips.map(ch =>
    `<button class="chip ${ch.nama === menuCatQ ? 'active' : ''}" data-mcat="${esc(ch.nama)}">${esc(ch.label)}</button>`
  ).join('');
}

function renderMenuList() {
  const wrap = $('#menuList');
  const q = menuSearchQ.toLowerCase();
  const list = State.menu.filter(m =>
    (menuCatQ === 'Semua' || (m.kategori || 'Umum') === menuCatQ) &&
    (!q || m.nama.toLowerCase().indexOf(q) >= 0)
  );
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">Menu tidak ditemukan.<br>Tekan <b>＋ Tambah Menu</b> untuk menambah.</div>`;
    return;
  }
  wrap.innerHTML = list.map(menuRowHtml).join('');
}

function renderCatList() {
  const wrap = $('#catList');
  if (!State.categories.length) {
    wrap.innerHTML = `<div class="empty">Belum ada kategori.<br>Tekan <b>＋ Tambah Kategori</b>.</div>`;
    return;
  }
  wrap.innerHTML = State.categories.map(c => {
    const count = State.menu.filter(m => (m.kategori || 'Umum') === c.nama).length;
    return `<div class="cat-row">
       <span class="mr-photo"><span class="mc-emoji">${esc(c.emoji || '🍽️')}</span></span>
       <div class="mr-info">
         <div class="mr-name">${esc(c.nama)}</div>
         <div class="mr-sub">${count} menu</div>
       </div>
       <button class="icon-btn" data-act="edit" data-id="${esc(c.id)}" title="Edit">✏️</button>
       <button class="icon-btn danger" data-act="del" data-id="${esc(c.id)}" title="Hapus">🗑</button>
     </div>`;
  }).join('');
}

function showMenuTab(tab) {
  const isMenu = tab === 'menu';
  $('#tabMenu').classList.toggle('active', isMenu);
  $('#tabKategori').classList.toggle('active', !isMenu);
  $('#menuSection').classList.toggle('hidden', !isMenu);
  $('#catSection').classList.toggle('hidden', isMenu);
}

/* ---------- Form menu ---------- */
function renderFotoPreview() {
  const prev = $('#mfFotoPrev');
  const u = photoUrl(State.currentFoto);
  prev.innerHTML = u ? `<img src="${u}" alt="foto menu">` : '<span style="font-size:30px">🍌</span>';
}

function openMenuForm(item) {
  State.editingId = item ? item.id : null;
  State.currentFoto = item && item.foto ? String(item.foto) : '';
  $('#menuModalTitle').textContent = item ? 'Edit Menu' : 'Tambah Menu';
  $('#mfNama').value = item ? item.nama : '';
  $('#mfHarga').value = item ? item.harga : '';
  $('#mfKategori').value = item ? (item.kategori || '') : '';
  $('#mfEmoji').value = item ? (item.emoji || '🍌') : '🍌';
  $('#mfAktif').checked = item ? item.aktif !== false : true;
  // saran kategori dari daftar kategori
  $('#catList').innerHTML = State.categories.map(c => `<option value="${esc(c.nama)}">`).join('');
  $('#mfFotoUrl').value = '';
  renderFotoPreview();
  openSheet('menuModal');
  setTimeout(() => $('#mfNama').focus(), 250);
}

async function saveMenuForm() {
  const nama = $('#mfNama').value.trim();
  const harga = Number($('#mfHarga').value);
  if (!nama) { toast('Nama menu wajib diisi', 'err'); return; }
  if (!(harga > 0)) { toast('Harga harus lebih dari 0', 'err'); return; }

  const item = {
    id: State.editingId || uid(),
    nama,
    harga,
    kategori: $('#mfKategori').value.trim() || 'Umum',
    emoji: $('#mfEmoji').value.trim() || '🍌',
    aktif: $('#mfAktif').checked,
  };

  // Foto: data URL baru → kirim base64 (server simpan ke Drive)
  const cf = State.currentFoto;
  if (cf && cf.indexOf('data:') === 0) {
    item.foto = '';
    item.fotoData = cf.split(',')[1];
  } else {
    item.foto = cf; // URL biasa / id Drive / kosong
  }

  try {
    const saved = await Data.saveMenu(item);
    const i = State.menu.findIndex(x => x.id === saved.id);
    if (i >= 0) State.menu[i] = saved; else State.menu.push(saved);
    closeSheet('menuModal');
    toast('Menu disimpan ✔', 'ok');
    renderAll();
  } catch (e) {
    toast('Gagal simpan: ' + e.message, 'err');
  }
}

async function toggleMenu(id) {
  const m = State.menu.find(x => x.id === id);
  if (!m) return;
  const updated = Object.assign({}, m, { aktif: !(m.aktif !== false) });
  try {
    const saved = await Data.saveMenu(updated);
    const i = State.menu.findIndex(x => x.id === id);
    if (i >= 0) State.menu[i] = saved;
    renderAll();
  } catch (e) {
    toast('Gagal ubah: ' + e.message, 'err');
  }
}

async function deleteMenu(id) {
  const m = State.menu.find(x => x.id === id);
  if (!m) return;
  if (!confirm('Hapus menu "' + m.nama + '"?')) return;
  try {
    await Data.deleteMenu(id);
    State.menu = State.menu.filter(x => x.id !== id);
    State.cart.delete(id);
    renderAll();
    toast('Menu dihapus', 'info');
  } catch (e) {
    toast('Gagal hapus: ' + e.message, 'err');
  }
}

/* ---------- Form kategori ---------- */
function openCatForm(cat) {
  State.editingCatId = cat ? cat.id : null;
  $('#catModalTitle').textContent = cat ? 'Edit Kategori' : 'Tambah Kategori';
  $('#cfNama').value = cat ? cat.nama : '';
  $('#cfEmoji').value = cat ? (cat.emoji || '🍽️') : '🍽️';
  openSheet('catModal');
  setTimeout(() => $('#cfNama').focus(), 250);
}

async function saveCatForm() {
  const nama = $('#cfNama').value.trim();
  if (!nama) { toast('Nama kategori wajib diisi', 'err'); return; }
  const cat = {
    id: State.editingCatId || ('K' + Date.now()),
    nama,
    emoji: $('#cfEmoji').value.trim() || '🍽️',
    urutan: State.categories.length + 1,
  };
  try {
    const saved = await Data.saveCategory(cat);
    // muat ulang kategori + menu (rename bisa mengubah menu)
    State.categories = await Data.getCategories();
    State.menu = await Data.getMenu();
    mergeCategories();
    if (catQ !== 'Semua') catQ = 'Semua';
    closeSheet('catModal');
    toast('Kategori disimpan ✔', 'ok');
    renderAll();
  } catch (e) {
    toast('Gagal simpan kategori: ' + e.message, 'err');
  }
}

async function deleteCategory(id) {
  const c = State.categories.find(x => x.id === id);
  if (!c) return;
  if (!confirm('Hapus kategori "' + c.nama + '"?\nMenu di kategori ini akan dipindah ke "Umum".')) return;
  try {
    await Data.deleteCategory(id);
    State.categories = await Data.getCategories();
    State.menu = await Data.getMenu();
    mergeCategories();
    renderAll();
    toast('Kategori dihapus', 'info');
  } catch (e) {
    toast('Gagal hapus kategori: ' + e.message, 'err');
  }
}

/* ================= PENGATURAN ================= */
function updateBrand() {
  const name = (State.settings && State.settings.namaToko) || CONFIG.APP_NAME;
  $('#brandTitle').textContent = name;
  document.title = name + ' — Kasir';
}

function fillSettingsForm() {
  // Jangan timpa input yang sedang diketik user (mis. saat auto-sync)
  const active = document.activeElement;
  const settingIds = ['setNama', 'setAlamat', 'setTelp', 'setFooter', 'setGasUrl', 'setToken'];
  if (active && settingIds.indexOf(active.id) >= 0) return;

  const s = State.settings;
  $('#setNama').value = s.namaToko || '';
  $('#setAlamat').value = s.alamat || '';
  $('#setTelp').value = s.telepon || '';
  $('#setFooter').value = s.footer || '';
  $('#setGasUrl').value = CONFIG.GAS_URL || '';
  $('#setToken').value = CONFIG.TOKEN || '';
  $('#setAutoPrint').checked = LS.get('pq_autoprint', false) === true;
  $('#setFoodLogos').checked = LS.get('pq_show_food_logos', true) !== false;
  fillPrinterWidthChips();
}

async function saveSettingsForm() {
  const s = {
    namaToko: $('#setNama').value.trim() || CONFIG.APP_NAME,
    alamat: $('#setAlamat').value.trim(),
    telepon: $('#setTelp').value.trim(),
    footer: $('#setFooter').value.trim(),
  };
  State.settings = s;
  LS.set('pq_autoprint', $('#setAutoPrint').checked);
  try {
    await Data.saveSettings(s);
    toast('Pengaturan disimpan ✔', 'ok');
  } catch (e) {
    toast('Gagal simpan: ' + e.message, 'err');
  }
  updateBrand();
}

function saveConnection() {
  CONFIG.GAS_URL = $('#setGasUrl').value.trim();
  CONFIG.TOKEN = $('#setToken').value.trim();
  LS.set('pq_config', { GAS_URL: CONFIG.GAS_URL, TOKEN: CONFIG.TOKEN });
  refreshAll(false);
  toast('Koneksi disimpan — memuat ulang data…', 'info');
}

async function testConnection() {
  const el = $('#connResult');
  el.className = 'conn-result';
  el.textContent = 'Menghubungi GAS…';
  try {
    const r = await Api.getMenu();
    el.className = 'conn-result ok';
    el.textContent = '✔ Terhubung! ' + r.menu.length + ' menu dimuat dari spreadsheet.';
  } catch (e) {
    el.className = 'conn-result bad';
    el.textContent = '✖ ' + e.message;
  }
}

async function setupSampleMenu() {
  if (!confirm('Muat contoh menu (3 kategori pisang, 39 menu) ke spreadsheet?\nMenu yang ada akan DIGANTI dengan contoh.')) return;
  try {
    if (Data.isDemo()) {
      LS.set('pq_demo_menu', DEMO_MENU_FULL);
      LS.set('pq_demo_cats', DEMO_CATS);
      State.menu = DEMO_MENU_FULL.slice();
      State.categories = DEMO_CATS.slice();
      toast('Contoh menu dimuat (demo)', 'ok');
    } else {
      const r = await Api.setup(true);
      toast('Contoh menu siap: ' + r.menuCount + ' menu, ' + r.categoryCount + ' kategori', 'ok');
    }
    catQ = 'Semua';
    renderAll();
  } catch (e) {
    toast('Gagal: ' + e.message, 'err');
  }
}

function resetDemo() {
  if (!confirm('Hapus semua data demo di perangkat ini?')) return;
  ['pq_demo_menu', 'pq_demo_cats', 'pq_demo_settings', 'pq_sales_local'].forEach(k => LS.del(k));
  LS.del(CONFIG.PENDING_KEY);
  LS.set('pq_config', { GAS_URL: '', TOKEN: '' });
  location.reload();
}

async function syncNow() {
  const n = await Data.syncPending();
  if (n > 0) toast(n + ' transaksi tersinkronkan ✔', 'ok');
  else toast('Tidak ada antrian tersisa', 'info');
  updatePendingBadge();
  loadSales();
}

function updatePendingBadge() {
  $('#pendingCount').textContent = String(Pending.unsavedCount());
}

/* ================= KONEKSI / STATUS ================= */
function setGasDot(state) {
  const dot = $('#gasDot');
  dot.className = 'dot ' + (state || '');
  dot.title = state === 'ok' ? 'Terhubung ke spreadsheet'
    : state === 'bad' ? 'Server tidak terjangkau'
    : state === 'demo' ? 'Mode demo (tanpa server)' : 'Memeriksa…';
}

async function refreshAll(silent) {
  setGasDot('');
  try {
    State.settings = await Data.getSettings();
    State.categories = await Data.getCategories();
    State.menu = await Data.getMenu();
    setGasDot(Data.isDemo() ? 'demo' : 'ok');
    if (!silent && !Data.isDemo()) toast('Terhubung ke spreadsheet ✔', 'ok');
  } catch (e) {
    setGasDot(Data.isDemo() ? 'demo' : 'bad');
    if (!silent) toast('Gagal hubungi server: ' + e.message, 'err');
  }
  mergeCategories();
  $('#demoBanner').classList.toggle('hidden', !Data.isDemo());
  // Setting → Data: tombol yang tidak relevan disembunyikan sesuai mode
  $('#syncRow').style.display = Data.isDemo() ? 'none' : '';
  $('#resetRow').style.display = Data.isDemo() ? '' : 'none';
  updateBrand();
  fillSettingsForm();
  renderAll();
  await loadSales();
  updatePendingBadge();
}

function renderAll() {
  renderCategories();
  renderMenuGrid();
  renderMenuCatChips();
  renderMenuList();
  renderCatList();
}

/* ================= NAVIGASI ================= */
function showScreen(name) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === name));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  if (name === 'scr-riwayat') renderSales();
  if (name === 'scr-setting') { fillSettingsForm(); updatePendingBadge(); }
}

function openSheet(id) { $('#' + id).classList.remove('hidden'); document.body.classList.add('no-scroll'); }
function closeSheet(id) { $('#' + id).classList.add('hidden'); document.body.classList.remove('no-scroll'); }

/* ================= EVENT BINDING ================= */
function bindEvents() {
  // Navigasi
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.screen)));

  // Tutup sheet via mask / tombol
  $$('[data-close]').forEach(el => el.addEventListener('click', () => closeSheet(el.dataset.close)));

  // Kasir: pencarian & kategori
  $('#searchInput').addEventListener('input', e => { searchQ = e.target.value; renderMenuGrid(); });
  $$('.search-clear').forEach(btn => btn.addEventListener('click', () => {
    const wrap = btn.parentElement;
    const input = wrap.querySelector('input');
    if (!input) return;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  }));
  $('#catChips').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    catQ = b.dataset.cat;
    renderCategories();
    renderMenuGrid();
  });

  // Kasir: tambah item
  $('#menuGrid').addEventListener('click', e => {
    const card = e.target.closest('.menu-card');
    if (!card) return;
    const item = State.menu.find(m => m.id === card.dataset.id);
    if (!item) return;
    Cart.add(item);
    card.style.transform = 'scale(.92)';
    setTimeout(() => { card.style.transform = ''; }, 120);
  });

  // Keranjang
  $('#btnOpenCart').addEventListener('click', () => { renderCartItems(); openSheet('cartSheet'); });
  $('#cartItems').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === 'inc') Cart.inc(id);
    else if (b.dataset.act === 'dec') Cart.dec(id);
    else if (b.dataset.act === 'del') Cart.remove(id);
  });

  // Pembayaran (tunai saja)
  $$('.cash-chip').forEach(b => b.addEventListener('click', () => {
    const total = Cart.subtotal();
    const v = b.dataset.cash === 'pas' ? total : Number(b.dataset.cash);
    State.cash = v;
    $('#cashInput').value = v || '';
    updateCashUI();
  }));
  $('#cashInput').addEventListener('input', e => {
    State.cash = Number(e.target.value) || 0;
    updateCashUI();
  });
  $('#btnPay').addEventListener('click', doPay);

  // Struk
  $('#btnPrint').addEventListener('click', doPrint);

  // Riwayat: lihat struk lama / cetak ulang
  $('#salesList').addEventListener('click', async e => {
    const card = e.target.closest('.sale-card');
    if (!card) return;
    const sale = State.sales.find(s => s.no === card.dataset.no);
    if (!sale) return;
    State.currentSale = sale;
    openSheet('receiptModal');
    await renderReceiptPaper(sale);
    $('#printStatus').textContent = sale.saved
      ? 'Struk lama — bisa dicetak ulang.'
      : '⚠ Belum tersimpan ke server (antrian).';
  });

  // Kelola menu & kategori
  $('#tabMenu').addEventListener('click', () => showMenuTab('menu'));
  $('#tabKategori').addEventListener('click', () => showMenuTab('kategori'));
  $('#menuSearch').addEventListener('input', e => {
    menuSearchQ = e.target.value;
    renderMenuList();
  });
  $('#menuCatChips').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    menuCatQ = b.dataset.mcat;
    renderMenuCatChips();
    renderMenuList();
  });
  $('#btnAddMenu').addEventListener('click', () => openMenuForm(null));
  $('#menuList').addEventListener('click', e => {
    const b = e.target.closest('button, .switch input');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === 'edit') openMenuForm(State.menu.find(m => m.id === id));
    else if (b.dataset.act === 'del') deleteMenu(id);
    else if (b.dataset.act === 'toggle') toggleMenu(id);
  });
  $('#btnSaveMenu').addEventListener('click', saveMenuForm);

  // Foto menu
  $('#btnPickFoto').addEventListener('click', () => $('#mfFotoFile').click());
  $('#mfFotoFile').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      State.currentFoto = await fileToDataUrl(file, 400, 0.8);
      renderFotoPreview();
      $('#mfFotoUrl').value = '';
    } catch (err) {
      toast(err.message, 'err');
    }
  });
  $('#btnUseUrl').addEventListener('click', () => {
    const url = $('#mfFotoUrl').value.trim();
    if (!/^https?:\/\//.test(url)) { toast('URL gambar tidak valid', 'err'); return; }
    State.currentFoto = url;
    renderFotoPreview();
    toast('URL foto dipakai', 'info');
  });
  $('#btnClearFoto').addEventListener('click', () => {
    State.currentFoto = '';
    $('#mfFotoUrl').value = '';
    renderFotoPreview();
  });

  // Kategori
  $('#btnAddCat').addEventListener('click', () => openCatForm(null));
  $('#catList').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === 'edit') openCatForm(State.categories.find(c => c.id === id));
    else if (b.dataset.act === 'del') deleteCategory(id);
  });
  $('#btnSaveCat').addEventListener('click', saveCatForm);

  // Pengaturan
  $('#btnSaveConn').addEventListener('click', saveConnection);
  $('#btnTestConn').addEventListener('click', testConnection);
  $('#btnSaveSettings').addEventListener('click', saveSettingsForm);
  $('#btnTestPrint').addEventListener('click', async () => {
    const info = $('#printerInfo');
    info.textContent = 'Mencoba cetak… pastikan printer menyala.';
    try {
      const ops = {
        showFoodLogos: LS.get('pq_show_food_logos', true) !== false,
        logoUrl: getLogo(),
      };
      await Print.testPrint(State.settings, msg => { info.textContent = msg; }, ops);
      info.textContent = '🖨 Tes cetak berhasil ✓';
      toast('Tes cetak berhasil', 'ok');
    } catch (e) {
      info.textContent = '❌ ' + e.message;
      toast('Tes cetak gagal', 'err', 4000);
    }
  });
  $('#btnSync').addEventListener('click', syncNow);
  $('#btnSetupMenu').addEventListener('click', setupSampleMenu);
  $('#btnResetDemo').addEventListener('click', resetDemo);

  // Logo aplikasi pesan-antar di struk
  $('#setFoodLogos').addEventListener('change', e => {
    LS.set('pq_show_food_logos', e.target.checked);
    toast(e.target.checked ? 'Logo ShopeeFood/GoFood/GrabFood tampil di struk' : 'Logo aplikasi disembunyikan dari struk', 'info');
  });

  // Lebar printer
  $('#printerWidthChips').addEventListener('click', e => {
    const b = e.target.closest('.cash-chip');
    if (!b) return;
    LS.set('pq_printer_w', b.dataset.w);
    applyPrinterWidth();
    fillPrinterWidthChips();
    toast('Lebar printer: ' + (CONFIG.PRINTER_SIZES[b.dataset.w] || {}).label || b.dataset.w + ' mm', 'info');
  });

  // Header: klik status → info
  $('#gasDotWrap').addEventListener('click', () => {
    const st = $('#gasDot').className;
    if (st.indexOf('ok') >= 0) toast('Terhubung ke spreadsheet ✔', 'ok');
    else if (st.indexOf('bad') >= 0) toast('Server tidak terjangkau — cek URL & internet', 'err');
    else toast('Mode demo — data tersimpan di perangkat ini', 'warn');
  });
}

/* ================= AUTO-SYNC REALTIME =================
   Saat aplikasi terbuka (tab aktif), data otomatis ditarik
   dari spreadsheet secara berkala + antrian offline otomatis
   dikirim. Jadi update dari HP lain / spreadsheet langsung
   terlihat tanpa perlu buka-tutup aplikasi. */
const AUTO_SYNC_MS = 30000; // cek setiap 30 detik
let autoSyncTimer = null;

async function autoSync() {
  if (Data.isDemo()) return;      // mode demo: tidak ada server
  if (document.hidden) return;    // tab tidak aktif → hemat kuota
  try {
    await Data.syncPending();     // kirim transaksi antrian (offline) dulu
    await refreshAll(true);       // tarik data terbaru dari spreadsheet (silent)
    updatePendingBadge();
  } catch (e) { /* offline: biarkan, coba lagi di siklus berikutnya */ }
}

function startAutoSync() {
  stopAutoSync();
  autoSyncTimer = setInterval(autoSync, AUTO_SYNC_MS);
}

function stopAutoSync() {
  if (autoSyncTimer) { clearInterval(autoSyncTimer); autoSyncTimer = null; }
}

/* ================= INIT ================= */
async function init() {
  // Service worker (PWA / offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  applyPrinterWidth();
  bindEvents();
  renderCartBar();
  showMenuTab('menu');
  await refreshAll(true);

  // Auto-sync realtime saat aplikasi terbuka (mode server)
  if (!Data.isDemo()) startAutoSync();
  // Begitu kembali ke tab aplikasi → langsung sync tanpa menunggu interval
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !Data.isDemo()) autoSync();
  });

  // Info dukungan Bluetooth
  const info = $('#printerInfo');
  if (!Print.isSupported()) {
    info.textContent = '⚠ Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome di Android (iOS Safari belum didukung).';
  } else {
    info.textContent = 'Siap mencetak. Printer akan dipilih saat tombol cetak ditekan.';
  }
}

document.addEventListener('DOMContentLoaded', init);
