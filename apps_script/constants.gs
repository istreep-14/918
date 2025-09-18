/**
 * Project constants: sheet/tab names, headers, property keys, and common literals.
 * All timestamps are normalized to yyyy-MM-dd HH:mm:ss in the script timezone.
 */

// ------------------------------
// Sheet/tab names (Control file)
// ------------------------------
var SHEET_NAMES = {
  ActiveGames: 'ActiveGames',
  DailyTotalsActive: 'DailyTotalsActive',
  ArchiveList: 'ArchiveList',
  CallbacksQueue: 'CallbacksQueue',
  CallbacksResults: 'CallbacksResults',
  Logs: 'Logs',
  Health: 'Health'
};

// ------------------------------
// Headers
// ------------------------------
var GAME_HEADERS = [
  'url', 'type', 'id',
  'time_control', 'base_time', 'increment', 'correspondence_time',
  'start_time', 'end_time', 'duration_seconds',
  'rated', 'accuracies.white', 'accuracies.black', 'tcn', 'uuid', 'initial_setup', 'fen',
  'time_class', 'rules', 'format',
  'pgn.ECO', 'pgn.ECOUrl',
  'player.username', 'player.color', 'player.rating', 'player.rating_last', 'player.rating_change', 'player.result', 'player.outcome', 'player.score', 'player.@id', 'player.uuid',
  'opponent.username', 'opponent.color', 'opponent.rating', 'opponent.rating_last', 'opponent.rating_change', 'opponent.result', 'opponent.outcome', 'opponent.score', 'opponent.@id', 'opponent.uuid',
  'end_reason',
  'rating_is_exact'
];

// Daily totals headers (per-day, grouped by end_time in timezone)
var DAILY_TOTALS_HEADERS = [
  'date',
  'bullet.wins', 'bullet.losses', 'bullet.draws', 'bullet.rating_start', 'bullet.rating_end', 'bullet.rating_change', 'bullet.duration_seconds',
  'blitz.wins', 'blitz.losses', 'blitz.draws', 'blitz.rating_start', 'blitz.rating_end', 'blitz.rating_change', 'blitz.duration_seconds',
  'rapid.wins', 'rapid.losses', 'rapid.draws', 'rapid.rating_start', 'rapid.rating_end', 'rapid.rating_change', 'rapid.duration_seconds',
  'daily.wins', 'daily.losses', 'daily.draws', 'daily.rating_start', 'daily.rating_end', 'daily.rating_change', 'daily.duration_seconds',
  'overall.wins', 'overall.losses', 'overall.draws', 'overall.rating_change', 'overall.duration_seconds'
];

// Callbacks queue and results headers
var CALLBACKS_QUEUE_HEADERS = [ 'unique_key', 'game_url', 'kind', 'status', 'attempts', 'enqueued_at_iso', 'last_attempt_iso', 'last_error', 'month_key' ];
var CALLBACKS_RESULTS_HEADERS = [ 'unique_key', 'game_url', 'kind', 'payload_json', 'captured_at_iso' ];

// ArchiveList headers
var ARCHIVE_LIST_HEADERS = [
  'year', 'month', 'archive_url',
  'list_etag', 'month_etag',
  'first_seen_via_list_at', 'last_list_check_at', 'last_month_check_at',
  'last_url_api', 'last_url_seen', 'api_game_count_last', 'sheet_game_count', 'ingested_at_last',
  'daily_recalc_last_at', 'finalized_at',
  'queued_total', 'processed_total', 'failed_total', 'pending_total'
];

// ------------------------------
// Properties keys
// ------------------------------
var PROP_KEYS = {
  CURRENT_ACTIVE_MONTH: 'CURRENT_ACTIVE_MONTH', // YYYY-MM
  PRIOR_BY_FORMAT: 'PRIOR_BY_FORMAT', // JSON map { blitz, bullet, rapid, daily }
  LIST_ETAG: 'LIST_ETAG',
  MONTH_ETAG_PREFIX: 'MONTH_ETAG_', // + YYYY-MM
  LAST_SEEN_URL_PREFIX: 'LAST_SEEN_URL_', // + YYYY-MM
  CONTROL_SPREADSHEET_ID: 'CONTROL_SPREADSHEET_ID',
  ARCHIVE_SPREADSHEET_ID_PREFIX: 'ARCHIVE_SPREADSHEET_ID_', // + YYYY for per-year files
  USERNAME: 'USERNAME',
  MY_USERNAME: 'MY_USERNAME'
};

// API endpoints
var APIS = {
  archivesList: function(username) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/archives'; },
  archiveMonth: function(username, yyyy, mm) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/' + yyyy + '/' + mm; },
  profile: function(username) { return 'https://api.chess.com/pub/player/' + encodeURIComponent(username); }
};

// Result code → outcome mapping
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

// Variant → normalized format mapping
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

// Active headers to write (keep sheet light). If empty, all GAME_HEADERS are written.
var ACTIVE_HEADERS = [
  'url', 'type', 'id',
  'start_time', 'end_time', 'duration_seconds',
  'rated',
  'time_class', 'rules', 'format',
  'player.username', 'player.color', 'player.rating', 'player.rating_last', 'player.rating_change', 'player.outcome', 'player.score',
  'opponent.username', 'opponent.rating',
  'end_reason',
  'rating_is_exact'
];

// Formats we aggregate daily
var DAILY_FORMAT_KEYS = ['bullet','blitz','rapid','daily'];