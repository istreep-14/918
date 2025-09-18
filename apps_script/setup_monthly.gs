/**
 * Per-month spreadsheet management: ensure active month file, seed days, bootstrap from archives list.
 */

function ensureRootAndSubfolders_() {
  var props = PropertiesService.getDocumentProperties();
  var rootId = props.getProperty(PROP_KEYS.ROOT_FOLDER_ID);
  var root = rootId ? DriveApp.getFolderById(rootId) : DriveApp.createFolder('Chess Sheets');
  if (!rootId) props.setProperty(PROP_KEYS.ROOT_FOLDER_ID, root.getId());

  function ensureSub(name, propKey) {
    var id = props.getProperty(propKey);
    if (id) return DriveApp.getFolderById(id);
    var f = root.createFolder(name);
    props.setProperty(propKey, f.getId());
    return f;
  }

  var activeFolder = ensureSub('Active Months', PROP_KEYS.ACTIVE_MONTHS_FOLDER_ID);
  var archiveFolder = ensureSub('Archive Months', PROP_KEYS.ARCHIVE_MONTHS_FOLDER_ID);
  return { root: root, activeFolder: activeFolder, archiveFolder: archiveFolder };
}

function findFileInFolderByName_(folder, name) {
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function ensureActiveMonthSpreadsheet_(yyyyMm) {
  var parts = { yyyy: yyyyMm.substring(0,4), mm: yyyyMm.substring(5,7) };
  var folders = ensureRootAndSubfolders_();
  var name = 'Archive ' + parts.yyyy + '-' + parts.mm;
  var existing = findFileInFolderByName_(folders.activeFolder, name);
  var ss;
  if (existing) {
    ss = SpreadsheetApp.openById(existing.getId());
  } else {
    ss = SpreadsheetApp.create(name);
    var drv = DriveApp.getFileById(ss.getId());
    var parent = drv.getParents();
    if (parent.hasNext()) parent.next().removeFile(drv);
    folders.activeFolder.addFile(drv);
  }
  // Ensure tabs
  var shGames = getOrCreateSheet_(ss, MONTH_TABS.Games);
  ensureHeaders_(shGames, (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS);
  var shTotals = getOrCreateSheet_(ss, MONTH_TABS.DailyTotals);
  ensureHeaders_(shTotals, DAILY_TOTALS_HEADERS);

  // Seed month days if sheet nearly empty
  if (shTotals.getLastRow() < 2) seedDailyTotalsForNewMonth_(parts.yyyy, parts.mm);

  return ss;
}

function bootstrapFromArchivesList_() {
  var props = PropertiesService.getDocumentProperties();
  var username = props.getProperty(PROP_KEYS.USERNAME);
  if (!username) throw new Error('USERNAME not set');

  var res = fetchArchivesList_(username);
  if (!(res.status >= 200 && res.status < 300) || !res.json || !res.json.archives) return 0;
  var archives = res.json.archives;
  var latest = archives[archives.length - 1];
  var m = latest.match(/\/games\/(\d{4})\/(\d{2})$/);
  if (!m) return 0;
  var active = m[1] + '-' + m[2];
  setActiveMonth_(active);

  // Ensure active month spreadsheet exists
  ensureActiveMonthSpreadsheet_(active);

  // Older archives will be handled by daily finalize job moving files from active to archive
  return 1;
}