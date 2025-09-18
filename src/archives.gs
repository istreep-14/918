/** Archives ingestion: list, fetch per-month with ETag, write rows, update meta */

function fetchArchivesList_() {
  var username = getUsername();
  var res = httpFetchJson(ENDPOINTS.archivesList(username), {});
  if (res.status >= 200 && res.status < 300 && res.json && res.json.archives) {
    return res.json.archives; // array of urls: .../YYYY/MM
  }
  throw new Error('Failed to fetch archives list');
}

function upsertArchivesMetaRow_(archiveUrl, yyyy, mm, etag, lastModified, gamesCount, status, gamesSeen, gamesAppended) {
  var ss = SpreadsheetApp.openById(getArchivesMetaSpreadsheetId());
  var sheet = getOrCreateSheet_(ss, SHEET_NAMES.archivesMeta);
  ensureHeaders_(sheet, ARCHIVES_META_HEADERS);
  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var rng = sheet.getRange(2, 1, lastRow - 1, ARCHIVES_META_HEADERS.length).getValues();
    for (var i = 0; i < rng.length; i++) {
      if (rng[i][0] === archiveUrl) { foundRow = i + 2; break; }
    }
  }
  var row = [archiveUrl, yyyy, mm, etag || '', lastModified || '', isoNow(), gamesCount || 0, status || 'active', '', (gamesSeen != null ? gamesSeen : ''), (gamesAppended != null ? gamesAppended : '')];
  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function getStoredEtagForArchive_(archiveUrl) {
  var ss = SpreadsheetApp.openById(getArchivesMetaSpreadsheetId());
  var sheet = getOrCreateSheet_(ss, SHEET_NAMES.archivesMeta);
  ensureHeaders_(sheet, ARCHIVES_META_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var data = sheet.getRange(2, 1, lastRow - 1, ARCHIVES_META_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === archiveUrl) return data[i][3] || null;
  }
  return null;
}

function ingestArchiveMonth(archiveUrl) {
  var m = archiveUrl.match(/\/(\d{4})\/(\d{2})$/);
  if (!m) throw new Error('Bad archive URL: ' + archiveUrl);
  var yyyy = m[1], mm = m[2];
  var etag = getStoredEtagForArchive_(archiveUrl);
  var res = httpFetchJson(archiveUrl, { etag: etag });
  if (res.status === 304) {
    // Preserve prior last_modified and games_count by not overwriting with blanks
    upsertArchivesMetaRow_(archiveUrl, yyyy, mm, etag, '', null, (isCurrentOrFutureMonth_(yyyy, mm) ? 'active' : 'inactive'), null, null);
    return { status: 'not_modified', appended: 0 };
  }
  if (!(res.status >= 200 && res.status < 300) || !res.json) {
    logWarn('ARCHIVE_FETCH_FAIL', 'Archive fetch failed', { url: archiveUrl, status: res.status });
    return { status: 'error', appended: 0 };
  }
  var games = res.json.games || [];
  var gamesSeen = games.length;
  var appended = ingestGamesArray_(yyyy, mm, games);
  var newEtag = (res.headers && (res.headers['etag'])) || etag || '';
  var lastModified = (res.headers && (res.headers['last-modified'])) || '';
  var status = (isCurrentOrFutureMonth_(yyyy, mm) ? 'active' : 'inactive');
  upsertArchivesMetaRow_(archiveUrl, yyyy, mm, newEtag, lastModified, games.length, status, gamesSeen, appended);
  // Aggregate progress totals
  updateArchivesProgress_(archiveUrl, yyyy, mm, gamesSeen, appended);
  return { status: 'ok', appended: appended, seen: gamesSeen };
}

function isCurrentOrFutureMonth_(yyyy, mm) {
  var now = new Date();
  var curY = now.getFullYear();
  var curM = now.getMonth() + 1;
  var y = Number(yyyy), m = Number(mm);
  return (y > curY) || (y === curY && m >= curM);
}

function ingestGamesArray_(yyyy, mm, games) {
  var username = getUsername();
  var ss = ensureArchiveSpreadsheet_(yyyy, mm);
  var sheet = ss.getSheetByName(SHEET_NAMES.games);
  var urlIndex = buildUrlIndex_(sheet);

  // Determine column indices from headers to avoid off-by-one mistakes
  var FORMAT_INDEX = GAME_HEADERS.indexOf('format');
  var PLAYER_RATING_INDEX = GAME_HEADERS.indexOf('player.rating');

  // Seed prior ratings per format from existing sheet rows (last known rating)
  var priorByFormat = {};
  var lastRowExisting = sheet.getLastRow();
  if (lastRowExisting >= 2) {
    var existing = sheet.getRange(2, 1, lastRowExisting - 1, GAME_HEADERS.length).getValues();
    for (var e = 0; e < existing.length; e++) {
      var fmtE = existing[e][FORMAT_INDEX];
      var prE = existing[e][PLAYER_RATING_INDEX];
      if (fmtE && prE != null && prE !== '') {
        priorByFormat[fmtE] = Number(prE);
      }
    }
  }

  // If this month has no prior in-sheet rating for a format, seed from previous month
  seedPriorRatingsFromPreviousMonth_(yyyy, mm, priorByFormat);

  // Sort input games chronologically by end_time (fallback to start_time)
  games.sort(function(a, b) {
    function ts(g) {
      return (g && (g.end_time || g.start_time)) ? Number(g.end_time || g.start_time) : 0;
    }
    return ts(a) - ts(b);
  });

  var rows = [];
  for (var i = 0; i < games.length; i++) {
    var g = games[i];
    var url = g.url;
    if (!url || urlIndex[url]) continue; // dedupe
    var pgnMap = parsePgnHeadersToMap_(g.pgn || '');
    var row = makeGameRow_(g, pgnMap, priorByFormat, username);
    rows.push(row);
    // update prior map for player's rating by format, keyed by format
    var fmt = row[FORMAT_INDEX];
    var playerRating = row[PLAYER_RATING_INDEX];
    priorByFormat[fmt] = playerRating;
  }

  if (rows.length > 0) {
    appendRowsWithIndex_(ss, rows);
    // Also enqueue callbacks for these newly appended games (backfill and live)
    try {
      enqueueCallbacksForRows_(rows);
    } catch (e) {
      logWarn('ENQUEUE_CALLBACKS', 'Failed to enqueue callbacks for appended rows', { yyyy: yyyy, mm: mm, rows: rows.length, error: String(e) });
    }
  }
  metricRecord('archive_rows_appended', rows.length, { yyyy: yyyy, mm: mm });
  return rows.length;
}

/** Seed prior ratings map from previous month sheet to maintain cross-month continuity */
function seedPriorRatingsFromPreviousMonth_(yyyy, mm, priorByFormat) {
  try {
    var prev = previousMonth_(yyyy, mm);
    var prevSs = getArchiveSpreadsheetByMonth_(prev.yyyy, prev.mm);
    if (!prevSs) return;
    var sheet = prevSs.getSheetByName(SHEET_NAMES.games);
    if (!sheet) return;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    var FORMAT_INDEX = GAME_HEADERS.indexOf('format');
    var PLAYER_RATING_INDEX = GAME_HEADERS.indexOf('player.rating');
    var data = sheet.getRange(2, 1, lastRow - 1, GAME_HEADERS.length).getValues();
    // Scan from bottom for last known rating per format
    var seen = {};
    for (var i = data.length - 1; i >= 0; i--) {
      var fmt = data[i][FORMAT_INDEX];
      var rating = data[i][PLAYER_RATING_INDEX];
      if (fmt && rating != null && rating !== '' && !seen[fmt]) {
        if (priorByFormat[fmt] == null) priorByFormat[fmt] = Number(rating);
        seen[fmt] = true;
      }
    }
  } catch (e) {
    logWarn('SEED_PRIOR_FROM_PREV', 'Failed to seed prior ratings from previous month', { yyyy: yyyy, mm: mm, error: String(e) });
  }
}

/** Compute previous month given yyyy and mm (strings) */
function previousMonth_(yyyy, mm) {
  var y = Number(yyyy);
  var m = Number(mm);
  m -= 1;
  if (m === 0) { m = 12; y -= 1; }
  var mmStr = (m < 10 ? '0' + m : '' + m);
  return { yyyy: '' + y, mm: mmStr };
}

/** Discover archives, upsert meta rows, and pre-create per-month spreadsheets */
function syncArchivesListAndPrepare() {
  var list = fetchArchivesList_();
  var username = getUsername(); // ensure configured
  for (var i = 0; i < list.length; i++) {
    var url = list[i];
    var m = url.match(/\/(\d{4})\/(\d{2})$/);
    if (!m) continue;
    var yyyy = m[1], mm = m[2];
    var status = isCurrentOrFutureMonth_(yyyy, mm) ? 'active' : 'inactive';
    // Pre-create spreadsheet if missing
    ensureArchiveSpreadsheet_(yyyy, mm);
    // Upsert meta with minimal info; etag/last-modified will be filled during ingest
    upsertArchivesMetaRow_(url, yyyy, mm, '', '', 0, status, null, null);
  }
  upsertOpsMeta_('SYNC_ARCHIVES_LAST_AT_ISO', isoNow());
}

/** Batched backfill: process up to maxMonths archives starting from stored cursor */
function backfillArchivesBatch(maxMonths) {
  var list = fetchArchivesList_();
  // Ensure per-month spreadsheets exist beforehand for speed
  for (var i = 0; i < list.length; i++) {
    var m = list[i].match(/\/(\d{4})\/(\d{2})$/);
    if (m) ensureArchiveSpreadsheet_(m[1], m[2]);
  }
  var idx = getBackfillCursorIndex();
  if (idx < 0 || idx >= list.length) idx = 0;
  var limit = Math.max(1, Number(maxMonths || 5));
  var processed = 0;
  upsertOpsMeta_('BACKFILL_LAST_AT_ISO', isoNow());
  for (var j = idx; j < list.length && processed < limit; j++) {
    var url = list[j];
    upsertOpsMeta_('BACKFILL_NEXT_URL', url);
    upsertOpsMeta_('BACKFILL_LAST_IDX', String(j));
    var res = ingestArchiveMonth(url);
    logInfo('BACKFILL_BATCH', 'Ingested ' + url, res);
    processed++;
    setBackfillCursorIndex(j + 1);
  }
  SpreadsheetApp.flush();
  return { processed: processed, nextIndex: getBackfillCursorIndex(), totalArchives: list.length };
}

function backfillAllArchives() {
  var list = fetchArchivesList_();
  // Pre-create spreadsheets for each archive month so they exist upfront
  for (var i = 0; i < list.length; i++) {
    var m = list[i].match(/\/(\d{4})\/(\d{2})$/);
    if (m) ensureArchiveSpreadsheet_(m[1], m[2]);
  }
  var start = new Date().getTime();
  var idx = getBackfillCursorIndex();
  if (idx < 0 || idx >= list.length) idx = 0;
  upsertOpsMeta_('BACKFILL_LAST_AT_ISO', isoNow());
  for (var j = idx; j < list.length; j++) {
    var url = list[j];
    upsertOpsMeta_('BACKFILL_NEXT_URL', url);
    upsertOpsMeta_('BACKFILL_LAST_IDX', String(j));
    var res = ingestArchiveMonth(url);
    logInfo('BACKFILL_MONTH', 'Ingested ' + url, res);
    setBackfillCursorIndex(j + 1);
    if (new Date().getTime() - start > 5 * 60 * 1000) {
      logWarn('BACKFILL_TIME', 'Stopping early due to time limit', { processed: (j - idx + 1), nextIndex: j + 1 });
      SpreadsheetApp.flush();
      return; // resumable next run
    }
    if ((j + 1) % 5 === 0) SpreadsheetApp.flush();
  }
  // Completed all archives; reset cursor
  setBackfillCursorIndex(0);
  upsertOpsMeta_('BACKFILL_NEXT_URL', '');
}