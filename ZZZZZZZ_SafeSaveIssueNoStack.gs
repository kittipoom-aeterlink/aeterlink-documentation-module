/**
 * AETERLINK Documentation Module — ZZZZZZZ_SafeSaveIssueNoStack.gs
 * Targeted endpoint for Save Draft / Issue only.
 *
 * Purpose:
 * - Avoid Maximum call stack size exceeded caused by legacy duplicate apiModularSaveFormRecord* wrappers.
 * - Use a unique API name and do not call AETERLINK_DRAFT_ISSUE_EDIT_API.save() from here.
 * - Do not change document layout, EQC table, print, photo report, row controls, or other modules.
 */

function apiSafeSaveIssueNoStackV1(payload) {
  payload = payload || {};
  var status = cleanSafeSave_(payload.Status || payload.DocumentStatus || (payload.Data && payload.Data.Status) || 'Draft');
  if (status.toUpperCase() === 'ISSUED') return safeIssueNoStack_(payload);
  return safeDraftNoStack_(payload);
}

function safeDraftNoStack_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('FORM_RECORDS');
    if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
    var columns = [
      'FormRecordId','ProjectCode','TemplateCode','DocumentNo','RevisionNo','Status','DataJson','PdfUrl','SubmittedBy','SubmittedAt','ApprovedBy','ApprovedAt','CreatedAt','UpdatedAt','UpdatedBy','Revision','IsDeleted','RelatedTable','RelatedRecordId','DocumentStatus','LockedAfterPdf','WorkflowGateId','ReviewComment','IssueNo','RevisionReason','DriveFileId','DriveFolderUrl','PdfStatus','IssuedPdfFileName'
    ];
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

    var record = {
      FormRecordId: formRecordId,
      ProjectCode: projectCode,
      TemplateCode: templateCode,
      DocumentNo: '',
      RevisionNo: revisionNo,
      Status: 'Draft',
      DataJson: JSON.stringify(data),
      PdfUrl: old.PdfUrl || '',
      SubmittedBy: old.SubmittedBy || user,
      SubmittedAt: old.SubmittedAt || '',
      ApprovedBy: old.ApprovedBy || '',
      ApprovedAt: old.ApprovedAt || '',
      CreatedAt: old.CreatedAt || nowIso,
      UpdatedAt: nowIso,
      UpdatedBy: user,
      Revision: revisionNo,
      IsDeleted: 'FALSE',
      RelatedTable: payload.RelatedTable || old.RelatedTable || '',
      RelatedRecordId: payload.RelatedRecordId || old.RelatedRecordId || '',
      DocumentStatus: 'Draft',
      LockedAfterPdf: 'FALSE',
      WorkflowGateId: payload.WorkflowGateId || old.WorkflowGateId || '',
      ReviewComment: payload.ReviewComment || old.ReviewComment || '',
      IssueNo: old.IssueNo || 'XXX',
      RevisionReason: payload.RevisionReason || old.RevisionReason || '',
      DriveFileId: old.DriveFileId || '',
      DriveFolderUrl: old.DriveFolderUrl || '',
      PdfStatus: 'Draft',
      IssuedPdfFileName: old.IssuedPdfFileName || ''
    };

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
  var data = payload.Data || {};
  var issuedPayload = JSON.parse(JSON.stringify(payload));
  issuedPayload.Status = 'Issued';
  issuedPayload.DocumentStatus = 'Issued';
  issuedPayload.TemplateCode = canonicalSafeSave_(issuedPayload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
  issuedPayload.ProjectCode = cleanSafeSave_(issuedPayload.ProjectCode || data.ProjectCode || 'TEST-PJ');
  issuedPayload.RevisionNo = normalizeRevisionSafeSave_(issuedPayload.RevisionNo || data.RevisionNo || 'R00');
  issuedPayload.Data = issuedPayload.Data || data;
  issuedPayload.Data.TemplateCode = issuedPayload.TemplateCode;
  issuedPayload.Data.ProjectCode = issuedPayload.ProjectCode;
  issuedPayload.Data.RevisionNo = issuedPayload.RevisionNo;
  issuedPayload.Data.Status = 'Issued';

  var result = AETERLINK_NUMBERING_V3.saveFormRecord(issuedPayload);
  var record = result && result.record ? result.record : {};

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('FORM_RECORDS');
    if (sh && record.FormRecordId) {
      var headers = headersSafeSave_(sh);
      var row = findRowSafeSave_(sh, headers, 'FormRecordId', record.FormRecordId);
      if (row > 0) {
        issuedPayload.Data.DocumentNo = record.DocumentNo || issuedPayload.Data.DocumentNo || '';
        issuedPayload.Data.RevisionNo = record.RevisionNo || issuedPayload.Data.RevisionNo || 'R00';
        issuedPayload.Data.FormRecordId = record.FormRecordId;
        setRowValuesSafeSave_(sh, headers, row, { DataJson: JSON.stringify(issuedPayload.Data), LockedAfterPdf: 'FALSE' });
      }
    }
  } catch (err) {}

  var html = cleanSafeSave_(issuedPayload.Html || '');
  if (html && typeof AETERLINK_DRIVE_PDF !== 'undefined' && AETERLINK_DRIVE_PDF.saveIssuedPdf) {
    try {
      var pdf = AETERLINK_DRIVE_PDF.saveIssuedPdf({
        ProjectCode: record.ProjectCode || issuedPayload.ProjectCode,
        TemplateCode: record.TemplateCode || issuedPayload.TemplateCode,
        DocumentNo: record.DocumentNo || issuedPayload.Data.DocumentNo,
        RevisionNo: record.RevisionNo || issuedPayload.RevisionNo,
        FormRecordId: record.FormRecordId || issuedPayload.FormRecordId || '',
        Html: html,
        Styles: cleanSafeSave_(issuedPayload.Styles || '')
      });
      result.pdf = pdf;
      result.pdfStatus = pdf.pdfStatus;
      result.fileUrl = pdf.fileUrl;
      result.folderUrl = pdf.folderUrl;
      result.folderPath = pdf.folderPath;
      result.record = pdf.record || result.record;
      if (result.record) {
        result.record.LockedAfterPdf = 'FALSE';
        result.record.Status = 'Issued';
      }
    } catch (pdfErr) {
      result.pdfStatus = 'PDF_SAVE_FAILED_BUT_RECORD_ISSUED';
      result.pdfError = pdfErr && pdfErr.message ? pdfErr.message : String(pdfErr);
    }
  }
  result.ok = true;
  result.numbering = result.numbering || 'SAFE_ISSUE_NO_STACK';
  return result;
}

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
function setRowValuesSafeSave_(sheet, headers, row, values) { Object.keys(values || {}).forEach(function (k) { var c = headers.indexOf(k) + 1; if (c > 0) sheet.getRange(row, c).setValue(values[k]); }); }
function cleanSafeSave_(v) { return String(v == null ? '' : v).trim(); }
function normalizeRevisionSafeSave_(v) { v = cleanSafeSave_(v).toUpperCase(); if (!v || v === '0') return 'R00'; var n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? v : 'R' + ('00' + n).slice(-2); }
function canonicalSafeSave_(code) { code = cleanSafeSave_(code).toUpperCase(); if (code === 'PJ-WORK-COMPLETE-001' || code === 'PJ-WORK-COMPLETE') return 'PJ-WCR-001'; return code || 'PJ-WCR-001'; }
function idSafeSave_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000); }
function activeUserSafeSave_() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) {} return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }
