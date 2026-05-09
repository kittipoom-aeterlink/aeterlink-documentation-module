/**
 * AETERLINK Documentation Module — ZZZ_AutoIssuePdfSave.gs
 * Overrides apiModularSaveFormRecordV2 so Issue / Send automatically saves a PDF to Google Drive.
 */

function apiModularSaveFormRecordV2(payload) {
  payload = payload || {};
  var result = AETERLINK_NUMBERING_V3.saveFormRecord(payload);
  var status = String((payload.Status || payload.DocumentStatus || (payload.Data && payload.Data.Status) || '')).toUpperCase();
  if (status !== 'ISSUED') return result;

  try {
    var record = result && result.record ? result.record : {};
    var data = payload.Data || {};
    data.DocumentNo = record.DocumentNo || data.DocumentNo || '';
    data.RevisionNo = record.RevisionNo || data.RevisionNo || 'R00';
    data.Status = 'Issued';
    data.TemplateCode = record.TemplateCode || payload.TemplateCode || data.TemplateCode || '';
    data.ProjectCode = record.ProjectCode || payload.ProjectCode || data.ProjectCode || '';

    var html = String(payload.Html || '').trim();
    var styles = String(payload.Styles || '').trim();
    if (!html) {
      html = buildIssuedA4Html_(data, record);
      styles = buildIssuedA4Styles_();
    }

    var pdfPayload = {
      ProjectCode: record.ProjectCode || data.ProjectCode,
      TemplateCode: record.TemplateCode || data.TemplateCode,
      DocumentNo: record.DocumentNo || data.DocumentNo,
      RevisionNo: record.RevisionNo || data.RevisionNo,
      FormRecordId: record.FormRecordId || payload.FormRecordId || '',
      Html: sanitizeIssuedHtml_(html),
      Styles: buildIssuedA4Styles_() + '\n' + styles
    };
    var pdf = AETERLINK_DRIVE_PDF.saveIssuedPdf(pdfPayload);
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
      result.record.LockedAfterPdf = 'TRUE';
    }
  } catch (err) {
    result.pdfStatus = 'PDF_SAVE_FAILED';
    result.pdfError = err && err.message ? err.message : String(err);
  }
  return result;
}

function sanitizeIssuedHtml_(html) {
  html = String(html || '');
  html = html.replace(/ contenteditable="true"/g, '').replace(/ spellcheck="false"/g, '');
  html = html.replace(/<button[\s\S]*?<\/button>/gi, '');
  html = html.replace(/<select[\s\S]*?<\/select>/gi, function (selectHtml) {
    var m = selectHtml.match(/<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i);
    if (!m) m = selectHtml.match(/<option[^>]*>([\s\S]*?)<\/option>/i);
    return html_(cleanIssuedStatus_((m && m[1]) || ''));
  });
  html = html.replace(/<span class="a4-status-print"[^>]*>\s*(DoneDone|PendingPending|OpenOpen|IssuedIssued|DraftDraft)\s*<\/span>/gi, function (_, v) {
    return '<span class="a4-status-print">' + html_(cleanIssuedStatus_(v)) + '</span>';
  });
  return html;
}

function cleanIssuedStatus_(v) {
  v = String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  var names = ['Done', 'Pending', 'Not Started', 'In Progress', 'Issue', 'N/A', 'Open', 'Closed', 'Issued', 'Draft', 'Approved', 'Submitted'];
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (v === n + n || v.replace(/\s+/g, '') === (n + n).replace(/\s+/g, '')) return n;
  }
  return v;
}

function buildIssuedA4Styles_() {
  return [
    '@page{size:A4 portrait;margin:0}',
    '*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}',
    'html,body{margin:0!important;padding:0!important;background:#fff!important;font-family:Arial,"Noto Sans Thai",sans-serif;color:#09243f;width:210mm!important;min-width:210mm!important}',
    '.a4-root,.a4-print-area{background:#fff!important;margin:0!important;padding:0!important;width:210mm!important;max-width:210mm!important;overflow:visible!important}',
    '.a4-page{position:relative!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;page-break-after:always!important;break-after:page!important;background:#fff!important;overflow:hidden!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important}',
    '.a4-page:last-child{page-break-after:auto!important;break-after:auto!important}',
    '.a4-page-inner{width:100%!important;height:100%!important;padding:10.5mm 10.5mm 11mm!important;box-sizing:border-box!important;display:flex!important;flex-direction:column!important}',
    '.a4-header{display:grid!important;grid-template-columns:48mm 100mm 41mm!important;border:1.2px solid #333!important;min-height:29mm!important;margin-bottom:5mm!important}',
    '.a4-logo-cell,.a4-title-cell,.a4-meta-cell{display:flex!important;align-items:center!important;justify-content:center!important;padding:2mm!important;border-right:1.2px solid #333!important;box-sizing:border-box!important}',
    '.a4-meta-cell{border-right:0!important;justify-content:flex-start!important;align-items:flex-start!important;padding-top:6mm!important}',
    '.a4-logo{font-size:14pt!important;font-weight:900!important;color:#0b86c6!important;letter-spacing:2px!important}',
    '.a4-title{font-size:17pt!important;font-weight:900!important;text-align:center!important;color:#06345d!important;letter-spacing:.5px!important;line-height:1.05!important}',
    '.a4-subtitle{font-size:6.1pt!important;color:#2e5d7d!important;text-align:center!important;margin-top:1.2mm!important;font-weight:700!important}',
    '.a4-meta{font-size:7.2pt!important;color:#111!important;line-height:1.2!important;font-weight:900!important;width:100%!important}',
    '.a4-meta-row{display:grid!important;grid-template-columns:17mm 1fr!important;column-gap:1mm!important;margin-bottom:.8mm!important}',
    '.a4-project-grid{width:100%!important;border-collapse:separate!important;border-spacing:0!important;margin-bottom:4mm!important;font-size:7.6pt!important;table-layout:fixed!important}',
    '.a4-project-grid th,.a4-project-grid td{border:0!important;border-right:.18mm solid #666!important;border-bottom:.18mm solid #666!important}',
    '.a4-project-grid tr:first-child>*{border-top:.18mm solid #666!important}.a4-project-grid tr>*:first-child{border-left:.18mm solid #666!important}',
    '.a4-project-grid th{background:#fff!important;color:#06345d!important;font-weight:900!important;text-transform:uppercase!important;font-size:5.8pt!important;letter-spacing:.35px!important;text-align:left!important;padding:1.35mm 1.7mm .6mm!important}',
    '.a4-project-grid td{font-size:7.8pt!important;font-weight:900!important;color:#09243f!important;padding:.8mm 1.7mm 1.55mm!important;vertical-align:top!important}',
    '.a4-content{flex:1 1 auto!important;min-height:0!important;overflow:hidden!important}',
    '.a4-section-title{margin:0 0 2.4mm!important;padding:1.8mm 2.2mm!important;background:#113e63!important;color:#fff!important;border:1px solid #113e63!important;font-size:9pt!important;font-weight:900!important;letter-spacing:.8px!important;text-transform:uppercase!important;line-height:1!important}',
    '.a4-info-table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;table-layout:fixed!important;margin-bottom:4.8mm!important}',
    '.a4-info-table th,.a4-info-table td{border:0!important;border-right:.18mm solid #666!important;border-bottom:.18mm solid #666!important}',
    '.a4-info-table tr:first-child>*{border-top:.18mm solid #666!important}.a4-info-table tr>*:first-child{border-left:.18mm solid #666!important}',
    '.a4-info-table th{width:48mm!important;background:#f0f0f0!important;color:#061f38!important;font-size:6.2pt!important;text-transform:uppercase!important;letter-spacing:.25px!important;text-align:left!important;padding:1.12mm 1mm!important}',
    '.a4-info-table td{font-size:7.4pt!important;font-weight:900!important;padding:1.12mm 1mm!important}',
    'table.a4-scope-table,table.a4-table{width:100%!important;max-width:100%!important;border-collapse:separate!important;border-spacing:0!important;table-layout:fixed!important;border:0!important;outline:0!important;box-shadow:none!important;margin-bottom:3mm!important}',
    'table.a4-scope-table th,table.a4-scope-table td,table.a4-table th,table.a4-table td{border:0!important;border-right:.18mm solid #666!important;border-bottom:.18mm solid #666!important;box-shadow:none!important;background-clip:padding-box!important;padding:1.05mm .9mm!important;white-space:normal!important;word-break:break-word!important;overflow-wrap:anywhere!important;vertical-align:middle!important;line-height:1.18!important}',
    'table.a4-scope-table thead tr:first-child>*,table.a4-table thead tr:first-child>*{border-top:.18mm solid #666!important}',
    'table.a4-scope-table tr>*:first-child,table.a4-table tr>*:first-child{border-left:.18mm solid #666!important}',
    'table.a4-scope-table tr>*:last-child,table.a4-table tr>*:last-child{border-right:.18mm solid #666!important}',
    'table.a4-scope-table tbody tr:last-child>*,table.a4-table tbody tr:last-child>*{border-bottom:.18mm solid #666!important}',
    'table.a4-scope-table th,table.a4-table th{background:#f1f1f1!important;color:#061f38!important;font-size:6.5pt!important;font-weight:900!important;text-align:center!important}',
    'table.a4-scope-table td,table.a4-table td{font-size:6.8pt!important;font-weight:800!important;text-align:center!important}',
    '.a4-status-select,.a4-no-print,.a4-preview-actions,.prod-inline-editor,.prod-row-delete,.prod-photo-report-toolbar,.row-actions,.photo-actions{display:none!important;visibility:hidden!important}',
    '.a4-status-print{display:inline!important;visibility:visible!important}',
    '.a4-detail-note{display:none!important;height:0!important;margin:0!important;padding:0!important;border:0!important;visibility:hidden!important}',
    '.a4-footer{flex:0 0 auto!important;padding-top:1.5mm!important;font-size:6.3pt!important;color:#555!important;display:flex!important;justify-content:center!important;text-align:center!important;gap:0!important}',
    '.a4-footer>span:not(.a4-footer-center){display:none!important}.a4-footer-center{display:block!important;width:100%!important;text-align:center!important;font-size:6.4pt!important;line-height:1.15!important;font-weight:700!important;color:#555!important}',
    '.photo-grid{display:grid!important;grid-template-columns:1fr!important;gap:5mm!important}.photo-block{border:.18mm solid #666!important;height:91mm!important;display:grid!important;grid-template-columns:55% 45%!important;overflow:hidden!important}.photo-box{display:flex!important;align-items:center!important;justify-content:center!important;background:#f7fbfd!important;color:#6b7f90!important;font-size:10pt!important;border-right:.18mm solid #666!important;overflow:hidden!important}.photo-box img{width:100%!important;height:100%!important;object-fit:contain!important}.photo-info{padding:3mm!important;font-size:8pt!important;line-height:1.3!important}.photo-label{font-size:6.5pt!important;color:#06345d!important;text-transform:uppercase!important;font-weight:900!important;margin-top:2mm!important}'
  ].join('\n');
}

function buildIssuedA4Html_(data, record) {
  data = data || {};
  record = record || {};
  var title = issuedTitle_(data, record);
  var subtitle = data._TemplateSubtitle || data.WorkType || 'Controlled Project Document';
  var pages = [];
  var rows = issuedRows_(data);
  var cols = issuedColumns_(rows, data);
  var info = [
    ['Document Purpose', data.Remarks || data.DocumentPurpose || '-'],
    ['Document Type / Code', (record.TemplateCode || data.TemplateCode || '-') + ' — ' + title],
    ['Work Type / Phase', data.WorkType || subtitle || '-'],
    ['Reference Documents', data.ReferenceDocuments || '-'],
    ['Prepared By', data.PreparedBy || record.SubmittedBy || ''],
    ['Approval Status', 'Issued']
  ];
  pages.push(page_(title, subtitle, data, documentInfo_(info) + section_('DOCUMENT DETAILS') + table_(cols, rows)));
  var photos = data.Photos || [];
  for (var i = 0; i < photos.length; i += 2) pages.push(page_(title, subtitle, data, section_('PHOTO REPORT') + photoGrid_(photos.slice(i, i + 2))));
  return '<div class="a4-root a4-print-area" id="a4PrintArea">' + pages.join('') + '</div>';
}
function issuedTitle_(data, record) { var t = String(data._TemplateTitle || data.TemplateName || record.TemplateCode || data.TemplateCode || 'PROJECT DOCUMENT').trim(); return t.replace(/^PJ-[A-Z0-9-]+\s+[—-]\s*/i, '').toUpperCase(); }
function issuedRows_(data) { var rows = data.ChecklistRows || data.ScopeRows || data.Rows || []; if (!rows || !rows.length) rows = [{ Section: 'Purpose', RequiredInformation: 'Document purpose and intended use', InputDetails: '', Responsibility: '', Status: 'Issued', Remarks: '' }]; return rows.map(function (r) { r = r || {}; var out = {}; Object.keys(r).forEach(function (k) { if (k === 'Package' || k === 'Action') return; out[k] = cleanIssuedStatus_(r[k]); }); return out; }); }
function issuedColumns_(rows, data) { if (data.ChecklistRows) return [{key:'No',label:'No.',width:'10mm'},{key:'EquipmentTag',label:'Equipment Tag',width:'24mm'},{key:'Description',label:'Description',width:'42mm'},{key:'Location',label:'Location',width:'24mm'},{key:'CheckItem',label:'Check Item',width:'58mm'},{key:'Status',label:'Status',width:'18mm'},{key:'Remark',label:'Remark',width:'22mm'}]; var keys = Object.keys(rows[0] || {}); var preferred = ['Item','Section','WorkDescription','RequiredInformation','InputDetails','Qty','Unit','Responsibility','Responsible','Status','Remarks','Remark']; keys.sort(function (a, b) { return order_(preferred, a) - order_(preferred, b); }); return keys.map(function (k) { var label = ({ WorkDescription:'Work Description', RequiredInformation:'Required Information', InputDetails:'Input / Details', Qty:'Qty.', Responsibility:'Responsible' })[k] || k; var width = /Input|Work|Required/.test(k) ? '48mm' : (/Status/.test(k) ? '17mm' : '24mm'); return { key: k, label: label, width: width }; }); }
function order_(arr, key) { var i = arr.indexOf(key); return i < 0 ? 999 : i; }
function section_(title) { return '<div class="a4-section-title">' + html_(title) + '</div>'; }
function documentInfo_(rows) { return section_('DOCUMENT INFORMATION') + '<table class="a4-info-table"><tbody>' + rows.map(function (r) { return '<tr><th>' + html_(r[0]) + '</th><td>' + html_(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>'; }
function table_(cols, rows) { return '<table class="a4-table a4-scope-table"><thead><tr>' + cols.map(function (c) { return '<th style="width:' + html_(c.width || 'auto') + '">' + html_(c.label || c.key) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + html_(cleanIssuedStatus_(r[c.key] || '')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>'; }
function page_(title, subtitle, data, content) { return '<div class="a4-page"><div class="a4-page-inner">' + header_(title, subtitle, data) + projectGrid_(data) + '<div class="a4-content">' + content + '</div><footer class="a4-footer"><span class="a4-footer-center">Document No.: ' + html_(data.DocumentNo || 'Not issued') + ' &nbsp;&nbsp;|&nbsp;&nbsp; Page No.: 1 / 1</span></footer></div></div>'; }
function header_(title, subtitle, data) { return '<header class="a4-header"><div class="a4-logo-cell"><div class="a4-logo">AETERLINK</div></div><div class="a4-title-cell"><div><div class="a4-title">' + html_(title) + '</div><div class="a4-subtitle">' + html_(subtitle || '') + '</div></div></div><div class="a4-meta-cell"><div class="a4-meta"><div class="a4-meta-row"><b>Doc No.:</b><span>' + html_(data.DocumentNo || 'Not issued') + '</span></div><div class="a4-meta-row"><b>Rev.:</b><span>' + html_(data.RevisionNo || 'R00') + '</span></div><div class="a4-meta-row"><b>Date:</b><span>' + html_(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy')) + '</span></div></div></div></header>'; }
function projectGrid_(data) { return '<table class="a4-project-grid"><tbody><tr><th>Project Code</th><th>Project Name / Site</th><th>Client</th><th>Main-Contractor</th></tr><tr><td>' + html_(data.ProjectCode || '') + '</td><td>' + html_(data.ProjectName || '') + '</td><td>' + html_(data.Client || '') + '</td><td>' + html_(data.MainContractor || '') + '</td></tr></tbody></table>'; }
function photoGrid_(photos) { photos = photos || []; while (photos.length < 2) photos.push({}); return '<div class="photo-grid">' + photos.slice(0, 2).map(function (p, i) { var url = p.PhotoUrl || ''; return '<div class="photo-block"><div class="photo-box">' + (url ? '<img src="' + html_(url) + '">' : 'Photo ' + (i + 1)) + '</div><div class="photo-info"><div class="photo-label">Item No.</div><div>' + html_(p.ItemNo || p.Item || '') + '</div><div class="photo-label">Description</div><div>' + html_(p.Description || p.Caption || '') + '</div><div class="photo-label">Note</div><div>' + html_(p.Note || '') + '</div></div></div>'; }).join('') + '</div>'; }
function html_(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]; }); }
