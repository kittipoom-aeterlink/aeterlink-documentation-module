/**
 * AETERLINK Documentation Module — ZZZZZ_DraftIssueEditApi.gs
 * Production override for Draft / Issue / Edit behavior.
 *
 * Rules:
 * - Save Draft must NOT run or reserve Document No.
 * - Document No. is generated only when Issue / Send is clicked.
 * - Draft and Issued records can be loaded back to the A4 workflow for editing.
 * - Delete is soft delete only.
 */

var AETERLINK_DRAFT_ISSUE_EDIT_API = (function () {
  var FORM_TABLE = 'FORM_RECORDS';
  var REGISTER_TABLE = 'DOCUMENT_REGISTER';
  var FORM_COLUMNS = [
    'FormRecordId', 'ProjectCode', 'TemplateCode', 'DocumentNo', 'RevisionNo', 'Status', 'DataJson',
    'PdfUrl', 'SubmittedBy', 'SubmittedAt', 'ApprovedBy', 'ApprovedAt', 'CreatedAt', 'UpdatedAt', 'UpdatedBy',
    'Revision', 'IsDeleted', 'RelatedTable', 'RelatedRecordId', 'DocumentStatus', 'LockedAfterPdf',
    'WorkflowGateId', 'ReviewComment', 'IssueNo', 'RevisionReason', 'DriveFileId', 'DriveFolderUrl',
    'PdfStatus', 'IssuedPdfFileName'
  ];
  var REGISTER_COLUMNS = [
    'DocumentId', 'ProjectCode', 'DocumentCode', 'DocumentNo', 'DocumentTitle', 'TemplateCode', 'Revision',
    'RevisionNo', 'Status', 'DocumentStatus', 'PdfUrl', 'FileUrl', 'DriveFileId', 'DriveFolderUrl',
    'PdfStatus', 'IssuedPdfFileName', 'UpdatedAt', 'UpdatedBy', 'IsDeleted'
  ];

  function save(payload) {
    payload = payload || {};
    var status = String(payload.Status || payload.DocumentStatus || (payload.Data && payload.Data.Status) || 'Draft').trim();
    if (status.toUpperCase() === 'ISSUED') return saveIssued_(payload);
    return saveDraft_(payload);
  }

  function saveIssued_(payload) {
    payload = payload || {};
    var data = payload.Data || {};
    var docNo = clean_(payload.DocumentNo || data.DocumentNo || '');
    var issuedPayload = copy_(payload);
    issuedPayload.Status = 'Issued';
    issuedPayload.DocumentStatus = 'Issued';
    if (docNo) issuedPayload.DocumentNo = docNo;
    if (issuedPayload.Data) {
      issuedPayload.Data.Status = 'Issued';
      if (docNo) issuedPayload.Data.DocumentNo = docNo;
    }

    var result = AETERLINK_NUMBERING_V3.saveFormRecord(issuedPayload);

    try {
      var record = result && result.record ? result.record : {};
      data = issuedPayload.Data || {};
      data.DocumentNo = record.DocumentNo || data.DocumentNo || '';
      data.RevisionNo = record.RevisionNo || data.RevisionNo || 'R00';
      data.Status = 'Issued';
      data.TemplateCode = record.TemplateCode || issuedPayload.TemplateCode || data.TemplateCode || '';
      data.ProjectCode = record.ProjectCode || issuedPayload.ProjectCode || data.ProjectCode || '';

      var html = String(issuedPayload.Html || '').trim();
      var styles = String(issuedPayload.Styles || '').trim();
      if (!html && typeof buildIssuedA4Html_ === 'function') {
        html = buildIssuedA4Html_(data, record);
        styles = typeof buildIssuedA4Styles_ === 'function' ? buildIssuedA4Styles_() : styles;
      }

      if (html && typeof AETERLINK_DRIVE_PDF !== 'undefined' && AETERLINK_DRIVE_PDF.saveIssuedPdf) {
        var pdf = AETERLINK_DRIVE_PDF.saveIssuedPdf({
          ProjectCode: record.ProjectCode || data.ProjectCode,
          TemplateCode: record.TemplateCode || data.TemplateCode,
          DocumentNo: record.DocumentNo || data.DocumentNo,
          RevisionNo: record.RevisionNo || data.RevisionNo,
          FormRecordId: record.FormRecordId || issuedPayload.FormRecordId || '',
          Html: typeof sanitizeIssuedHtml_ === 'function' ? sanitizeIssuedHtml_(html) : html,
          Styles: (typeof buildIssuedA4Styles_ === 'function' ? buildIssuedA4Styles_() : '') + '\n' + styles
        });
        result.pdf = pdf;
        result.pdfStatus = pdf.pdfStatus;
        result.fileUrl = pdf.fileUrl;
        result.folderUrl = pdf.folderUrl;
        result.folderPath = pdf.folderPath;
        result.record = pdf.record || result.record;
        if (result.record) {
          result.record.PdfUrl = pdf.fileUrl;
          result.record.DocumentStatus = 'Issued / PDF Saved';
          result.record.Status = 'Issued';
          result.record.LockedAfterPdf = 'FALSE';
        }
      }
      if (result.record) markEditableAfterIssue_(result.record.FormRecordId, result.record.DocumentNo);
    } catch (err) {
      result.pdfStatus = 'PDF_SAVE_FAILED';
      result.pdfError = err && err.message ? err.message : String(err);
    }
    return result;
  }

  function saveDraft_(payload) {
    payload = payload || {};
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(FORM_TABLE);
      if (!sh) throw new Error('Sheet not found: ' + FORM_TABLE);
      ensureColumns_(sh, FORM_COLUMNS);
      var headers = headers_(sh);
      var nowIso = new Date().toISOString();
      var user = activeUser_().email;
      var data = payload.Data || {};
      var formRecordId = clean_(payload.FormRecordId || data.FormRecordId || '') || id_('FR');
      var templateCode = canonicalCode_(payload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
      var projectCode = clean_(payload.ProjectCode || data.ProjectCode || 'TEST-PJ');
      var revisionNo = normalizeRevision_(payload.RevisionNo || data.RevisionNo || 'R00');
      var row = findRow_(sh, headers, 'FormRecordId', formRecordId);
      var old = row > 0 ? rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]) : {};

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
        PdfUrl: old.PdfUrl || payload.PdfUrl || '',
        SubmittedBy: old.SubmittedBy || payload.SubmittedBy || user,
        SubmittedAt: old.SubmittedAt || '',
        ApprovedBy: old.ApprovedBy || '',
        ApprovedAt: old.ApprovedAt || '',
        CreatedAt: old.CreatedAt || payload.CreatedAt || nowIso,
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
        IssueNo: 'XXX',
        RevisionReason: payload.RevisionReason || old.RevisionReason || '',
        DriveFileId: old.DriveFileId || '',
        DriveFolderUrl: old.DriveFolderUrl || '',
        PdfStatus: old.PdfStatus || 'Draft',
        IssuedPdfFileName: old.IssuedPdfFileName || ''
      };
      var values = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
      if (row > 0) sh.getRange(row, 1, 1, headers.length).setValues([values]);
      else { sh.appendRow(values); row = sh.getLastRow(); }
      return { ok: true, action: row > 0 && old.FormRecordId ? 'updated' : 'created', tableName: FORM_TABLE, row: row, record: record, numbering: 'DRAFT_NO_DOCUMENT_NO' };
    } finally {
      lock.releaseLock();
    }
  }

  function getRecord(payload) {
    payload = payload || {};
    var id = clean_(typeof payload === 'string' ? payload : payload.FormRecordId);
    var doc = clean_(payload.DocumentNo || payload.DocumentId || payload.DocumentCode || '');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName(FORM_TABLE);
    if (!sh) throw new Error('Sheet not found: ' + FORM_TABLE);
    var headers = headers_(sh);
    var row = id ? findRow_(sh, headers, 'FormRecordId', id) : -1;
    if (row < 0 && doc) row = findRow_(sh, headers, 'DocumentNo', doc);
    if (row < 0) throw new Error('Record not found for edit.');
    var record = rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
    var data = {};
    try { data = record.DataJson ? JSON.parse(record.DataJson) : {}; } catch (err) { data = {}; }
    return { ok: true, row: row, record: record, data: data };
  }

  function softDelete(payload) {
    payload = payload || {};
    var id = clean_(typeof payload === 'string' ? payload : payload.FormRecordId);
    var doc = clean_(payload.DocumentNo || payload.DocumentId || payload.DocumentCode || '');
    if (!id && !doc) throw new Error('Missing FormRecordId or DocumentNo for delete.');
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var nowIso = new Date().toISOString();
      var user = activeUser_().email;
      var form = ss && ss.getSheetByName(FORM_TABLE);
      var deleted = { formRecord: false, register: false };
      if (form) {
        ensureColumns_(form, FORM_COLUMNS);
        var fh = headers_(form);
        var fr = id ? findRow_(form, fh, 'FormRecordId', id) : -1;
        if (fr < 0 && doc) fr = findRow_(form, fh, 'DocumentNo', doc);
        if (fr > 0) {
          var old = rowObject_(fh, form.getRange(fr, 1, 1, fh.length).getDisplayValues()[0]);
          doc = doc || old.DocumentNo || '';
          setRowValues_(form, fh, fr, { IsDeleted: 'TRUE', Status: 'Deleted', DocumentStatus: 'Deleted', LockedAfterPdf: 'FALSE', UpdatedAt: nowIso, UpdatedBy: user });
          deleted.formRecord = true;
        }
      }
      var reg = ss && ss.getSheetByName(REGISTER_TABLE);
      if (reg && doc) {
        ensureColumns_(reg, REGISTER_COLUMNS);
        var rh = headers_(reg);
        var rr = findRow_(reg, rh, 'DocumentNo', doc);
        if (rr < 0) rr = findRow_(reg, rh, 'DocumentCode', doc);
        if (rr > 0) {
          setRowValues_(reg, rh, rr, { IsDeleted: 'TRUE', Status: 'Deleted', DocumentStatus: 'Deleted', UpdatedAt: nowIso, UpdatedBy: user });
          deleted.register = true;
        }
      }
      return { ok: true, deleted: deleted, formRecordId: id, documentNo: doc };
    } finally {
      lock.releaseLock();
    }
  }

  function markEditableAfterIssue_(formRecordId, documentNo) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName(FORM_TABLE);
    if (!sh) return;
    ensureColumns_(sh, FORM_COLUMNS);
    var headers = headers_(sh);
    var row = formRecordId ? findRow_(sh, headers, 'FormRecordId', formRecordId) : -1;
    if (row < 0 && documentNo) row = findRow_(sh, headers, 'DocumentNo', documentNo);
    if (row > 0) setRowValues_(sh, headers, row, { LockedAfterPdf: 'FALSE' });
  }

  function ensureColumns_(sheet, names) {
    var headers = headers_(sheet);
    if (!headers.length) return;
    var changed = false;
    names.forEach(function (name) {
      if (headers.indexOf(name) < 0) { sheet.getRange(1, headers.length + 1).setValue(name); headers.push(name); changed = true; }
    });
    if (changed) sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  function setRowValues_(sheet, headers, row, values) { Object.keys(values || {}).forEach(function (k) { var c = headers.indexOf(k) + 1; if (c > 0) sheet.getRange(row, c).setValue(values[k]); }); }
  function headers_(sheet) { return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (h) { return clean_(h); }); }
  function rowObject_(headers, row) { var o = {}; headers.forEach(function (h, i) { if (h) o[h] = row[i]; }); return o; }
  function findRow_(sheet, headers, key, value) { var c = headers.indexOf(key) + 1; if (c < 1 || !value || sheet.getLastRow() < 2) return -1; var vals = sheet.getRange(2, c, sheet.getLastRow() - 1, 1).getDisplayValues(); for (var i = 0; i < vals.length; i++) if (clean_(vals[i][0]) === clean_(value)) return i + 2; return -1; }
  function activeUser_() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) {} return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }
  function id_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000); }
  function clean_(v) { return String(v == null ? '' : v).trim(); }
  function copy_(obj) { return JSON.parse(JSON.stringify(obj || {})); }
  function normalizeRevision_(v) { v = clean_(v).toUpperCase(); if (!v || v === '0') return 'R00'; var n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? v : 'R' + ('00' + n).slice(-2); }
  function canonicalCode_(code) { code = clean_(code).toUpperCase(); if (code === 'PJ-WORK-COMPLETE-001' || code === 'PJ-WORK-COMPLETE') return 'PJ-WCR-001'; return code || 'PJ-WCR-001'; }

  return { save: save, getRecord: getRecord, softDelete: softDelete };
})();

function apiModularSaveFormRecordV2(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.save(payload); }
function apiModularSaveFormRecordV3(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.save(payload); }
function apiGetFormRecordForEditV2(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.getRecord(payload); }
function apiSoftDeleteFormRecordV2(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.softDelete(payload); }
