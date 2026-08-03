/* ============================================================
   Lapisan API — komunikasi dengan Web App Google Apps Script
   (database: Google Spreadsheet). Kirim JSON via POST
   Content-Type text/plain agar tidak memicu CORS preflight.
   ============================================================ */
const Api = {
  /* Kirim POST, tangani redirect khas Apps Script:
     Google kadang me-302 ke URL ber-token, dan browser mengubah
     POST → GET saat redirect (data hilang). Solusi: jika fetch
     melaporkan redirect, kirim ulang POST ke URL final. */
  async post(url, body, ctrl) {
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (res.redirected && res.url && res.url !== url) {
      res = await fetch(res.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        signal: ctrl.signal,
      });
    }
    return res;
  },

  /* Satu kali percobaan POST + parse JSON ke satu URL */
  async tryOnce(url, body, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await this.post(url, body, ctrl);
      let data;
      try {
        data = JSON.parse(await res.text());
      } catch (e) {
        throw new Error('Respons GAS tidak valid (HTTP ' + res.status + ')');
      }
      if (!data || data.ok !== true) {
        throw new Error((data && data.error) || 'GAS mengembalikan error');
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  },

  async call(action, payload = {}, opts) {
    opts = opts || {};
    const timeout = opts.timeout || 25000;       // batas tunggu tiap percobaan
    const retries = opts.retries !== undefined ? opts.retries : 2;

    if (!CONFIG.GAS_URL || !String(CONFIG.GAS_URL).trim()) {
      throw new Error('URL GAS belum diisi (mode demo)');
    }

    const body = JSON.stringify(
      Object.assign({ action }, payload, { token: CONFIG.TOKEN })
    );

    // Daftar URL yang dicoba: URL aktif dulu, lalu URL bawaan sebagai
    // cadangan otomatis (mengatasi URL tersimpan yang sudah basi).
    const urls = [CONFIG.GAS_URL];
    if (CONFIG_DEFAULT_GAS_URL && CONFIG_DEFAULT_GAS_URL !== CONFIG.GAS_URL) {
      urls.push(CONFIG_DEFAULT_GAS_URL);
    }

    let lastErr = null;
    for (const url of urls) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await this.tryOnce(url, body, timeout);
        } catch (e) {
          lastErr = e;
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw lastErr || new Error('Server tidak terjangkau. Cek koneksi internet / URL GAS.');
  },

  /* ---- pembaca: toleransi lambat (GAS bisa cold start), 1-2 percobaan ---- */
  getMenu()           { return this.call('getMenu', {}, { timeout: 60000, retries: 1 }); },
  getAll()            { return this.call('getAll', {}, { timeout: 60000, retries: 1 }); },
  getCategories()     { return this.call('getCategories', {}, { timeout: 45000, retries: 1 }); },
  getSettings()       { return this.call('getSettings', {}, { timeout: 45000, retries: 1 }); },
  getSales(limit)     { return this.call('getSales', { limit: limit || 200 }, { timeout: 60000, retries: 1 }); },

  /* ---- penulis: retry lebih agresif biar transaksi tidak hilang ---- */
  saveMenu(item)      { return this.call('saveMenu', { item }, { timeout: 30000, retries: 2 }); },
  deleteMenu(id)      { return this.call('deleteMenu', { id }, { timeout: 30000, retries: 2 }); },
  saveCategory(cat)   { return this.call('saveCategory', { category: cat }, { timeout: 30000, retries: 2 }); },
  deleteCategory(id)  { return this.call('deleteCategory', { id }, { timeout: 30000, retries: 2 }); },
  saveSettings(settings) { return this.call('saveSettings', { settings }, { timeout: 30000, retries: 2 }); },
  saveSale(sale)      { return this.call('saveSale', { sale }, { timeout: 30000, retries: 2 }); },
  setup(reset)        { return this.call('setup', { reset: reset === true }, { timeout: 120000, retries: 1 }); },
};
