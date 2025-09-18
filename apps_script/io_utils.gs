/**
 * Spreadsheet/file I/O helpers and header management.
 */

function getControlSpreadsheet_() {
  var id = PropertiesService.getDocumentProperties().getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID);
  if (id) return SpreadsheetApp.openById(id);
  return SpreadsheetApp.getActive();
}

function getArchiveSpreadsheetForYear_(yyyy) {
  var key = PROP_KEYS.ARCHIVE_SPREADSHEET_ID_PREFIX + String(yyyy);
  var id = PropertiesService.getDocumentProperties().getProperty(key);
  return id ? SpreadsheetApp.openById(id) : null;
}

function setArchiveSpreadsheetForYear_(yyyy, spreadsheetId) {
  var key = PROP_KEYS.ARCHIVE_SPREADSHEET_ID_PREFIX + String(yyyy);
  PropertiesService.getDocumentProperties().setProperty(key, String(spreadsheetId));
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function readHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

function ensureHeaders_(sheet, desiredHeaders) {
  var current = readHeaders_(sheet);
  if (current.length === 0) {
    sheet.getRange(1, 1, 1, desiredHeaders.length).setValues([desiredHeaders]);
    return desiredHeaders;
  }
  var missing = desiredHeaders.filter(function(h){ return current.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    current = current.concat(missing);
  }
  return current;
}

function subsetRow_(row, fullHeaders, keepHeaders) {
  var idx = {};
  for (var i = 0; i < fullHeaders.length; i++) idx[fullHeaders[i]] = i;
  var out = new Array(keepHeaders.length);
  for (var j = 0; j < keepHeaders.length; j++) out[j] = row[idx[keepHeaders[j]]];
  return out;
}

function writeRowsAppend_(sheet, headers, rows) {
  if (!rows || !rows.length) return;
  var ensured = ensureHeaders_(sheet, headers);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, ensured.length).setValues([ensured]);
  var startRow = sheet.getLastRow() >= 1 ? sheet.getLastRow() + 1 : 2;
  sheet.getRange(startRow, 1, rows.length, ensured.length).setValues(rows);
}

function writeRowsReplace_(sheet, headers, rows) {
  sheet.clearContents();
  ensureHeaders_(sheet, headers);
  if (rows && rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}