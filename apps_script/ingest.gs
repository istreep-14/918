/**
 * Incremental ingest for active month with last URL slicing (per-month spreadsheet).
 */

function getActiveMonth_() {
  var p = PropertiesService.getDocumentProperties();
  var key = p.getProperty(PROP_KEYS.CURRENT_ACTIVE_MONTH);
  if (key) return key;
  var today = new Date();
  var yyyy = String(today.getFullYear());
  var mm = ('0' + (today.getMonth() + 1)).slice(-2);
  var mk = yyyy + '-' + mm;
  p.setProperty(PROP_KEYS.CURRENT_ACTIVE_MONTH, mk);
  return mk;
}

function setActiveMonth_(yyyyMm) {
  PropertiesService.getDocumentProperties().setProperty(PROP_KEYS.CURRENT_ACTIVE_MONTH, yyyyMm);
}

function getLastSeenUrl_(yyyyMm) {
  var key = PROP_KEYS.LAST_SEEN_URL_PREFIX + yyyyMm;
  return PropertiesService.getDocumentProperties().getProperty(key) || '';
}

function setLastSeenUrl_(yyyyMm, url) {
  var key = PROP_KEYS.LAST_SEEN_URL_PREFIX + yyyyMm;
  PropertiesService.getDocumentProperties().setProperty(key, url || '');
}

function listArchiveMonthsParsed_(username) {
  var res = fetchArchivesList_(username);
  if (res.status === 304) return [];
  if (res.status >= 200 && res.status < 300 && res.json && res.json.archives) {
    var out = [];
    for (var i = 0; i < res.json.archives.length; i++) {
      var u = res.json.archives[i];
      var m = u.match(/\/games\/(\d{4})\/(\d{2})$/);
      if (m) out.push({ yyyy: m[1], mm: m[2], url: u });
    }
    return out;
  }
  return [];
}

function buildMonthRows_(games, myUsername) {
  var priorRatingByFormat = loadPriorRatings_();
  games.sort(function(a, b) {
    var ae = Number(a.end_time || 0), be = Number(b.end_time || 0);
    if (ae !== be) return ae - be;
    var as = Number(a.start_time || 0), bs = Number(b.start_time || 0);
    return as - bs;
  });
  var rows = new Array(games.length);
  var formatIdx = GAME_HEADERS.indexOf('format');
  var playerRatingIdx = GAME_HEADERS.indexOf('player.rating');
  for (var i = 0; i < games.length; i++) {
    var g = games[i];
    var pgnMap = parsePgnHeadersToMap_(g.pgn || '');
    var fmt = deriveFormat_(g.rules || 'chess', g.time_class || '', deriveType_(g.time_class));
    if (!(fmt in priorRatingByFormat)) priorRatingByFormat[fmt] = null;
    var row = makeGameRow_(g, pgnMap, priorRatingByFormat, PropertiesService.getDocumentProperties().getProperty(PROP_KEYS.MY_USERNAME) || '');
    var fmtRow = row[formatIdx];
    var pr = row[playerRatingIdx];
    if (pr != null && !isNaN(pr)) priorRatingByFormat[fmtRow] = Number(pr);
    rows[i] = row;
  }
  savePriorRatings_(priorRatingByFormat);
  return rows;
}

function ingestActiveMonthOnce() {
  return withStepLogging_('ingestActiveMonthOnce', getActiveMonth_(), function() {
    var props = PropertiesService.getDocumentProperties();
    var username = props.getProperty(PROP_KEYS.USERNAME);
    var myUsername = props.getProperty(PROP_KEYS.MY_USERNAME) || username;
    if (!username) throw new Error('USERNAME property not set');

    var active = getActiveMonth_();
    var yyyy = active.substring(0, 4);
    var mm = active.substring(5, 7);

    var monthRes = fetchMonthArchive_(username, yyyy, mm);
    var nowIso = formatIsoLocal(new Date());

    if (monthRes.status === 304) {
      patchArchiveListRow_(yyyy, mm, { last_month_check_at: nowIso });
      return 0;
    }
    if (!(monthRes.status >= 200 && monthRes.status < 300) || !monthRes.json || !monthRes.json.games) {
      patchArchiveListRow_(yyyy, mm, { last_month_check_at: nowIso });
      return 0;
    }

    var games = monthRes.json.games || [];
    var apiCount = games.length;
    var lastUrlApi = apiCount ? games[apiCount - 1].url : '';

    var lastSeen = getLastSeenUrl_(active);
    var startIdx = 0;
    if (lastSeen) {
      for (var i = games.length - 1; i >= 0; i--) { if (games[i].url === lastSeen) { startIdx = i + 1; break; } }
    }
    var newGames = games.slice(startIdx);
    if (newGames.length === 0) {
      patchArchiveListRow_(yyyy, mm, {
        last_month_check_at: nowIso,
        last_url_api: lastUrlApi,
        api_game_count_last: apiCount
      });
      return 0;
    }

    var rows = buildMonthRows_(newGames, myUsername);

    // Write to Active month spreadsheet (Games tab)
    var ssActive = ensureActiveMonthSpreadsheet_(active);
    var shGames = getOrCreateSheet_(ssActive, MONTH_TABS.Games);
    var headers = (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS;
    var outRows = (headers === GAME_HEADERS) ? rows : rows.map(function(r){ return subsetRow_(r, GAME_HEADERS, headers); });
    writeRowsAppend_(shGames, headers, outRows);

    // Update daily totals for affected dates
    var affectedDates = {};
    var endIdx = GAME_HEADERS.indexOf('end_time');
    for (var r = 0; r < rows.length; r++) {
      var dk = getDateKeyFromLocalIso_(rows[r][endIdx]);
      if (dk) affectedDates[dk] = true;
    }
    recomputeDailyTotalsForDates_(Object.keys(affectedDates));

    // Update ledger in Control file
    var sheetCount = shGames.getLastRow() > 1 ? (shGames.getLastRow() - 1) : 0;
    patchArchiveListRow_(yyyy, mm, {
      archive_url: APIS.archiveMonth(username, yyyy, mm),
      last_month_check_at: nowIso,
      month_etag: PropertiesService.getDocumentProperties().getProperty(PROP_KEYS.MONTH_ETAG_PREFIX + active) || '',
      last_url_api: lastUrlApi,
      last_url_seen: newGames[newGames.length - 1].url,
      api_game_count_last: apiCount,
      sheet_game_count: sheetCount,
      ingested_at_last: nowIso
    });

    setLastSeenUrl_(active, lastUrlApi || (newGames.length ? newGames[newGames.length - 1].url : lastSeen));
    return outRows.length;
  });
}