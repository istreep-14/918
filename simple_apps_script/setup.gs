/** Setup: create project folder, spreadsheets, apply configuration */

function ensureProject_() {
  var props = PropertiesService.getDocumentProperties();
  var rootId = props.getProperty(PROP_KEYS.ROOT_FOLDER_ID);
  var name = props.getProperty(PROP_KEYS.PROJECT_NAME) || 'Chess Simple';
  var root = rootId ? DriveApp.getFolderById(rootId) : DriveApp.createFolder(name);
  if (!rootId) props.setProperty(PROP_KEYS.ROOT_FOLDER_ID, root.getId());

  function ensureFile(fn) {
    var it = root.getFilesByName(fn);
    return it.hasNext() ? SpreadsheetApp.openById(it.next().getId()) : SpreadsheetApp.openById(DriveApp.getFileById(SpreadsheetApp.create(fn).getId()).getId());
  }

  // Control spreadsheet
  var controlId = props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID);
  var control = controlId ? SpreadsheetApp.openById(controlId) : (function(){ var f = SpreadsheetApp.create('Control'); var df = DriveApp.getFileById(f.getId()); var p = df.getParents(); if (p.hasNext()) p.next().removeFile(df); root.addFile(df); props.setProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID, f.getId()); return f; })();

  // Archives spreadsheet (single file for all historical months)
  var archId = props.getProperty(PROP_KEYS.ARCHIVES_SPREADSHEET_ID);
  var arch = archId ? SpreadsheetApp.openById(archId) : (function(){ var f = SpreadsheetApp.create('Archives'); var df = DriveApp.getFileById(f.getId()); var p = df.getParents(); if (p.hasNext()) p.next().removeFile(df); root.addFile(df); props.setProperty(PROP_KEYS.ARCHIVES_SPREADSHEET_ID, f.getId()); return f; })();

  // Active spreadsheet (current month mirror)
  var actId = props.getProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID);
  var act = actId ? SpreadsheetApp.openById(actId) : (function(){ var f = SpreadsheetApp.create('Active'); var df = DriveApp.getFileById(f.getId()); var p = df.getParents(); if (p.hasNext()) p.next().removeFile(df); root.addFile(df); props.setProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID, f.getId()); return f; })();

  // Ensure tabs and headers
  ensureHeaders_(getOrCreateSheet_(control, SHEET_NAMES.ArchivesList), ARCHIVES_HEADERS);
  ensureHeaders_(getOrCreateSheet_(arch, SHEET_NAMES.ArchiveGames), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(act, SHEET_NAMES.ActiveGames), GAME_HEADERS);

  return { rootId: root.getId(), controlId: control.getId(), archivesId: arch.getId(), activeId: act.getId() };
}

function setupSimple() {
  applyConfigToProperties();
  var out = ensureProject_();
  fetchAndStoreArchivesList_();
  return out;
}

