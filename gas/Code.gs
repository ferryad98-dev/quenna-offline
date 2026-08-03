/* ============================================================
   PISANG MADU QUEENA — BACKEND
   Google Apps Script + Google Spreadsheet (database)

   LANGKAH DEPLOY (sekali saja):
   1. Buat Google Spreadsheet baru (bebas, otomatis dibuat
      sheet-nya saat dipanggil).
   2. Buka menu: Ekstensi → Apps Script.
   3. Hapus isi editor, tempel seluruh kode ini, simpan (Ctrl+S).
   4. Klik Deploy → New deployment → pilih type: Web app.
      - Description: bebas
      - Execute as: Me
      - Who has access: Anyone
      → Deploy → izinkan akses (termasuk akses Google Drive
        untuk menyimpan foto menu) → salin URL .../exec.
   5. Tempel URL itu di aplikasi:
      Pengaturan → Koneksi Spreadsheet → Simpan & Muat Ulang.
   6. (Opsional) Di aplikasi: Pengaturan → "Muat Contoh Menu"
      untuk mengisi contoh menu (3 kategori pisang).

   SHEET DATABASE:
   - MENU      : ID | NAMA | HARGA | KATEGORI | EMOJI | AKTIF | FOTO
   - KATEGORI  : ID | NAMA | EMOJI | URUTAN
   - TRANSAKSI : NO | TANGGAL | JAM | ITEMS | JUMLAH_ITEM | SUBTOTAL |
                 DISKON | TOTAL | METODE | BAYAR | KEMBALI | KASIR
   - SETTINGS  : KEY | VALUE

   KEAMANAN: atur TOKEN di sheet SETTINGS (KEY=TOKEN) lalu isi
   TOKEN yang sama di aplikasi (Pengaturan → Token).
   Jika TOKEN kosong, akses terbuka.
   ============================================================ */

function doGet(e)  { return route_(e); }
function doPost(e) { return route_(e); }

/* ============ ROUTER ============ */
function route_(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    let body = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); }
      catch (err) { return out_({ ok: false, error: 'JSON body tidak valid' }); }
    } else if (e.parameter) {
      body = e.parameter;
      // Dukungan GET: payload dikirim sebagai parameter (query string)
      if (body.payload) {
        try { body = JSON.parse(body.payload); }
        catch (err) { return out_({ ok: false, error: 'Payload tidak valid' }); }
      }
    }

    const action = String(body.action || '');
    if (!action) return out_({ ok: false, error: 'Parameter action wajib ada' });
    if (!isAuthed_(body)) return out_({ ok: false, error: 'Token tidak valid' });

    const ss = getDb_();
    switch (action) {
      case 'setup':          return out_(setup_(ss, body.reset === true));
      case 'getMenu':        return out_({ ok: true, menu: readMenu_(ss) });
      // 1 panggilan untuk semua data (mempercepat loading awal)
      case 'getAll':         return out_({
        ok: true,
        menu: readMenu_(ss),
        categories: readCategories_(ss),
        settings: readSettings_(ss),
        sales: readSales_(ss, 200),
      });
      case 'saveMenu':       return out_(saveMenu_(ss, body.item));
      case 'deleteMenu':     return out_(deleteMenu_(ss, body.id));
      case 'getCategories':  return out_({ ok: true, categories: readCategories_(ss) });
      case 'saveCategory':   return out_(saveCategory_(ss, body.category));
      case 'deleteCategory': return out_(deleteCategory_(ss, body.id));
      case 'getSettings':    return out_({ ok: true, settings: readSettings_(ss) });
      case 'saveSettings':   return out_(saveSettings_(ss, body.settings));
      case 'saveSale':       return out_(saveSale_(ss, body.sale));
      case 'getSales':       return out_({ ok: true, sales: readSales_(ss, Number(body.limit) || 100) });
      default:               return out_({ ok: false, error: 'Action tidak dikenal: ' + action });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============ AUTH ============ */
function isAuthed_(body) {
  const token = String(readSetting_('TOKEN') || '');
  if (!token) return true; // token belum diatur = akses terbuka
  return String(body.token || '') === token;
}

/* ============ SPREADSHEET ============ */
function getDb_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers) sh.appendRow(headers);
  }
  return sh;
}

/* Pastikan header ada (misal kolom FOTO di sheet lama) */
function ensureHeader_(sh, colName, colIndex) {
  if (sh.getLastColumn() < colIndex) {
    sh.getRange(1, colIndex).setValue(colName);
  }
}

function readSetting_(key) {
  const ss = getDb_();
  const sh = ss.getSheetByName('SETTINGS');
  if (!sh) return '';
  const data = sh.getDataRange().getValues();
  const row = data.find(r => String(r[0]) === key);
  return row && row[1] != null ? String(row[1]) : '';
}

/* ============ MENU ============ */
const MENU_HEADERS = ['ID', 'NAMA', 'HARGA', 'KATEGORI', 'EMOJI', 'AKTIF', 'FOTO'];

function readMenu_(ss) {
  const sh = sheet_(ss, 'MENU', MENU_HEADERS);
  ensureHeader_(sh, 'FOTO', 7);
  return sh.getDataRange().getValues()
    .slice(1)
    .filter(r => r[0] && r[1])
    .map(r => ({
      id: String(r[0]),
      nama: String(r[1]),
      harga: Number(r[2]) || 0,
      kategori: String(r[3] || ''),
      emoji: String(r[4] || '🍌'),
      aktif: String(r[5]) !== 'FALSE',
      foto: r.length > 6 && r[6] ? String(r[6]) : '',
    }));
}

function saveMenu_(ss, item) {
  if (!item || !item.nama || !(Number(item.harga) > 0)) {
    throw new Error('Data menu tidak lengkap (nama & harga wajib)');
  }
  const sh = sheet_(ss, 'MENU', MENU_HEADERS);
  ensureHeader_(sh, 'FOTO', 7);
  const data = sh.getDataRange().getValues();
  const id = String(item.id || ('M' + Date.now()));
  const row = data.findIndex(r => String(r[0]) === id);

  // FOTO: base64 baru → upload ke Drive; selain itu simpan apa adanya
  let foto = '';
  if (item.fotoData) {
    const oldFoto = row > 0 && data[row][6] ? String(data[row][6]) : '';
    if (oldFoto && oldFoto.indexOf('http') !== 0) {
      try { DriveApp.getFileById(oldFoto).setTrashed(true); } catch (e) {}
    }
    foto = uploadMenuPhoto_(id, String(item.fotoData));
  } else {
    foto = String(item.foto || '');
  }

  const vals = [
    id,
    String(item.nama),
    Number(item.harga),
    String(item.kategori || ''),
    String(item.emoji || '🍌'),
    item.aktif === false ? 'FALSE' : 'TRUE',
    foto,
  ];
  if (row > 0) sh.getRange(row + 1, 1, 1, 7).setValues([vals]);
  else sh.appendRow(vals);
  return {
    ok: true,
    item: {
      id, nama: vals[1], harga: vals[2],
      kategori: vals[3], emoji: vals[4],
      aktif: vals[5] !== 'FALSE', foto: vals[6],
    },
  };
}

function deleteMenu_(ss, id) {
  const sh = sheet_(ss, 'MENU', MENU_HEADERS);
  const data = sh.getDataRange().getValues();
  const row = data.findIndex(r => String(r[0]) === String(id));
  if (row > 0) {
    // hapus juga foto dari Drive bila ada
    const foto = data[row][6] ? String(data[row][6]) : '';
    if (foto && foto.indexOf('http') !== 0) {
      try { DriveApp.getFileById(foto).setTrashed(true); } catch (e) {}
    }
    sh.deleteRow(row + 1);
  }
  return { ok: true };
}

/* Upload foto menu → folder "MENU FOTO - <nama spreadsheet>" di Drive */
function uploadMenuPhoto_(menuId, b64) {
  const folderName = 'MENU FOTO - ' + getDb_().getName();
  const it = DriveApp.getFoldersByName(folderName);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(folderName);
  const bytes = Utilities.base64Decode(b64);
  const blob = Utilities.newBlob(bytes, 'image/jpeg', menuId + '_' + Date.now() + '.jpg');
  return folder.createFile(blob).getId();
}

/* ============ KATEGORI ============ */
const CAT_HEADERS = ['ID', 'NAMA', 'EMOJI', 'URUTAN'];

function readCategories_(ss) {
  const sh = sheet_(ss, 'KATEGORI', CAT_HEADERS);
  return sh.getDataRange().getValues()
    .slice(1)
    .filter(r => r[0] && r[1])
    .map((r, i) => ({
      id: String(r[0]),
      nama: String(r[1]),
      emoji: String(r[2] || '🍽️'),
      urutan: Number(r[3]) || (i + 1),
    }));
}

function saveCategory_(ss, cat) {
  if (!cat || !cat.nama) throw new Error('Nama kategori wajib diisi');
  const sh = sheet_(ss, 'KATEGORI', CAT_HEADERS);
  const data = sh.getDataRange().getValues();
  const id = String(cat.id || ('K' + Date.now()));
  const row = data.findIndex(r => String(r[0]) === id);
  const oldNama = row > 0 ? String(data[row][1]) : '';
  const newNama = String(cat.nama);
  const urutan = Number(cat.urutan) ||
    (row > 0 ? (Number(data[row][3]) || row) : (data.length));
  const vals = [id, newNama, String(cat.emoji || '🍽️'), urutan];
  if (row > 0) sh.getRange(row + 1, 1, 1, 4).setValues([vals]);
  else sh.appendRow(vals);

  // Jika kategori diganti namanya → ikutkan menu yang memakainya
  if (oldNama && oldNama !== newNama) {
    const mSh = sheet_(ss, 'MENU', MENU_HEADERS);
    const mData = mSh.getDataRange().getValues();
    mData.forEach((r, i) => {
      if (i > 0 && String(r[3]) === oldNama) mSh.getRange(i + 1, 4).setValue(newNama);
    });
  }
  return { ok: true, category: { id, nama: newNama, emoji: vals[2], urutan: vals[3] } };
}

function deleteCategory_(ss, id) {
  const sh = sheet_(ss, 'KATEGORI', CAT_HEADERS);
  const data = sh.getDataRange().getValues();
  const row = data.findIndex(r => String(r[0]) === String(id));
  const nama = row > 0 ? String(data[row][1]) : '';
  if (row > 0) sh.deleteRow(row + 1);
  // menu di kategori itu dipindah ke "Umum"
  if (nama) {
    const mSh = sheet_(ss, 'MENU', MENU_HEADERS);
    const mData = mSh.getDataRange().getValues();
    mData.forEach((r, i) => {
      if (i > 0 && String(r[3]) === nama) mSh.getRange(i + 1, 4).setValue('Umum');
    });
  }
  return { ok: true };
}

/* ============ SETTINGS ============ */
function readSettings_(ss) {
  const sh = sheet_(ss, 'SETTINGS', ['KEY', 'VALUE']);
  const map = {};
  sh.getDataRange().getValues().slice(1).forEach(r => {
    if (r[0]) map[String(r[0])] = String(r[1]);
  });
  return {
    namaToko: map.NAMA_TOKO || 'PISANG MADU QUEENA',
    alamat: map.ALAMAT || '',
    telepon: map.TELEPON || '',
    footer: map.FOOTER || 'Terima kasih!',
  };
}

function saveSettings_(ss, s) {
  if (!s) throw new Error('Data settings kosong');
  const set = (k, v) => {
    const sh = sheet_(ss, 'SETTINGS', ['KEY', 'VALUE']);
    const data = sh.getDataRange().getValues();
    const row = data.findIndex(r => String(r[0]) === k);
    const val = String(v == null ? '' : v);
    if (row > 0) sh.getRange(row + 1, 2).setValue(val);
    else sh.appendRow([k, val]);
  };
  if (s.token !== undefined) set('TOKEN', s.token);
  // Penting: kunci disimpan DENGAN underscore (NAMA_TOKO) agar cocok
  // dengan pembacaan di readSettings_ (map.NAMA_TOKO).
  const KEY_MAP = { namaToko: 'NAMA_TOKO', alamat: 'ALAMAT', telepon: 'TELEPON', footer: 'FOOTER' };
  ['namaToko', 'alamat', 'telepon', 'footer'].forEach(k => {
    if (s[k] !== undefined) set(KEY_MAP[k], s[k]);
  });
  return { ok: true };
}


/* ============ TRANSAKSI ============ */
function saveSale_(ss, sale) {
  if (!sale || !Array.isArray(sale.items) || !sale.items.length) {
    throw new Error('Transaksi kosong');
  }
  const sh = sheet_(ss, 'TRANSAKSI', [
    'NO', 'TANGGAL', 'JAM', 'ITEMS', 'JUMLAH_ITEM',
    'SUBTOTAL', 'DISKON', 'TOTAL', 'METODE', 'BAYAR', 'KEMBALI', 'KASIR',
  ]);

  const items = sale.items.map(it => ({
    id: String(it.id),
    nama: String(it.nama),
    harga: Number(it.harga) || 0,
    qty: Number(it.qty) || 1,
  }));
  const subtotal = items.reduce((s, it) => s + it.harga * it.qty, 0);
  const diskon = Number(sale.diskon) || 0;
  const total = Math.max(0, subtotal - diskon);
  const metode = String(sale.metode || 'Tunai');
  const bayar = metode === 'Tunai' ? (Number(sale.bayar) || 0) : total;
  const kembali = metode === 'Tunai' ? Math.max(0, bayar - total) : 0;

  // DEKLARASI DULU sebelum dipakai (hindari error TDZ)
  const tz = Session.getScriptTimeZone();
  const tanggal = String(sale.tanggal || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'));
  const jam = String(sale.jam || Utilities.formatDate(new Date(), tz, 'HH:mm'));

  // Nomor urut transaksi PER HARI (reset tiap hari): 001, 002, dst.
  const dataRows = sh.getDataRange().getValues().slice(1);
  const todayCount = dataRows.filter(r => String(r[1]) === tanggal).length;
  const no = String(todayCount + 1).padStart(3, '0');

  sh.appendRow([
    no, tanggal, jam, JSON.stringify(items),
    items.reduce((s, it) => s + it.qty, 0),
    subtotal, diskon, total, metode, bayar, kembali,
    String(sale.kasir || 'Kasir'),
  ]);

  return { ok: true, sale: { no, tanggal, jam, total, kembali } };
}

function readSales_(ss, limit) {
  const sh = sheet_(ss, 'TRANSAKSI', [
    'NO', 'TANGGAL', 'JAM', 'ITEMS', 'JUMLAH_ITEM',
    'SUBTOTAL', 'DISKON', 'TOTAL', 'METODE', 'BAYAR', 'KEMBALI', 'KASIR',
  ]);
  const tz = Session.getScriptTimeZone();
  // Google Sheets mengubah string tanggal/jam menjadi Date →
  // normalisasi kembali ke format teks "yyyy-MM-dd" & "HH:mm".
  const fmtDate = v => (v instanceof Date) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v || '');
  const fmtTime = v => (v instanceof Date) ? Utilities.formatDate(v, tz, 'HH:mm') : String(v || '');
  const rows = sh.getDataRange().getValues().slice(1);
  return rows
    .filter(r => r[0] && r[3])
    .slice(-limit)
    .reverse()
    .map(r => {
      let items = [];
      try { items = JSON.parse(r[3]); } catch (e) { items = []; }
      return {
        // Sheets juga menghapus leading zero "001" → jadikan 3 digit lagi
        no: String(r[0]).padStart(3, '0'),
        tanggal: fmtDate(r[1]),
        jam: fmtTime(r[2]),
        items,
        qty: Number(r[4]) || 0,
        subtotal: Number(r[5]) || 0,
        diskon: Number(r[6]) || 0,
        total: Number(r[7]) || 0,
        metode: String(r[8] || 'Tunai'),
        bayar: Number(r[9]) || 0,
        kembali: Number(r[10]) || 0,
        kasir: String(r[11] || ''),
      };
    });
}

/* ============ SETUP AWAL (contoh menu 3 kategori) ============ */
const SAMPLE_CATS = [
  ['k1', 'Pisang Goreng', '🍌', 1],
  ['k2', 'Pisang Bakar',  '🔥', 2],
  ['k3', 'Pisang Katsu',  '🍢', 3],
];

/* [ID, NAMA, HARGA, KATEGORI, EMOJI, AKTIF, FOTO] */
const SAMPLE_MENU = [
  ['m01', 'Pisang Goreng Original',        10000, 'Pisang Goreng', '🍌', 'TRUE', ''],
  ['m02', 'Pisang Goreng Madu',            11000, 'Pisang Goreng', '🍯', 'TRUE', ''],
  ['m03', 'Pisang Goreng Gula Palm',       11000, 'Pisang Goreng', '🍬', 'TRUE', ''],
  ['m04', 'Pisang Goreng Keju',            12000, 'Pisang Goreng', '🧀', 'TRUE', ''],
  ['m05', 'Pisang Goreng Coklat',          12000, 'Pisang Goreng', '🍫', 'TRUE', ''],
  ['m06', 'Pisang Goreng Coklat Keju',     13000, 'Pisang Goreng', '🍫🧀', 'TRUE', ''],
  ['m07', 'Pisang Goreng Strawberry',      12000, 'Pisang Goreng', '🍓', 'TRUE', ''],
  ['m08', 'Pisang Goreng Tiramisu',        12000, 'Pisang Goreng', '🍰', 'TRUE', ''],
  ['m09', 'Pisang Goreng Greentea',        12000, 'Pisang Goreng', '🍵', 'TRUE', ''],
  ['m10', 'Pisang Goreng Capucino',        12000, 'Pisang Goreng', '☕', 'TRUE', ''],
  ['m11', 'Pisang Goreng Crumble Oreo',    14000, 'Pisang Goreng', '🍪', 'TRUE', ''],
  ['m12', 'Pisang Goreng Crumble Matcha',  14000, 'Pisang Goreng', '🍵', 'TRUE', ''],
  ['m13', 'Pisang Goreng Crumble Redvelvet', 14000, 'Pisang Goreng', '🧁', 'TRUE', ''],
  ['m14', 'Pisang Bakar Susu',             12000, 'Pisang Bakar', '🥛', 'TRUE', ''],
  ['m15', 'Pisang Bakar Gula Palm',        12000, 'Pisang Bakar', '🍬', 'TRUE', ''],
  ['m16', 'Pisang Bakar Keju',             13000, 'Pisang Bakar', '🧀', 'TRUE', ''],
  ['m17', 'Pisang Bakar Coklat',           13000, 'Pisang Bakar', '🍫', 'TRUE', ''],
  ['m18', 'Pisang Bakar Coklat Keju',      14000, 'Pisang Bakar', '🍫🧀', 'TRUE', ''],
  ['m19', 'Pisang Bakar Strawberry',       13000, 'Pisang Bakar', '🍓', 'TRUE', ''],
  ['m20', 'Pisang Bakar Tiramisu',         13000, 'Pisang Bakar', '🍰', 'TRUE', ''],
  ['m21', 'Pisang Bakar Greentea',         13000, 'Pisang Bakar', '🍵', 'TRUE', ''],
  ['m22', 'Pisang Bakar Capucino',         13000, 'Pisang Bakar', '☕', 'TRUE', ''],
  ['m23', 'Pisang Bakar Crumble Oreo',     15000, 'Pisang Bakar', '🍪', 'TRUE', ''],
  ['m24', 'Pisang Bakar Crumble Matcha',   15000, 'Pisang Bakar', '🍵', 'TRUE', ''],
  ['m25', 'Pisang Bakar Crumble Redvelvet', 15000, 'Pisang Bakar', '🧁', 'TRUE', ''],
  ['m26', 'Pisang Katsu Original',         12000, 'Pisang Katsu', '🍌', 'TRUE', ''],
  ['m27', 'Pisang Katsu Saus Vanila',      13000, 'Pisang Katsu', '🍦', 'TRUE', ''],
  ['m28', 'Pisang Katsu Saus Coklat',      13000, 'Pisang Katsu', '🍫', 'TRUE', ''],
  ['m29', 'Pisang Katsu Saus Karamel',     13000, 'Pisang Katsu', '🍮', 'TRUE', ''],
  ['m30', 'Pisang Katsu Saus Strawberry',  13000, 'Pisang Katsu', '🍓', 'TRUE', ''],
  ['m31', 'Pisang Katsu Susu',             13000, 'Pisang Katsu', '🥛', 'TRUE', ''],
  ['m32', 'Pisang Katsu Keju',             14000, 'Pisang Katsu', '🧀', 'TRUE', ''],
  ['m33', 'Pisang Katsu Coklat Keju',      15000, 'Pisang Katsu', '🍫🧀', 'TRUE', ''],
  ['m34', 'Pisang Katsu Tiramisu',         15000, 'Pisang Katsu', '🍰', 'TRUE', ''],
  ['m35', 'Pisang Katsu Greentea',         15000, 'Pisang Katsu', '🍵', 'TRUE', ''],
  ['m36', 'Pisang Katsu Capucino',         15000, 'Pisang Katsu', '☕', 'TRUE', ''],
  ['m37', 'Pisang Katsu Crumble Oreo',     16000, 'Pisang Katsu', '🍪', 'TRUE', ''],
  ['m38', 'Pisang Katsu Crumble Matcha',   16000, 'Pisang Katsu', '🍵', 'TRUE', ''],
  ['m39', 'Pisang Katsu Crumble Redvelvet', 16000, 'Pisang Katsu', '🧁', 'TRUE', ''],
];

function setup_(ss, reset) {
  const mSh = sheet_(ss, 'MENU', MENU_HEADERS);
  sheet_(ss, 'SETTINGS', ['KEY', 'VALUE']);
  sheet_(ss, 'TRANSAKSI', [
    'NO', 'TANGGAL', 'JAM', 'ITEMS', 'JUMLAH_ITEM',
    'SUBTOTAL', 'DISKON', 'TOTAL', 'METODE', 'BAYAR', 'KEMBALI', 'KASIR',
  ]);
  const cSh = sheet_(ss, 'KATEGORI', CAT_HEADERS);

  if (reset && mSh.getLastRow() > 1) mSh.deleteRows(2, mSh.getLastRow() - 1);
  if (mSh.getLastRow() <= 1) {
    mSh.getRange(2, 1, SAMPLE_MENU.length, 7).setValues(SAMPLE_MENU);
  }
  if (cSh.getLastRow() <= 1) {
    cSh.getRange(2, 1, SAMPLE_CATS.length, 4).setValues(SAMPLE_CATS);
  }

  ensureSetting_('TOKEN', '');
  ensureSetting_('NAMA_TOKO', 'PISANG MADU QUEENA');
  ensureSetting_('ALAMAT', 'Candirenggo, Singosari - Malang');
  ensureSetting_('TELEPON', '0819-4534-8703');
  ensureSetting_('FOOTER', 'Terima kasih! Sampai jumpa lagi.');

  return { ok: true, menuCount: readMenu_(ss).length, categoryCount: readCategories_(ss).length };
}

function ensureSetting_(key, value) {
  const sh = sheet_(getDb_(), 'SETTINGS', ['KEY', 'VALUE']);
  const data = sh.getDataRange().getValues();
  const row = data.findIndex(r => String(r[0]) === key);
  if (row < 0) sh.appendRow([key, value]);
}
