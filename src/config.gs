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

function setOpsSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.opsSpreadsheetId, id); }
function getOpsSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.opsSpreadsheetId); }

function setArchivesMetaSpreadsheetId(id) { setSpreadsheetId_(PROP_KEYS.archivesMetaSpreadsheetId, id); }
function getArchivesMetaSpreadsheetId() { return getSpreadsheetId_(PROP_KEYS.archivesMetaSpreadsheetId); }

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