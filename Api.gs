/**
 * ============================================================
 * AETERLINK Documentation Module — Api.gs
 * Public server API facade for the WebApp.
 *
 * Notes:
 * - This module is intentionally lightweight during refactor.
 * - Existing global API functions in Code.gs remain active.
 * - New logic should be added here under AETERLINK_API namespace first.
 * ============================================================
 */

var AETERLINK_API = (function() {
  function init() {
    return {
      ok: true,
      appName: typeof DMS !== 'undefined' && DMS.name ? DMS.name : 'AETERLINK Documentation Control',
      version: typeof DMS !== 'undefined' && DMS.version ? DMS.version : 'MODULAR_REFACTOR',
      serverTime: new Date().toISOString(),
      modules: typeof MODULES !== 'undefined' ? MODULES : {},
      schema: typeof SCHEMA !== 'undefined' ? SCHEMA : {},
      counts: getCounts()
    };
  }

  function health() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return {
      ok: true,
      connected: true,
      spreadsheetId: ss ? ss.getId() : '',
      spreadsheetName: ss ? ss.getName() : '',
      serverTime: new Date().toISOString()
    };
  }

  function getCounts() {
    var dao = typeof AETERLINK_DAO !== 'undefined' ? AETERLINK_DAO : null;
    if (!dao) return {};
    return {
      projects: dao.readRows('PROJECTS', { allowMissing: true }).length,
      templates: dao.readRows('FORM_TEMPLATES', { allowMissing: true, activeOnly: true }).length,
      formRecords: dao.readRows('FORM_RECORDS', { allowMissing: true, activeOnly: true }).length,
      documentRegister: dao.readRows('DOCUMENT_REGISTER', { allowMissing: true, activeOnly: true }).length,
      clientSubmittals: dao.readRows('CLIENT_SUBMITTALS', { allowMissing: true, activeOnly: true }).length
    };
  }

  return {
    init: init,
    health: health,
    getCounts: getCounts
  };
})();
