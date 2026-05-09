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
  APP_VERSION: 'AETERLINK_DOCS_MODULAR_2026_05_08_R06',
  BUILD_TIMESTAMP: '2026-05-08T00:00:00Z',
  SOURCE_BRANCH: 'main',
  DEPLOYMENT_MODE: 'GitHub Actions + clasp existing deployment',
  STRUCTURE_VERSION: 'ROOT_LEVEL_MODULAR_APPS_SCRIPT'
};

var AETERLINK_ROUTER = {
  DEFAULT_VIEW_PROPERTY_KEY: 'AETERLINK_WEBAPP_DEFAULT_VIEW',
  LEGACY_VIEW: 'legacy',
  MODULAR_VIEW: 'modular',
  SMOKE_VIEW: 'smoke'
};

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
  function init() { return modularInit(); }

  function modularInit() {
    var recentDocuments = tableRows('DOCUMENT_REGISTER', { limit: 10 }).rows;
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
      counts: getCounts(),
      lifecycle: lifecycleConfig(),
      recentDocuments: recentDocuments
    };
  }

  function health() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return { ok: true, connected: true, build: buildInfo(), routing: routingInfo(), spreadsheetId: ss ? ss.getId() : '', spreadsheetName: ss ? ss.getName() : '', serverTime: new Date().toISOString(), user: activeUser() };
  }

  function buildInfo() {
    return { appVersion: AETERLINK_BUILD.APP_VERSION, buildTimestamp: AETERLINK_BUILD.BUILD_TIMESTAMP, sourceBranch: AETERLINK_BUILD.SOURCE_BRANCH, deploymentMode: AETERLINK_BUILD.DEPLOYMENT_MODE, structureVersion: AETERLINK_BUILD.STRUCTURE_VERSION, serverTime: new Date().toISOString() };
  }

  function lifecycleConfig() {
    return { hint: 'Used to group documents by project lifecycle: initiation → planning → design → procurement → installation → testing → handover → Warranty/DLP', stages: [
      { key: 'All', label: 'All documents' },
      { key: '01_INITIATION', label: '1. Project Start / Sales Handover' },
      { key: '02_PLANNING', label: '2. Project Planning / Control' },
      { key: '03_DESIGN', label: '3. Design / Engineering / Approval Documents' },
      { key: '04_PROCUREMENT', label: '4. Procurement / Material' },
      { key: '05_CONSTRUCTION', label: '5. Construction / Installation' },
      { key: '06_TESTING', label: '6. Testing / Commissioning' },
      { key: '07_HANDOVER', label: '7. Handover / Closeout' },
      { key: '08_WARRANTY', label: '8. Warranty / DLP / Post-handover' }
    ] };
  }

  function getCounts() {
    return { projects: tableRows('PROJECTS').count, templates: tableRows('FORM_TEMPLATES').count, formRecords: tableRows('FORM_RECORDS').count, documentRegister: tableRows('DOCUMENT_REGISTER').count, clientSubmittals: tableRows('CLIENT_SUBMITTALS').count };
  }

  function tableRows(tableName, options) {
    options = options || {};
    tableName = String(tableName || '').trim();
    if (!tableName) throw new Error('Missing table name');
    var dao = typeof AETERLINK_DAO !== 'undefined' ? AETERLINK_DAO : null;
    var rows = [];
    if (dao && dao.readRows) rows = dao.readRows(tableName, { allowMissing: true, activeOnly: true });
    else rows = fallbackReadRows_(tableName);
    if (options.limit) rows = rows.slice(0, Number(options.limit));
    return { ok: true, tableName: tableName, rows: rows, count: rows.length, serverTime: new Date().toISOString() };
  }

  function fallbackReadRows_(tableName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return [];
    var sh = ss.getSheetByName(tableName);
    if (!sh) return [];
    var values = sh.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return [];
    var headers = values[0].map(function(h) { return String(h || '').trim(); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var obj = {}, hasValue = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        obj[headers[c]] = values[r][c];
        if (values[r][c] !== '') hasValue = true;
      }
      if (hasValue) rows.push(obj);
    }
    return rows.filter(function(row) {
      var isDeleted = String(row.IsDeleted || '').toUpperCase();
      var active = String(row.Active || '').toUpperCase();
      return isDeleted !== 'TRUE' && isDeleted !== 'YES' && active !== 'FALSE' && active !== 'NO';
    });
  }

  function saveFormRecord(payload) {
    payload = payload || {};
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName('FORM_RECORDS');
      if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
      var headers = getHeaders_(sh);
      if (!headers.length) throw new Error('FORM_RECORDS has no header row');

      var now = new Date();
      var nowIso = now.toISOString();
      var user = activeUser().email;
      var existingId = String(payload.FormRecordId || '').trim();
      var data = payload.Data || {};
      var originalTemplateCode = String(payload.TemplateCode || 'PJ-WCR-001').trim();
      var templateCode = canonicalTemplateCode_(originalTemplateCode);
      var projectCode = String(payload.ProjectCode || data.ProjectCode || 'TEST-PJ').trim();
      var revisionNo = normalizeRevisionNo_(payload.RevisionNo || data.RevisionNo || 'R00');
      var status = String(payload.Status || 'Draft').trim();
      var formRecordId = existingId || createId_('FR');
      var rawDocumentNo = String(payload.DocumentNo || data.DocumentNo || '').trim();
      var documentNo = rawDocumentNo ? normalizeDocumentNo_(projectCode, templateCode, rawDocumentNo, revisionNo) : createDocumentNo_(projectCode, templateCode, revisionNo);

      if (data && typeof data === 'object') {
        data.TemplateCode = templateCode;
        data.DocumentNo = documentNo;
        data.RevisionNo = revisionNo;
        data.Status = status;
      }

      var record = {
        FormRecordId: formRecordId,
        ProjectCode: projectCode,
        TemplateCode: templateCode,
        DocumentNo: documentNo,
        RevisionNo: revisionNo,
        Status: status,
        DataJson: JSON.stringify(data),
        PdfUrl: payload.PdfUrl || '',
        SubmittedBy: payload.SubmittedBy || user,
        SubmittedAt: payload.SubmittedAt || '',
        ApprovedBy: payload.ApprovedBy || '',
        ApprovedAt: payload.ApprovedAt || '',
        CreatedAt: payload.CreatedAt || nowIso,
        UpdatedAt: nowIso,
        UpdatedBy: user,
        Revision: payload.Revision || revisionNo,
        IsDeleted: 'FALSE',
        RelatedTable: payload.RelatedTable || '',
        RelatedRecordId: payload.RelatedRecordId || '',
        DocumentStatus: payload.DocumentStatus || status,
        LockedAfterPdf: payload.LockedAfterPdf || 'FALSE',
        WorkflowGateId: payload.WorkflowGateId || '',
        ReviewComment: payload.ReviewComment || '',
        IssueNo: payload.IssueNo || extractIssueNo_(documentNo),
        RevisionReason: payload.RevisionReason || ''
      };

      var targetRow = findRowByValue_(sh, headers, 'FormRecordId', formRecordId);
      if (targetRow > 0 && payload.CreatedAt === undefined) {
        var old = rowToObject_(headers, sh.getRange(targetRow, 1, 1, headers.length).getDisplayValues()[0]);
        record.CreatedAt = old.CreatedAt || record.CreatedAt;
      }
      var rowValues = headers.map(function(h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
      if (targetRow > 0) sh.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      else { sh.appendRow(rowValues); targetRow = sh.getLastRow(); }

      return { ok: true, action: existingId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: targetRow, record: record, build: buildInfo() };
    } finally {
      lock.releaseLock();
    }
  }

  function getHeaders_(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return [];
    return sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) { return String(h || '').trim(); });
  }

  function findRowByValue_(sheet, headers, keyField, keyValue) {
    var col = headers.indexOf(keyField) + 1;
    if (col < 1 || !keyValue) return -1;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var values = sheet.getRange(2, col, lastRow - 1, 1).getDisplayValues();
    for (var i = 0; i < values.length; i++) if (String(values[i][0] || '').trim() === keyValue) return i + 2;
    return -1;
  }

  function rowToObject_(headers, row) {
    var obj = {};
    headers.forEach(function(h, i) { if (h) obj[h] = row[i]; });
    return obj;
  }

  function createId_(prefix) {
    return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
  }

  function canonicalTemplateCode_(templateCode) {
    var code = String(templateCode || '').trim().toUpperCase();
    var aliases = {
      'PJ-WORK-COMPLETE-001': 'PJ-WCR-001',
      'PJ-WORK-COMPLETE': 'PJ-WCR-001'
    };
    return aliases[code] || code || 'PJ-WCR-001';
  }

  function templateNameForCode_(templateCode) {
    var wanted = String(templateCode || '').trim();
    var canonical = canonicalTemplateCode_(wanted);
    try {
      var rows = tableRows('FORM_TEMPLATES').rows;
      for (var i = 0; i < rows.length; i++) {
        var code = String(rows[i].TemplateCode || '').trim();
        if (code === wanted || canonicalTemplateCode_(code) === canonical) return String(rows[i].TemplateName || rows[i].DocumentTitle || '').trim();
      }
    } catch (err) {}
    return '';
  }

  function acronym3_(name, fallbackCode) {
    var raw = String(name || '').trim();
    var fallback = String(fallbackCode || '').trim().toUpperCase();
    if (/WORK\s+COMPLETION\s+REPORT/i.test(raw) || /PJ-WCR/.test(fallback)) return 'WCR';
    if (/MEETING\s+MINUTES|\bMOM\b/i.test(raw) || /PJ-MTG-MOM/.test(fallback)) return 'MOM';
    if (/REQUEST\s+FOR\s+INFORMATION|\bRFI\b/i.test(raw) || /PJ-RFI/.test(fallback)) return 'RFI';
    if (/REQUEST\s+FOR\s+APPROVAL|\bRFA\b/i.test(raw) || /PJ-RFA/.test(fallback)) return 'RFA';
    var cleaned = raw.replace(/^[A-Z0-9-]+\s+[—-]\s+/, '').replace(/[()]/g, ' ').replace(/&/g, ' and ').replace(/\//g, ' ');
    var stop = { AND: true, OR: true, OF: true, THE: true, FOR: true, TO: true, FROM: true, BY: true, WITH: true, A: true, AN: true };
    var words = cleaned.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(function(w) { return w && !stop[w] && !/^\d+$/.test(w); });
    var letters = words.map(function(w) { return w.charAt(0); }).join('');
    if (letters.length >= 3) return letters.substring(0, 3);
    var compact = words.join('').replace(/[^A-Z0-9]/g, '');
    for (var i = 0; letters.length < 3 && i < compact.length; i++) {
      if (letters.indexOf(compact.charAt(i)) < 0 || letters.length < 2) letters += compact.charAt(i);
    }
    if (letters.length >= 3) return letters.substring(0, 3);
    var m = fallback.match(/^PJ-([A-Z0-9]{3})-/);
    if (m) return m[1];
    var body = fallback.replace(/^PJ-/, '').replace(/-\d{3,4}$/, '').replace(/[^A-Z0-9]/g, '');
    return (body + 'XXX').substring(0, 3);
  }

  function documentCodePrefix_(templateCode) {
    var canonical = canonicalTemplateCode_(templateCode);
    var name = templateNameForCode_(canonical) || templateNameForCode_(templateCode);
    var acronym = acronym3_(name, canonical);
    return 'PJ-' + acronym;
  }

  function normalizeRevisionNo_(revisionNo) {
    var value = String(revisionNo || '').trim().toUpperCase();
    if (!value || value === '0') return 'R00';
    var n = parseInt(value.replace(/\D/g, ''), 10);
    if (isNaN(n)) return value;
    return 'R' + ('00' + n).slice(-2);
  }

  function stripRevisionSuffix_(documentNo) {
    return String(documentNo || '').trim().replace(/-R\d{2}$/i, '');
  }

  function padIssueSeq_(seq) {
    var n = parseInt(seq, 10);
    if (isNaN(n) || n < 1) n = 1;
    return ('000' + n).slice(-3);
  }

  function extractIssueNo_(documentNo) {
    var m = stripRevisionSuffix_(documentNo).match(/-(\d{3,4})$/);
    if (!m) return '';
    return padIssueSeq_(m[1]);
  }

  function applyRevisionSuffix_(baseDocumentNo, revisionNo) {
    var base = stripRevisionSuffix_(baseDocumentNo);
    var rev = normalizeRevisionNo_(revisionNo);
    if (rev && rev !== 'R00' && rev !== '0') return base + '-' + rev;
    return base;
  }

  function normalizeDocumentNo_(projectCode, templateCode, documentNo, revisionNo) {
    var project = String(projectCode || 'TEST-PJ').trim();
    var prefix = project + '-' + documentCodePrefix_(templateCode) + '-';
    var base = stripRevisionSuffix_(documentNo);
    var issue = extractIssueNo_(base);
    if (issue) base = prefix + issue;
    else if (base.indexOf(prefix) !== 0) base = prefix + padIssueSeq_(nextIssueSeq_(project, templateCode));
    return applyRevisionSuffix_(base, revisionNo);
  }

  function nextIssueSeq_(projectCode, templateCode) {
    var project = String(projectCode || '').trim();
    var canonical = canonicalTemplateCode_(templateCode);
    var prefix = project + '-' + documentCodePrefix_(canonical) + '-';
    var rows = tableRows('FORM_RECORDS').rows;
    var max = 0, sameTemplateCount = 0;
    rows.forEach(function(r) {
      var rowTemplate = canonicalTemplateCode_(r.TemplateCode || '');
      var docNo = String(r.DocumentNo || '').trim();
      var sameTemplate = rowTemplate === canonical || docNo.indexOf(prefix) === 0;
      if (!sameTemplate || String(r.ProjectCode || '') !== project) return;
      sameTemplateCount++;
      var issue = extractIssueNo_(docNo);
      var n = parseInt(issue || '0', 10);
      if (!isNaN(n) && n > max) max = n;
    });
    if (max > 0) return max + 1;
    return sameTemplateCount + 1;
  }

  function createDocumentNo_(projectCode, templateCode, revisionNo) {
    var project = String(projectCode || 'TEST-PJ').trim();
    var canonical = canonicalTemplateCode_(templateCode);
    var base = project + '-' + documentCodePrefix_(canonical) + '-' + padIssueSeq_(nextIssueSeq_(project, canonical));
    return applyRevisionSuffix_(base, revisionNo);
  }

  function include(fileName) { fileName = String(fileName || '').trim(); if (!fileName) throw new Error('Missing include file name'); return HtmlService.createHtmlOutputFromFile(fileName).getContent(); }
  function htmlOutput(fileName, title) { return HtmlService.createTemplateFromFile(fileName).evaluate().setTitle(title || 'AETERLINK Documentation Control').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); }

  function routeWebApp(e) {
    var params = (e && e.parameter) ? e.parameter : {};
    var requestedView = normalizeView(params.view || params.modular);
    var effectiveView = requestedView || getDefaultView();
    if (effectiveView === AETERLINK_ROUTER.MODULAR_VIEW) return htmlOutput('Index_Modular_Full', 'AETERLINK Documentation Control — Modular Full');
    if (effectiveView === AETERLINK_ROUTER.SMOKE_VIEW) return htmlOutput('Index_Modular', 'AETERLINK Documentation Control — Modular Smoke Test');
    return htmlOutput('Index', 'AETERLINK Documentation Control');
  }

  function normalizeView(value) { value = String(value || '').trim().toLowerCase(); if (value === 'modular' || value === '1' || value === 'true' || value === 'full') return AETERLINK_ROUTER.MODULAR_VIEW; if (value === 'smoke' || value === 'test') return AETERLINK_ROUTER.SMOKE_VIEW; if (value === 'legacy' || value === '0' || value === 'false') return AETERLINK_ROUTER.LEGACY_VIEW; return ''; }
  function getDefaultView() { var stored = ''; try { stored = PropertiesService.getScriptProperties().getProperty(AETERLINK_ROUTER.DEFAULT_VIEW_PROPERTY_KEY) || ''; } catch (err) { stored = ''; } return normalizeView(stored) || AETERLINK_ROUTER.LEGACY_VIEW; }
  function setDefaultView(view) { var normalized = normalizeView(view); if (!normalized) throw new Error('Invalid default WebApp view: ' + view); PropertiesService.getScriptProperties().setProperty(AETERLINK_ROUTER.DEFAULT_VIEW_PROPERTY_KEY, normalized); return routingInfo(); }
  function routingInfo() { return { defaultView: getDefaultView(), propertyKey: AETERLINK_ROUTER.DEFAULT_VIEW_PROPERTY_KEY, availableViews: [AETERLINK_ROUTER.LEGACY_VIEW, AETERLINK_ROUTER.MODULAR_VIEW, AETERLINK_ROUTER.SMOKE_VIEW], testUrls: { legacy: '?view=legacy', modular: '?view=modular', smoke: '?view=smoke' } }; }
  function activeUser() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) { email = ''; } return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }

  return { init: init, modularInit: modularInit, health: health, buildInfo: buildInfo, lifecycleConfig: lifecycleConfig, getCounts: getCounts, tableRows: tableRows, saveFormRecord: saveFormRecord, include: include, htmlOutput: htmlOutput, routeWebApp: routeWebApp, normalizeView: normalizeView, getDefaultView: getDefaultView, setDefaultView: setDefaultView, routingInfo: routingInfo, activeUser: activeUser };
})();

function doGet(e) { return AETERLINK_API.routeWebApp(e); }
function include(fileName) { return AETERLINK_API.include(fileName); }
function apiBuildInfo() { return AETERLINK_API.buildInfo(); }
function apiModularHealth() { return AETERLINK_API.health(); }
function apiModularInit() { return AETERLINK_API.modularInit(); }
function apiModularTable(tableName) { return AETERLINK_API.tableRows(tableName); }
function apiModularSaveFormRecord(payload) { return AETERLINK_API.saveFormRecord(payload); }
function apiWebAppRoutingInfo() { return AETERLINK_API.routingInfo(); }
function setWebAppDefaultViewLegacy() { return AETERLINK_API.setDefaultView('legacy'); }
function setWebAppDefaultViewModular() { return AETERLINK_API.setDefaultView('modular'); }
function setWebAppDefaultViewSmoke() { return AETERLINK_API.setDefaultView('smoke'); }
