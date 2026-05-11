/**
 * AETERLINK Documentation Module — ZZZZZ_DraftIssueEditApi.gs
 * Production override for Draft / Issue / Edit behavior.
 *
 * Rules:
 * - Save Draft must NOT run or reserve Document No.
 * - Document No. is generated only when Issue / Send is clicked.
 * - Draft records can be loaded from FORM_RECORDS and edited in the A4 workflow.
 * - Issued records are never overwritten by edit/issue. Editing an issued record creates a revision flow.
 * - Issuing an edited issued record keeps the same base Document No. and increments Revision No. R01, R02, ...
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
    var status = clean_(payload.Status || payload.DocumentStatus || (payload.Data && payload.Data.Status) || 'Draft');
    if (status.toUpperCase() === 'ISSUED') return saveIssued_(payload);
    return saveDraft_(payload);
  }

  function saveIssued_(payload) {
    payload = payload || {};
    var data = payload.Data || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName(FORM_TABLE);
    var headers = sh ? headers_(sh) : [];
    var existingId = clean_(payload.FormRecordId || data.FormRecordId || '');
    var existingRow = sh && existingId ? findRow_(sh, headers, 'FormRecordId', existingId) : -1;
    var existing = existingRow > 0 ? rowObject_(headers, sh.getRange(existingRow, 1, 1, headers.length).getDisplayValues()[0]) : {};

    var sourceDocNo = clean_(payload.SourceDocumentNo || data.SourceDocumentNo || payload.RevisionOf || data.RevisionOf || '');
    var sourceFormRecordId = clean_(payload.SourceFormRecordId || data.SourceFormRecordId || '');
    var oldStatus = clean_(existing.Status || existing.DocumentStatus || '').toUpperCase();
    var oldDocNo = clean_(existing.DocumentNo || '');
    var existingIsIssued = !!oldDocNo && (oldStatus.indexOf('ISSUED') >= 0 || oldStatus.indexOf('PDF') >= 0 || oldStatus.indexOf('APPROVED') >= 0);

    if (!sourceDocNo && existingIsIssued) {
      sourceDocNo = stripRevision_(oldDocNo);
      sourceFormRecordId = existing.FormRecordId || sourceFormRecordId;
    }

    var revisionMode = !!sourceDocNo;
    var issuedPayload = copy_(payload);
    issuedPayload.Status = 'Issued';
    issuedPayload.DocumentStatus = 'Issued';

    if (revisionMode) {
      var baseDocNo = stripRevision_(sourceDocNo);
      var nextRev = normalizeRevision_(payload.RevisionNo || data.RevisionNo || nextRevisionNo_(baseDocNo));
      if (nextRev === 'R00') nextRev = nextRevisionNo_(baseDocNo);
      issuedPayload.DocumentNo = baseDocNo;
      issuedPayload.RevisionNo = nextRev;
      issuedPayload.Revision = nextRev;
      // If the user opened an already issued record directly, do not overwrite it. Create a new revision record.
      if (existingIsIssued && (!sourceFormRecordId || sourceFormRecordId === existingId)) {
        issuedPayload.FormRecordId = '';
      }
      issuedPayload.RevisionReason = issuedPayload.RevisionReason || data.RevisionReason || 'Revision from issued document';
      issuedPayload.Data = issuedPayload.Data || data;
      issuedPayload.Data.SourceDocumentNo = baseDocNo;
      issuedPayload.Data.SourceFormRecordId = sourceFormRecordId || existing.FormRecordId || '';
      issuedPayload.Data.RevisionOf = baseDocNo;
      issuedPayload.Data.DocumentNo = baseDocNo;
      issuedPayload.Data.RevisionNo = nextRev;
      issuedPayload.Data.Status = 'Issued';
    } else {
      var docNo = clean_(payload.DocumentNo || data.DocumentNo || '');
      if (docNo) issuedPayload.DocumentNo = docNo;
      issuedPayload.Data = issuedPayload.Data || data;
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

      // Update DataJson after the numbering engine creates / updates the record.
      updateDataJson_(record.FormRecordId, data);

      var html = clean_(issuedPayload.Html || '');
      var styles = clean_(issuedPayload.Styles || '');
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
          markEditableAfterIssue_(result.record.FormRecordId, result.record.DocumentNo);
        }
      } else if (result.record) {
        markEditableAfterIssue_(result.record.FormRecordId, result.record.DocumentNo);
      }
      result.revisionMode = revisionMode;
      result.sourceDocumentNo = revisionMode ? stripRevision_(sourceDocNo) : '';
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
      var requestedId = clean_(payload.FormRecordId || data.FormRecordId || '');
      var row = requestedId ? findRow_(sh, headers, 'FormRecordId', requestedId) : -1;
      var old = row > 0 ? rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]) : {};
      var oldStatus = clean_(old.Status || old.DocumentStatus || '').toUpperCase();
      var oldDocNo = clean_(old.DocumentNo || '');
      var oldIsIssued = !!oldDocNo && (oldStatus.indexOf('ISSUED') >= 0 || oldStatus.indexOf('PDF') >= 0 || oldStatus.indexOf('APPROVED') >= 0);
      var sourceDocNo = clean_(payload.SourceDocumentNo || data.SourceDocumentNo || payload.RevisionOf || data.RevisionOf || '');
      var sourceFormRecordId = clean_(payload.SourceFormRecordId || data.SourceFormRecordId || '');
      if (!sourceDocNo && oldIsIssued) {
        sourceDocNo = stripRevision_(oldDocNo);
        sourceFormRecordId = old.FormRecordId || sourceFormRecordId;
      }
      var revisionMode = !!sourceDocNo;
      var formRecordId = requestedId || id_('FR');
      if (oldIsIssued) {
        // Never convert an issued row back to Draft. Start a new revision draft instead.
        formRecordId = id_('FR');
        row = -1;
        old = {};
      }
      var templateCode = canonicalCode_(payload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
      var projectCode = clean_(payload.ProjectCode || data.ProjectCode || 'TEST-PJ');
      var revisionNo = normalizeRevision_(payload.RevisionNo || data.RevisionNo || (revisionMode ? nextRevisionNo_(sourceDocNo) : 'R00'));
      if (revisionMode && revisionNo === 'R00') revisionNo = nextRevisionNo_(sourceDocNo);

      data.TemplateCode = templateCode;
      data.ProjectCode = projectCode;
      data.DocumentNo = '';
      data.RevisionNo = revisionNo;
      data.Status = 'Draft';
      data.FormRecordId = formRecordId;
      if (revisionMode) {
        data.SourceDocumentNo = stripRevision_(sourceDocNo);
        data.SourceFormRecordId = sourceFormRecordId;
        data.RevisionOf = stripRevision_(sourceDocNo);
      }

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
        RelatedRecordId: revisionMode ? (sourceFormRecordId || old.RelatedRecordId || '') : (payload.RelatedRecordId || old.RelatedRecordId || ''),
        DocumentStatus: revisionMode ? 'Draft Revision' : 'Draft',
        LockedAfterPdf: 'FALSE',
        WorkflowGateId: payload.WorkflowGateId || old.WorkflowGateId || '',
        ReviewComment: payload.ReviewComment || old.ReviewComment || '',
        IssueNo: revisionMode ? extractIssueNo_(sourceDocNo) : 'XXX',
        RevisionReason: payload.RevisionReason || old.RevisionReason || '',
        DriveFileId: old.DriveFileId || '',
        DriveFolderUrl: old.DriveFolderUrl || '',
        PdfStatus: 'Draft',
        IssuedPdfFileName: old.IssuedPdfFileName || ''
      };
      var values = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
      if (row > 0) sh.getRange(row, 1, 1, headers.length).setValues([values]);
      else { sh.appendRow(values); row = sh.getLastRow(); }
      return { ok: true, action: row > 0 && old.FormRecordId ? 'updated' : 'created', tableName: FORM_TABLE, row: row, record: record, numbering: 'DRAFT_NO_DOCUMENT_NO', revisionMode: revisionMode, sourceDocumentNo: revisionMode ? stripRevision_(sourceDocNo) : '' };
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
    var baseDoc = stripRevision_(record.DocumentNo || data.SourceDocumentNo || data.RevisionOf || '');
    var st = clean_(record.Status || record.DocumentStatus || '').toUpperCase();
    var isIssued = !!record.DocumentNo && (st.indexOf('ISSUED') >= 0 || st.indexOf('PDF') >= 0 || st.indexOf('APPROVED') >= 0);
    return { ok: true, row: row, record: record, data: data, isIssued: isIssued, baseDocumentNo: baseDoc, nextRevisionNo: baseDoc ? nextRevisionNo_(baseDoc) : 'R00' };
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

  function updateDataJson_(formRecordId, data) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName(FORM_TABLE);
    if (!sh || !formRecordId) return;
    ensureColumns_(sh, FORM_COLUMNS);
    var headers = headers_(sh);
    var row = findRow_(sh, headers, 'FormRecordId', formRecordId);
    if (row > 0) setRowValues_(sh, headers, row, { DataJson: JSON.stringify(data), LockedAfterPdf: 'FALSE' });
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

  function nextRevisionNo_(documentNo) {
    var base = stripRevision_(documentNo);
    if (!base) return 'R01';
    var max = 0;
    readRows_(FORM_TABLE).forEach(function (r) {
      var doc = clean_(r.DocumentNo || '');
      var data = {};
      try { data = r.DataJson ? JSON.parse(r.DataJson) : {}; } catch (err) { data = {}; }
      var source = clean_(data.SourceDocumentNo || data.RevisionOf || '');
      if (stripRevision_(doc) !== base && stripRevision_(source) !== base) return;
      var rev = normalizeRevision_(r.RevisionNo || r.Revision || (doc.match(/-R(\d{2})$/i) || [])[1] || 'R00');
      var n = parseInt(rev.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'R' + ('00' + (max + 1)).slice(-2);
  }

  function readRows_(tableName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName(tableName);
    if (!sh || sh.getLastRow() < 2) return [];
    var values = sh.getDataRange().getDisplayValues();
    var headers = values[0].map(function (h) { return clean_(h); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var o = {}, has = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        o[headers[c]] = values[r][c];
        if (values[r][c] !== '') has = true;
      }
      if (has && String(o.IsDeleted || '').toUpperCase() !== 'TRUE') rows.push(o);
    }
    return rows;
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
  function stripRevision_(documentNo) { return clean_(documentNo).replace(/-R\d{2}$/i, ''); }
  function extractIssueNo_(documentNo) { var m = stripRevision_(documentNo).match(/-(\d{3,4})$/); return m ? ('000' + parseInt(m[1], 10)).slice(-3) : ''; }
  function canonicalCode_(code) { code = clean_(code).toUpperCase(); if (code === 'PJ-WORK-COMPLETE-001' || code === 'PJ-WORK-COMPLETE') return 'PJ-WCR-001'; return code || 'PJ-WCR-001'; }

  return { save: save, getRecord: getRecord, softDelete: softDelete };
})();

function apiModularSaveFormRecord(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.save(payload); }
function apiModularSaveFormRecordV2(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.save(payload); }
function apiModularSaveFormRecordV3(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.save(payload); }
function apiGetFormRecordForEditV2(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.getRecord(payload); }
function apiSoftDeleteFormRecordV2(payload) { return AETERLINK_DRAFT_ISSUE_EDIT_API.softDelete(payload); }
