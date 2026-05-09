/**
 * AETERLINK Documentation Module — DocumentRegisterV2.gs
 * Enhanced Document Register / Form Records API with PDF links.
 *
 * Purpose:
 * - Ensure PDF link/status columns exist in Google Sheet.
 * - Merge PDF link fields from FORM_RECORDS into DOCUMENT_REGISTER when possible.
 * - Return a complete table payload for the WebApp Document Register module.
 */

var AETERLINK_DOCUMENT_REGISTER_V2 = (function () {
  var REGISTER_COLUMNS = ['PdfUrl', 'FileUrl', 'DriveFileId', 'DriveFolderUrl', 'PdfStatus', 'IssuedPdfFileName', 'TemplateCode', 'DocumentNo', 'RevisionNo', 'DocumentStatus', 'UpdatedBy'];
  var FORM_COLUMNS = ['PdfUrl', 'DriveFileId', 'DriveFolderUrl', 'PdfStatus', 'IssuedPdfFileName', 'DocumentStatus', 'LockedAfterPdf', 'IssueNo'];

  function documentRegister() {
    ensureColumns();
    backfillRegisterLinks_();
    var rows = readRows_('DOCUMENT_REGISTER');
    return {
      ok: true,
      tableName: 'DOCUMENT_REGISTER',
      rows: rows.map(normalizeRegisterRow_),
      count: rows.length,
      columns: ['DocumentId', 'ProjectCode', 'DocumentCode', 'DocumentTitle', 'Revision', 'Status', 'PdfStatus', 'PdfUrl', 'DriveFolderUrl', 'UpdatedAt'],
      serverTime: new Date().toISOString()
    };
  }

  function formRecords() {
    ensureColumns();
    var rows = readRows_('FORM_RECORDS');
    return {
      ok: true,
      tableName: 'FORM_RECORDS',
      rows: rows.map(normalizeFormRow_),
      count: rows.length,
      columns: ['FormRecordId', 'ProjectCode', 'TemplateCode', 'DocumentNo', 'RevisionNo', 'Status', 'PdfStatus', 'PdfUrl', 'DriveFolderUrl', 'UpdatedAt'],
      serverTime: new Date().toISOString()
    };
  }

  function ensureColumns() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { ok: false, message: 'No active spreadsheet' };
    var register = ss.getSheetByName('DOCUMENT_REGISTER');
    var forms = ss.getSheetByName('FORM_RECORDS');
    if (register) ensureColumns_(register, REGISTER_COLUMNS);
    if (forms) ensureColumns_(forms, FORM_COLUMNS);
    return { ok: true, message: 'Document Register PDF columns are ready.' };
  }

  function backfillRegisterLinks_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reg = ss && ss.getSheetByName('DOCUMENT_REGISTER');
    var forms = ss && ss.getSheetByName('FORM_RECORDS');
    if (!reg || !forms) return;
    ensureColumns_(reg, REGISTER_COLUMNS);
    ensureColumns_(forms, FORM_COLUMNS);
    var regHeaders = headers_(reg);
    var formRows = readRows_('FORM_RECORDS');
    if (!formRows.length) return;
    var byDoc = {};
    formRows.forEach(function (r) {
      var doc = clean_(r.DocumentNo || r.DocumentCode);
      if (!doc) return;
      byDoc[doc] = r;
    });
    if (reg.getLastRow() < 2) return;
    var values = reg.getRange(2, 1, reg.getLastRow() - 1, regHeaders.length).getDisplayValues();
    var changed = false;
    for (var i = 0; i < values.length; i++) {
      var row = rowObject_(regHeaders, values[i]);
      var docNo = clean_(row.DocumentNo || row.DocumentCode);
      var form = byDoc[docNo];
      if (!form) continue;
      var updates = {
        PdfUrl: row.PdfUrl || form.PdfUrl || form.FileUrl || '',
        FileUrl: row.FileUrl || form.PdfUrl || form.FileUrl || '',
        DriveFileId: row.DriveFileId || form.DriveFileId || '',
        DriveFolderUrl: row.DriveFolderUrl || form.DriveFolderUrl || '',
        PdfStatus: row.PdfStatus || form.PdfStatus || form.DocumentStatus || '',
        IssuedPdfFileName: row.IssuedPdfFileName || form.IssuedPdfFileName || '',
        TemplateCode: row.TemplateCode || form.TemplateCode || '',
        DocumentNo: row.DocumentNo || form.DocumentNo || '',
        RevisionNo: row.RevisionNo || form.RevisionNo || '',
        DocumentStatus: row.DocumentStatus || form.DocumentStatus || '',
        UpdatedBy: row.UpdatedBy || form.UpdatedBy || ''
      };
      Object.keys(updates).forEach(function (k) {
        if (!updates[k]) return;
        var col = regHeaders.indexOf(k);
        if (col >= 0 && values[i][col] !== updates[k]) {
          values[i][col] = updates[k];
          changed = true;
        }
      });
    }
    if (changed) reg.getRange(2, 1, values.length, regHeaders.length).setValues(values);
  }

  function normalizeRegisterRow_(r) {
    var pdfUrl = clean_(r.PdfUrl || r.FileUrl);
    var folderUrl = clean_(r.DriveFolderUrl);
    var pdfStatus = clean_(r.PdfStatus || r.DocumentStatus || (pdfUrl ? 'PDF Saved' : ''));
    return {
      DocumentId: r.DocumentId || '',
      ProjectCode: r.ProjectCode || '',
      DocumentCode: r.DocumentCode || r.DocumentNo || '',
      DocumentNo: r.DocumentNo || r.DocumentCode || '',
      DocumentTitle: r.DocumentTitle || r.TemplateCode || '',
      TemplateCode: r.TemplateCode || '',
      Revision: r.Revision || r.RevisionNo || '',
      RevisionNo: r.RevisionNo || r.Revision || '',
      Status: r.Status || r.DocumentStatus || '',
      DocumentStatus: r.DocumentStatus || r.Status || '',
      PdfStatus: pdfStatus,
      PdfUrl: pdfUrl,
      FileUrl: r.FileUrl || pdfUrl,
      DriveFolderUrl: folderUrl,
      DriveFileId: r.DriveFileId || '',
      IssuedPdfFileName: r.IssuedPdfFileName || '',
      Module: r.Module || '',
      UpdatedAt: r.UpdatedAt || '',
      UpdatedBy: r.UpdatedBy || ''
    };
  }

  function normalizeFormRow_(r) {
    var pdfUrl = clean_(r.PdfUrl || r.FileUrl);
    return {
      FormRecordId: r.FormRecordId || '',
      ProjectCode: r.ProjectCode || '',
      TemplateCode: r.TemplateCode || '',
      DocumentNo: r.DocumentNo || '',
      RevisionNo: r.RevisionNo || r.Revision || '',
      Status: r.Status || r.DocumentStatus || '',
      DocumentStatus: r.DocumentStatus || r.Status || '',
      PdfStatus: r.PdfStatus || r.DocumentStatus || (pdfUrl ? 'PDF Saved' : ''),
      PdfUrl: pdfUrl,
      FileUrl: r.FileUrl || pdfUrl,
      DriveFolderUrl: r.DriveFolderUrl || '',
      DriveFileId: r.DriveFileId || '',
      IssuedPdfFileName: r.IssuedPdfFileName || '',
      UpdatedAt: r.UpdatedAt || '',
      UpdatedBy: r.UpdatedBy || ''
    };
  }

  function ensureColumns_(sheet, names) {
    var headers = headers_(sheet);
    if (!headers.length) return;
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

  function readRows_(tableName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return [];
    var sh = ss.getSheetByName(tableName);
    if (!sh) return [];
    var values = sh.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return [];
    var headers = values[0].map(function (h) { return String(h || '').trim(); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var obj = {}, has = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        obj[headers[c]] = values[r][c];
        if (values[r][c] !== '') has = true;
      }
      if (has) rows.push(obj);
    }
    return rows.filter(function (row) {
      var isDeleted = String(row.IsDeleted || '').toUpperCase();
      return isDeleted !== 'TRUE' && isDeleted !== 'YES';
    });
  }

  function headers_(sheet) {
    return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (h) { return String(h || '').trim(); });
  }

  function rowObject_(headers, row) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = row[i]; });
    return obj;
  }

  function clean_(value) { return String(value == null ? '' : value).trim(); }

  return { documentRegister: documentRegister, formRecords: formRecords, ensureColumns: ensureColumns };
})();

function apiDocumentRegisterV2() {
  return AETERLINK_DOCUMENT_REGISTER_V2.documentRegister();
}

function apiFormRecordsPdfV2() {
  return AETERLINK_DOCUMENT_REGISTER_V2.formRecords();
}

function apiEnsureDocumentRegisterPdfColumnsV2() {
  return AETERLINK_DOCUMENT_REGISTER_V2.ensureColumns();
}
