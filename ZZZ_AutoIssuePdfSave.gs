/**
 * AETERLINK Documentation Module — ZZZ_AutoIssuePdfSave.gs
 * Overrides apiModularSaveFormRecordV2 so Issue / Send automatically saves a PDF to Google Drive.
 *
 * This file intentionally does not change Google Sheet structure.
 * It updates existing PDF/status columns only when they already exist.
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

    var pdfPayload = {
      ProjectCode: record.ProjectCode || data.ProjectCode,
      TemplateCode: record.TemplateCode || data.TemplateCode,
      DocumentNo: record.DocumentNo || data.DocumentNo,
      RevisionNo: record.RevisionNo || data.RevisionNo,
      FormRecordId: record.FormRecordId || payload.FormRecordId || '',
      Html: buildIssuedA4Html_(data, record),
      Styles: buildIssuedA4Styles_()
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

function buildIssuedA4Styles_() {
  return [
    '@page{size:A4 portrait;margin:0}',
    'html,body{margin:0;padding:0;background:#fff;font-family:Arial,"Noto Sans Thai",sans-serif;color:#09243f}',
    '.a4-root{background:#fff;margin:0;padding:0}',
    '.a4-page{width:210mm;height:297mm;box-sizing:border-box;page-break-after:always;background:#fff;overflow:hidden}',
    '.a4-page-inner{height:100%;padding:10.5mm 10.5mm 11mm;box-sizing:border-box;display:flex;flex-direction:column}',
    '.a4-header{display:grid;grid-template-columns:48mm 100mm 41mm;border:1.2px solid #333;min-height:29mm;margin-bottom:5mm}',
    '.a4-logo-cell,.a4-title-cell,.a4-meta-cell{display:flex;align-items:center;justify-content:center;padding:2mm;border-right:1.2px solid #333;box-sizing:border-box}',
    '.a4-meta-cell{border-right:0;justify-content:flex-start;align-items:flex-start;padding-top:6mm}',
    '.a4-logo{font-size:14pt;font-weight:900;color:#0b86c6;letter-spacing:2px}',
    '.a4-title{font-size:17pt;font-weight:900;text-align:center;color:#06345d;letter-spacing:.5px;line-height:1.05}',
    '.a4-subtitle{font-size:6.1pt;color:#2e5d7d;text-align:center;margin-top:1.2mm;font-weight:700}',
    '.a4-meta{font-size:7.2pt;color:#111;line-height:1.2;font-weight:900;width:100%}',
    '.a4-meta-row{display:grid;grid-template-columns:17mm 1fr;column-gap:1mm;margin-bottom:.8mm}',
    '.a4-project-grid{width:100%;border-collapse:collapse;margin-bottom:4mm;font-size:7.6pt;table-layout:fixed}',
    '.a4-project-grid th{background:#fff;color:#06345d;font-weight:900;text-transform:uppercase;font-size:5.8pt;letter-spacing:.35px;text-align:left;padding:1.35mm 1.7mm .6mm;border:1px solid #333}',
    '.a4-project-grid td{font-size:7.8pt;font-weight:900;color:#09243f;padding:.8mm 1.7mm 1.55mm;border:1px solid #333;vertical-align:top}',
    '.a4-content{flex:1 1 auto;min-height:0;overflow:hidden}',
    '.a4-section-title{margin:0 0 2.4mm;padding:1.8mm 2.2mm;background:#113e63;color:#fff;border:1px solid #113e63;font-size:9pt;font-weight:900;letter-spacing:.8px;text-transform:uppercase;line-height:1}',
    '.a4-info-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:4.8mm}',
    '.a4-info-table th{width:48mm;background:#f0f0f0;color:#061f38;font-size:6.2pt;text-transform:uppercase;letter-spacing:.25px;text-align:left;border:1px solid #777;padding:1.12mm 1mm}',
    '.a4-info-table td{font-size:7.4pt;font-weight:900;border:1px solid #777;padding:1.12mm 1mm}',
    '.a4-detail-heading{margin-top:5mm}',
    'table.a4-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:3mm}',
    'table.a4-table th,table.a4-table td{border:1px solid #777;padding:1.05mm .9mm;white-space:normal;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;line-height:1.18}',
    'table.a4-table th{background:#f1f1f1;color:#061f38;font-size:6.5pt;font-weight:900;text-align:center}',
    'table.a4-table td{font-size:6.8pt;font-weight:700}',
    '.a4-footer{flex:0 0 auto;padding-top:1.5mm;font-size:6.3pt;color:#555;display:flex;justify-content:space-between;gap:4mm}',
    '.photo-grid{display:grid;grid-template-columns:1fr;gap:5mm}',
    '.photo-block{border:1px solid #777;height:91mm;display:grid;grid-template-columns:55% 45%;overflow:hidden}',
    '.photo-box{display:flex;align-items:center;justify-content:center;background:#f7fbfd;color:#6b7f90;font-size:10pt;border-right:1px solid #777;overflow:hidden}',
    '.photo-box img{width:100%;height:100%;object-fit:contain}',
    '.photo-info{padding:3mm;font-size:8pt;line-height:1.3}',
    '.photo-label{font-size:6.5pt;color:#06345d;text-transform:uppercase;font-weight:900;margin-top:2mm}'
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
  for (var i = 0; i < photos.length; i += 2) {
    pages.push(page_(title, subtitle, data, section_('PHOTO REPORT') + photoGrid_(photos.slice(i, i + 2))));
  }
  return '<div class="a4-root a4-print-area" id="a4PrintArea">' + pages.join('') + '</div>';
}

function issuedTitle_(data, record) {
  var t = String(data._TemplateTitle || data.TemplateName || record.TemplateCode || data.TemplateCode || 'PROJECT DOCUMENT').trim();
  return t.replace(/^PJ-[A-Z0-9-]+\s+[—-]\s*/i, '').toUpperCase();
}

function issuedRows_(data) {
  var rows = data.ChecklistRows || data.ScopeRows || data.Rows || [];
  if (!rows || !rows.length) rows = [{ Section: 'Purpose', RequiredInformation: 'Document purpose and intended use', InputDetails: '', Responsibility: '', Status: 'Issued', Remarks: '' }];
  return rows.map(function (r) {
    r = r || {};
    var out = {};
    Object.keys(r).forEach(function (k) {
      if (k === 'Package' || k === 'Action') return;
      out[k] = r[k];
    });
    return out;
  });
}

function issuedColumns_(rows, data) {
  if (data.ChecklistRows) return [
    { key: 'No', label: 'No.', width: '10mm' },
    { key: 'EquipmentTag', label: 'Equipment Tag', width: '24mm' },
    { key: 'Description', label: 'Description', width: '42mm' },
    { key: 'Location', label: 'Location', width: '24mm' },
    { key: 'CheckItem', label: 'Check Item', width: '58mm' },
    { key: 'Status', label: 'Status', width: '18mm' },
    { key: 'Remark', label: 'Remark', width: '22mm' }
  ];
  var keys = Object.keys(rows[0] || {});
  var preferred = ['Item','Section','WorkDescription','RequiredInformation','InputDetails','Qty','Unit','Responsibility','Responsible','Status','Remarks','Remark'];
  keys.sort(function (a, b) { return order_(preferred, a) - order_(preferred, b); });
  return keys.map(function (k) {
    var label = ({ WorkDescription:'Work Description', RequiredInformation:'Required Information', InputDetails:'Input / Details', Qty:'Qty.', Responsibility:'Responsible' })[k] || k;
    var width = /Input|Work|Required/.test(k) ? '48mm' : (/Status/.test(k) ? '17mm' : '24mm');
    return { key: k, label: label, width: width };
  });
}

function order_(arr, key) { var i = arr.indexOf(key); return i < 0 ? 999 : i; }
function section_(title) { return '<div class="a4-section-title">' + html_(title) + '</div>'; }
function documentInfo_(rows) { return section_('DOCUMENT INFORMATION') + '<table class="a4-info-table"><tbody>' + rows.map(function (r) { return '<tr><th>' + html_(r[0]) + '</th><td>' + html_(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>'; }
function table_(cols, rows) { return '<table class="a4-table"><thead><tr>' + cols.map(function (c) { return '<th style="width:' + html_(c.width || 'auto') + '">' + html_(c.label || c.key) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + html_(r[c.key] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>'; }
function page_(title, subtitle, data, content) { return '<div class="a4-page"><div class="a4-page-inner">' + header_(title, subtitle, data) + projectGrid_(data) + '<div class="a4-content">' + content + '</div><footer class="a4-footer"><span>AETERLINK Documentation Control</span><span>A4 controlled layout</span></footer></div></div>'; }
function header_(title, subtitle, data) { return '<header class="a4-header"><div class="a4-logo-cell"><div class="a4-logo">AETERLINK</div></div><div class="a4-title-cell"><div><div class="a4-title">' + html_(title) + '</div><div class="a4-subtitle">' + html_(subtitle || '') + '</div></div></div><div class="a4-meta-cell"><div class="a4-meta"><div class="a4-meta-row"><b>Doc No.:</b><span>' + html_(data.DocumentNo || 'Not issued') + '</span></div><div class="a4-meta-row"><b>Rev.:</b><span>' + html_(data.RevisionNo || 'R00') + '</span></div><div class="a4-meta-row"><b>Date:</b><span>' + html_(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy')) + '</span></div></div></div></header>'; }
function projectGrid_(data) { return '<table class="a4-project-grid"><tbody><tr><th>Project Code</th><th>Project Name / Site</th><th>Client</th><th>Main-Contractor</th></tr><tr><td>' + html_(data.ProjectCode || '') + '</td><td>' + html_(data.ProjectName || '') + '</td><td>' + html_(data.Client || '') + '</td><td>' + html_(data.MainContractor || '') + '</td></tr></tbody></table>'; }
function photoGrid_(photos) { photos = photos || []; while (photos.length < 2) photos.push({}); return '<div class="photo-grid">' + photos.slice(0, 2).map(function (p, i) { var url = p.PhotoUrl || ''; return '<div class="photo-block"><div class="photo-box">' + (url ? '<img src="' + html_(url) + '">' : 'Photo ' + (i + 1)) + '</div><div class="photo-info"><div class="photo-label">Item No.</div><div>' + html_(p.ItemNo || p.Item || '') + '</div><div class="photo-label">Description</div><div>' + html_(p.Description || p.Caption || '') + '</div><div class="photo-label">Note</div><div>' + html_(p.Note || '') + '</div></div></div>'; }).join('') + '</div>'; }
function html_(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]; }); }
