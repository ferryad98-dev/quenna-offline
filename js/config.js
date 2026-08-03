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

  APP_NAME: 'Kedai Pisang Queena',
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
  var savedUrl = String(savedCfg.GAS_URL || '').trim().replace(/\/+$/, '');
  if (savedUrl && /^https:\/\/script\.google\.com\/macros\/s\/.+/.test(savedUrl)) {
    CONFIG.GAS_URL = savedUrl;
  }
  if (savedCfg.TOKEN) CONFIG.TOKEN = savedCfg.TOKEN;
} catch (e) {}

// URL bawaan (tidak bisa tertimpa) — dipakai sebagai cadangan otomatis
// bila URL tersimpan di HP gagal/ganti deployment.
var CONFIG_DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycby_6xj5BYYcvQoZ_9_lzwmVofcKtez3JsSkcoymE0ZPCCQGiScZH3a-vAq0UjK7fiXU-g/exec';
