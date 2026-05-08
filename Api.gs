/**
 * ============================================================
 * AETERLINK Documentation Module — Api.gs
 * Public server API facade for the WebApp.
 *
 * Notes:
 * - Apps Script exposes global functions from every .gs file.
 * - This module adds safe global helper APIs without replacing Code.gs.
 * - Existing global API functions in Code.gs remain active.
 * ============================================================
 */

var AETERLINK_BUILD = {
  APP_VERSION: 'AETERLINK_DOCS_MODULAR_2026_05_08_R01',
  BUILD_TIMESTAMP: '2026-05-08T00:00:00Z',
  SOURCE_BRANCH: 'main',
  DEPLOYMENT_MODE: 'GitHub Actions + clasp existing deployment',
  STRUCTURE_VERSION: 'ROOT_LEVEL_MODULAR_APPS_SCRIPT'
};

// Keep DMS compatible with legacy Code.gs while preserving any existing fields.
(function() {
  try {
    if (typeof DMS === 'undefined' || !DMS) {
      DMS = { name: 'AETERLINK Documentation Control', version: AETERLINK_BUILD.APP_VERSION };
    } else {
      DMS.name = DMS.name || 'AETERLINK Documentation Control';
      DMS.version = AETERLINK_BUILD.APP_VERSION;
    }
  } catch (err) {
    DMS = { name: 'AETERLINK Documentation Control', version: AETERLINK_BUILD.APP_VERSION };
  }
})();

var AETERLINK_API = (function() {
  function init() {
    return {
      ok: true,
      connected: true,
      build: buildInfo(),
      appName: typeof DMS !== 'undefined' && DMS.name ? DMS.name : 'AETERLINK Documentation Control',
      version: typeof DMS !== 'undefined' && DMS.version ? DMS.version : AETERLINK_BUILD.APP_VERSION,
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
      build: buildInfo(),
      spreadsheetId: ss ? ss.getId() : '',
      spreadsheetName: ss ? ss.getName() : '',
      serverTime: new Date().toISOString(),
      user: activeUser()
    };
  }

  function buildInfo() {
    return {
      appVersion: AETERLINK_BUILD.APP_VERSION,
      buildTimestamp: AETERLINK_BUILD.BUILD_TIMESTAMP,
      sourceBranch: AETERLINK_BUILD.SOURCE_BRANCH,
      deploymentMode: AETERLINK_BUILD.DEPLOYMENT_MODE,
      structureVersion: AETERLINK_BUILD.STRUCTURE_VERSION,
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

  function include(fileName) {
    fileName = String(fileName || '').trim();
    if (!fileName) throw new Error('Missing include file name');
    return HtmlService.createHtmlOutputFromFile(fileName).getContent();
  }

  function activeUser() {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
    } catch (err) {
      email = '';
    }
    return {
      email: email,
      displayName: email ? email.split('@')[0] : 'User'
    };
  }

  return {
    init: init,
    health: health,
    buildInfo: buildInfo,
    getCounts: getCounts,
    include: include,
    activeUser: activeUser
  };
})();

/**
 * Global Apps Script helper for future HTML partial templates:
 *   <?!= include('Styles'); ?>
 *   <?!= include('Client_App'); ?>
 */
function include(fileName) {
  return AETERLINK_API.include(fileName);
}

/**
 * Global endpoint for UI/version verification after deployment.
 */
function apiBuildInfo() {
  return AETERLINK_API.buildInfo();
}

/**
 * Global modular health endpoint. This avoids replacing existing apiHealth/apiHealthV8.
 */
function apiModularHealth() {
  return AETERLINK_API.health();
}
