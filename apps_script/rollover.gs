/**
 * Month rollover: finalize previous month, move active monthly spreadsheet to archive folder.
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

    // Verify stability of previous month by ETag/URL parity
    var monthRes = fetchMonthArchive_(username, parts.yyyy, parts.mm);
    var ledger = getArchiveListRow_(parts.yyyy, parts.mm) || {};
    var apiGames = 0;
    var lastUrlApi = '';
    if (monthRes.status === 200 && monthRes.json && monthRes.json.games) {
      apiGames = monthRes.json.games.length;
      lastUrlApi = apiGames ? monthRes.json.games[apiGames - 1].url : '';
    }
    var stable = (monthRes.status === 304) || (String(ledger.last_url_seen || '') === String(lastUrlApi) && Number(ledger.api_game_count_last || 0) === apiGames);
    if (!stable) return false;

    // Move Active monthly spreadsheet file from Active Months -> Archive Months
    var folders = ensureRootAndSubfolders_();
    var name = 'Archive ' + parts.yyyy + '-' + parts.mm;
    var file = findFileInFolderByName_(folders.activeFolder, name);
    if (!file) return false;
    folders.archiveFolder.addFile(file);
    folders.activeFolder.removeFile(file);

    patchArchiveListRow_(parts.yyyy, parts.mm, { finalized_at: nowIso });

    // Seed the new active month spreadsheet
    setActiveMonth_(newestMonth);
    var newParts = getYearMonthParts_(newestMonth);
    ensureActiveMonthSpreadsheet_(newestMonth);

    return true;
  });
}