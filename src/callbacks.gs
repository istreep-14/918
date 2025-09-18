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
      // Extract sides with colors
      var top = (g.players && g.players.top) || {};
      var bottom = (g.players && g.players.bottom) || {};
      var whiteSide = top && top.color === 'white' ? top : (bottom && bottom.color === 'white' ? bottom : {});
      var blackSide = top && top.color === 'black' ? top : (bottom && bottom.color === 'black' ? bottom : {});
      var whiteUsername = whiteSide.username || '';
      var blackUsername = blackSide.username || '';
      var whiteId = (whiteSide.id != null ? String(whiteSide.id) : '');
      var blackId = (blackSide.id != null ? String(blackSide.id) : '');
      var whiteUuid = whiteSide.uuid || '';
      var blackUuid = blackSide.uuid || '';
      var whitePregame = (whiteSide.rating != null ? Number(whiteSide.rating) : null);
      var blackPregame = (blackSide.rating != null ? Number(blackSide.rating) : null);

      var rcW = (typeof g.ratingChangeWhite !== 'undefined') ? Number(g.ratingChangeWhite) : null;
      var rcB = (typeof g.ratingChangeBlack !== 'undefined') ? Number(g.ratingChangeBlack) : (typeof g.ratingChange !== 'undefined' ? -Number(g.ratingChange) : null);

      // Determine opponent relative to configured username
      var my = '';
      try { my = getUsername(); } catch (e) { my = ''; }
      var opponentSide = null;
      if (my && whiteUsername && whiteUsername.toLowerCase() === my.toLowerCase()) opponentSide = blackSide;
      else if (my && blackUsername && blackUsername.toLowerCase() === my.toLowerCase()) opponentSide = whiteSide;

      var oppCountry = opponentSide && opponentSide.countryName ? opponentSide.countryName : '';
      var oppMembership = opponentSide && opponentSide.membershipCode ? opponentSide.membershipCode : '';
      var oppMemberSince = opponentSide && opponentSide.memberSince != null ? Number(opponentSide.memberSince) : '';
      var oppPostMove = opponentSide && opponentSide.postMoveAction ? opponentSide.postMoveAction : '';
      var oppDefaultTab = opponentSide && opponentSide.defaultTab != null ? Number(opponentSide.defaultTab) : '';

      rSheet.appendRow([
        url, type, id,
        rcW, rcB,
        whiteUsername, blackUsername,
        whiteId, blackId,
        whiteUuid, blackUuid,
        whitePregame, blackPregame,
        g.moveTimestamps || '',
        oppCountry, oppMembership, oppMemberSince, oppPostMove, oppDefaultTab,
        isoNow()
      ]);
      // Update main sheet record with exact rating changes mapped to player/opponent, ids/uuids if possible
      tryApplyCallbackDetailsToGame_(url, {
        whiteUsername: whiteUsername,
        blackUsername: blackUsername,
        ratingChangeWhite: rcW,
        ratingChangeBlack: rcB,
        whiteId: whiteId,
        blackId: blackId,
        whiteUuid: whiteUuid,
        blackUuid: blackUuid,
        gameUuid: g.uuid || ''
      });
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

function tryApplyCallbackDetailsToGame_(url, details) {
  // search current and prior month archives
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
        var baseRow = r + 2;
        var playerUserCol = GAME_HEADERS.indexOf('player.username') + 1;
        var opponentUserCol = GAME_HEADERS.indexOf('opponent.username') + 1;
        var playerColorCol = GAME_HEADERS.indexOf('player.color') + 1;
        var playerChangeCol = GAME_HEADERS.indexOf('player.rating_change') + 1;
        var opponentChangeCol = GAME_HEADERS.indexOf('opponent.rating_change') + 1;
        var playerIdCol = GAME_HEADERS.indexOf('player.@id') + 1;
        var opponentIdCol = GAME_HEADERS.indexOf('opponent.@id') + 1;
        var playerUuidCol = GAME_HEADERS.indexOf('player.uuid') + 1;
        var opponentUuidCol = GAME_HEADERS.indexOf('opponent.uuid') + 1;
        var gameUuidCol = GAME_HEADERS.indexOf('uuid') + 1;
        var exactFlagCol = GAME_HEADERS.indexOf('rating_is_exact') + 1;

        var rowVals = sheet.getRange(baseRow, 1, 1, GAME_HEADERS.length).getValues()[0];
        var playerUsername = rowVals[playerUserCol - 1];
        var playerColor = rowVals[playerColorCol - 1];

        // Determine which color corresponds to player row
        var playerIsWhite = false;
        if (playerUsername) {
          if (details.whiteUsername && String(details.whiteUsername).toLowerCase() === String(playerUsername).toLowerCase()) playerIsWhite = true;
          else if (details.blackUsername && String(details.blackUsername).toLowerCase() === String(playerUsername).toLowerCase()) playerIsWhite = false;
          else playerIsWhite = (playerColor === 'white');
        } else {
          playerIsWhite = (playerColor === 'white');
        }

        var playerChange = playerIsWhite ? details.ratingChangeWhite : details.ratingChangeBlack;
        var opponentChange = playerIsWhite ? details.ratingChangeBlack : details.ratingChangeWhite;

        var updates = {};
        if (playerChangeCol > 0 && playerChange != null) updates[playerChangeCol] = playerChange;
        if (opponentChangeCol > 0 && opponentChange != null) updates[opponentChangeCol] = opponentChange;
        if (playerIdCol > 0 && !rowVals[playerIdCol - 1]) updates[playerIdCol] = playerIsWhite ? (details.whiteId || '') : (details.blackId || '');
        if (opponentIdCol > 0 && !rowVals[opponentIdCol - 1]) updates[opponentIdCol] = playerIsWhite ? (details.blackId || '') : (details.whiteId || '');
        if (playerUuidCol > 0 && !rowVals[playerUuidCol - 1]) updates[playerUuidCol] = playerIsWhite ? (details.whiteUuid || '') : (details.blackUuid || '');
        if (opponentUuidCol > 0 && !rowVals[opponentUuidCol - 1]) updates[opponentUuidCol] = playerIsWhite ? (details.blackUuid || '') : (details.whiteUuid || '');
        if (gameUuidCol > 0 && !rowVals[gameUuidCol - 1] && details.gameUuid) updates[gameUuidCol] = details.gameUuid;
        if (exactFlagCol > 0) updates[exactFlagCol] = true;

        // Apply updates in a single setValues call using a sparse row
        if (Object.keys(updates).length > 0) {
          var newRow = rowVals.slice();
          for (var c in updates) {
            newRow[Number(c) - 1] = updates[c];
          }
          sheet.getRange(baseRow, 1, 1, GAME_HEADERS.length).setValues([newRow]);
        }
        return true;
      }
    }
  }
  return false;
}

/** Enqueue callback jobs for an array of newly appended game rows */
function enqueueCallbacksForRows_(rows) {
  if (!rows || rows.length === 0) return 0;
  var qId = getCallbacksQueueSpreadsheetId();
  if (!qId) return 0;
  var q = getOrCreateSheet_(SpreadsheetApp.openById(qId), SHEET_NAMES.callbacksQueue);
  ensureHeaders_(q, CALLBACKS_QUEUE_HEADERS);
  var nowIso = isoNow();
  var appended = 0;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var url = row[0], type = row[1], id = row[2];
    if (!url || !id) continue;
    q.appendRow([url, type, id, nowIso, 'queued', '', 0]);
    appended++;
  }
  return appended;
}