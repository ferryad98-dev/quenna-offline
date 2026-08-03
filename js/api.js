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

  async call(action, payload = {}) {
    if (!CONFIG.GAS_URL || !String(CONFIG.GAS_URL).trim()) {
      throw new Error('URL GAS belum diisi (mode demo)');
    }

    const body = JSON.stringify(
      Object.assign({ action }, payload, { token: CONFIG.TOKEN })
    );

    let res = null;
    let lastErr = null;
    // Auto-retry 2x (total 3 percobaan) — tahan jaringan tidak stabil
    for (let attempt = 0; attempt < 3; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        res = await this.post(CONFIG.GAS_URL, body, ctrl);
        break;
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      } finally {
        clearTimeout(timer);
      }
    }

    if (!res) {
      throw new Error('Server tidak terjangkau. Cek koneksi internet / URL GAS.');
    }

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
  },

  getMenu()           { return this.call('getMenu'); },
  getAll()            { return this.call('getAll'); },
  saveMenu(item)      { return this.call('saveMenu', { item }); },
  deleteMenu(id)      { return this.call('deleteMenu', { id }); },

  getCategories()     { return this.call('getCategories'); },
  saveCategory(cat)   { return this.call('saveCategory', { category: cat }); },
  deleteCategory(id)  { return this.call('deleteCategory', { id }); },

  getSettings()       { return this.call('getSettings'); },
  saveSettings(settings) { return this.call('saveSettings', { settings }); },
  saveSale(sale)      { return this.call('saveSale', { sale }); },
  getSales(limit)     { return this.call('getSales', { limit: limit || 200 }); },
  setup(reset)        { return this.call('setup', { reset: reset === true }); },
};
