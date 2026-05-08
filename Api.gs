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
  APP_VERSION: 'AETERLINK_DOCS_MODULAR_2026_05_08_R03',
  BUILD_TIMESTAMP: '2026-05-08T00:00:00Z',
  SOURCE_BRANCH: 'main',
  DEPLOYMENT_MODE: 'GitHub Actions + clasp existing deployment',
  STRUCTURE_VERSION: 'ROOT_LEVEL_MODULAR_APPS_SCRIPT'
};

var AETERLINK_ROUTER = {
  DEFAULT_VIEW_PROPERTY_KEY: 'AETERLINK_WEBAPP_DEFAULT_VIEW',
  LEGACY_VIEW: 'legacy',
  MODULAR_VIEW: 'modular'
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
      routing: routingInfo(),
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
      routing: routingInfo(),
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

  function htmlOutput(fileName, title) {
    return HtmlService
      .createTemplateFromFile(fileName)
      .evaluate()
      .setTitle(title || 'AETERLINK Documentation Control')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  function routeWebApp(e) {
    var params = (e && e.parameter) ? e.parameter : {};
    var requestedView = normalizeView(params.view || params.modular);
    var effectiveView = requestedView || getDefaultView();

    if (effectiveView === AETERLINK_ROUTER.MODULAR_VIEW) {
      return htmlOutput('Index_Modular', 'AETERLINK Documentation Control — Modular Test');
    }

    return htmlOutput('Index', 'AETERLINK Documentation Control');
  }

  function normalizeView(value) {
    value = String(value || '').trim().toLowerCase();
    if (value === 'modular' || value === '1' || value === 'true') return AETERLINK_ROUTER.MODULAR_VIEW;
    if (value === 'legacy' || value === '0' || value === 'false') return AETERLINK_ROUTER.LEGACY_VIEW;
    return '';
  }

  function getDefaultView() {
    var stored = '';
    try {
      stored = PropertiesService.getScriptProperties().getProperty(AETERLINK_ROUTER.DEFAULT_VIEW_PROPERTY_KEY) || '';
    } catch (err) {
      stored = '';
    }
    return normalizeView(stored) || AETERLINK_ROUTER.LEGACY_VIEW;
  }

  function setDefaultView(view) {
    var normalized = normalizeView(view);
    if (!normalized) throw new Error('Invalid default WebApp view: ' + view);
    PropertiesService.getScriptProperties().setProperty(AETERLINK_ROUTER.DEFAULT_VIEW_PROPERTY_KEY, normalized);
    return routingInfo();
  }

  function routingInfo() {
    return {
      defaultView: getDefaultView(),
      propertyKey: AETERLINK_ROUTER.DEFAULT_VIEW_PROPERTY_KEY,
      availableViews: [AETERLINK_ROUTER.LEGACY_VIEW, AETERLINK_ROUTER.MODULAR_VIEW],
      testUrls: {
        legacy: '?view=legacy',
        modular: '?view=modular'
      }
    };
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
    htmlOutput: htmlOutput,
    routeWebApp: routeWebApp,
    normalizeView: normalizeView,
    getDefaultView: getDefaultView,
    setDefaultView: setDefaultView,
    routingInfo: routingInfo,
    activeUser: activeUser
  };
})();

/**
 * Controlled WebApp entry point.
 * - Default view is stored in ScriptProperties, defaulting to legacy.
 * - Force legacy: ?view=legacy
 * - Test modular page: ?view=modular or ?modular=1
 */
function doGet(e) {
  return AETERLINK_API.routeWebApp(e);
}

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

/**
 * Global endpoint for checking and controlling WebApp routing.
 */
function apiWebAppRoutingInfo() {
  return AETERLINK_API.routingInfo();
}

function setWebAppDefaultViewLegacy() {
  return AETERLINK_API.setDefaultView('legacy');
}

function setWebAppDefaultViewModular() {
  return AETERLINK_API.setDefaultView('modular');
}
