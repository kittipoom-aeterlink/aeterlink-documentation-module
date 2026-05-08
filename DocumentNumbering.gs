/**
 * AETERLINK Documentation Module — DocumentNumbering.gs
 * Document number helper namespace.
 * Safe refactor layer: does not change existing numbering logic yet.
 */
var AETERLINK_DOCNO = (function() {
  function pad(number, width) {
    number = String(number || 0);
    while (number.length < width) number = '0' + number;
    return number;
  }

  function fiscalYear(dateValue) {
    var date = dateValue ? new Date(dateValue) : new Date();
    return date.getFullYear();
  }

  function buildDocumentNo(projectCode, templateCode, sequence, revision) {
    projectCode = String(projectCode || 'PJ').trim() || 'PJ';
    templateCode = String(templateCode || 'DOC').trim() || 'DOC';
    sequence = pad(sequence || 1, 4);
    revision = String(revision || '').trim();

    var docNo = projectCode + '-' + templateCode + '-' + sequence;
    if (revision) docNo += '-' + revision;
    return docNo;
  }

  function nextSequenceFromRecords(records, templateCode) {
    templateCode = String(templateCode || '').trim();
    var max = 0;
    (records || []).forEach(function(record) {
      if (templateCode && String(record.TemplateCode || '').trim() !== templateCode) return;
      var docNo = String(record.DocumentNo || '').trim();
      var matches = docNo.match(/(\d{4})(?:-R\d+)?$/);
      if (matches) max = Math.max(max, Number(matches[1]));
    });
    return max + 1;
  }

  return {
    pad: pad,
    fiscalYear: fiscalYear,
    buildDocumentNo: buildDocumentNo,
    nextSequenceFromRecords: nextSequenceFromRecords
  };
})();
