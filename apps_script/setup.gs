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

// ------------------------------
// Easy entry points
// ------------------------------

function setUsernames(username, myUsername) {
  var props = PropertiesService.getDocumentProperties();
  if (username) props.setProperty(PROP_KEYS.USERNAME, String(username));
  if (myUsername) props.setProperty(PROP_KEYS.MY_USERNAME, String(myUsername));
  if (username && !myUsername) props.setProperty(PROP_KEYS.MY_USERNAME, String(username));
}

function setupProject() {
  var year = new Date().getFullYear();
  return provisionControlAndArchives_('Chess Sheets', [year]);
}

function setupProjectWithRange(folderName, startYear, endYear) {
  var f = folderName || 'Chess Sheets';
  var s = Number(startYear || new Date().getFullYear());
  var e = Number(endYear || s);
  if (e < s) e = s;
  var years = [];
  for (var y = s; y <= e; y++) years.push(y);
  return provisionControlAndArchives_(f, years);
}

function quickSetup(username, folderName) {
  setUsernames(username, username);
  return setupProjectWithRange(folderName || 'Chess Sheets', new Date().getFullYear(), new Date().getFullYear());
}

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Chess Pipeline')
      .addItem('Setup Project (default)', 'setupProject')
      .addSeparator()
      .addItem('Ingest Active Month', 'ingestActiveMonthOnce')
      .addItem('Finalize Previous Month If Ready', 'finalizePreviousMonthIfReady_')
      .addItem('Health Check', 'writeHealth_')
      .addSeparator()
      .addItem('Seed Daily Totals (this month)', 'menuSeedDailyTotals_')
      .addToUi();
  } catch (e) {}
}

function menuSeedDailyTotals_() {
  var active = getActiveMonth_();
  var yyyy = active.substring(0,4);
  var mm = active.substring(5,7);
  seedDailyTotalsForNewMonth_(yyyy, mm);
}