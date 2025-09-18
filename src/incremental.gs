/** Incremental ingestion for active months and quick mirror updates */

function getCurrentAndPriorMonth_() {
  var now = new Date();
  var curY = now.getFullYear();
  var curM = now.getMonth() + 1;
  var prior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var pY = prior.getFullYear();
  var pM = prior.getMonth() + 1;
  function pad(n) { return (n < 10 ? '0' + n : '' + n); }
  return [ { yyyy: '' + curY, mm: pad(curM) }, { yyyy: '' + pY, mm: pad(pM) } ];
}

function updateActiveMirror_() {
  var activeId = getGamesActiveSpreadsheetId();
  if (!activeId) return;
  var activeSs = SpreadsheetApp.openById(activeId);
  var activeSheet = activeSs.getSheetByName(SHEET_NAMES.games);
  ensureHeaders_(activeSheet, GAME_HEADERS);

  // Rebuild mirror from current month archive only for speed
  var pair = getCurrentAndPriorMonth_()[0];
  var ss = getArchiveSpreadsheetByMonth_(pair.yyyy, pair.mm);
  if (!ss) return;
  var src = ss.getSheetByName(SHEET_NAMES.games);
  var lastRow = src.getLastRow();
  if (lastRow < 2) return;
  var data = src.getRange(2, 1, lastRow - 1, GAME_HEADERS.length).getValues();
  activeSheet.clear();
  activeSheet.getRange(1, 1, 1, GAME_HEADERS.length).setValues([GAME_HEADERS]);
  if (data.length > 0) activeSheet.getRange(2, 1, data.length, GAME_HEADERS.length).setValues(data);
  SpreadsheetApp.flush();
}

function incrementalIngestActiveMonths() {
  var username = getUsername(); // ensures configured
  var months = getCurrentAndPriorMonth_();
  var archivesList = fetchArchivesList_();
  for (var i = 0; i < months.length; i++) {
    var m = months[i];
    var targetUrl = ENDPOINTS.archiveMonth(username, m.yyyy, m.mm);
    if (archivesList.indexOf(targetUrl) === -1) continue; // not present yet
    var res = ingestArchiveMonth(targetUrl);
    logInfo('INCR', 'Month update ' + targetUrl, res);
  }
  updateActiveMirror_();
}