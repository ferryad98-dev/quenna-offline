/* ============================================================
   Lapisan API — komunikasi dengan Web App Google Apps Script
   (database: Google Spreadsheet).
   ------------------------------------------------------------
   PENTING: semua permintaan memakai GET (query string).
   Alasan: Apps Script me-redirect POST → browser mengubah POST
   jadi GET (data hilang → error 405). GET aman dari masalah ini
   karena parameter ikut di URL.
   ============================================================ */
const Api = {
  async call(action, payload = {}, opts) {
    opts = opts || {};
    const timeout = opts.timeout || 25000;
    const retries = opts.retries !== undefined ? opts.retries : 1;

    if (!CONFIG.GAS_URL || !String(CONFIG.GAS_URL).trim()) {
      throw new Error('URL GAS belum diisi (mode demo)');
    }

    // Susun query string: ?action=...&payload=<JSON>&token=...
    const full = Object.assign({ action }, payload, { token: CONFIG.TOKEN });
    const q = 'action=' + encodeURIComponent(action) +
      '&payload=' + encodeURIComponent(JSON.stringify(full));

    // Daftar URL: URL aktif dulu, URL bawaan sebagai cadangan
    const urls = [CONFIG.GAS_URL];
    if (CONFIG_DEFAULT_GAS_URL && CONFIG_DEFAULT_GAS_URL !== CONFIG.GAS_URL) {
      urls.push(CONFIG_DEFAULT_GAS_URL);
    }

    let lastErr = null;
    for (const base of urls) {
      const url = base + (base.indexOf('?') >= 0 ? '&' : '?') + q;
      for (let attempt = 0; attempt <= retries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        try {
          const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
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
        } catch (e) {
          lastErr = e;
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        } finally {
          clearTimeout(timer);
        }
      }
    }
    throw lastErr || new Error('Server tidak terjangkau. Cek koneksi internet / URL GAS.');
  },

  /* ---- pembaca: toleransi lambat (GAS bisa cold start) ---- */
  getMenu()           { return this.call('getMenu', {}, { timeout: 30000, retries: 1 }); },
  getAll()            { return this.call('getAll', {}, { timeout: 30000, retries: 1 }); },
  getCategories()     { return this.call('getCategories', {}, { timeout: 25000, retries: 1 }); },
  getSettings()       { return this.call('getSettings', {}, { timeout: 25000, retries: 1 }); },
  getSales(limit)     { return this.call('getSales', { limit: limit || 200 }, { timeout: 30000, retries: 1 }); },

  /* ---- penulis: retry agresif biar transaksi tidak hilang ---- */
  saveMenu(item)      { return this.call('saveMenu', { item }, { timeout: 25000, retries: 2 }); },
  deleteMenu(id)      { return this.call('deleteMenu', { id }, { timeout: 25000, retries: 2 }); },
  saveCategory(cat)   { return this.call('saveCategory', { category: cat }, { timeout: 25000, retries: 2 }); },
  deleteCategory(id)  { return this.call('deleteCategory', { id }, { timeout: 25000, retries: 2 }); },
  saveSettings(settings) { return this.call('saveSettings', { settings }, { timeout: 25000, retries: 2 }); },
  saveSale(sale)      { return this.call('saveSale', { sale }, { timeout: 25000, retries: 2 }); },
  setup(reset)        { return this.call('setup', { reset: reset === true }, { timeout: 90000, retries: 0 }); },
};
