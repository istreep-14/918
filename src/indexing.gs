/** Per-month archive spreadsheet management and indexing */

function monthKey_(yyyy, mm) { return yyyy + '-' + mm; }

function ensureArchiveSpreadsheet_(yyyy, mm) {
  var registry = getArchiveMonthRegistry();
  var key = monthKey_(yyyy, mm);
  var id = registry[key];
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  var folderId = getArchivesFolderId() || getFolderId();
  var ss = createSpreadsheetInFolder_('Archive ' + yyyy + '-' + mm, folderId);
  ensureHeaders_(getOrCreateSheet_(ss, SHEET_NAMES.games), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, SHEET_NAMES.gameIndex), GAME_INDEX_HEADERS);
  registry[key] = ss.getId();
  setArchiveMonthRegistry(registry);
  return ss;
}

function getArchiveSpreadsheetByMonth_(yyyy, mm) {
  var registry = getArchiveMonthRegistry();
  var key = monthKey_(yyyy, mm);
  var id = registry[key];
  return id ? SpreadsheetApp.openById(id) : null;
}

function buildUrlIndex_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  var urls = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var index = {};
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i][0];
    if (u) index[u] = i + 2; // row number
  }
  return index;
}

function appendRowsWithIndex_(ss, rows) {
  if (!rows || rows.length === 0) return 0;
  var sheet = ss.getSheetByName(SHEET_NAMES.games);
  var indexSheet = ss.getSheetByName(SHEET_NAMES.gameIndex);
  var lastRow = sheet.getLastRow();
  var startRow = lastRow + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  var indexRows = [];
  for (var i = 0; i < rows.length; i++) {
    var url = rows[i][0];
    indexRows.push([url, ss.getId(), SHEET_NAMES.games, startRow + i]);
  }
  indexSheet.getRange(indexSheet.getLastRow() + 1, 1, indexRows.length, indexRows[0].length).setValues(indexRows);
  return rows.length;
}