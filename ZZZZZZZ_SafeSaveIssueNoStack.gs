/**
 * AETERLINK Documentation Module — ZZZZZZZ_SafeSaveIssueNoStack.gs
 * Targeted endpoint for Save Draft / Issue / exact Form Record edit only.
 *
 * Scope:
 * - Save Document Form A4 records directly into FORM_RECORDS.
 * - Load exact record for edit by FormRecordId OR DocumentNo/DocumentCode/DocumentId.
 * - Keep issued DocumentNo unchanged when opening from Document Register.
 * - Keep Save Draft / Issue on a single no-stack path.
 * - Do not change document layout, EQC table, WCR table, print, photo report, or other modules.
 */

function apiSafeSaveIssueNoStackV1(payload) {
  payload = payload || {};
  var status = cleanSafeSave_(payload.Status || payload.DocumentStatus || (payload.Data && payload.Data.Status) || 'Draft');
  return isIssuedSafeStatus_(status) ? safeIssueNoStack_(payload) : safeDraftNoStack_(payload);
}

function apiGetFormRecordExactForEditV1(payload) {
  payload = payload || {};
  if (typeof payload === 'string') payload = { FormRecordId: payload };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss && ss.getSheetByName('FORM_RECORDS');
  if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
  ensureSafeSaveColumns_(sh, safeFormRecordColumns_());
  var headers = headersSafeSave_(sh);

  var formRecordId = cleanSafeSave_(payload.FormRecordId || payload.formRecordId || '');
  var refs = buildSafeEditRefs_(payload);
  var row = formRecordId ? findRowSafeSave_(sh, headers, 'FormRecordId', formRecordId) : -1;

  if (row < 1) {
    for (var i = 0; i < refs.length && row < 1; i++) row = findRowSafeSave_(sh, headers, 'DocumentNo', refs[i]);
  }
  if (row < 1) row = findBestSafeEditRow_(sh, headers, payload, refs);

  if (row < 1) throw new Error('Form Record not found for edit: ' + (formRecordId || refs.join(' / ') || '-'));

  var record = rowObjectSafeSave_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
  if (String(record.IsDeleted || '').toUpperCase() === 'TRUE') throw new Error('Form Record is deleted: ' + (record.FormRecordId || formRecordId));

  var data = parseSafeSaveJson_(record.DataJson);
  data.FormRecordId = record.FormRecordId || data.FormRecordId || formRecordId;
  data.ProjectCode = record.ProjectCode || data.ProjectCode || cleanSafeSave_(payload.ProjectCode || '');
  data.TemplateCode = canonicalSafeSave_(record.TemplateCode || data.TemplateCode || payload.TemplateCode || inferSafeTemplateFromRef_(payload) || 'PJ-WCR-001');
  data.DocumentNo = record.DocumentNo || data.DocumentNo || '';
  data.RevisionNo = normalizeRevisionSafeSave_(record.RevisionNo || record.Revision || data.RevisionNo || payload.RevisionNo || payload.Revision || 'R00');
  data.Status = record.Status || record.DocumentStatus || data.Status || 'Draft';
  data.Photos = normalizeSafePhotoRows_(data.Photos || data.PhotoRows || data.PhotoReportRows || []);
  data.PhotoRows = normalizeSafePhotoRows_(data.PhotoRows || data.Photos || data.PhotoReportRows || []);

  try { setRowValuesSafeSave_(sh, headers, row, { LockedAfterPdf: 'FALSE' }); } catch (editErr) {}
  record.LockedAfterPdf = 'FALSE';

  return { ok: true, row: row, record: record, data: data, exactEdit: true, resolvedBy: formRecordId ? 'FormRecordId' : 'DocumentNo' };
}

function safeDraftNoStack_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  var locked = false;
  lock.waitLock(30000);
  locked = true;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('FORM_RECORDS');
    if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
    ensureSafeSaveColumns_(sh, safeFormRecordColumns_());
    var headers = headersSafeSave_(sh);
    var nowIso = new Date().toISOString();
    var user = activeUserSafeSave_().email;
    var data = payload.Data || {};
    var formRecordId = cleanSafeSave_(payload.FormRecordId || data.FormRecordId || '') || idSafeSave_('FR');
    var templateCode = canonicalSafeSave_(payload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
    var projectCode = cleanSafeSave_(payload.ProjectCode || data.ProjectCode || 'TEST-PJ');
    var revisionNo = normalizeRevisionSafeSave_(payload.RevisionNo || data.RevisionNo || 'R00');
    var row = findRowSafeSave_(sh, headers, 'FormRecordId', formRecordId);
    var old = row > 0 ? rowObjectSafeSave_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]) : {};

    data.FormRecordId = formRecordId;
    data.TemplateCode = templateCode;
    data.ProjectCode = projectCode;
    data.DocumentNo = '';
    data.RevisionNo = revisionNo;
    data.Status = 'Draft';
    data.Photos = normalizeSafePhotoRows_(data.Photos || data.PhotoRows || []);
    data.PhotoRows = normalizeSafePhotoRows_(data.PhotoRows || data.Photos || []);

    var record = buildSafeFormRecord_({old: old, data: data, formRecordId: formRecordId, projectCode: projectCode, templateCode: templateCode, documentNo: '', revisionNo: revisionNo, status: 'Draft', user: user, nowIso: nowIso, payload: payload, pdfStatus: 'Draft'});
    var values = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
    if (row > 0) sh.getRange(row, 1, 1, headers.length).setValues([values]); else { sh.appendRow(values); row = sh.getLastRow(); }
    return { ok: true, action: old.FormRecordId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: row, record: record, numbering: 'SAFE_DRAFT_NO_STACK' };
  } finally { if (locked) lock.releaseLock(); }
}

function safeIssueNoStack_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  var locked = false;
  lock.waitLock(30000);
  locked = true;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('FORM_RECORDS');
    if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
    ensureSafeSaveColumns_(sh, safeFormRecordColumns_());
    var headers = headersSafeSave_(sh);
    var nowIso = new Date().toISOString();
    var user = activeUserSafeSave_().email;
    var data = payload.Data || {};
    var formRecordId = cleanSafeSave_(payload.FormRecordId || data.FormRecordId || '') || idSafeSave_('FR');
    var templateCode = canonicalSafeSave_(payload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
    var projectCode = cleanSafeSave_(payload.ProjectCode || data.ProjectCode || 'TEST-PJ');
    var revisionNo = normalizeRevisionSafeSave_(payload.RevisionNo || data.RevisionNo || 'R00');
    var row = findRowSafeSave_(sh, headers, 'FormRecordId', formRecordId);
    var old = row > 0 ? rowObjectSafeSave_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]) : {};
    var documentNo = cleanSafeSave_(payload.DocumentNo || data.DocumentNo || old.DocumentNo || '');
    documentNo = documentNo ? normalizeSafeDocumentNo_(documentNo, projectCode, templateCode, revisionNo) : createSafeDocumentNo_(sh, headers, projectCode, templateCode, revisionNo);

    data.FormRecordId = formRecordId;
    data.TemplateCode = templateCode;
    data.ProjectCode = projectCode;
    data.DocumentNo = documentNo;
    data.RevisionNo = revisionNo;
    data.Status = 'Issued';
    data.Photos = normalizeSafePhotoRows_(data.Photos || data.PhotoRows || []);
    data.PhotoRows = normalizeSafePhotoRows_(data.PhotoRows || data.Photos || []);

    var record = buildSafeFormRecord_({old: old, data: data, formRecordId: formRecordId, projectCode: projectCode, templateCode: templateCode, documentNo: documentNo, revisionNo: revisionNo, status: 'Issued', user: user, nowIso: nowIso, payload: payload, pdfStatus: 'Issued'});
    var values = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
    if (row > 0) sh.getRange(row, 1, 1, headers.length).setValues([values]); else { sh.appendRow(values); row = sh.getLastRow(); }

    var result = { ok: true, action: old.FormRecordId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: row, record: record, numbering: 'SAFE_ISSUE_DIRECT_NO_STACK' };

    // Release FORM_RECORDS lock before PDF export because Drive PDF save owns its own lock.
    // This prevents nested script-lock waits and keeps Issue/Send on a non-recursive path.
    lock.releaseLock();
    locked = false;

    var html = cleanSafeSave_(payload.Html || '');
    if (html && typeof AETERLINK_DRIVE_PDF !== 'undefined' && AETERLINK_DRIVE_PDF.saveIssuedPdf) {
      try {
        var pdf = AETERLINK_DRIVE_PDF.saveIssuedPdf({ProjectCode: projectCode, TemplateCode: templateCode, DocumentNo: documentNo, RevisionNo: revisionNo, FormRecordId: formRecordId, Html: html, Styles: cleanSafeSave_(payload.Styles || '')});
        result.pdf = pdf; result.pdfStatus = pdf.pdfStatus; result.fileUrl = pdf.fileUrl; result.folderUrl = pdf.folderUrl; result.folderPath = pdf.folderPath;
        if (pdf.record) result.record = pdf.record;
        try { markSafeEditableAfterPdf_(formRecordId, documentNo); } catch (markErr) {}
        if (result.record) result.record.LockedAfterPdf = 'FALSE';
      } catch (pdfErr) {
        result.pdfStatus = 'PDF_SAVE_FAILED_BUT_RECORD_ISSUED';
        result.pdfError = pdfErr && pdfErr.message ? pdfErr.message : String(pdfErr);
        try { updateSafeDocumentRegister_(projectCode, documentNo, templateCode, revisionNo, '', nowIso); } catch (e) {}
        try { markSafeEditableAfterPdf_(formRecordId, documentNo); } catch (markErr2) {}
      }
    } else {
      try { updateSafeDocumentRegister_(projectCode, documentNo, templateCode, revisionNo, '', nowIso); } catch (e) {}
      try { markSafeEditableAfterPdf_(formRecordId, documentNo); } catch (markErr3) {}
    }
    return result;
  } finally { if (locked) lock.releaseLock(); }
}

function buildSafeEditRefs_(payload) {
  var raw = [payload.DocumentNo, payload.DocumentCode, payload.DocumentId].map(cleanSafeSave_).filter(Boolean);
  var out = [];
  raw.forEach(function (x) {
    out.push(x);
    if (/^DR-/i.test(x)) out.push(x.replace(/^DR-/i, ''));
    out.push(x.replace(/-R\d{2}$/i, ''));
  });
  return uniqueSafeSave_(out);
}

function findBestSafeEditRow_(sheet, headers, payload, refs) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  var refMap = {};
  (refs || []).forEach(function (r) { refMap[cleanSafeSave_(r)] = true; refMap[cleanSafeSave_(r).replace(/-R\d{2}$/i, '')] = true; });
  var project = cleanSafeSave_(payload.ProjectCode || '');
  var template = canonicalSafeSave_(payload.TemplateCode || inferSafeTemplateFromRef_(payload) || '');
  var revision = normalizeRevisionSafeSave_(payload.RevisionNo || payload.Revision || '');
  var best = { row: -1, score: -1, updated: '' };
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    var o = rowObjectSafeSave_(headers, values[i]);
    if (String(o.IsDeleted || '').toUpperCase() === 'TRUE') continue;
    var data = parseSafeSaveJson_(o.DataJson);
    var doc = cleanSafeSave_(o.DocumentNo || data.DocumentNo || '');
    var baseDoc = doc.replace(/-R\d{2}$/i, '');
    var rowRev = normalizeRevisionSafeSave_(o.RevisionNo || o.Revision || data.RevisionNo || '');
    var score = 0;
    if (doc && refMap[doc]) score += 100;
    if (baseDoc && refMap[baseDoc]) score += 90;
    if (project && cleanSafeSave_(o.ProjectCode || data.ProjectCode) === project) score += 15;
    if (template && canonicalSafeSave_(o.TemplateCode || data.TemplateCode) === template) score += 15;
    if (revision && rowRev === revision) score += 12;
    if (score <= 0) continue;
    var updated = cleanSafeSave_(o.UpdatedAt || o.CreatedAt || '');
    if (score > best.score || (score === best.score && updated > best.updated)) best = { row: i + 2, score: score, updated: updated };
  }
  return best.row;
}

function updateSafeDocumentRegister_(projectCode, documentNo, templateCode, revisionNo, fileUrl, nowIso) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss && ss.getSheetByName('DOCUMENT_REGISTER');
  if (!sh) return null;
  ensureSafeSaveColumns_(sh, ['DocumentId','ProjectCode','DocumentCode','DocumentNo','DocumentTitle','TemplateCode','Revision','RevisionNo','Status','DocumentStatus','PdfUrl','FileUrl','UpdatedAt','UpdatedBy','IsDeleted']);
  var headers = headersSafeSave_(sh);
  var row = findRowSafeSave_(sh, headers, 'DocumentCode', documentNo);
  if (row < 1) row = findRowSafeSave_(sh, headers, 'DocumentNo', documentNo);
  var values = {DocumentId:'DR-' + documentNo, ProjectCode:projectCode, DocumentCode:documentNo, DocumentNo:documentNo, DocumentTitle:templateCode, TemplateCode:templateCode, Revision:revisionNo, RevisionNo:revisionNo, Status:'Issued / PDF Saved', DocumentStatus:'Issued / PDF Saved', PdfUrl:fileUrl || '', FileUrl:fileUrl || '', UpdatedAt:nowIso, UpdatedBy:activeUserSafeSave_().email, IsDeleted:'FALSE'};
  if (row > 0) { setRowValuesSafeSave_(sh, headers, row, values); return row; }
  sh.appendRow(headers.map(function (h) { return Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ''; }));
  return sh.getLastRow();
}

function markSafeEditableAfterPdf_(formRecordId, documentNo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss && ss.getSheetByName('FORM_RECORDS');
  if (!sh) return;
  ensureSafeSaveColumns_(sh, safeFormRecordColumns_());
  var headers = headersSafeSave_(sh);
  var row = formRecordId ? findRowSafeSave_(sh, headers, 'FormRecordId', formRecordId) : -1;
  if (row < 1 && documentNo) row = findRowSafeSave_(sh, headers, 'DocumentNo', documentNo);
  if (row > 0) setRowValuesSafeSave_(sh, headers, row, { LockedAfterPdf: 'FALSE' });
}

function safeFormRecordColumns_() { return ['FormRecordId','ProjectCode','TemplateCode','DocumentNo','RevisionNo','Status','DataJson','PdfUrl','SubmittedBy','SubmittedAt','ApprovedBy','ApprovedAt','CreatedAt','UpdatedAt','UpdatedBy','Revision','IsDeleted','RelatedTable','RelatedRecordId','DocumentStatus','LockedAfterPdf','WorkflowGateId','ReviewComment','IssueNo','RevisionReason','DriveFileId','DriveFolderUrl','PdfStatus','IssuedPdfFileName']; }

function buildSafeFormRecord_(o) {
  o = o || {}; var old = o.old || {}, payload = o.payload || {}, data = o.data || {};
  return {FormRecordId:o.formRecordId,ProjectCode:o.projectCode,TemplateCode:o.templateCode,DocumentNo:o.documentNo,RevisionNo:o.revisionNo,Status:o.status,DataJson:JSON.stringify(data),PdfUrl:old.PdfUrl||payload.PdfUrl||'',SubmittedBy:old.SubmittedBy||payload.SubmittedBy||o.user,SubmittedAt:o.status==='Issued'?(payload.SubmittedAt||old.SubmittedAt||o.nowIso):(old.SubmittedAt||''),ApprovedBy:old.ApprovedBy||payload.ApprovedBy||'',ApprovedAt:old.ApprovedAt||payload.ApprovedAt||'',CreatedAt:old.CreatedAt||payload.CreatedAt||o.nowIso,UpdatedAt:o.nowIso,UpdatedBy:o.user,Revision:o.revisionNo,IsDeleted:'FALSE',RelatedTable:payload.RelatedTable||old.RelatedTable||'',RelatedRecordId:payload.RelatedRecordId||old.RelatedRecordId||'',DocumentStatus:o.status,LockedAfterPdf:'FALSE',WorkflowGateId:payload.WorkflowGateId||old.WorkflowGateId||'',ReviewComment:payload.ReviewComment||old.ReviewComment||'',IssueNo:extractSafeIssueNo_(o.documentNo)||old.IssueNo||'XXX',RevisionReason:payload.RevisionReason||old.RevisionReason||'',DriveFileId:old.DriveFileId||'',DriveFolderUrl:old.DriveFolderUrl||'',PdfStatus:o.pdfStatus||o.status,IssuedPdfFileName:old.IssuedPdfFileName||''};
}

function createSafeDocumentNo_(sheet, headers, projectCode, templateCode, revisionNo) {
  var prefix = cleanSafeSave_(projectCode || 'TEST-PJ') + '-' + safePrefix_(templateCode) + '-';
  var max = 0;
  if (sheet && sheet.getLastRow() >= 2) {
    var docCol = headers.indexOf('DocumentNo') + 1, projectCol = headers.indexOf('ProjectCode') + 1, templateCol = headers.indexOf('TemplateCode') + 1;
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues().forEach(function (r) {
      var doc = cleanSafeSave_(docCol ? r[docCol - 1] : '');
      var prj = cleanSafeSave_(projectCol ? r[projectCol - 1] : '');
      var tpl = canonicalSafeSave_(templateCol ? r[templateCol - 1] : '');
      if (prj !== cleanSafeSave_(projectCode) && doc.indexOf(prefix) !== 0) return;
      if (tpl !== canonicalSafeSave_(templateCode) && doc.indexOf(prefix) !== 0) return;
      var n = parseInt(extractSafeIssueNo_(doc) || '0', 10);
      if (!isNaN(n) && n > max) max = n;
    });
  }
  return applySafeRevision_(prefix + ('000' + (max + 1)).slice(-3), revisionNo);
}

function normalizeSafeDocumentNo_(documentNo, projectCode, templateCode, revisionNo) { var issue = extractSafeIssueNo_(documentNo); var base = issue ? cleanSafeSave_(projectCode || 'TEST-PJ') + '-' + safePrefix_(templateCode) + '-' + issue : cleanSafeSave_(documentNo).replace(/-R\d{2}$/i, ''); return applySafeRevision_(base, revisionNo); }
function safePrefix_(templateCode) { var code = canonicalSafeSave_(templateCode); if (code === 'PJ-WCR-001') return 'PJ-WCR'; if (code === 'PJ-EQC-001') return 'PJ-EQC'; var m = code.match(/PJ-([A-Z0-9]+)-?([A-Z0-9]*)/); return m ? 'PJ-' + (m[1] || 'DOC') : 'PJ-DOC'; }
function extractSafeIssueNo_(documentNo) { var m = cleanSafeSave_(documentNo).replace(/-R\d{2}$/i, '').match(/-(\d{3,4})$/); return m ? ('000' + parseInt(m[1], 10)).slice(-3) : ''; }
function applySafeRevision_(baseDocumentNo, revisionNo) { var rev = normalizeRevisionSafeSave_(revisionNo); return rev && rev !== 'R00' ? cleanSafeSave_(baseDocumentNo).replace(/-R\d{2}$/i, '') + '-' + rev : cleanSafeSave_(baseDocumentNo).replace(/-R\d{2}$/i, ''); }
function inferSafeTemplateFromRef_(payload) { var s = cleanSafeSave_([payload.DocumentNo,payload.DocumentCode,payload.DocumentId,payload.DocumentTitle].join(' ')).toUpperCase(); if (s.indexOf('PJ-WCR') >= 0) return 'PJ-WCR-001'; if (s.indexOf('PJ-EQC') >= 0) return 'PJ-EQC-001'; return ''; }
function isIssuedSafeStatus_(status) { var s = cleanSafeSave_(status).toUpperCase(); return s === 'ISSUED' || s.indexOf('ISSUED') >= 0 || s.indexOf('PDF') >= 0 || s.indexOf('APPROVED') >= 0; }
function normalizeSafePhotoRows_(rows) { return Array.isArray(rows) ? rows : []; }
function uniqueSafeSave_(arr) { var seen = {}, out = []; (arr || []).forEach(function (x) { x = cleanSafeSave_(x); if (x && !seen[x]) { seen[x] = true; out.push(x); } }); return out; }
function ensureSafeSaveColumns_(sheet, names) { var headers = headersSafeSave_(sheet); names.forEach(function (name) { if (headers.indexOf(name) < 0) { sheet.getRange(1, headers.length + 1).setValue(name); headers.push(name); } }); }
function headersSafeSave_(sheet) { return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(cleanSafeSave_); }
function rowObjectSafeSave_(headers, row) { var o = {}; headers.forEach(function (h, i) { if (h) o[h] = row[i]; }); return o; }
function findRowSafeSave_(sheet, headers, key, value) { value = cleanSafeSave_(value); var col = headers.indexOf(key) + 1; if (col < 1 || !value || sheet.getLastRow() < 2) return -1; var vals = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues(); for (var i = 0; i < vals.length; i++) if (cleanSafeSave_(vals[i][0]) === value) return i + 2; return -1; }
function setRowValuesSafeSave_(sheet, headers, row, values) { Object.keys(values || {}).forEach(function (k) { var c = headers.indexOf(k) + 1; if (c > 0) sheet.getRange(row, c).setValue(values[k]); }); }
function parseSafeSaveJson_(s) { try { return s ? JSON.parse(s) : {}; } catch (err) { return {}; } }
function cleanSafeSave_(v) { return String(v == null ? '' : v).trim(); }
function normalizeRevisionSafeSave_(v) { v = cleanSafeSave_(v).toUpperCase(); if (!v || v === '0') return 'R00'; var n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? v : 'R' + ('00' + n).slice(-2); }
function canonicalSafeSave_(code) { code = cleanSafeSave_(code).toUpperCase(); if (code === 'PJ-WORK-COMPLETE-001' || code === 'PJ-WORK-COMPLETE') return 'PJ-WCR-001'; return code || 'PJ-WCR-001'; }
function idSafeSave_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000); }
function activeUserSafeSave_() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) {} return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }

(function installFinalNoStackCompatibility_() {
  function routeSave(payload) { return apiSafeSaveIssueNoStackV1(payload || {}); }
  function routeEdit(payload) { return apiGetFormRecordExactForEditV1(payload || {}); }
  try {
    if (typeof AETERLINK_DRAFT_ISSUE_EDIT_API !== 'undefined' && AETERLINK_DRAFT_ISSUE_EDIT_API) {
      AETERLINK_DRAFT_ISSUE_EDIT_API.save = routeSave;
      AETERLINK_DRAFT_ISSUE_EDIT_API.getRecord = routeEdit;
      AETERLINK_DRAFT_ISSUE_EDIT_API.__noStackFinalGuard = true;
    }
  } catch (err) {}
  try {
    if (typeof AETERLINK_SAVE_ISSUE_EDIT_FIX !== 'undefined' && AETERLINK_SAVE_ISSUE_EDIT_FIX) {
      AETERLINK_SAVE_ISSUE_EDIT_FIX.save = routeSave;
      AETERLINK_SAVE_ISSUE_EDIT_FIX.getRecord = routeEdit;
      AETERLINK_SAVE_ISSUE_EDIT_FIX.__noStackFinalGuard = true;
    }
  } catch (err2) {}
})();

function apiSaveIssueNoStackHealthV1() {
  return {
    ok: true,
    route: 'apiSafeSaveIssueNoStackV1',
    draftIssueApiPatched: typeof AETERLINK_DRAFT_ISSUE_EDIT_API !== 'undefined' && !!AETERLINK_DRAFT_ISSUE_EDIT_API.__noStackFinalGuard,
    saveIssueFixPatched: typeof AETERLINK_SAVE_ISSUE_EDIT_FIX !== 'undefined' && !!AETERLINK_SAVE_ISSUE_EDIT_FIX.__noStackFinalGuard
  };
}
