/**
 * AETERLINK Documentation Module — DrivePdfExport.gs
 * Save issued A4 documents as PDF files in Google Drive.
 *
 * Folder structure:
 *   AETERLINK Documentation Control PDF
 *     / <ProjectCode>
 *       / Issued PDF
 *
 * Google Sheet structure update:
 * - This module is allowed to add only PDF/status tracking columns required for Drive links.
 * - It does not remove, rename, or reorder existing columns.
 */

var AETERLINK_DRIVE_PDF = (function () {
  var ROOT_FOLDER_NAME = 'AETERLINK Documentation Control PDF';
  var ISSUED_FOLDER_NAME = 'Issued PDF';
  var FORM_PDF_COLUMNS = ['PdfUrl', 'DriveFileId', 'DriveFolderUrl', 'PdfStatus', 'IssuedPdfFileName', 'DocumentStatus', 'LockedAfterPdf', 'IssueNo'];
  var REGISTER_PDF_COLUMNS = ['PdfUrl', 'FileUrl', 'DriveFileId', 'DriveFolderUrl', 'PdfStatus', 'IssuedPdfFileName', 'TemplateCode', 'DocumentNo', 'RevisionNo', 'DocumentStatus', 'UpdatedBy'];

  function saveIssuedPdf(payload) {
    payload = payload || {};
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      ensurePdfColumns_();
      var projectCode = clean_(payload.ProjectCode || 'UNASSIGNED-PROJECT');
      var documentNo = clean_(payload.DocumentNo || 'NOT-ISSUED');
      var revisionNo = clean_(payload.RevisionNo || 'R00');
      var templateCode = clean_(payload.TemplateCode || '');
      var formRecordId = clean_(payload.FormRecordId || '');
      var html = String(payload.Html || payload.html || '').trim();
      var styles = String(payload.Styles || payload.styles || '').trim();
      if (!html) throw new Error('Missing A4 HTML content for PDF export.');

      var projectFolder = getOrCreateChildFolder_(getOrCreateRootFolder_(), safeFolderName_(projectCode));
      var issuedFolder = getOrCreateChildFolder_(projectFolder, ISSUED_FOLDER_NAME);
      var fileName = safeFileName_([documentNo, revisionNo, templateCode].filter(Boolean).join('_')) + '.pdf';
      var pdfBlob = htmlToPdfBlob_(html, styles, fileName);
      var file = issuedFolder.createFile(pdfBlob).setName(fileName);
      var fileUrl = file.getUrl();
      var nowIso = new Date().toISOString();

      var updatedRecord = updateFormRecord_(formRecordId, documentNo, {
        PdfUrl: fileUrl,
        DriveFileId: file.getId(),
        DriveFolderUrl: issuedFolder.getUrl(),
        PdfStatus: 'PDF Saved',
        IssuedPdfFileName: fileName,
        Status: 'Issued',
        DocumentStatus: 'Issued / PDF Saved',
        LockedAfterPdf: 'TRUE',
        SubmittedAt: nowIso,
        UpdatedAt: nowIso,
        UpdatedBy: activeUser_().email,
        IssueNo: extractIssueNo_(documentNo)
      });

      updateDocumentRegister_(projectCode, documentNo, templateCode, revisionNo, fileUrl, file.getId(), issuedFolder.getUrl(), fileName, nowIso);

      return {
        ok: true,
        status: 'Issued / PDF Saved',
        pdfStatus: 'PDF_SAVED_TO_DRIVE',
        projectCode: projectCode,
        documentNo: documentNo,
        revisionNo: revisionNo,
        templateCode: templateCode,
        formRecordId: formRecordId,
        fileName: fileName,
        fileId: file.getId(),
        fileUrl: fileUrl,
        folderUrl: issuedFolder.getUrl(),
        folderPath: ROOT_FOLDER_NAME + ' / ' + projectCode + ' / ' + ISSUED_FOLDER_NAME,
        record: updatedRecord
      };
    } finally {
      lock.releaseLock();
    }
  }

  function htmlToPdfBlob_(a4Html, styles, fileName) {
    var safeHtml = String(a4Html || '')
      .replace(/ contenteditable="true"/g, '')
      .replace(/ spellcheck="false"/g, '')
      .replace(/<input[\s\S]*?>/gi, '');
    var css = String(styles || '') + '\n' + [
      '@page{size:A4 portrait;margin:0}',
      'html,body{margin:0!important;padding:0!important;background:#fff!important;width:210mm!important}',
      '.a4-root{background:#fff!important;padding:0!important;margin:0!important}',
      '.a4-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;overflow:hidden!important;margin:0!important;box-shadow:none!important;border:0!important;page-break-after:always;break-after:page}',
      '.a4-no-print,.a4-preview-actions,.prod-inline-editor,.prod-row-delete,.prod-photo-report-toolbar,.row-actions,.photo-actions{display:none!important}',
      '.a4-detail-note{display:none!important;height:0!important;margin:0!important;padding:0!important;border:0!important;visibility:hidden!important}'
    ].join('\n');
    var doc = '<!doctype html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' + safeHtml + '</body></html>';
    var blob = Utilities.newBlob(doc, 'text/html', fileName.replace(/\.pdf$/i, '.html'));
    return blob.getAs(MimeType.PDF).setName(fileName);
  }

  function ensurePdfColumns_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var form = ss.getSheetByName('FORM_RECORDS');
    if (form) ensureColumns_(form, FORM_PDF_COLUMNS);
    var reg = ss.getSheetByName('DOCUMENT_REGISTER');
    if (reg) ensureColumns_(reg, REGISTER_PDF_COLUMNS);
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

  function updateFormRecord_(formRecordId, documentNo, values) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('FORM_RECORDS');
    if (!sh) return null;
    ensureColumns_(sh, FORM_PDF_COLUMNS);
    var headers = headers_(sh);
    if (!headers.length) return null;
    var row = formRecordId ? findRow_(sh, headers, 'FormRecordId', formRecordId) : -1;
    if (row < 0 && documentNo) row = findRow_(sh, headers, 'DocumentNo', documentNo);
    if (row < 0) return null;
    Object.keys(values || {}).forEach(function (key) {
      var col = headers.indexOf(key) + 1;
      if (col > 0) sh.getRange(row, col).setValue(values[key]);
    });
    return rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
  }

  function updateDocumentRegister_(projectCode, documentNo, templateCode, revisionNo, fileUrl, fileId, folderUrl, fileName, nowIso) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName('DOCUMENT_REGISTER');
    if (!sh) return null;
    ensureColumns_(sh, REGISTER_PDF_COLUMNS);
    var headers = headers_(sh);
    if (!headers.length) return null;
    var row = findRow_(sh, headers, 'DocumentCode', documentNo);
    if (row < 0) row = findRow_(sh, headers, 'DocumentNo', documentNo);
    var values = {
      DocumentId: 'DR-' + documentNo,
      ProjectCode: projectCode,
      DocumentCode: documentNo,
      DocumentNo: documentNo,
      DocumentTitle: templateCode || documentNo,
      TemplateCode: templateCode,
      Revision: revisionNo,
      RevisionNo: revisionNo,
      Status: 'Issued / PDF Saved',
      DocumentStatus: 'Issued / PDF Saved',
      PdfUrl: fileUrl,
      FileUrl: fileUrl,
      DriveFileId: fileId,
      DriveFolderUrl: folderUrl,
      PdfStatus: 'PDF Saved',
      IssuedPdfFileName: fileName,
      UpdatedAt: nowIso,
      UpdatedBy: activeUser_().email,
      IsDeleted: 'FALSE'
    };
    if (row > 0) {
      Object.keys(values).forEach(function (key) {
        var col = headers.indexOf(key) + 1;
        if (col > 0) sh.getRange(row, col).setValue(values[key]);
      });
      return rowObject_(headers, sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
    }
    var newRow = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ''; });
    sh.appendRow(newRow);
    return rowObject_(headers, sh.getRange(sh.getLastRow(), 1, 1, headers.length).getDisplayValues()[0]);
  }

  function getOrCreateRootFolder_() {
    var props = PropertiesService.getScriptProperties();
    var existingId = props.getProperty('AETERLINK_DRIVE_PDF_ROOT_FOLDER_ID');
    if (existingId) {
      try { return DriveApp.getFolderById(existingId); } catch (err) {}
    }
    var it = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
    var folder = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
    props.setProperty('AETERLINK_DRIVE_PDF_ROOT_FOLDER_ID', folder.getId());
    return folder;
  }

  function getOrCreateChildFolder_(parent, name) {
    var it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }

  function headers_(sheet) {
    return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (h) { return String(h || '').trim(); });
  }

  function findRow_(sheet, headers, key, value) {
    var col = headers.indexOf(key) + 1;
    if (col < 1 || !value || sheet.getLastRow() < 2) return -1;
    var values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (var i = 0; i < values.length; i++) if (String(values[i][0] || '').trim() === String(value || '').trim()) return i + 2;
    return -1;
  }

  function rowObject_(headers, row) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = row[i]; });
    return obj;
  }

  function clean_(value) { return String(value == null ? '' : value).trim(); }
  function safeFolderName_(value) { return clean_(value).replace(/[\\/:*?"<>|#%{}~&]/g, '-').substring(0, 120) || 'UNASSIGNED-PROJECT'; }
  function safeFileName_(value) { return clean_(value).replace(/[\\/:*?"<>|#%{}~&]/g, '-').replace(/\s+/g, '_').substring(0, 160) || 'AETERLINK_Document'; }
  function extractIssueNo_(documentNo) { var m = String(documentNo || '').replace(/-R\d{2}$/i, '').match(/-(\d{3,4})$/); return m ? ('000' + parseInt(m[1], 10)).slice(-3) : ''; }
  function activeUser_() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) { email = ''; } return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }

  return { saveIssuedPdf: saveIssuedPdf, ensurePdfColumns: ensurePdfColumns_ };
})();

function apiIssuePdfToDriveV1(payload) {
  return AETERLINK_DRIVE_PDF.saveIssuedPdf(payload);
}

function apiEnsureDrivePdfColumnsV1() {
  AETERLINK_DRIVE_PDF.ensurePdfColumns();
  return { ok: true, message: 'PDF link/status columns are ready.' };
}
