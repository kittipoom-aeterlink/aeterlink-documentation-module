/**
 * AETERLINK Documentation Module — DocumentNumberingV2.gs
 * Production numbering facade for A4 workflow.
 *
 * Rules:
 * - Do not change Google Sheet structure.
 * - PJ-WORK-COMPLETE-001 is treated as alias of PJ-WCR-001.
 * - Document running number: 001, 002, 003...
 * - Revision suffix: first issue revision becomes 001-R01.
 * - Abbreviation logic:
 *   - 3+ significant words: first consonant of first 3 words. Work Completion Report = WCR.
 *   - 2 significant words: first 2 consonants of word 1 + first consonant of word 2. Material Requisition = MTR.
 *   - If duplicated, extend to 4 letters. Material Requisition duplicate style = MTRQ.
 */

var AETERLINK_NUMBERING_V2 = (function() {
  var TEMPLATE_ALIASES = {
    'PJ-WORK-COMPLETE-001': 'PJ-WCR-001',
    'PJ-WORK-COMPLETE': 'PJ-WCR-001'
  };

  function saveFormRecord(payload) {
    payload = payload || {};
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName('FORM_RECORDS');
      if (!sh) throw new Error('Sheet not found: FORM_RECORDS');
      var headers = getHeaders_(sh);
      if (!headers.length) throw new Error('FORM_RECORDS has no header row');

      var now = new Date();
      var nowIso = now.toISOString();
      var user = activeUser_().email;
      var data = payload.Data || {};
      var existingId = String(payload.FormRecordId || '').trim();
      var templateCode = canonicalTemplateCode_(payload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
      var projectCode = String(payload.ProjectCode || data.ProjectCode || 'TEST-PJ').trim();
      var revisionNo = normalizeRevisionNo_(payload.RevisionNo || data.RevisionNo || 'R00');
      var status = String(payload.Status || data.Status || 'Draft').trim();
      var formRecordId = existingId || createId_('FR');
      var rawDocumentNo = String(payload.DocumentNo || data.DocumentNo || '').trim();
      var documentNo = rawDocumentNo ? normalizeDocumentNo_(projectCode, templateCode, rawDocumentNo, revisionNo) : createDocumentNo_(projectCode, templateCode, revisionNo);

      if (data && typeof data === 'object') {
        data.TemplateCode = templateCode;
        data.DocumentNo = documentNo;
        data.RevisionNo = revisionNo;
        data.Status = status;
      }

      var record = {
        FormRecordId: formRecordId,
        ProjectCode: projectCode,
        TemplateCode: templateCode,
        DocumentNo: documentNo,
        RevisionNo: revisionNo,
        Status: status,
        DataJson: JSON.stringify(data),
        PdfUrl: payload.PdfUrl || '',
        SubmittedBy: payload.SubmittedBy || user,
        SubmittedAt: payload.SubmittedAt || '',
        ApprovedBy: payload.ApprovedBy || '',
        ApprovedAt: payload.ApprovedAt || '',
        CreatedAt: payload.CreatedAt || nowIso,
        UpdatedAt: nowIso,
        UpdatedBy: user,
        Revision: payload.Revision || revisionNo,
        IsDeleted: 'FALSE',
        RelatedTable: payload.RelatedTable || '',
        RelatedRecordId: payload.RelatedRecordId || '',
        DocumentStatus: payload.DocumentStatus || status,
        LockedAfterPdf: payload.LockedAfterPdf || 'FALSE',
        WorkflowGateId: payload.WorkflowGateId || '',
        ReviewComment: payload.ReviewComment || '',
        IssueNo: payload.IssueNo || extractIssueNo_(documentNo),
        RevisionReason: payload.RevisionReason || ''
      };

      var targetRow = findRowByValue_(sh, headers, 'FormRecordId', formRecordId);
      if (targetRow > 0 && payload.CreatedAt === undefined) {
        var old = rowToObject_(headers, sh.getRange(targetRow, 1, 1, headers.length).getDisplayValues()[0]);
        record.CreatedAt = old.CreatedAt || record.CreatedAt;
      }
      var rowValues = headers.map(function(h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
      if (targetRow > 0) sh.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      else { sh.appendRow(rowValues); targetRow = sh.getLastRow(); }

      return { ok: true, action: existingId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: targetRow, record: record, numbering: 'V2_CONSONANT_RULE' };
    } finally {
      lock.releaseLock();
    }
  }

  function createDocumentNo_(projectCode, templateCode, revisionNo) {
    var project = String(projectCode || 'TEST-PJ').trim();
    var canonical = canonicalTemplateCode_(templateCode);
    var base = project + '-' + documentCodePrefix_(canonical) + '-' + padIssueSeq_(nextIssueSeq_(project, canonical));
    return applyRevisionSuffix_(base, revisionNo);
  }

  function normalizeDocumentNo_(projectCode, templateCode, documentNo, revisionNo) {
    var project = String(projectCode || 'TEST-PJ').trim();
    var prefix = project + '-' + documentCodePrefix_(templateCode) + '-';
    var base = stripRevisionSuffix_(documentNo);
    var issue = extractIssueNo_(base);
    if (issue) base = prefix + issue;
    else if (base.indexOf(prefix) !== 0) base = prefix + padIssueSeq_(nextIssueSeq_(project, templateCode));
    return applyRevisionSuffix_(base, revisionNo);
  }

  function nextIssueSeq_(projectCode, templateCode) {
    var project = String(projectCode || '').trim();
    var canonical = canonicalTemplateCode_(templateCode);
    var prefix = project + '-' + documentCodePrefix_(canonical) + '-';
    var rows = readRows_('FORM_RECORDS');
    var max = 0, sameTemplateCount = 0;
    rows.forEach(function(r) {
      var rowTemplate = canonicalTemplateCode_(r.TemplateCode || '');
      var docNo = String(r.DocumentNo || '').trim();
      var sameTemplate = rowTemplate === canonical || docNo.indexOf(prefix) === 0;
      if (!sameTemplate || String(r.ProjectCode || '') !== project) return;
      sameTemplateCount++;
      var issue = extractIssueNo_(docNo);
      var n = parseInt(issue || '0', 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return max > 0 ? max + 1 : sameTemplateCount + 1;
  }

  function documentCodePrefix_(templateCode) {
    return 'PJ-' + uniqueAbbreviationForTemplate_(templateCode);
  }

  function uniqueAbbreviationForTemplate_(templateCode) {
    var canonical = canonicalTemplateCode_(templateCode);
    var templates = templateCatalog_();
    var target = templates.filter(function(t) { return t.code === canonical; })[0];
    var targetName = target ? target.name : templateNameForCode_(canonical);
    var base = baseAbbreviation_(targetName, canonical, 3);
    var sameBase = templates.filter(function(t) { return baseAbbreviation_(t.name, t.code, 3) === base; });
    if (sameBase.length <= 1) return base;
    var candidate = baseAbbreviation_(targetName, canonical, 4);
    var used = {};
    sameBase.forEach(function(t) {
      var c = baseAbbreviation_(t.name, t.code, 4);
      used[c] = (used[c] || 0) + 1;
    });
    if (used[candidate] <= 1) return candidate;
    return makeUniqueAbbreviation_(targetName, canonical, sameBase);
  }

  function makeUniqueAbbreviation_(name, code, peers) {
    var words = significantWords_(name || code);
    var source = words.map(function(w) { return consonants_(w) || letters_(w); }).join('') || String(code || '').replace(/[^A-Z0-9]/g, '');
    var base = baseAbbreviation_(name, code, 4);
    for (var len = 5; len <= 8; len++) {
      var candidate = (base + source).substring(0, len);
      var conflict = peers.some(function(p) {
        return p.code !== canonicalTemplateCode_(code) && (baseAbbreviation_(p.name, p.code, len) === candidate || (baseAbbreviation_(p.name, p.code, 4) + significantWords_(p.name).map(function(w) { return consonants_(w) || letters_(w); }).join('')).substring(0, len) === candidate);
      });
      if (!conflict) return candidate;
    }
    return (base + String(code || '').replace(/[^A-Z0-9]/g, '')).substring(0, 8);
  }

  function baseAbbreviation_(name, code, targetLength) {
    var canonical = canonicalTemplateCode_(code);
    var raw = cleanName_(name || canonical);
    if (/WORK\s+COMPLETION\s+REPORT/i.test(raw) || canonical === 'PJ-WCR-001') return targetLength > 3 ? 'WCRP' : 'WCR';
    var words = significantWords_(raw);
    if (!words.length) words = significantWords_(canonical.replace(/^PJ-/, '').replace(/-\d{3,4}$/, ''));
    var result = '';
    if (words.length >= 3) {
      result = firstSound_(words[0]) + firstSound_(words[1]) + firstSound_(words[2]);
      if (targetLength > 3) result += firstSound_(words[3] || secondSound_(words[2]) || secondSound_(words[1]) || secondSound_(words[0]));
    } else if (words.length === 2) {
      var w1 = consonants_(words[0]) || letters_(words[0]);
      var w2 = consonants_(words[1]) || letters_(words[1]);
      result = (w1 + 'XX').substring(0, 2) + (w2 + 'X').substring(0, 1);
      if (targetLength > 3) result = (w1 + 'XX').substring(0, 2) + (w2 + 'XX').substring(0, 2);
    } else {
      var w = consonants_(words[0] || canonical) || letters_(words[0] || canonical);
      result = (w + letters_(words[0] || canonical) + 'XXX').substring(0, targetLength > 3 ? 4 : 3);
    }
    result = String(result || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    var source = words.map(function(w) { return consonants_(w) || letters_(w); }).join('') + words.map(letters_).join('') + canonical.replace(/[^A-Z0-9]/g, '');
    while (result.length < (targetLength > 3 ? 4 : 3)) result += source.charAt(result.length) || 'X';
    return result.substring(0, targetLength > 3 ? 4 : 3);
  }

  function firstSound_(word) { var c = consonants_(word); return (c || letters_(word) || 'X').charAt(0); }
  function secondSound_(word) { var c = consonants_(word); return (c || letters_(word) || '').charAt(1); }
  function consonants_(word) { return letters_(word).replace(/[AEIOU]/g, ''); }
  function letters_(word) { return String(word || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function significantWords_(name) {
    var stop = { AND: true, OR: true, OF: true, THE: true, FOR: true, TO: true, FROM: true, BY: true, WITH: true, A: true, AN: true };
    return cleanName_(name).replace(/[()]/g, ' ').replace(/&/g, ' AND ').replace(/\//g, ' ').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(function(w) {
      return w && !stop[w] && !/^\d+$/.test(w);
    });
  }

  function cleanName_(value) {
    return String(value || '').replace(/^[A-Z0-9-]+\s+[—-]\s*/, '').trim();
  }

  function templateCatalog_() {
    var rows = readRows_('FORM_TEMPLATES');
    var map = {};
    rows.forEach(function(r) {
      var rawCode = String(r.TemplateCode || '').trim();
      var code = canonicalTemplateCode_(rawCode);
      if (!code) return;
      if (!map[code]) map[code] = { code: code, name: String(r.TemplateName || r.DocumentTitle || rawCode).trim() };
    });
    if (!map['PJ-WCR-001']) map['PJ-WCR-001'] = { code: 'PJ-WCR-001', name: 'Work Completion Report' };
    return Object.keys(map).map(function(k) { return map[k]; });
  }

  function templateNameForCode_(templateCode) {
    var canonical = canonicalTemplateCode_(templateCode);
    var rows = readRows_('FORM_TEMPLATES');
    for (var i = 0; i < rows.length; i++) {
      var code = String(rows[i].TemplateCode || '').trim();
      if (code === templateCode || canonicalTemplateCode_(code) === canonical) return String(rows[i].TemplateName || rows[i].DocumentTitle || '').trim();
    }
    return canonical === 'PJ-WCR-001' ? 'Work Completion Report' : canonical;
  }

  function canonicalTemplateCode_(templateCode) {
    var code = String(templateCode || '').trim().toUpperCase();
    return TEMPLATE_ALIASES[code] || code || 'PJ-WCR-001';
  }

  function normalizeRevisionNo_(revisionNo) {
    var value = String(revisionNo || '').trim().toUpperCase();
    if (!value || value === '0') return 'R00';
    var n = parseInt(value.replace(/\D/g, ''), 10);
    if (isNaN(n)) return value;
    return 'R' + ('00' + n).slice(-2);
  }

  function stripRevisionSuffix_(documentNo) {
    return String(documentNo || '').trim().replace(/-R\d{2}$/i, '');
  }

  function padIssueSeq_(seq) {
    var n = parseInt(seq, 10);
    if (isNaN(n) || n < 1) n = 1;
    return ('000' + n).slice(-3);
  }

  function extractIssueNo_(documentNo) {
    var m = stripRevisionSuffix_(documentNo).match(/-(\d{3,4})$/);
    if (!m) return '';
    return padIssueSeq_(m[1]);
  }

  function applyRevisionSuffix_(baseDocumentNo, revisionNo) {
    var base = stripRevisionSuffix_(baseDocumentNo);
    var rev = normalizeRevisionNo_(revisionNo);
    if (rev && rev !== 'R00' && rev !== '0') return base + '-' + rev;
    return base;
  }

  function readRows_(tableName) {
    try {
      if (typeof AETERLINK_DAO !== 'undefined' && AETERLINK_DAO && AETERLINK_DAO.readRows) return AETERLINK_DAO.readRows(tableName, { allowMissing: true, activeOnly: true });
    } catch (err) {}
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return [];
    var sh = ss.getSheetByName(tableName);
    if (!sh) return [];
    var values = sh.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return [];
    var headers = values[0].map(function(h) { return String(h || '').trim(); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var obj = {}, hasValue = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        obj[headers[c]] = values[r][c];
        if (values[r][c] !== '') hasValue = true;
      }
      if (hasValue) rows.push(obj);
    }
    return rows.filter(function(row) {
      var isDeleted = String(row.IsDeleted || '').toUpperCase();
      var active = String(row.Active || '').toUpperCase();
      return isDeleted !== 'TRUE' && isDeleted !== 'YES' && active !== 'FALSE' && active !== 'NO';
    });
  }

  function getHeaders_(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return [];
    return sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) { return String(h || '').trim(); });
  }

  function findRowByValue_(sheet, headers, keyField, keyValue) {
    var col = headers.indexOf(keyField) + 1;
    if (col < 1 || !keyValue) return -1;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var values = sheet.getRange(2, col, lastRow - 1, 1).getDisplayValues();
    for (var i = 0; i < values.length; i++) if (String(values[i][0] || '').trim() === keyValue) return i + 2;
    return -1;
  }

  function rowToObject_(headers, row) {
    var obj = {};
    headers.forEach(function(h, i) { if (h) obj[h] = row[i]; });
    return obj;
  }

  function createId_(prefix) {
    return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
  }

  function activeUser_() {
    var email = '';
    try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) { email = ''; }
    return { email: email, displayName: email ? email.split('@')[0] : 'User' };
  }

  return { saveFormRecord: saveFormRecord, createDocumentNo: createDocumentNo_, documentCodePrefix: documentCodePrefix_, baseAbbreviation: baseAbbreviation_ };
})();

function apiModularSaveFormRecordV2(payload) {
  return AETERLINK_NUMBERING_V2.saveFormRecord(payload);
}
