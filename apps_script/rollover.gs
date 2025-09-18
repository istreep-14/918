/**
 * Month rollover: finalize previous month, move data to archive, seed new month.
 */

function getYearMonthParts_(yyyyMm) {
  return { yyyy: yyyyMm.substring(0,4), mm: yyyyMm.substring(5,7) };
}

function finalizePreviousMonthIfReady_() {
  return withStepLogging_('finalizePreviousMonthIfReady_', getActiveMonth_(), function() {
    var props = PropertiesService.getDocumentProperties();
    var username = props.getProperty(PROP_KEYS.USERNAME);
    if (!username) throw new Error('USERNAME property not set');

    var active = getActiveMonth_();
    var parts = getYearMonthParts_(active);

    // Check archives list for new month
    var listRes = fetchArchivesList_(username);
    var nowIso = formatIsoLocal(new Date());
    if (!(listRes.status === 200 && listRes.json && listRes.json.archives && listRes.json.archives.length)) {
      return false;
    }
    var latest = listRes.json.archives[listRes.json.archives.length - 1];
    var m = latest.match(/\/games\/(\d{4})\/(\d{2})$/);
    if (!m) return false;
    var newestMonth = m[1] + '-' + m[2];

    // If the newest month equals the active month, nothing to finalize
    if (newestMonth === active) return false;

    // Candidate previous month to finalize
    var prev = active;
    var prevParts = getYearMonthParts_(prev);

    // Verify stability of previous month by ETag / parity
    var monthRes = fetchMonthArchive_(username, prevParts.yyyy, prevParts.mm);
    // Accept 304 as stable; or if 200, ensure last_url_api equals last_url_seen and counts match
    var ledger = getArchiveListRow_(prevParts.yyyy, prevParts.mm) || {};
    var apiGames = 0;
    var lastUrlApi = '';
    if (monthRes.status === 200 && monthRes.json && monthRes.json.games) {
      apiGames = monthRes.json.games.length;
      lastUrlApi = apiGames ? monthRes.json.games[apiGames - 1].url : '';
    }
    var stable = (monthRes.status === 304) || (ledger && String(ledger.last_url_seen) === String(lastUrlApi) && Number(ledger.api_game_count_last || 0) === apiGames);
    if (!stable) return false;

    // Move ActiveGames rows to the archive file (per year)
    var ssControl = getControlSpreadsheet_();
    var shActive = getOrCreateSheet_(ssControl, SHEET_NAMES.ActiveGames);
    var headers = readHeaders_(shActive);
    if (headers.length === 0) headers = (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS;
    var lastRow = shActive.getLastRow();
    var toMove = (lastRow >= 2) ? shActive.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];

    if (toMove.length) {
      var yyyy = prevParts.yyyy;
      var ssArchive = getArchiveSpreadsheetForYear_(yyyy);
      if (!ssArchive) throw new Error('Archive spreadsheet for year ' + yyyy + ' is not configured');
      var shArchive = getOrCreateSheet_(ssArchive, 'ArchiveGames_' + yyyy);
      writeRowsAppend_(shArchive, headers, toMove);
    }

    // Recompute and append daily totals to archive totals (in archive file or control as per design)
    recomputeDailyTotalsForMonth_(prevParts.yyyy, prevParts.mm);

    // Mark ledger and clear actives
    patchArchiveListRow_(prevParts.yyyy, prevParts.mm, { finalized_at: nowIso });

    shActive.clearContents();
    ensureHeaders_(shActive, (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS);

    var shTotals = getDailyTotalsActiveSheet_();
    shTotals.clearContents();
    ensureHeaders_(shTotals, DAILY_TOTALS_HEADERS);

    // Seed new active month dates if the list reports a newer month
    setActiveMonth_(newestMonth);
    var newParts = getYearMonthParts_(newestMonth);
    seedDailyTotalsForNewMonth_(newParts.yyyy, newParts.mm);

    return true;
  });
}