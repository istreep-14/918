/** Setup for Option B: Control + Archives + Active */

function ensureProject_() {
  var props=PropertiesService.getDocumentProperties();
  var rootId=props.getProperty(PROP_KEYS.ROOT_FOLDER_ID);
  var name=props.getProperty(PROP_KEYS.PROJECT_NAME)||'Chess Option B';
  var root=rootId?DriveApp.getFolderById(rootId):DriveApp.createFolder(name);
  if(!rootId) props.setProperty(PROP_KEYS.ROOT_FOLDER_ID, root.getId());

  function createSs_(title){ var f=SpreadsheetApp.create(title); var df=DriveApp.getFileById(f.getId()); var p=df.getParents(); if(p.hasNext()) p.next().removeFile(df); root.addFile(df); return f; }

  var ctlId=props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID);
  var ctl=ctlId?SpreadsheetApp.openById(ctlId):createSs_('Control');
  props.setProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID, ctl.getId());

  var archId=props.getProperty(PROP_KEYS.ARCHIVES_SPREADSHEET_ID);
  var arch=archId?SpreadsheetApp.openById(archId):createSs_('Archives');
  props.setProperty(PROP_KEYS.ARCHIVES_SPREADSHEET_ID, arch.getId());

  var actId=props.getProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID);
  var act=actId?SpreadsheetApp.openById(actId):createSs_('Active');
  props.setProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID, act.getId());

  ensureHeaders_(getOrCreateSheet_(ctl, SHEET_NAMES.ArchivesList), ARCHIVES_HEADERS);
  ensureHeaders_(getOrCreateSheet_(arch, SHEET_NAMES.ArchiveGames), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(act, SHEET_NAMES.ActiveGames), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(act, SHEET_NAMES.DailyTotals), DAILY_TOTALS_HEADERS);

  return { rootId: root.getId(), controlId: ctl.getId(), archivesId: arch.getId(), activeId: act.getId() };
}

function setupOptionB(){ applyConfigToProperties(); var out=ensureProject_(); fetchAndStoreArchivesList_(); return out; }

