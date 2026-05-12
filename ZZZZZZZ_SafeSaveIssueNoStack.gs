/**
 * AETERLINK Documentation Module — ZZZZZZZ_SafeSaveIssueNoStack.gs
 * Targeted endpoint for Save Draft / Issue / Form Record exact edit only.
 *
 * Scope:
 * - Avoid Maximum call stack size exceeded caused by legacy duplicate save wrappers.
 * - Save Document Form A4 records directly into FORM_RECORDS.
 * - Provide exact Form Record edit loader by FormRecordId.
 * - Do not change document layout, EQC table, WCR table, print, photo report, or other modules.
 */

function apiSafeSaveIssueNoStackV1(payload) {
  payload = payload || {};
  var status = cleanSafeSave_(payload.Status || payload.DocumentStatus || (payload.Data && payload.Data.Status) || 'Draft');
  if (status.toUpperCase() === 'ISSUED') return safeIssueNoStack_(payload);
  return safeDraftNoStack_(payload);
}

function apiGetFormRecordExactForEditV1(payload) {
  payload = payload || {};
  if (typeof payload === 'string') payload = { FormRecordId: payload };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss && ss.getSheetByName('FORM_RECORDS');
  if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
  var headers = headersSafeSave_(sh);
  var formRecordId = cleanSafeSave_(payload.FormRecordId || payload.formRecordId || '');
  if (!formRecordId) throw new Error('Missing FormRecordId for Form Record edit');
  var row = findRowSafeSave_(sh, headers, 'FormRecordId', formRecordId);
  if (row < 1) throw new Error('Form Record not found: ' + formRecordId);
  var record = rowObjectSafeSave_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
  if (String(record.IsDeleted || '').toUpperCase() === 'TRUE') throw new Error('Form Record is deleted: ' + formRecordId);
  var data = parseSafeSaveJson_(record.DataJson);
  data.FormRecordId = record.FormRecordId || data.FormRecordId || formRecordId;
  data.ProjectCode = record.ProjectCode || data.ProjectCode || '';
  data.TemplateCode = canonicalSafeSave_(record.TemplateCode || data.TemplateCode || payload.TemplateCode || 'PJ-WCR-001');
  data.DocumentNo = record.DocumentNo || data.DocumentNo || '';
  data.RevisionNo = normalizeRevisionSafeSave_(record.RevisionNo || record.Revision || data.RevisionNo || 'R00');
  data.Status = record.Status || record.DocumentStatus || data.Status || 'Draft';
  return { ok: true, row: row, record: record, data: data, exactEdit: true };
}

function safeDraftNoStack_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('FORM_RECORDS');
    if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
    var columns = safeFormRecordColumns_();
    ensureSafeSaveColumns_(sh, columns);
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

    data.TemplateCode = templateCode;
    data.ProjectCode = projectCode;
    data.DocumentNo = '';
    data.RevisionNo = revisionNo;
    data.Status = 'Draft';
    data.FormRecordId = formRecordId;

    var record = buildSafeFormRecord_({
      old: old,
      data: data,
      formRecordId: formRecordId,
      projectCode: projectCode,
      templateCode: templateCode,
      documentNo: '',
      revisionNo: revisionNo,
      status: 'Draft',
      user: user,
      nowIso: nowIso,
      payload: payload,
      pdfStatus: 'Draft'
    });

    var values = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
    if (row > 0) sh.getRange(row, 1, 1, headers.length).setValues([values]);
    else { sh.appendRow(values); row = sh.getLastRow(); }
    return { ok: true, action: row > 0 && old.FormRecordId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: row, record: record, numbering: 'SAFE_DRAFT_NO_STACK' };
  } finally {
    lock.releaseLock();
  }
}

function safeIssueNoStack_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
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
    if (!documentNo) documentNo = createSafeDocumentNo_(sh, headers, projectCode, templateCode, revisionNo);
    else documentNo = normalizeSafeDocumentNo_(documentNo, projectCode, templateCode, revisionNo);

    data.TemplateCode = templateCode;
    data.ProjectCode = projectCode;
    data.DocumentNo = documentNo;
    data.RevisionNo = revisionNo;
    data.Status = 'Issued';
    data.FormRecordId = formRecordId;

    var record = buildSafeFormRecord_({
      old: old,
      data: data,
      formRecordId: formRecordId,
      projectCode: projectCode,
      templateCode: templateCode,
      documentNo: documentNo,
      revisionNo: revisionNo,
      status: 'Issued',
      user: user,
      nowIso: nowIso,
      payload: payload,
      pdfStatus: 'Issued'
    });

    var values = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
    if (row > 0) sh.getRange(row, 1, 1, headers.length).setValues([values]);
    else { sh.appendRow(values); row = sh.getLastRow(); }

    var result = { ok: true, action: row > 0 && old.FormRecordId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: row, record: record, numbering: 'SAFE_ISSUE_DIRECT_NO_STACK' };

    var html = cleanSafeSave_(payload.Html || '');
    if (html && typeof AETERLINK_DRIVE_PDF !== 'undefined' && AETERLINK_DRIVE_PDF.saveIssuedPdf) {
      try {
        var pdf = AETERLINK_DRIVE_PDF.saveIssuedPdf({
          ProjectCode: projectCode,
          TemplateCode: templateCode,
          DocumentNo: documentNo,
          RevisionNo: revisionNo,
          FormRecordId: formRecordId,
          Html: html,
          Styles: cleanSafeSave_(payload.Styles || '')
        });
        result.pdf = pdf;
        result.pdfStatus = pdf.pdfStatus;
        result.fileUrl = pdf.fileUrl;
        result.folderUrl = pdf.folderUrl;
        result.folderPath = pdf.folderPath;
        if (pdf.record) result.record = pdf.record;
      } catch (pdfErr) {
        result.pdfStatus = 'PDF_SAVE_FAILED_BUT_RECORD_ISSUED';
        result.pdfError = pdfErr && pdfErr.message ? pdfErr.message : String(pdfErr);
      }
    }
    return result;
  } finally {
    lock.releaseLock();
  }
}

function safeFormRecordColumns_() {
  return ['FormRecordId','ProjectCode','TemplateCode','DocumentNo','RevisionNo','Status','DataJson','PdfUrl','SubmittedBy','SubmittedAt','ApprovedBy','ApprovedAt','CreatedAt','UpdatedAt','UpdatedBy','Revision','IsDeleted','RelatedTable','RelatedRecordId','DocumentStatus','LockedAfterPdf','WorkflowGateId','ReviewComment','IssueNo','RevisionReason','DriveFileId','DriveFolderUrl','PdfStatus','IssuedPdfFileName'];
}

function buildSafeFormRecord_(o) {
  o = o || {};
  var old = o.old || {}, payload = o.payload || {}, data = o.data || {};
  return {
    FormRecordId: o.formRecordId,
    ProjectCode: o.projectCode,
    TemplateCode: o.templateCode,
    DocumentNo: o.documentNo,
    RevisionNo: o.revisionNo,
    Status: o.status,
    DataJson: JSON.stringify(data),
    PdfUrl: old.PdfUrl || payload.PdfUrl || '',
    SubmittedBy: old.SubmittedBy || payload.SubmittedBy || o.user,
    SubmittedAt: o.status === 'Issued' ? (payload.SubmittedAt || old.SubmittedAt || o.nowIso) : (old.SubmittedAt || ''),
    ApprovedBy: old.ApprovedBy || payload.ApprovedBy || '',
    ApprovedAt: old.ApprovedAt || payload.ApprovedAt || '',
    CreatedAt: old.CreatedAt || payload.CreatedAt || o.nowIso,
    UpdatedAt: o.nowIso,
    UpdatedBy: o.user,
    Revision: o.revisionNo,
    IsDeleted: 'FALSE',
    RelatedTable: payload.RelatedTable || old.RelatedTable || '',
    RelatedRecordId: payload.RelatedRecordId || old.RelatedRecordId || '',
    DocumentStatus: o.status,
    LockedAfterPdf: 'FALSE',
    WorkflowGateId: payload.WorkflowGateId || old.WorkflowGateId || '',
    ReviewComment: payload.ReviewComment || old.ReviewComment || '',
    IssueNo: extractSafeIssueNo_(o.documentNo) || old.IssueNo || 'XXX',
    RevisionReason: payload.RevisionReason || old.RevisionReason || '',
    DriveFileId: old.DriveFileId || '',
    DriveFolderUrl: old.DriveFolderUrl || '',
    PdfStatus: o.pdfStatus || o.status,
    IssuedPdfFileName: old.IssuedPdfFileName || ''
  };
}

function createSafeDocumentNo_(sheet, headers, projectCode, templateCode, revisionNo) {
  var prefix = cleanSafeSave_(projectCode || 'TEST-PJ') + '-' + safePrefix_(templateCode) + '-';
  var max = 0;
  if (sheet && sheet.getLastRow() >= 2) {
    var docCol = headers.indexOf('DocumentNo') + 1;
    var projectCol = headers.indexOf('ProjectCode') + 1;
    var templateCol = headers.indexOf('TemplateCode') + 1;
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
    rows.forEach(function (r) {
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

function normalizeSafeDocumentNo_(documentNo, projectCode, templateCode, revisionNo) {
  var issue = extractSafeIssueNo_(documentNo);
  var base = issue ? cleanSafeSave_(projectCode || 'TEST-PJ') + '-' + safePrefix_(templateCode) + '-' + issue : cleanSafeSave_(documentNo).replace(/-R\d{2}$/i, '');
  return applySafeRevision_(base, revisionNo);
}

function safePrefix_(templateCode) {
  var code = canonicalSafeSave_(templateCode);
  if (code === 'PJ-WCR-001') return 'PJ-WCR';
  if (code === 'PJ-EQC-001') return 'PJ-EQC';
  var m = code.match(/PJ-([A-Z0-9]+)-?([A-Z0-9]*)/);
  return m ? 'PJ-' + (m[1] || 'DOC') : 'PJ-DOC';
}
function extractSafeIssueNo_(documentNo) { var m = cleanSafeSave_(documentNo).replace(/-R\d{2}$/i, '').match(/-(\d{3,4})$/); return m ? ('000' + parseInt(m[1], 10)).slice(-3) : ''; }
function applySafeRevision_(baseDocumentNo, revisionNo) { var rev = normalizeRevisionSafeSave_(revisionNo); return rev && rev !== 'R00' ? cleanSafeSave_(baseDocumentNo).replace(/-R\d{2}$/i, '') + '-' + rev : cleanSafeSave_(baseDocumentNo).replace(/-R\d{2}$/i, ''); }

function ensureSafeSaveColumns_(sheet, names) {
  var headers = headersSafeSave_(sheet);
  names.forEach(function (name) {
    if (headers.indexOf(name) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(name);
      headers.push(name);
    }
  });
}
function headersSafeSave_(sheet) { return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(cleanSafeSave_); }
function rowObjectSafeSave_(headers, row) { var o = {}; headers.forEach(function (h, i) { if (h) o[h] = row[i]; }); return o; }
function findRowSafeSave_(sheet, headers, key, value) {
  value = cleanSafeSave_(value);
  var col = headers.indexOf(key) + 1;
  if (col < 1 || !value || sheet.getLastRow() < 2) return -1;
  var vals = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++) if (cleanSafeSave_(vals[i][0]) === value) return i + 2;
  return -1;
}
function parseSafeSaveJson_(s) { try { return s ? JSON.parse(s) : {}; } catch (err) { return {}; } }
function cleanSafeSave_(v) { return String(v == null ? '' : v).trim(); }
function normalizeRevisionSafeSave_(v) { v = cleanSafeSave_(v).toUpperCase(); if (!v || v === '0') return 'R00'; var n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? v : 'R' + ('00' + n).slice(-2); }
function canonicalSafeSave_(code) { code = cleanSafeSave_(code).toUpperCase(); if (code === 'PJ-WORK-COMPLETE-001' || code === 'PJ-WORK-COMPLETE') return 'PJ-WCR-001'; return code || 'PJ-WCR-001'; }
function idSafeSave_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000); }
function activeUserSafeSave_() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) {} return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }
