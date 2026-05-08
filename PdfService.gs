/**
 * AETERLINK Documentation Module — PdfService.gs
 * PDF and print/export helper namespace.
 * Safe refactor layer: does not change existing PDF generation logic yet.
 */
var AETERLINK_PDF = (function() {
  function buildExportMetadata(record, template, options) {
    options = options || {};
    record = record || {};
    template = template || {};

    return {
      documentNo: record.DocumentNo || '',
      revisionNo: record.RevisionNo || record.Revision || 'R00',
      templateCode: record.TemplateCode || template.TemplateCode || '',
      templateName: template.TemplateName || '',
      projectCode: record.ProjectCode || '',
      generatedAt: new Date().toISOString(),
      generatedBy: _activeEmail_(),
      paperSize: options.paperSize || 'A4',
      orientation: options.orientation || 'portrait'
    };
  }

  function normalizeFileName(value) {
    return String(value || 'document')
      .replace(/[\\/:*?"<>|#%{}~&]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildPdfFileName(record, template) {
    var meta = buildExportMetadata(record, template, {});
    var parts = [
      meta.projectCode,
      meta.documentNo,
      meta.templateCode,
      meta.revisionNo
    ].filter(function(part) { return String(part || '').trim(); });

    return normalizeFileName(parts.join('_') || 'AETERLINK_Document') + '.pdf';
  }

  function _activeEmail_() {
    try {
      return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
    } catch (err) {
      return '';
    }
  }

  return {
    buildExportMetadata: buildExportMetadata,
    normalizeFileName: normalizeFileName,
    buildPdfFileName: buildPdfFileName
  };
})();
