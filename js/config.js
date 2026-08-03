/* ============================================================
   KONFIGURASI APLIKASI — PISANG MADU QUEENA
   ------------------------------------------------------------
   Setelah deploy Google Apps Script, isi GAS_URL dengan URL
   Web App Anda (lihat README.md langkah 1).
   Bisa juga diisi langsung dari aplikasi:
   menu Pengaturan → Koneksi Spreadsheet → Simpan.
   ============================================================ */
var CONFIG = {
  // URL Web App Google Apps Script (sudah terisi — backend PISANG MADU QUEENA)
  GAS_URL: 'https://script.google.com/macros/s/AKfycby_6xj5BYYcvQoZ_9_lzwmVofcKtez3JsSkcoymE0ZPCCQGiScZH3a-vAq0UjK7fiXU-g/exec',

  // Token opsional untuk keamanan ringan (harus sama dengan
  // nilai TOKEN di sheet SETTINGS spreadsheet Anda).
  TOKEN: '',

  APP_NAME: 'PISANG MADU QUEENA',
  PRINTER_CHARS: 32, // lebar struk 58mm font A (80mm: 48)
  PRINTER_DOTS: 384, // lebar titik cetak 58mm (80mm: 576)

  // Pilihan lebar printer thermal (bisa diganti dari Pengaturan)
  PRINTER_SIZES: {
    '58': { chars: 32, dots: 384, label: '58 mm' },
    '80': { chars: 48, dots: 576, label: '80 mm' },
  },

  // Logo toko (embedded base64 — tampil tanpa fetch, dijamin offline)
  LOGO_DEFAULT: 'data:image/png;base64,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',

  PENDING_KEY: 'pq_pending_v1', // transaksi yang belum tersimpan ke server
};

// Override dari localStorage (tersimpan saat ubah lewat menu Pengaturan)
// — hanya dipakai jika URL valid (mencegah URL lama/terpotong merusak)
try {
  var savedCfg = JSON.parse(localStorage.getItem('pq_config') || '{}');
  if (savedCfg.GAS_URL && /^https:\/\/script\.google\.com\/macros\/s\/.+/.test(savedCfg.GAS_URL)) {
    CONFIG.GAS_URL = savedCfg.GAS_URL;
  }
  if (savedCfg.TOKEN) CONFIG.TOKEN = savedCfg.TOKEN;
} catch (e) {}
