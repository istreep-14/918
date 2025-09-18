/**
 * Provisioning: create folder, Control spreadsheet with sheets/headers, and Archive files per year.
 */

function ensureFolder_(folderName) {
  var iter = DriveApp.getFoldersByName(folderName);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFolder(folderName);
}

function createSpreadsheetInFolder_(name, folder) {
  var file = SpreadsheetApp.create(name);
  if (folder) {
    var drvFile = DriveApp.getFileById(file.getId());
    var parent = drvFile.getParents();
    if (parent.hasNext()) parent.next().removeFile(drvFile);
    folder.addFile(drvFile);
  }
  return file;
}

function provisionControlAndArchives_(folderName, yearsArray) {
  var props = PropertiesService.getDocumentProperties();
  var folder = ensureFolder_(folderName);

  // Control spreadsheet
  var controlId = props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID);
  var control;
  if (controlId) {
    control = SpreadsheetApp.openById(controlId);
  } else {
    control = createSpreadsheetInFolder_('Control', folder);
    props.setProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID, control.getId());
  }

  // Create required tabs with headers
  var ctlSheets = [
    { name: SHEET_NAMES.ActiveGames, headers: (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS },
    { name: SHEET_NAMES.DailyTotalsActive, headers: DAILY_TOTALS_HEADERS },
    { name: SHEET_NAMES.ArchiveList, headers: ARCHIVE_LIST_HEADERS },
    { name: SHEET_NAMES.CallbacksQueue, headers: CALLBACKS_QUEUE_HEADERS },
    { name: SHEET_NAMES.CallbacksResults, headers: CALLBACKS_RESULTS_HEADERS },
    { name: SHEET_NAMES.Logs, headers: ['timestamp_iso','level','step','month_key','message','context_json'] },
    { name: SHEET_NAMES.Health, headers: ['checked_at_iso','active_month','list_etag_age_hours','active_month_etag_age_minutes','api_vs_sheet_count_diff','last_url_match','pending_queue_total','failed_queue_24h','daily_totals_yesterday_fresh','finalization_ready_prev_month','severity','summary'] }
  ];
  for (var i = 0; i < ctlSheets.length; i++) {
    var sh = getOrCreateSheet_(control, ctlSheets[i].name);
    ensureHeaders_(sh, ctlSheets[i].headers);
  }

  // Archive spreadsheets per year
  for (var y = 0; y < yearsArray.length; y++) {
    var yyyy = String(yearsArray[y]);
    var key = PROP_KEYS.ARCHIVE_SPREADSHEET_ID_PREFIX + yyyy;
    var id = props.getProperty(key);
    var arch;
    if (id) {
      arch = SpreadsheetApp.openById(id);
    } else {
      arch = createSpreadsheetInFolder_('ArchiveGames_' + yyyy, folder);
      props.setProperty(key, arch.getId());
    }
    var shA = getOrCreateSheet_(arch, 'ArchiveGames_' + yyyy);
    ensureHeaders_(shA, (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS);
  }

  return { folderId: folder.getId(), controlId: control.getId() };
}