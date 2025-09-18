/**
 * Global constants and schema definitions for the Chess.com → Google Sheets pipeline.
 * Target runtime: Google Apps Script (V8)
 */

/** Schema and runtime configuration */
var SCHEMA_VERSION = 1;
var DEFAULT_TIMEZONE = 'America/New_York';
var USER_AGENT = 'ChessSheets/1.0 (+AppsScript)';

/** Properties keys */
var PROP_KEYS = {
  folderId: 'FOLDER_ID',
  archivesFolderId: 'ARCHIVES_FOLDER_ID',
  gamesActiveSpreadsheetId: 'GAMES_ACTIVE_SPREADSHEET_ID',
  dailyTotalsActiveSpreadsheetId: 'DAILY_TOTALS_ACTIVE_SPREADSHEET_ID',
  callbacksQueueSpreadsheetId: 'CALLBACKS_QUEUE_SPREADSHEET_ID',
  callbacksResultsSpreadsheetId: 'CALLBACKS_RESULTS_SPREADSHEET_ID',
  opsSpreadsheetId: 'OPS_SPREADSHEET_ID',
  archivesMetaSpreadsheetId: 'ARCHIVES_META_SPREADSHEET_ID',
  username: 'USERNAME',
  timezone: 'TIMEZONE',
  schemaVersion: 'SCHEMA_VERSION'
};

/** Named sheets within spreadsheets */
var SHEET_NAMES = {
  games: 'Games',
  archivesMeta: 'ArchivesMeta',
  opsMeta: 'OpsMeta',
  logs: 'Logs',
  metrics: 'Metrics',
  gameIndex: 'GameIndex',
  dailyTotals: 'DailyTotals',
  callbacksQueue: 'CallbacksQueue',
  callbacksResults: 'CallbacksResults',
  analysisQueue: 'AnalysisQueue',
  analysisResults: 'AnalysisResults',
  profile: 'Profile',
  playerStatsTimeline: 'PlayerStatsTimeline'
};

/** Endpoints */
var ENDPOINTS = {
  archivesList: function(username) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/archives'; },
  archiveMonth: function(username, yyyy, mm) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/' + yyyy + '/' + mm; },
  profile: function(username) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username); },
  stats: function(username) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/stats'; },
  callbackLive: function(id) { return 'https://www.chess.com/callback/live/game/' + id; },
  callbackDaily: function(id) { return 'https://www.chess.com/callback/daily/game/' + id; }
};

/** Result code → outcome mapping */
var RESULT_CODE_TO_OUTCOME = {
  win: 'win',
  checkmated: 'loss',
  agreed: 'draw',
  repetition: 'draw',
  timeout: 'loss',
  resigned: 'loss',
  stalemate: 'draw',
  insufficient: 'draw',
  '50move': 'draw',
  abandoned: 'loss',
  kingofthehill: 'loss',
  threecheck: 'loss',
  timevsinsufficient: 'draw',
  bughousepartnerlose: 'loss'
};

/** Format mapping helpers */
var VARIANT_FORMATS = {
  chess: function(timeClass, type) {
    if (timeClass === 'daily') return 'daily';
    if (timeClass === 'bullet') return 'bullet';
    if (timeClass === 'blitz') return 'blitz';
    if (timeClass === 'rapid') return 'rapid';
    return timeClass;
  },
  chess960: function(timeClass, type) {
    return (timeClass === 'daily') ? 'daily960' : 'live960';
  },
  threecheck: function() { return 'threecheck'; },
  kingofthehill: function() { return 'kingofthehill'; },
  bughouse: function() { return 'bughouse'; },
  crazyhouse: function() { return 'crazyhouse'; },
  oddschess: function() { return 'oddschess'; }
};

/** Column headers for Games sheet (normalized + selected raw fragments) */
var GAME_HEADERS = [
  'url', 'type', 'id',
  'time_control', 'base_time', 'increment', 'correspondence_time',
  'start_time', 'end_time', 'duration_seconds',
  'rated', 'accuracies.white', 'accuracies.black', 'tcn', 'uuid', 'initial_setup', 'fen',
  'time_class', 'rules', 'format',
  'pgn.Event', 'pgn.Site', 'pgn.Date', 'pgn.Round', 'pgn.White', 'pgn.Black', 'pgn.Result', 'pgn.ECO', 'pgn.ECOUrl', 'pgn.TimeControl', 'pgn.Termination', 'pgn.StartTime', 'pgn.EndDate', 'pgn.EndTime', 'pgn.Link',
  'player.username', 'player.color', 'player.rating', 'player.rating_last', 'player.rating_change', 'player.result', 'player.outcome', 'player.score', 'player.@id', 'player.uuid',
  'opponent.username', 'opponent.color', 'opponent.rating', 'opponent.rating_last', 'opponent.rating_change', 'opponent.result', 'opponent.outcome', 'opponent.score', 'opponent.@id', 'opponent.uuid',
  'rating_is_exact'
];

/** Archives meta headers */
var ARCHIVES_META_HEADERS = [
  'archive_url', 'yyyy', 'mm', 'etag', 'last_modified', 'last_checked', 'games_count', 'status', 'callback_progress', 'games_seen', 'games_appended'
];

/** Game index headers for cross-sheet updates */
var GAME_INDEX_HEADERS = [
  'url', 'spreadsheet_id', 'sheet_name', 'row_number'
];

/** Daily totals headers (per-day, grouped by end_time in timezone) */
var DAILY_TOTALS_HEADERS = [
  'date',
  'bullet.wins', 'bullet.losses', 'bullet.draws', 'bullet.rating_start', 'bullet.rating_end', 'bullet.rating_change', 'bullet.duration_seconds',
  'blitz.wins', 'blitz.losses', 'blitz.draws', 'blitz.rating_start', 'blitz.rating_end', 'blitz.rating_change', 'blitz.duration_seconds',
  'rapid.wins', 'rapid.losses', 'rapid.draws', 'rapid.rating_start', 'rapid.rating_end', 'rapid.rating_change', 'rapid.duration_seconds',
  'daily.wins', 'daily.losses', 'daily.draws', 'daily.rating_start', 'daily.rating_end', 'daily.rating_change', 'daily.duration_seconds',
  'overall.wins', 'overall.losses', 'overall.draws', 'overall.rating_change', 'overall.duration_seconds'
];

/** Callbacks queue and results headers */
var CALLBACKS_QUEUE_HEADERS = [ 'url', 'type', 'id', 'enqueued_at_iso', 'status', 'last_attempt_iso', 'attempts' ];
var CALLBACKS_RESULTS_HEADERS = [ 'url', 'type', 'id', 'exact_rating_change', 'pregame_rating', 'moveTimestamps', 'captured_at_iso' ];

/** Ops sheets headers */
var OPS_META_HEADERS = [ 'key', 'value' ];
var LOGS_HEADERS = [ 'ts_iso', 'level', 'code', 'message', 'context' ];
var METRICS_HEADERS = [ 'ts_iso', 'metric', 'value', 'context' ];
var PROFILE_HEADERS = [ 'fetched_at_iso', 'username', 'player_id', 'uuid', 'joined_iso', 'status' ];
var PLAYER_STATS_TIMELINE_HEADERS = [ 'captured_at_iso', 'metric', 'time_class', 'value', 'context' ];

/** Utility */
function isoNow() {
  return new Date().toISOString();
}