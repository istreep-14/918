/**
 * Configuration helpers backed by PropertiesService.
 */

function getScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function getUsername() {
  var value = getScriptProperties_().getProperty(PROP_KEYS.username);
  if (!value) throw new Error('USERNAME not set. Run initSetup(username) first.');
  return value;
}

function setUsername(username) {
  getScriptProperties_().setProperty(PROP_KEYS.username, username);
}

function getTimezone() {
  return getScriptProperties_().getProperty(PROP_KEYS.timezone) || DEFAULT_TIMEZONE;
}

function setTimezone(timezone) {
  getScriptProperties_().setProperty(PROP_KEYS.timezone, timezone);
}

function getSchemaVersion() {
  var v = getScriptProperties_().getProperty(PROP_KEYS.schemaVersion);
  return v ? Number(v) : SCHEMA_VERSION;
}

function setSchemaVersion(version) {
  getScriptProperties_().setProperty(PROP_KEYS.schemaVersion, String(version));
}

function setFolderId(id) { getScriptProperties_().setProperty(PROP_KEYS.folderId, id); }
function getFolderId() { return getScriptProperties_().getProperty(PROP_KEYS.folderId); }

function setArchivesFolderId(id) { getScriptProperties_().setProperty(PROP_KEYS.archivesFolderId, id); }
function getArchivesFolderId() { return getScriptProperties_().getProperty(PROP_KEYS.archivesFolderId); }

function setSpreadsheetId_(key, id) { getScriptProperties_().setProperty(key, id); }
function getSpreadsheetId_(key) { return getScriptProperties_().getProperty(key); }

function setGamesActiveSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.gamesActiveSpreadsheetId, id); }
function getGamesActiveSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.gamesActiveSpreadsheetId); }

function setDailyTotalsActiveSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.dailyTotalsActiveSpreadsheetId, id); }
function getDailyTotalsActiveSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.dailyTotalsActiveSpreadsheetId); }

function setCallbacksQueueSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.callbacksQueueSpreadsheetId, id); }
function getCallbacksQueueSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.callbacksQueueSpreadsheetId); }

function setCallbacksResultsSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.callbacksResultsSpreadsheetId, id); }
function getCallbacksResultsSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.callbacksResultsSpreadsheetId); }

function setOpeningsQueueSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.openingsQueueSpreadsheetId, id); }
function getOpeningsQueueSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.openingsQueueSpreadsheetId); }

function setOpeningsResultsSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.openingsResultsSpreadsheetId, id); }
function getOpeningsResultsSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.openingsResultsSpreadsheetId); }

function setOpsSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.opsSpreadsheetId, id); }
function getOpsSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.opsSpreadsheetId); }

function setArchivesMetaSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.archivesMetaSpreadsheetId, id); }
function getArchivesMetaSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.archivesMetaSpreadsheetId); }

/** Backfill cursor helpers */
function getBackfillCursorIndex() {
  var v = getScriptProperties_().getProperty('BACKFILL_CURSOR_INDEX');
  return v ? Number(v) : 0;
}

function setBackfillCursorIndex(idx) {
  getScriptProperties_().setProperty('BACKFILL_CURSOR_INDEX', String(idx));
}

/** OpsMeta helpers (simple key/value in Ops spreadsheet) */
function upsertOpsMeta_(key, value) {
  var opsId = getOpsSpreadsheetId();
  if (!opsId) return;
  var ss = SpreadsheetApp.openById(opsId);
  var sheet = getOrCreateSheet_(ss, SHEET_NAMES.opsMeta);
  ensureHeaders_(sheet, OPS_META_HEADERS);
  var lastRow = sheet.getLastRow();
  var found = -1;
  if (lastRow >= 2) {
    var vals = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (vals[i][0] === key) { found = i + 2; break; }
    }
  }
  if (found > 0) {
    sheet.getRange(found, 2, 1, 1).setValue(value);
  } else {
    sheet.appendRow([key, value]);
  }
}

/** Per-archive cursors (stored as JSON in script properties) */
function getArchiveCursors() {
  var raw = getScriptProperties_().getProperty('ARCHIVE_CURSORS');
  return raw ? JSON.parse(raw) : {};
}

function setArchiveCursors(cursors) {
  getScriptProperties_().setProperty('ARCHIVE_CURSORS', JSON.stringify(cursors));
}

/** Archive month spreadsheet registry: { 'YYYY-MM': spreadsheetId } */
function getArchiveMonthRegistry() {
  var raw = getScriptProperties_().getProperty('ARCHIVE_MONTH_REGISTRY');
  return raw ? JSON.parse(raw) : {};
}

function setArchiveMonthRegistry(registry) {
  getScriptProperties_().setProperty('ARCHIVE_MONTH_REGISTRY', JSON.stringify(registry));
}