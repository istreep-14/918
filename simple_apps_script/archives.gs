/** Archives: list fetch, ledger write, and backfill */

function fetchArchivesListRaw_() {
  var props = PropertiesService.getDocumentProperties();
  var username = props.getProperty(PROP_KEYS.USERNAME);
  if (!username) throw new Error('USERNAME not set. Call applyConfigToProperties().');
  var etag = props.getProperty(PROP_KEYS.LIST_ETAG);
  var res = httpGetJson_(APIS.archivesList(username), etag);
  if (res.etag) props.setProperty(PROP_KEYS.LIST_ETAG, res.etag);
  return res;
}

function parseArchivesList_(res) {
  if (res.status === 304) return [];
  if (!(res.status >= 200 && res.status < 300) || !res.json || !res.json.archives) return [];
  var out = [];
  for (var i = 0; i < res.json.archives.length; i++) {
    var u = res.json.archives[i];
    var m = u.match(/\/games\/(\d{4})\/(\d{2})$/);
    if (m) out.push({ yyyy: m[1], mm: m[2], url: u });
  }
  return out;
}

function fetchAndStoreArchivesList_() {
  var res = fetchArchivesListRaw_();
  var list = parseArchivesList_(res);
  var props = PropertiesService.getDocumentProperties();
  var control = SpreadsheetApp.openById(props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID));
  var sh = getOrCreateSheet_(control, SHEET_NAMES.ArchivesList);
  ensureHeaders_(sh, ARCHIVES_HEADERS);
  // Build existing index by year-month
  var idx = {};
  var last = sh.getLastRow();
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, ARCHIVES_HEADERS.length).getValues();
    var yI = ARCHIVES_HEADERS.indexOf('year');
    var mI = ARCHIVES_HEADERS.indexOf('month');
    for (var r = 0; r < vals.length; r++) idx[vals[r][yI] + '-' + vals[r][mI]] = r + 2;
  }
  var nowIso = isoNow_();
  for (var j = 0; j < list.length; j++) {
    var rec = list[j];
    var key = rec.yyyy + '-' + rec.mm;
    var row = [rec.yyyy, rec.mm, rec.url, (isCurrentOrFuture_(rec.yyyy, rec.mm) ? 'active' : 'inactive'), '', '', nowIso, '', '', '', ''];
    if (idx[key]) {
      sh.getRange(idx[key], 1, 1, ARCHIVES_HEADERS.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }
  }
  return list;
}

function isCurrentOrFuture_(yyyy, mm) {
  var now = new Date();
  var cy = now.getFullYear();
  var cm = now.getMonth() + 1;
  var y = Number(yyyy), m = Number(mm);
  return (y > cy) || (y === cy && m >= cm);
}

function fetchMonth_(yyyy, mm) {
  var props = PropertiesService.getDocumentProperties();
  var username = props.getProperty(PROP_KEYS.USERNAME);
  var etag = props.getProperty(PROP_KEYS.MONTH_ETAG_PREFIX + (yyyy + '-' + mm));
  var res = httpGetJson_(APIS.archiveMonth(username, yyyy, mm), etag);
  if (res.etag) props.setProperty(PROP_KEYS.MONTH_ETAG_PREFIX + (yyyy + '-' + mm), res.etag);
  return res;
}

function backfillAllArchives() {
  var props = PropertiesService.getDocumentProperties();
  var control = SpreadsheetApp.openById(props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID));
  var arch = SpreadsheetApp.openById(props.getProperty(PROP_KEYS.ARCHIVES_SPREADSHEET_ID));
  var active = SpreadsheetApp.openById(props.getProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID));
  var shLedger = getOrCreateSheet_(control, SHEET_NAMES.ArchivesList);
  ensureHeaders_(shLedger, ARCHIVES_HEADERS);
  var shArchive = getOrCreateSheet_(arch, SHEET_NAMES.ArchiveGames);
  ensureHeaders_(shArchive, GAME_HEADERS);
  var shActive = getOrCreateSheet_(active, SHEET_NAMES.ActiveGames);
  ensureHeaders_(shActive, GAME_HEADERS);

  var headers = ARCHIVES_HEADERS;
  var last = shLedger.getLastRow();
  if (last < 2) return 0;
  var rows = shLedger.getRange(2, 1, last - 1, headers.length).getValues();
  var yI = headers.indexOf('year');
  var mI = headers.indexOf('month');
  var urlI = headers.indexOf('archive_url');
  var statusI = headers.indexOf('status');
  var apiCountI = headers.indexOf('api_game_count_last');
  var sheetCountI = headers.indexOf('sheet_game_count');
  var lastUrlApiI = headers.indexOf('last_url_api');
  var lastUrlSeenI = headers.indexOf('last_url_seen');

  // Build index of existing URLs in destination sheets to avoid duplicates
  function buildUrlIdx_(sheet) {
    var lr = sheet.getLastRow();
    if (lr < 2) return {};
    var urls = sheet.getRange(2, 1, lr - 1, 1).getValues();
    var idx = {};
    for (var i = 0; i < urls.length; i++) { var u = urls[i][0]; if (u) idx[u] = true; }
    return idx;
  }
  var idxArchive = buildUrlIdx_(shArchive);
  var idxActive = buildUrlIdx_(shActive);

  var totalAppended = 0;
  for (var r = 0; r < rows.length; r++) {
    var yyyy = String(rows[r][yI]);
    var mm = String(rows[r][mI]);
    var status = String(rows[r][statusI] || 'inactive');
    var res = fetchMonth_(yyyy, mm);
    var apiGames = 0; var lastUrl = '';
    if (res.status === 304) {
      // nothing new
    } else if (res.status >= 200 && res.status < 300 && res.json && res.json.games) {
      var games = res.json.games || [];
      apiGames = games.length;
      lastUrl = apiGames ? games[apiGames - 1].url : '';
      // Transform all rows in-memory once using pipeline
      var rowsOut = transformAll_(games);
      var dest = (status === 'active') ? shActive : shArchive;
      var idxDest = (status === 'active') ? idxActive : idxArchive;
      var append = [];
      for (var i = 0; i < rowsOut.length; i++) {
        var u = rowsOut[i][0];
        if (!u || idxDest[u]) continue;
        append.push(rowsOut[i]); idxDest[u] = true;
      }
      if (append.length) { writeRowsAppend_(dest, GAME_HEADERS, append); totalAppended += append.length; }
    }
    // Update ledger for row
    rows[r][apiCountI] = apiGames;
    rows[r][sheetCountI] = (status === 'active') ? Math.max(0, shActive.getLastRow() - 1) : Math.max(0, shArchive.getLastRow() - 1);
    rows[r][lastUrlApiI] = lastUrl;
    rows[r][lastUrlSeenI] = lastUrl;
  }
  shLedger.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return totalAppended;
}

