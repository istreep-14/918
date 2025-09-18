/** Archives ingestion: list, fetch per-month with ETag, write rows, update meta */

function fetchArchivesList_() {
  var username = getUsername();
  var res = httpFetchJson(ENDPOINTS.archivesList(username), {});
  if (res.status >= 200 && res.status < 300 && res.json && res.json.archives) {
    return res.json.archives; // array of urls: .../YYYY/MM
  }
  throw new Error('Failed to fetch archives list');
}

function upsertArchivesMetaRow_(archiveUrl, yyyy, mm, etag, lastModified, gamesCount, status) {
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
  var row = [archiveUrl, yyyy, mm, etag || '', lastModified || '', isoNow(), gamesCount || 0, status || 'active', ''];
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
    upsertArchivesMetaRow_(archiveUrl, yyyy, mm, etag, '', 0, (isCurrentOrFutureMonth_(yyyy, mm) ? 'active' : 'inactive'));
    return { status: 'not_modified', appended: 0 };
  }
  if (!(res.status >= 200 && res.status < 300) || !res.json) {
    logWarn('ARCHIVE_FETCH_FAIL', 'Archive fetch failed', { url: archiveUrl, status: res.status });
    return { status: 'error', appended: 0 };
  }
  var games = res.json.games || [];
  var appended = ingestGamesArray_(yyyy, mm, games);
  var newEtag = (res.headers && (res.headers['ETag'] || res.headers['Etag'])) || etag || '';
  var lastModified = (res.headers && (res.headers['Last-Modified'] || res.headers['Last-modified'])) || '';
  var status = (isCurrentOrFutureMonth_(yyyy, mm) ? 'active' : 'inactive');
  upsertArchivesMetaRow_(archiveUrl, yyyy, mm, newEtag, lastModified, games.length, status);
  return { status: 'ok', appended: appended };
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

  // naive prior-rating map per format (estimate); for speed keep in memory per-run
  var priorByFormat = {};

  var rows = [];
  for (var i = 0; i < games.length; i++) {
    var g = games[i];
    var url = g.url;
    if (!url || urlIndex[url]) continue; // dedupe
    var pgnMap = parsePgnHeadersToMap_(g.pgn || '');
    var row = makeGameRow_(g, pgnMap, priorByFormat, username);
    rows.push(row);
    // update prior map for player's rating by format, keyed by format
    var fmt = row[19]; // 'format' index in GAME_HEADERS
    var playerRating = row[36];
    priorByFormat[fmt] = playerRating;
  }

  if (rows.length > 0) {
    appendRowsWithIndex_(ss, rows);
  }
  metricRecord('archive_rows_appended', rows.length, { yyyy: yyyy, mm: mm });
  return rows.length;
}

function backfillAllArchives() {
  var list = fetchArchivesList_();
  for (var i = 0; i < list.length; i++) {
    var url = list[i];
    var res = ingestArchiveMonth(url);
    logInfo('BACKFILL_MONTH', 'Ingested ' + url, res);
    // Execution time guard
    if (Utilities.getRemainingDailyQuota && i % 10 === 0) SpreadsheetApp.flush();
  }
}