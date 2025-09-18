/** Callbacks queue and worker */

function enqueueCallbacksForRecentGames(limit) {
  var activeId = getGamesActiveSpreadsheetId();
  if (!activeId) return 0;
  var ss = SpreadsheetApp.openById(activeId);
  var sheet = getOrCreateSheet_(ss, SHEET_NAMES.games);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var data = sheet.getRange(Math.max(2, lastRow - 500), 1, Math.min(500, lastRow - 1), 3).getValues(); // url,type,id
  var queued = 0;
  var qId = getCallbacksQueueSpreadsheetId();
  if (!qId) return queued;
  var q = getOrCreateSheet_(SpreadsheetApp.openById(qId), SHEET_NAMES.callbacksQueue);
  ensureHeaders_(q, CALLBACKS_QUEUE_HEADERS);
  var nowIso = isoNow();
  for (var i = 0; i < data.length && queued < (limit || 50); i++) {
    var row = data[i];
    if (!row[0]) continue;
    q.appendRow([row[0], row[1], row[2], nowIso, 'queued', '', 0]);
    queued++;
  }
  return queued;
}

function processCallbacksBatch(maxBatch) {
  var qId = getCallbacksQueueSpreadsheetId();
  if (!qId) return 0;
  var rId = getCallbacksResultsSpreadsheetId();
  if (!rId) return 0;
  var qSheet = getOrCreateSheet_(SpreadsheetApp.openById(qId), SHEET_NAMES.callbacksQueue);
  var rSheet = getOrCreateSheet_(SpreadsheetApp.openById(rId), SHEET_NAMES.callbacksResults);
  ensureHeaders_(qSheet, CALLBACKS_QUEUE_HEADERS);
  ensureHeaders_(rSheet, CALLBACKS_RESULTS_HEADERS);
  var lastRow = qSheet.getLastRow();
  if (lastRow < 2) return 0;
  var rows = qSheet.getRange(2, 1, lastRow - 1, CALLBACKS_QUEUE_HEADERS.length).getValues();
  var processed = 0;
  var start = new Date().getTime();
  for (var i = 0; i < rows.length && processed < (maxBatch || 25); i++) {
    var rec = rows[i];
    if (rec[4] !== 'queued') continue;
    var url = rec[0], type = rec[1], id = rec[2];
    var endpoint = (type === 'daily') ? ENDPOINTS.callbackDaily(id) : ENDPOINTS.callbackLive(id);
    var res = httpFetchJson(endpoint, {});
    // best-effort parse, schema may vary
    if (res.status >= 200 && res.status < 300 && res.json && res.json.game) {
      var g = res.json.game;
      var exactChange = (typeof g.ratingChange !== 'undefined') ? Number(g.ratingChange) : null;
      var pregame = (g.players && g.players.bottom && typeof g.players.bottom.rating !== 'undefined') ? Number(g.players.bottom.rating) : null;
      rSheet.appendRow([url, type, id, exactChange, pregame, g.moveTimestamps || '', isoNow()]);
      // Update main sheet record's rating_is_exact = true and player.rating_change if present
      tryUpdateGameExact_(url, exactChange);
      // Mark queue row as done
      qSheet.getRange(i + 2, 5, 1, 3).setValues([['done', isoNow(), (rec[6] || 0) + 1]]);
      processed++;
    } else {
      // mark attempt and keep queued for retry
      qSheet.getRange(i + 2, 6, 1, 2).setValues([[isoNow(), (rec[6] || 0) + 1]]);
    }
    if (new Date().getTime() - start > 4 * 60 * 1000) {
      logWarn('CALLBACK_TIME', 'Stopping early due to time limit', { processed: processed });
      break;
    }
  }
  return processed;
}

function tryUpdateGameExact_(url, exactChange) {
  if (exactChange == null) return;
  // search current month archive first
  var months = getCurrentAndPriorMonth_();
  for (var i = 0; i < months.length; i++) {
    var ss = getArchiveSpreadsheetByMonth_(months[i].yyyy, months[i].mm);
    if (!ss) continue;
    var sheet = ss.getSheetByName(SHEET_NAMES.games);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var urls = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < urls.length; r++) {
      if (urls[r][0] === url) {
        // Update exact change (col 40 1-based) and rating_is_exact (col 56 1-based)
        sheet.getRange(r + 2, 40, 1, 1).setValue(exactChange);
        sheet.getRange(r + 2, 56, 1, 1).setValue(true);
        return true;
      }
    }
  }
  return false;
}