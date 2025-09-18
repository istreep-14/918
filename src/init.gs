/** Initialization: create Drive folder and spreadsheets, set headers, and store IDs */

function initSetup(username) {
  if (!username) throw new Error('Provide username for initSetup(username)');
  setUsername(username);
  setTimezone(DEFAULT_TIMEZONE);
  setSchemaVersion(SCHEMA_VERSION);

  var folder = DriveApp.createFolder('Chess Sheets Project');
  setFolderId(folder.getId());
  // Archives subfolder to keep month files organized
  var archivesFolder = ensureSubfolder_(folder.getId(), 'Archives');
  setArchivesFolderId(archivesFolder.getId());

  // Ops
  var ops = createSpreadsheetInFolder_('Ops', folder.getId());
  setOpsSpreadsheetId(ops.getId());
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.opsMeta), OPS_META_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.logs), LOGS_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.metrics), METRICS_HEADERS);

  // Active games (single, small sheet for quick pulls)
  var gamesActive = createSpreadsheetInFolder_('Games Active', folder.getId());
  setGamesActiveSpreadsheetId(gamesActive.getId());
  ensureHeaders_(getOrCreateSheet_(gamesActive, SHEET_NAMES.games), GAME_HEADERS);
  ensureHeaders_(getOrCreateSheet_(gamesActive, SHEET_NAMES.gameIndex), GAME_INDEX_HEADERS);

  // Daily totals active
  var dailyActive = createSpreadsheetInFolder_('Daily Totals Active', folder.getId());
  setDailyTotalsActiveSpreadsheetId(dailyActive.getId());
  ensureHeaders_(getOrCreateSheet_(dailyActive, SHEET_NAMES.dailyTotals), DAILY_TOTALS_HEADERS);

  // Callbacks
  var callbacksQueue = createSpreadsheetInFolder_('Callbacks Queue', folder.getId());
  setCallbacksQueueSpreadsheetId(callbacksQueue.getId());
  ensureHeaders_(getOrCreateSheet_(callbacksQueue, SHEET_NAMES.callbacksQueue), CALLBACKS_QUEUE_HEADERS);

  var callbacksResults = createSpreadsheetInFolder_('Callbacks Results', folder.getId());
  setCallbacksResultsSpreadsheetId(callbacksResults.getId());
  ensureHeaders_(getOrCreateSheet_(callbacksResults, SHEET_NAMES.callbacksResults), CALLBACKS_RESULTS_HEADERS);

  // Openings
  var openingsQueue = createSpreadsheetInFolder_('Openings Queue', folder.getId());
  setOpeningsQueueSpreadsheetId(openingsQueue.getId());
  ensureHeaders_(getOrCreateSheet_(openingsQueue, SHEET_NAMES.openingsQueue), OPENINGS_QUEUE_HEADERS);

  var openingsResults = createSpreadsheetInFolder_('Openings Results', folder.getId());
  setOpeningsResultsSpreadsheetId(openingsResults.getId());
  ensureHeaders_(getOrCreateSheet_(openingsResults, SHEET_NAMES.openingsResults), OPENINGS_RESULTS_HEADERS);

  // Archives meta index (points to per-month spreadsheets)
  var archivesMeta = createSpreadsheetInFolder_('Archives Meta', folder.getId());
  setArchivesMetaSpreadsheetId(archivesMeta.getId());
  ensureHeaders_(getOrCreateSheet_(archivesMeta, SHEET_NAMES.archivesMeta), ARCHIVES_META_HEADERS);

  // Profile + Stats timeline in Ops
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.profile), PROFILE_HEADERS);
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.playerStatsTimeline), PLAYER_STATS_TIMELINE_HEADERS);

  // Analysis placeholders
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.analysisQueue), [ 'url', 'type', 'id', 'enqueued_at_iso', 'status', 'notes' ]);
  ensureHeaders_(getOrCreateSheet_(ops, SHEET_NAMES.analysisResults), [ 'url', 'type', 'id', 'analysis_link', 'captured_at_iso' ]);

  logInfo('INIT', 'Setup completed', { username: username, folderId: folder.getId() });
}