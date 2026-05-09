/**
 * AETERLINK Documentation Module — ZZ_DocumentNumberingV3.gs
 * Safe override for production document numbering.
 *
 * Rules applied to every document:
 * - PJ-WORK-COMPLETE-001 is canonicalized to PJ-WCR-001.
 * - Running issue number is 001, 002, 003...
 * - Revision suffix is added as -R01, -R02... for revised documents.
 * - Explicit acronym in document name has priority: Inspection Test Plan (ITP) => ITP.
 * - 3+ title words: first sound/letter of each of the first 3 words: Installation Inspection Record => IIR.
 * - 2 title words: first 2 sounds from word 1 + first sound from word 2: Installation Checklist => ISC, Material Requisition => MTR.
 * - If duplicate, extend to 4 characters using the same rule: Material Requisition duplicate style => MTRQ.
 */

var AETERLINK_NUMBERING_V3 = (function() {
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
      var headers = headers_(sh);
      if (!headers.length) throw new Error('FORM_RECORDS has no header row');

      var now = new Date();
      var nowIso = now.toISOString();
      var data = payload.Data || {};
      var user = activeUser_().email;
      var existingId = String(payload.FormRecordId || '').trim();
      var templateCode = canonicalCode_(payload.TemplateCode || data.TemplateCode || 'PJ-WCR-001');
      var projectCode = String(payload.ProjectCode || data.ProjectCode || 'TEST-PJ').trim();
      var revisionNo = normalizeRevision_(payload.RevisionNo || data.RevisionNo || 'R00');
      var status = String(payload.Status || data.Status || 'Draft').trim();
      var formRecordId = existingId || id_('FR');
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

      var targetRow = findRow_(sh, headers, 'FormRecordId', formRecordId);
      if (targetRow > 0 && payload.CreatedAt === undefined) {
        var old = rowObject_(headers, sh.getRange(targetRow, 1, 1, headers.length).getDisplayValues()[0]);
        record.CreatedAt = old.CreatedAt || record.CreatedAt;
      }
      var rowValues = headers.map(function(h) { return Object.prototype.hasOwnProperty.call(record, h) ? record[h] : ''; });
      if (targetRow > 0) sh.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      else { sh.appendRow(rowValues); targetRow = sh.getLastRow(); }

      return { ok: true, action: existingId ? 'updated' : 'created', tableName: 'FORM_RECORDS', row: targetRow, record: record, numbering: 'V3_SOUND_RULE' };
    } finally {
      lock.releaseLock();
    }
  }

  function createDocumentNo_(projectCode, templateCode, revisionNo) {
    var project = String(projectCode || 'TEST-PJ').trim();
    var canonical = canonicalCode_(templateCode);
    var base = project + '-' + prefix_(canonical) + '-' + pad_(nextIssueSeq_(project, canonical));
    return applyRevision_(base, revisionNo);
  }

  function normalizeDocumentNo_(projectCode, templateCode, documentNo, revisionNo) {
    var project = String(projectCode || 'TEST-PJ').trim();
    var prefix = project + '-' + prefix_(templateCode) + '-';
    var base = stripRevision_(documentNo);
    var issue = extractIssueNo_(base);
    if (issue) base = prefix + issue;
    else if (base.indexOf(prefix) !== 0) base = prefix + pad_(nextIssueSeq_(project, templateCode));
    return applyRevision_(base, revisionNo);
  }

  function nextIssueSeq_(projectCode, templateCode) {
    var project = String(projectCode || '').trim();
    var canonical = canonicalCode_(templateCode);
    var prefix = project + '-' + prefix_(canonical) + '-';
    var rows = readRows_('FORM_RECORDS');
    var max = 0;
    rows.forEach(function(r) {
      var rowTemplate = canonicalCode_(r.TemplateCode || '');
      var docNo = String(r.DocumentNo || '').trim();
      if (String(r.ProjectCode || '') !== project) return;
      if (rowTemplate !== canonical && docNo.indexOf(prefix) !== 0) return;
      var n = parseInt(extractIssueNo_(docNo) || '0', 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return max + 1;
  }

  function prefix_(templateCode) {
    return 'PJ-' + uniqueAbbrev_(templateCode);
  }

  function uniqueAbbrev_(templateCode) {
    var canonical = canonicalCode_(templateCode);
    var catalog = templateCatalog_();
    var target = catalog.filter(function(t) { return t.code === canonical; })[0];
    var name = target ? target.name : templateName_(canonical);
    var base = abbreviation_(name, canonical, 3);
    var same = catalog.filter(function(t) { return abbreviation_(t.name, t.code, 3) === base; });
    if (same.length <= 1) return base;
    var candidate = abbreviation_(name, canonical, 4);
    var used = {};
    same.forEach(function(t) { var a = abbreviation_(t.name, t.code, 4); used[a] = (used[a] || 0) + 1; });
    if (used[candidate] <= 1) return candidate;
    var source = words_(name).map(letters_).join('') + canonical.replace(/[^A-Z0-9]/g, '');
    for (var len = 5; len <= 8; len++) {
      var extended = (candidate + source).substring(0, len);
      var conflict = same.some(function(t) {
        if (t.code === canonical) return false;
        return (abbreviation_(t.name, t.code, 4) + words_(t.name).map(letters_).join('')).substring(0, len) === extended;
      });
      if (!conflict) return extended;
    }
    return (candidate + source).substring(0, 8);
  }

  function abbreviation_(name, code, length) {
    code = canonicalCode_(code);
    name = cleanName_(name || code, code);
    var explicit = explicitAcronym_(name);
    if (explicit) return extend_(explicit, name, length);
    if (/WORK\s+COMPLETION\s+REPORT/i.test(name) || code === 'PJ-WCR-001') return length > 3 ? 'WCRP' : 'WCR';
    var w = words_(name);
    if (!w.length) w = words_(code.replace(/^PJ-/, '').replace(/-\d{3,4}$/, ''));
    var result = '';
    if (w.length >= 3) {
      result = first_(w[0]) + first_(w[1]) + first_(w[2]);
      if (length > 3) result += first_(w[3]) || secondSound_(w[2]) || secondSound_(w[1]) || secondSound_(w[0]) || 'X';
    } else if (w.length === 2) {
      result = firstTwoSounds_(w[0]) + first_(w[1]);
      if (length > 3) result = firstTwoSounds_(w[0]) + firstTwoSounds_(w[1]);
    } else {
      result = (firstTwoSounds_(w[0] || code) + secondSound_(String(w[0] || code).substring(1)) + 'X').substring(0, length > 3 ? 4 : 3);
    }
    result = letters_(result);
    var source = w.map(letters_).join('') + code.replace(/[^A-Z0-9]/g, '');
    while (result.length < (length > 3 ? 4 : 3)) result += source.charAt(result.length) || 'X';
    return result.substring(0, length > 3 ? 4 : 3);
  }

  function explicitAcronym_(name) {
    var s = String(name || '');
    var m = s.match(/\(([A-Z0-9]{2,6})\)/);
    if (m) return m[1].toUpperCase();
    var slash = s.match(/[\/]\s*([A-Z0-9]{2,6})\b/);
    return slash ? slash[1].toUpperCase() : '';
  }

  function extend_(acronym, name, length) {
    acronym = letters_(acronym);
    if (length <= 3) return (acronym + 'XXX').substring(0, 3);
    if (acronym.length >= 4) return acronym.substring(0, 4);
    var source = words_(name.replace(/\([^)]*\)/g, '')).map(letters_).join('') + acronym + 'X';
    while (acronym.length < 4) acronym += source.charAt(acronym.length) || 'X';
    return acronym.substring(0, 4);
  }

  function firstTwoSounds_(word) {
    var w = letters_(word);
    if (!w) return 'XX';
    if (/^IN[A-Z]/.test(w) && w.length > 2) return w.charAt(0) + w.charAt(2); // INSTALLATION / INSPECTION => IS
    return w.charAt(0) + secondSound_(w);
  }

  function secondSound_(word) {
    var w = letters_(word);
    if (!w) return 'X';
    if (/^IN[A-Z]/.test(w) && w.length > 2) return w.charAt(2);
    for (var i = 1; i < w.length; i++) {
      if (/[AEIOU]/.test(w.charAt(i))) {
        for (var j = i + 1; j < w.length; j++) if (!/[AEIOU]/.test(w.charAt(j))) return w.charAt(j);
        break;
      }
    }
    for (var k = 1; k < w.length; k++) if (!/[AEIOU]/.test(w.charAt(k))) return w.charAt(k);
    return w.charAt(1) || w.charAt(0) || 'X';
  }

  function first_(word) { return (letters_(word) || 'X').charAt(0); }
  function letters_(word) { return String(word || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function words_(name) {
    return cleanName_(name)
      .replace(/KICK[-\s]*OFF/ig, 'KICKOFF')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/&/g, ' AND ')
      .replace(/[\/]/g, ' ')
      .replace(/[-–—]/g, ' ')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(function(w) { return w && !/^\d+$/.test(w); });
  }

  function cleanName_(value, code) {
    var v = String(value || code || '').replace(/^[A-Z0-9-]+\s+[—-]\s*/, '').trim();
    if (!v || /^PJ-[A-Z0-9-]+$/.test(v)) v = String(code || '').replace(/^PJ-/, '').replace(/-\d{3,4}$/, '').replace(/-/g, ' ');
    return v;
  }

  function templateCatalog_() {
    var rows = readRows_('FORM_TEMPLATES');
    var map = {};
    rows.forEach(function(r) {
      var rawCode = String(r.TemplateCode || '').trim();
      var code = canonicalCode_(rawCode);
      if (!code) return;
      if (!map[code]) map[code] = { code: code, name: String(r.TemplateName || r.DocumentTitle || rawCode).trim() };
    });
    if (!map['PJ-WCR-001']) map['PJ-WCR-001'] = { code: 'PJ-WCR-001', name: 'Work Completion Report' };
    return Object.keys(map).map(function(k) { return map[k]; });
  }

  function templateName_(templateCode) {
    var canonical = canonicalCode_(templateCode);
    var rows = readRows_('FORM_TEMPLATES');
    for (var i = 0; i < rows.length; i++) {
      var code = String(rows[i].TemplateCode || '').trim();
      if (code === templateCode || canonicalCode_(code) === canonical) return String(rows[i].TemplateName || rows[i].DocumentTitle || '').trim();
    }
    return canonical === 'PJ-WCR-001' ? 'Work Completion Report' : canonical;
  }

  function canonicalCode_(code) {
    code = String(code || '').trim().toUpperCase();
    return TEMPLATE_ALIASES[code] || code || 'PJ-WCR-001';
  }

  function normalizeRevision_(revisionNo) {
    var value = String(revisionNo || '').trim().toUpperCase();
    if (!value || value === '0') return 'R00';
    var n = parseInt(value.replace(/\D/g, ''), 10);
    return isNaN(n) ? value : 'R' + ('00' + n).slice(-2);
  }

  function stripRevision_(documentNo) { return String(documentNo || '').trim().replace(/-R\d{2}$/i, ''); }
  function pad_(seq) { var n = parseInt(seq, 10); if (isNaN(n) || n < 1) n = 1; return ('000' + n).slice(-3); }
  function extractIssueNo_(documentNo) { var m = stripRevision_(documentNo).match(/-(\d{3,4})$/); return m ? pad_(m[1]) : ''; }
  function applyRevision_(baseDocumentNo, revisionNo) { var base = stripRevision_(baseDocumentNo); var rev = normalizeRevision_(revisionNo); return rev && rev !== 'R00' && rev !== '0' ? base + '-' + rev : base; }

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
      var obj = {}, has = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        obj[headers[c]] = values[r][c];
        if (values[r][c] !== '') has = true;
      }
      if (has) rows.push(obj);
    }
    return rows.filter(function(row) {
      var isDeleted = String(row.IsDeleted || '').toUpperCase();
      var active = String(row.Active || '').toUpperCase();
      return isDeleted !== 'TRUE' && isDeleted !== 'YES' && active !== 'FALSE' && active !== 'NO';
    });
  }

  function headers_(sheet) { return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function(h) { return String(h || '').trim(); }); }
  function findRow_(sheet, headers, key, value) {
    var col = headers.indexOf(key) + 1;
    if (col < 1 || !value || sheet.getLastRow() < 2) return -1;
    var values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (var i = 0; i < values.length; i++) if (String(values[i][0] || '').trim() === value) return i + 2;
    return -1;
  }
  function rowObject_(headers, row) { var obj = {}; headers.forEach(function(h, i) { if (h) obj[h] = row[i]; }); return obj; }
  function id_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000); }
  function activeUser_() { var email = ''; try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (err) { email = ''; } return { email: email, displayName: email ? email.split('@')[0] : 'User' }; }

  return { saveFormRecord: saveFormRecord, createDocumentNo: createDocumentNo_, documentCodePrefix: prefix_, abbreviation: abbreviation_ };
})();

function apiModularSaveFormRecordV3(payload) {
  return AETERLINK_NUMBERING_V3.saveFormRecord(payload);
}

function apiModularSaveFormRecordV2(payload) {
  return AETERLINK_NUMBERING_V3.saveFormRecord(payload);
}
