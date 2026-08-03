/* ============================================================
   Lapisan API — komunikasi dengan Web App Google Apps Script
   (database: Google Spreadsheet). Kirim JSON via POST
   Content-Type text/plain agar tidak memicu CORS preflight.
   ============================================================ */
const Api = {
  async call(action, payload = {}) {
    if (!CONFIG.GAS_URL || !String(CONFIG.GAS_URL).trim()) {
      throw new Error('URL GAS belum diisi (mode demo)');
    }

    const body = JSON.stringify(
      Object.assign({ action }, payload, { token: CONFIG.TOKEN })
    );

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);

    let res;
    try {
      res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new Error('Server tidak terjangkau. Cek koneksi internet / URL GAS.');
    } finally {
      clearTimeout(timer);
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
