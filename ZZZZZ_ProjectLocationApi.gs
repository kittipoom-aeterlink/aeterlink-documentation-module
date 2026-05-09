/**
 * AETERLINK Documentation Module — ZZZZZ_ProjectLocationApi.gs
 * Adds ProjectLocation as a first-class project field and keeps project data linked to A4 documents.
 */

var AETERLINK_PROJECT_LOCATION_API = (function () {
  var PROJECT_TABLE = 'PROJECTS';
  var PROJECT_COLUMNS = [
    'ProjectCode', 'ProjectName', 'ProjectLocation', 'Client', 'MainContractor', 'ProjectManager',
    'CurrentPhase', 'ProgressPct', 'Status', 'StartDate', 'FinishDate',
    'SiteLocation', 'Description', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'IsDeleted'
  ];
  var DOCUMENT_COLUMNS = ['ProjectName', 'ProjectLocation', 'SiteLocation', 'Client', 'MainContractor', 'ProjectManager', 'CurrentPhase'];

  function listProjects() {
    var sh = ensureProjectSheet();
    var rows = readRows_(sh).map(normalizeProject_);
    backfillLocationIfNeeded_(sh, rows);
    rows = readRows_(sh).map(normalizeProject_);
    return { ok: true, tableName: PROJECT_TABLE, rows: rows, count: rows.length, serverTime: new Date().toISOString() };
  }

  function getProject(projectCode) {
    projectCode = clean_(projectCode);
    var rows = listProjects().rows;
    var project = rows.filter(function (p) { return clean_(p.ProjectCode) === projectCode; })[0] || null;
    return { ok: !!project, project: project, serverTime: new Date().toISOString() };
  }

  function saveProject(payload) {
    payload = payload || {};
    if (payload.confirmed !== true || clean_(payload.confirmText).toUpperCase() !== 'CONFIRM') {
      throw new Error('Project update requires confirmation. Please tick confirm and type CONFIRM.');
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var sh = ensureProjectSheet();
      var headers = headers_(sh);
      var now = new Date().toISOString();
      var user = activeUser_().email;
      var project = normalizeProject_(payload.project || payload);
      var originalCode = clean_(payload.originalProjectCode || payload.OriginalProjectCode || project.OriginalProjectCode || project.ProjectCode);
      if (!project.ProjectCode) throw new Error('ProjectCode is required.');
      if (!project.ProjectName) throw new Error('ProjectName is required.');
      project.ProjectLocation = project.ProjectLocation || project.SiteLocation || '';
      project.SiteLocation = project.SiteLocation || project.ProjectLocation || '';
      project.Status = project.Status || 'Active';
      project.UpdatedAt = now;
      project.UpdatedBy = user;
      project.IsDeleted = project.IsDeleted || 'FALSE';

      var originalRow = originalCode ? findRow_(sh, headers, 'ProjectCode', originalCode) : -1;
      var targetRow = findRow_(sh, headers, 'ProjectCode', project.ProjectCode);
      if (originalRow > 0 && targetRow > 0 && originalRow !== targetRow) {
        throw new Error('Cannot change ProjectCode to "' + project.ProjectCode + '" because this ProjectCode already exists.');
      }
      var row = originalRow > 0 ? originalRow : targetRow;
      var action = row > 0 ? (originalCode && originalCode !== project.ProjectCode ? 'renamed' : 'saved') : 'created';
      if (row < 0) {
        project.CreatedAt = now;
        project.CreatedBy = user;
        sh.appendRow(headers.map(function (h) { return Object.prototype.hasOwnProperty.call(project, h) ? project[h] : ''; }));
        row = sh.getLastRow();
      } else {
        var old = rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
        project.CreatedAt = old.CreatedAt || project.CreatedAt || now;
        project.CreatedBy = old.CreatedBy || project.CreatedBy || user;
        headers.forEach(function (h, i) {
          if (Object.prototype.hasOwnProperty.call(project, h)) sh.getRange(row, i + 1).setValue(project[h]);
        });
      }
      var saved = normalizeProject_(rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]));
      var sync = syncProjectToDocuments_(saved, originalCode);
      return { ok: true, action: action, originalProjectCode: originalCode, project: saved, sync: sync, serverTime: now };
    } finally {
      lock.releaseLock();
    }
  }

  function syncProjectToDocuments(project) {
    project = normalizeProject_(project || {});
    if (!project.ProjectCode) throw new Error('ProjectCode is required for sync.');
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return { ok: true, projectCode: project.ProjectCode, sync: syncProjectToDocuments_(project, project.ProjectCode), serverTime: new Date().toISOString() };
    } finally {
      lock.releaseLock();
    }
  }

  function syncProjectToDocuments_(project, originalCode) {
    var out = { formRecordsUpdated: 0, documentRegisterUpdated: 0, projectCodeRenamedFrom: originalCode || project.ProjectCode };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return out;
    var form = ss.getSheetByName('FORM_RECORDS');
    if (form) out.formRecordsUpdated = syncSheet_(form, project, originalCode, true);
    var reg = ss.getSheetByName('DOCUMENT_REGISTER');
    if (reg) out.documentRegisterUpdated = syncSheet_(reg, project, originalCode, false);
    return out;
  }

  function syncSheet_(sheet, project, originalCode, hasDataJson) {
    ensureColumns_(sheet, DOCUMENT_COLUMNS);
    var headers = headers_(sheet);
    if (!headers.length || sheet.getLastRow() < 2) return 0;
    var projectCol = headers.indexOf('ProjectCode') + 1;
    if (projectCol < 1) return 0;
    var dataCol = hasDataJson ? headers.indexOf('DataJson') + 1 : 0;
    var oldCode = clean_(originalCode || project.ProjectCode);
    var newCode = clean_(project.ProjectCode);
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
    var changed = 0;
    for (var r = 0; r < values.length; r++) {
      var rowCode = clean_(values[r][projectCol - 1]);
      if (rowCode !== oldCode && rowCode !== newCode) continue;
      var dirty = false;
      if (rowCode !== newCode) { values[r][projectCol - 1] = newCode; dirty = true; }
      DOCUMENT_COLUMNS.forEach(function (key) {
        var col = headers.indexOf(key);
        if (col >= 0 && values[r][col] !== (project[key] || '')) { values[r][col] = project[key] || ''; dirty = true; }
      });
      if (dataCol > 0 && values[r][dataCol - 1]) {
        try {
          var json = JSON.parse(values[r][dataCol - 1]);
          ['ProjectCode','ProjectName','ProjectLocation','SiteLocation','Client','MainContractor','ProjectManager','CurrentPhase'].forEach(function (key) {
            var next = key === 'ProjectCode' ? newCode : (project[key] || '');
            if (json[key] !== next) { json[key] = next; dirty = true; }
          });
          if (dirty) values[r][dataCol - 1] = JSON.stringify(json);
        } catch (err) {}
      }
      if (dirty) changed++;
    }
    if (changed) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    return changed;
  }

  function ensureProjectSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('No active spreadsheet');
    var sh = ss.getSheetByName(PROJECT_TABLE);
    if (!sh) {
      sh = ss.insertSheet(PROJECT_TABLE);
      sh.getRange(1, 1, 1, PROJECT_COLUMNS.length).setValues([PROJECT_COLUMNS]).setFontWeight('bold');
      sh.setFrozenRows(1);
      return sh;
    }
    ensureColumns_(sh, PROJECT_COLUMNS);
    return sh;
  }

  function backfillLocationIfNeeded_(sheet, rows) {
    if (!rows || !rows.length) return;
    var headers = headers_(sheet);
    var locCol = headers.indexOf('ProjectLocation') + 1;
    var siteCol = headers.indexOf('SiteLocation') + 1;
    if (locCol < 1 || siteCol < 1 || sheet.getLastRow() < 2) return;
    var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length);
    var values = range.getDisplayValues();
    var changed = false;
    values.forEach(function (row) {
      if (!row[locCol - 1] && row[siteCol - 1]) { row[locCol - 1] = row[siteCol - 1]; changed = true; }
      if (!row[siteCol - 1] && row[locCol - 1]) { row[siteCol - 1] = row[locCol - 1]; changed = true; }
    });
    if (changed) range.setValues(values);
  }

  function normalizeProject_(p) {
    p = p || {};
    var location = clean_(p.ProjectLocation || p.projectLocation || p.SiteLocation || p.siteLocation || p.Location || p.location || p.ProjectSite || p.ProjectNameSite);
    return {
      ProjectCode: clean_(p.ProjectCode || p.projectCode),
      ProjectName: clean_(p.ProjectName || p.projectName),
      ProjectLocation: location,
      Client: clean_(p.Client || p.client),
      MainContractor: clean_(p.MainContractor || p.Main_Contractor || p['Main-Contractor'] || p.mainContractor),
      ProjectManager: clean_(p.ProjectManager || p.projectManager),
      CurrentPhase: clean_(p.CurrentPhase || p.currentPhase),
      ProgressPct: clean_(p.ProgressPct || p.Progress || p.progressPct),
      Status: clean_(p.Status || p.status || 'Active'),
      StartDate: clean_(p.StartDate || p.startDate),
      FinishDate: clean_(p.FinishDate || p.finishDate),
      SiteLocation: location,
      Description: clean_(p.Description || p.description),
      CreatedAt: clean_(p.CreatedAt),
      CreatedBy: clean_(p.CreatedBy),
      UpdatedAt: clean_(p.UpdatedAt),
      UpdatedBy: clean_(p.UpdatedBy),
      IsDeleted: clean_(p.IsDeleted || 'FALSE')
    };
  }

  function readRows_(sheet) {
    var values = sheet.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return [];
    var headers = values[0].map(function (h) { return clean_(h); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var obj = {}, has = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        obj[headers[c]] = values[r][c];
        if (values[r][c] !== '') has = true;
      }
      if (has && String(obj.IsDeleted || '').toUpperCase() !== 'TRUE') rows.push(obj);
    }
    return rows;
  }

  function ensureColumns_(sheet, names) {
    var headers = headers_(sheet);
    if (!headers.length) {
      sheet.getRange(1, 1, 1, names.length).setValues([names]).setFontWeight('bold');
      try { sheet.setFrozenRows(1); } catch (err) {}
      return;
    }
    var changed = false;
    names.forEach(function (name) {
      if (headers.indexOf(name) < 0) {
        sheet.getRange(1, headers.length + 1).setValue(name);
        headers.push(name);
        changed = true;
      }
    });
    if (changed) {
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      try { sheet.setFrozenRows(1); } catch (err) {}
    }
  }

  function headers_(sheet) {
    return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (h) { return clean_(h); });
  }

  function findRow_(sheet, headers, key, value) {
    var col = headers.indexOf(key) + 1;
    if (col < 1 || !value || sheet.getLastRow() < 2) return -1;
    var values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (var i = 0; i < values.length; i++) if (clean_(values[i][0]) === clean_(value)) return i + 2;
    return -1;
  }

  function rowObject_(headers, row) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = row[i]; });
    return obj;
  }

  function activeUser_() {
    var email = '';
    try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) { email = ''; }
    return { email: email, displayName: email ? email.split('@')[0] : 'User' };
  }
  function clean_(v) { return String(v == null ? '' : v).trim(); }

  return { listProjects: listProjects, getProject: getProject, saveProject: saveProject, syncProjectToDocuments: syncProjectToDocuments, ensureProjectSheet: ensureProjectSheet };
})();

function apiProjectsV2() { return AETERLINK_PROJECT_LOCATION_API.listProjects(); }
function apiGetProjectV2(projectCode) { return AETERLINK_PROJECT_LOCATION_API.getProject(projectCode); }
function apiSaveProjectDetailV2(payload) { return AETERLINK_PROJECT_LOCATION_API.saveProject(payload); }
function apiSyncProjectToDocumentsV2(project) { return AETERLINK_PROJECT_LOCATION_API.syncProjectToDocuments(project); }
function apiEnsureProjectDetailSheetV2() { AETERLINK_PROJECT_LOCATION_API.ensureProjectSheet(); return { ok: true, message: 'PROJECTS sheet is ready with ProjectLocation.' }; }
