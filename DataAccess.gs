/**
 * AETERLINK Documentation Module — DataAccess.gs
 * Google Sheet backend read helpers.
 * Safe refactor layer: namespace only, no sheet structure changes.
 */
var AETERLINK_DAO = (function() {
  function spreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function getSheet(sheetName) {
    sheetName = String(sheetName || '').trim();
    if (!sheetName) throw new Error('Missing sheet name');
    var sheet = spreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);
    return sheet;
  }

  function readRows(sheetName, options) {
    options = options || {};
    var sheet;
    try {
      sheet = getSheet(sheetName);
    } catch (err) {
      if (options.allowMissing) return [];
      throw err;
    }

    var values = sheet.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return [];

    var headers = values[0].map(function(header) {
      return String(header || '').trim();
    });

    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var obj = {};
      var hasValue = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        obj[headers[c]] = values[r][c];
        if (values[r][c] !== '') hasValue = true;
      }
      if (!hasValue) continue;
      if (options.activeOnly && !isActiveRow(obj)) continue;
      rows.push(obj);
    }
    return rows;
  }

  function isActiveRow(row) {
    var isDeleted = String(row.IsDeleted || '').toUpperCase();
    var active = String(row.Active || '').toUpperCase();
    return isDeleted !== 'TRUE' && isDeleted !== 'YES' && active !== 'FALSE' && active !== 'NO';
  }

  function findByKey(sheetName, keyField, keyValue) {
    keyField = String(keyField || '').trim();
    keyValue = String(keyValue || '').trim();
    var rows = readRows(sheetName, { allowMissing: true });
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][keyField] || '').trim() === keyValue) return rows[i];
    }
    return null;
  }

  function toMap(rows, keyField) {
    var map = {};
    (rows || []).forEach(function(row) {
      var key = String(row[keyField] || '').trim();
      if (key) map[key] = row;
    });
    return map;
  }

  return {
    spreadsheet: spreadsheet,
    getSheet: getSheet,
    readRows: readRows,
    isActiveRow: isActiveRow,
    findByKey: findByKey,
    toMap: toMap
  };
})();
