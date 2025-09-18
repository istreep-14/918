/**
 * Unified queue: enqueue, reconcile, and batch worker for per-game enrichments.
 */

function getQueueSheet_() {
  var ss = getControlSpreadsheet_();
  var sh = getOrCreateSheet_(ss, SHEET_NAMES.CallbacksQueue);
  ensureHeaders_(sh, CALLBACKS_QUEUE_HEADERS);
  return sh;
}

function getResultsSheet_() {
  var ss = getControlSpreadsheet_();
  var sh = getOrCreateSheet_(ss, SHEET_NAMES.CallbacksResults);
  ensureHeaders_(sh, CALLBACKS_RESULTS_HEADERS);
  return sh;
}

function queueUniqueKey_(url, kind) { return String(url) + '|' + String(kind); }

function enqueueJobsForGames_(games, monthKey, kinds) {
  if (!games || !games.length) return 0;
  var sh = getQueueSheet_();
  var nowIso = formatIsoLocal(new Date());
  var existing = {};
  var last = sh.getLastRow();
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, CALLBACKS_QUEUE_HEADERS.length).getValues();
    var keyIdx = CALLBACKS_QUEUE_HEADERS.indexOf('unique_key');
    for (var i = 0; i < vals.length; i++) existing[String(vals[i][keyIdx])] = true;
  }
  var rows = [];
  for (var g = 0; g < games.length; g++) {
    var url = games[g].url || games[g][0] || '';
    if (!url) continue;
    for (var k = 0; k < kinds.length; k++) {
      var uk = queueUniqueKey_(url, kinds[k]);
      if (existing[uk]) continue;
      rows.push([uk, url, kinds[k], 'queued', 0, nowIso, '', '', monthKey]);
      existing[uk] = true;
    }
  }
  if (rows.length) writeRowsAppend_(sh, CALLBACKS_QUEUE_HEADERS, rows);
  return rows.length;
}

function reconcileQueueForMonth_(yyyy, mm, kinds) {
  var monthKey = yyyy + '-' + mm;
  var ss = getControlSpreadsheet_();
  var shGames = getOrCreateSheet_(ss, SHEET_NAMES.ActiveGames);
  var headers = readHeaders_(shGames);
  if (headers.length === 0 || shGames.getLastRow() < 2) return 0;
  var URL_IDX = headers.indexOf('url');
  var data = shGames.getRange(2, 1, shGames.getLastRow() - 1, headers.length).getValues();
  var games = data.map(function(r){ return { url: r[URL_IDX] }; });

  // Remove already done keys
  var shRes = getResultsSheet_();
  var resKeys = {};
  var lastRes = shRes.getLastRow();
  if (lastRes >= 2) {
    var vals = shRes.getRange(2, 1, lastRes - 1, CALLBACKS_RESULTS_HEADERS.length).getValues();
    var keyIdx = CALLBACKS_RESULTS_HEADERS.indexOf('unique_key');
    for (var i = 0; i < vals.length; i++) resKeys[String(vals[i][keyIdx])] = true;
  }

  var enqueued = enqueueJobsForGames_(games, monthKey, kinds || ['rating_callback','opening_lookup']);

  // Re-queue stale in_progress older than 30 minutes
  var q = getQueueSheet_();
  var lastQ = q.getLastRow();
  if (lastQ >= 2) {
    var qVals = q.getRange(2, 1, lastQ - 1, CALLBACKS_QUEUE_HEADERS.length).getValues();
    var idxStatus = CALLBACKS_QUEUE_HEADERS.indexOf('status');
    var idxLastAttempt = CALLBACKS_QUEUE_HEADERS.indexOf('last_attempt_iso');
    var idxUk = CALLBACKS_QUEUE_HEADERS.indexOf('unique_key');
    for (var j = 0; j < qVals.length; j++) {
      var row = qVals[j];
      if (row[idxStatus] === 'in_progress') {
        var la = row[idxLastAttempt];
        var stale = false;
        if (la) {
          var dt = parseLocalDateTimeString_(String(la));
          if (dt && (new Date().getTime() - dt.getTime() > 30*60*1000)) stale = true;
        }
        if (stale && !resKeys[row[idxUk]]) {
          // move back to queued
          q.getRange(j + 2, idxStatus + 1, 1, 1).setValue('queued');
        }
      }
    }
  }
  return enqueued;
}

function processQueueBatch_(maxBatch) {
  var q = getQueueSheet_();
  var r = getResultsSheet_();
  var last = q.getLastRow();
  if (last < 2) return 0;
  var vals = q.getRange(2, 1, last - 1, CALLBACKS_QUEUE_HEADERS.length).getValues();
  var idx = {
    unique_key: CALLBACKS_QUEUE_HEADERS.indexOf('unique_key'),
    game_url: CALLBACKS_QUEUE_HEADERS.indexOf('game_url'),
    kind: CALLBACKS_QUEUE_HEADERS.indexOf('kind'),
    status: CALLBACKS_QUEUE_HEADERS.indexOf('status'),
    attempts: CALLBACKS_QUEUE_HEADERS.indexOf('attempts'),
    enqueued_at_iso: CALLBACKS_QUEUE_HEADERS.indexOf('enqueued_at_iso'),
    last_attempt_iso: CALLBACKS_QUEUE_HEADERS.indexOf('last_attempt_iso'),
    last_error: CALLBACKS_QUEUE_HEADERS.indexOf('last_error'),
    month_key: CALLBACKS_QUEUE_HEADERS.indexOf('month_key')
  };

  var processed = 0;
  for (var i = 0; i < vals.length && processed < (maxBatch || 25); i++) {
    var row = vals[i];
    if (row[idx.status] !== 'queued') continue;

    // Mark in_progress and attempt
    q.getRange(i + 2, idx.status + 1, 1, 2).setValues([['in_progress', formatIsoLocal(new Date())]]);

    var url = row[idx.game_url];
    var kind = row[idx.kind];
    var payload = {};
    var ok = false;
    try {
      if (kind === 'rating_callback') {
        // Placeholder: user to implement specific callback
        ok = false; // set to true when implemented
      } else if (kind === 'opening_lookup') {
        // Placeholder: user to implement opening lookup
        ok = false;
      } else {
        ok = true; // unknown kinds considered no-op
      }
    } catch (e) {
      ok = false;
      q.getRange(i + 2, idx.last_error + 1, 1, 1).setValue(String(e && e.message ? e.message : e));
    }

    if (ok) {
      var resRow = [row[idx.unique_key], url, kind, JSON.stringify(payload), formatIsoLocal(new Date())];
      writeRowsAppend_(r, CALLBACKS_RESULTS_HEADERS, [resRow]);
      q.getRange(i + 2, idx.status + 1, 1, 1).setValue('done');
      processed++;
    } else {
      // back to queued with +attempts
      var attempts = Number(row[idx.attempts] || 0) + 1;
      q.getRange(i + 2, idx.status + 1, 1, 3).setValues([['queued', formatIsoLocal(new Date()), attempts]]);
    }
  }
  return processed;
}