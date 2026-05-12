/**
 * AETERLINK Documentation Module — ZZZZZZ_SaveIssueEditFix.gs
 * Targeted fix for Save Draft / Issue / Edit only.
 *
 * Scope:
 * - Route every legacy apiModularSaveFormRecord* wrapper to apiSafeSaveIssueNoStackV1.
 * - This removes the old AETERLINK_DRAFT_ISSUE_EDIT_API.save() path that can recurse and throw
 *   "Maximum call stack size exceeded".
 * - Keep edit loading logic unchanged.
 * - Do not change A4 rendering, tables, row controls, photo report, layout, or other modules.
 */

var AETERLINK_SAVE_ISSUE_EDIT_FIX = (function () {
  var FORM_TABLE = 'FORM_RECORDS';
  var REGISTER_TABLE = 'DOCUMENT_REGISTER';

  function save(payload) {
    return apiSafeSaveIssueNoStackV1(payload || {});
  }

  function getRecord(payload) {
    payload = payload || {};
    if (typeof payload === 'string') payload = { FormRecordId: payload };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var form = ss && ss.getSheetByName(FORM_TABLE);
    if (!form) throw new Error('Sheet not found: ' + FORM_TABLE);
    ensureColumns_(form, ['FormRecordId', 'ProjectCode', 'TemplateCode', 'DocumentNo', 'RevisionNo', 'Status', 'DataJson', 'DocumentStatus', 'LockedAfterPdf', 'IsDeleted', 'UpdatedAt']);
    var fh = headers_(form);

    var id = clean_(payload.FormRecordId || payload.formRecordId || '');
    var register = resolveRegisterRow_(payload);
    var candidates = buildDocumentCandidates_(payload, register);
    var row = id ? findRow_(form, fh, 'FormRecordId', id) : -1;

    if (row < 0) {
      for (var i = 0; i < candidates.length && row < 0; i++) {
        row = findRow_(form, fh, 'DocumentNo', candidates[i]);
      }
    }

    if (row < 0) {
      row = findBestFormRow_(form, fh, payload, register, candidates);
    }

    if (row < 0) {
      throw new Error('Record not found for edit. Ref: ' + (id || candidates.join(' / ') || clean_(payload.DocumentId || payload.DocumentCode || payload.DocumentNo || '-')));
    }

    var record = rowObject_(fh, form.getRange(row, 1, 1, fh.length).getDisplayValues()[0]);
    var data = parseJson_(record.DataJson);

    data.FormRecordId = record.FormRecordId || data.FormRecordId || '';
    data.ProjectCode = record.ProjectCode || data.ProjectCode || clean_(register.ProjectCode || payload.ProjectCode || '');
    data.TemplateCode = canonicalCode_(record.TemplateCode || data.TemplateCode || register.TemplateCode || inferTemplateCode_(register, payload));
    data.DocumentNo = record.DocumentNo || data.DocumentNo || '';
    data.RevisionNo = normalizeRevision_(record.RevisionNo || record.Revision || data.RevisionNo || register.RevisionNo || register.Revision || 'R00');
    data.Status = record.Status || record.DocumentStatus || data.Status || 'Draft';

    try { setRowValues_(form, fh, row, { LockedAfterPdf: 'FALSE' }); } catch (err) {}
    record.LockedAfterPdf = 'FALSE';

    var st = clean_(record.Status || record.DocumentStatus || data.Status || '').toUpperCase();
    var isIssued = !!clean_(record.DocumentNo || data.DocumentNo) && (st.indexOf('ISSUED') >= 0 || st.indexOf('PDF') >= 0 || st.indexOf('APPROVED') >= 0);
    var baseDoc = stripRevision_(record.DocumentNo || data.DocumentNo || data.SourceDocumentNo || data.RevisionOf || '');

    return {
      ok: true,
      row: row,
      record: record,
      data: data,
      isIssued: isIssued,
      baseDocumentNo: baseDoc,
      nextRevisionNo: baseDoc ? nextRevisionNo_(baseDoc) : 'R00',
      resolvedBy: id ? 'FormRecordId' : 'DocumentRegister/DocumentNo'
    };
  }

  function resolveRegisterRow_(payload) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reg = ss && ss.getSheetByName(REGISTER_TABLE);
    if (!reg || reg.getLastRow() < 2) return {};
    var rh = headers_(reg);
    var refs = unique_([
      payload.DocumentId,
      payload.DocumentNo,
      payload.DocumentCode,
      payload.DocumentTitle
    ].map(clean_).filter(Boolean));
    var keys = ['DocumentId', 'DocumentNo', 'DocumentCode', 'DocumentTitle'];
    for (var r = 0; r < refs.length; r++) {
      for (var k = 0; k < keys.length; k++) {
        var row = findRow_(reg, rh, keys[k], refs[r]);
        if (row > 0) return rowObject_(rh, reg.getRange(row, 1, 1, rh.length).getDisplayValues()[0]);
      }
    }
    return {};
  }

  function buildDocumentCandidates_(payload, reg) {
    var raw = [payload.DocumentNo, payload.DocumentCode, reg.DocumentNo, reg.DocumentCode, payload.DocumentId, reg.DocumentId].map(clean_).filter(Boolean);
    var out = [];
    raw.forEach(function (x) { out.push(x); if (/^DR-/i.test(x)) out.push(x.replace(/^DR-/i, '')); out.push(stripRevision_(x)); });
    return unique_(out.filter(Boolean));
  }

  function findBestFormRow_(sheet, headers, payload, reg, candidates) {
    var values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
    var project = clean_(payload.ProjectCode || reg.ProjectCode || '');
    var template = canonicalCode_(payload.TemplateCode || reg.TemplateCode || inferTemplateCode_(reg, payload));
    var revision = normalizeRevision_(payload.RevisionNo || payload.Revision || reg.RevisionNo || reg.Revision || '');
    var candidateMap = {};
    candidates.forEach(function (c) { candidateMap[clean_(c)] = true; candidateMap[stripRevision_(c)] = true; });
    var best = { row: -1, score: -1, updated: '' };
    for (var i = 0; i < values.length; i++) {
      var obj = rowObject_(headers, values[i]);
      if (String(obj.IsDeleted || '').toUpperCase() === 'TRUE') continue;
      var data = parseJson_(obj.DataJson);
      var doc = clean_(obj.DocumentNo || data.DocumentNo || '');
      var baseDoc = stripRevision_(doc);
      var rowProject = clean_(obj.ProjectCode || data.ProjectCode || '');
      var rowTemplate = canonicalCode_(obj.TemplateCode || data.TemplateCode || '');
      var rowRev = normalizeRevision_(obj.RevisionNo || obj.Revision || data.RevisionNo || '');
      var score = 0;
      if (doc && candidateMap[doc]) score += 100;
      if (baseDoc && candidateMap[baseDoc]) score += 80;
      if (project && rowProject === project) score += 20;
      if (template && rowTemplate === template) score += 20;
      if (revision && rowRev === revision) score += 12;
      if (score <= 0) continue;
      var updated = clean_(obj.UpdatedAt || obj.CreatedAt || '');
      if (score > best.score || (score === best.score && updated > best.updated)) best = { row: i + 2, score: score, updated: updated };
    }
    return best.row;
  }

  function nextRevisionNo_(documentNo) {
    var base = stripRevision_(documentNo);
    if (!base) return 'R01';
    var max = 0;
    readRows_(FORM_TABLE).forEach(function (r) {
      var doc = clean_(r.DocumentNo || '');
      var data = parseJson_(r.DataJson);
      var source = clean_(data.SourceDocumentNo || data.RevisionOf || '');
      if (stripRevision_(doc) !== base && stripRevision_(source) !== base) return;
      var rev = normalizeRevision_(r.RevisionNo || r.Revision || data.RevisionNo || 'R00');
      var n = parseInt(rev.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'R' + ('00' + (max + 1)).slice(-2);
  }

  function inferTemplateCode_(reg, payload) {
    var source = clean_(payload.TemplateCode || reg.TemplateCode || reg.DocumentTitle || payload.DocumentTitle || payload.DocumentCode || reg.DocumentCode || payload.DocumentNo || reg.DocumentNo || '');
    var m = source.match(/PJ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,4}/i);
    return m ? m[0].toUpperCase() : source.toUpperCase();
  }

  function readRows_(tableName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss && ss.getSheetByName(tableName);
    if (!sh || sh.getLastRow() < 2) return [];
    var values = sh.getDataRange().getDisplayValues();
    var headers = values[0].map(clean_);
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

  function ensureColumns_(sheet, names) { var headers = headers_(sheet); names.forEach(function (name) { if (headers.indexOf(name) < 0) { sheet.getRange(1, headers.length + 1).setValue(name); headers.push(name); } }); }
  function headers_(sheet) { return sheet.getLastColumn() < 1 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(clean_); }
  function rowObject_(headers, row) { var o = {}; headers.forEach(function (h, i) { if (h) o[h] = row[i]; }); return o; }
  function findRow_(sheet, headers, key, value) { value = clean_(value); var c = headers.indexOf(key) + 1; if (c < 1 || !value || sheet.getLastRow() < 2) return -1; var vals = sheet.getRange(2, c, sheet.getLastRow() - 1, 1).getDisplayValues(); for (var i = 0; i < vals.length; i++) if (clean_(vals[i][0]) === value) return i + 2; return -1; }
  function setRowValues_(sheet, headers, row, values) { Object.keys(values || {}).forEach(function (k) { var c = headers.indexOf(k) + 1; if (c > 0) sheet.getRange(row, c).setValue(values[k]); }); }
  function parseJson_(s) { try { return s ? JSON.parse(s) : {}; } catch (err) { return {}; } }
  function clean_(v) { return String(v == null ? '' : v).trim(); }
  function unique_(arr) { var seen = {}, out = []; (arr || []).forEach(function (x) { x = clean_(x); if (x && !seen[x]) { seen[x] = true; out.push(x); } }); return out; }
  function normalizeRevision_(v) { v = clean_(v).toUpperCase(); if (!v || v === '0') return v ? 'R00' : ''; var n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? v : 'R' + ('00' + n).slice(-2); }
  function stripRevision_(documentNo) { return clean_(documentNo).replace(/-R\d{2}$/i, ''); }
  function canonicalCode_(code) { code = clean_(code).toUpperCase(); if (code === 'PJ-WORK-COMPLETE-001' || code === 'PJ-WORK-COMPLETE') return 'PJ-WCR-001'; return code; }

  return { save: save, getRecord: getRecord };
})();

function apiModularSaveFormRecord(payload) { return apiSafeSaveIssueNoStackV1(payload || {}); }
function apiModularSaveFormRecordV2(payload) { return apiSafeSaveIssueNoStackV1(payload || {}); }
function apiModularSaveFormRecordV3(payload) { return apiSafeSaveIssueNoStackV1(payload || {}); }
function apiGetFormRecordForEditV2(payload) {
  if (typeof apiGetFormRecordExactForEditV1 === 'function') {
    try { return apiGetFormRecordExactForEditV1(payload); } catch (err) {}
  }
  return AETERLINK_SAVE_ISSUE_EDIT_FIX.getRecord(payload);
}
