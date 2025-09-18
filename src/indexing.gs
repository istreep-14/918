/** Per-month archive spreadsheet management and indexing */

function monthKey_(yyyy, mm) { return yyyy + '-' + mm; }

function ensureArchiveSpreadsheet_(yyyy, mm) {
  if (getArchiveStorageMode() === 'single') {
    return getOrCreateMasterArchive_();
  }
  var registry = getArchiveMonthRegistry();
  var key = monthKey_(yyyy, mm);
  var id = registry[key];
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  var folderId = getArchivesFolderId() || getFolderId();
  var ss = createSpreadsheetInFolder_('Archive ' + yyyy + '-' + mm, folderId);
  ensureHeaders_(getOrCreateSheet_(ss, SHEET_NAMES.games), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ss, SHEET_NAMES.gameIndex), GAME_INDEX_HEADERS);
  registry[key] = ss.getId();
  setArchiveMonthRegistry(registry);
  return ss;
}

function getArchiveSpreadsheetByMonth_(yyyy, mm) {
  if (getArchiveStorageMode() === 'single') {
    return getOrCreateMasterArchive_();
  }
  var registry = getArchiveMonthRegistry();
  var key = monthKey_(yyyy, mm);
  var id = registry[key];
  return id ? SpreadsheetApp.openById(id) : null;
}

function getOrCreateMasterArchive_() {
  var id = getMasterArchiveSpreadsheetId();
  if (id) {
    var ss = SpreadsheetApp.openById(id);
    ensureHeaders_(getOrCreateSheet_(ss, SHEET_NAMES.games), GAME_HEADERS);
    ensureHeaders_(getOrCreateSheet_(ss, SHEET_NAMES.gameIndex), GAME_INDEX_HEADERS);
    return ss;
  }
  var folderId = getArchivesFolderId() || getFolderId();
  var ssNew = createSpreadsheetInFolder_('Archive Master', folderId);
  ensureHeaders_(getOrCreateSheet_(ssNew, SHEET_NAMES.games), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ssNew, SHEET_NAMES.gameIndex), GAME_INDEX_HEADERS);
  setMasterArchiveSpreadsheetId(ssNew.getId());
  return ssNew;
}

/** Merge all monthly archives into the master archive. Optionally delete source files. */
function mergeArchivesIntoMaster(deleteAfter) {
  var mode = getArchiveStorageMode();
  var master = getOrCreateMasterArchive_();
  var masterGames = master.getSheetByName(SHEET_NAMES.games);
  var urlIndex = buildUrlIndex_(masterGames);
  var appendedTotal = 0;
  var registry = getArchiveMonthRegistry();
  var keys = Object.keys(registry);
  for (var i = 0; i < keys.length; i++) {
    var id = registry[keys[i]];
    if (!id) continue;
    var ss = SpreadsheetApp.openById(id);
    var src = ss.getSheetByName(SHEET_NAMES.games);
    if (!src) continue;
    var lastRow = src.getLastRow();
    if (lastRow < 2) continue;
    var data = src.getRange(2, 1, lastRow - 1, GAME_HEADERS.length).getValues();
    var toAppend = [];
    for (var r = 0; r < data.length; r++) {
      var url = data[r][0];
      if (url && !urlIndex[url]) {
        toAppend.push(data[r]);
        urlIndex[url] = true;
      }
    }
    if (toAppend.length > 0) {
      appendRowsWithIndex_(master, toAppend);
      appendedTotal += toAppend.length;
    }
    if (deleteAfter) {
      try {
        DriveApp.getFileById(id).setTrashed(true);
      } catch (e) {
        logWarn('MERGE_DELETE_FAIL', 'Failed to delete monthly archive file', { id: id, error: String(e) });
      }
      delete registry[keys[i]];
    }
  }
  setArchiveMonthRegistry(registry);
  if (mode !== 'single') setArchiveStorageMode('single');
  logInfo('MERGE_ARCHIVES', 'Merged into master', { appended: appendedTotal, deleted: Boolean(deleteAfter) });
  return appendedTotal;
}

function buildUrlIndex_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  var urls = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var index = {};
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i][0];
    if (u) index[u] = i + 2; // row number
  }
  return index;
}

function appendRowsWithIndex_(ss, rows) {
  if (!rows || rows.length === 0) return 0;
  var sheet = ss.getSheetByName(SHEET_NAMES.games);
  var indexSheet = ss.getSheetByName(SHEET_NAMES.gameIndex);
  var lastRow = sheet.getLastRow();
  var startRow = lastRow + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  var indexRows = [];
  for (var i = 0; i < rows.length; i++) {
    var url = rows[i][0];
    indexRows.push([url, ss.getId(), SHEET_NAMES.games, startRow + i]);
  }
  indexSheet.getRange(indexSheet.getLastRow() + 1, 1, indexRows.length, indexRows[0].length).setValues(indexRows);
  return rows.length;
}

/** Update ArchivesProgress aggregates */
function updateArchivesProgress_(archiveUrl, yyyy, mm, seenDelta, appendedDelta) {
  try {
    var id = getArchivesMetaSpreadsheetId();
    if (!id) return;
    var ss = SpreadsheetApp.openById(id);
    var sheet = getOrCreateSheet_(ss, SHEET_NAMES.archivesProgress);
    ensureHeaders_(sheet, ARCHIVES_PROGRESS_HEADERS);
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    if (lastRow >= 2) {
      var rng = sheet.getRange(2, 1, lastRow - 1, ARCHIVES_PROGRESS_HEADERS.length).getValues();
      for (var i = 0; i < rng.length; i++) {
        if (rng[i][0] === archiveUrl) { foundRow = i + 2; break; }
      }
    }
    var nowIso = isoNow();
    if (foundRow > 0) {
      var existing = sheet.getRange(foundRow, 1, 1, ARCHIVES_PROGRESS_HEADERS.length).getValues()[0];
      var totalSeen = Number(existing[3] || 0) + (seenDelta || 0);
      var totalAppended = Number(existing[4] || 0) + (appendedDelta || 0);
      sheet.getRange(foundRow, 1, 1, ARCHIVES_PROGRESS_HEADERS.length).setValues([[archiveUrl, yyyy, mm, totalSeen, totalAppended, nowIso]]);
    } else {
      sheet.appendRow([archiveUrl, yyyy, mm, (seenDelta || 0), (appendedDelta || 0), nowIso]);
    }
  } catch (e) {
    logWarn('ARCHIVES_PROGRESS', 'Failed to update ArchivesProgress', { url: archiveUrl, error: String(e) });
  }
}