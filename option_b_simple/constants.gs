/** Constants for Option B */

var PROP_KEYS = {
  USERNAME: 'B_USERNAME',
  TIMEZONE: 'B_TIMEZONE',
  PROJECT_NAME: 'B_PROJECT_NAME',
  ROOT_FOLDER_ID: 'B_ROOT_FOLDER_ID',
  CONTROL_SPREADSHEET_ID: 'B_CONTROL_SPREADSHEET_ID',
  ARCHIVES_SPREADSHEET_ID: 'B_ARCHIVES_SPREADSHEET_ID',
  ACTIVE_SPREADSHEET_ID: 'B_ACTIVE_SPREADSHEET_ID',
  LIST_ETAG: 'B_LIST_ETAG',
  MONTH_ETAG_PREFIX: 'B_MONTH_ETAG_' // + YYYY-MM
};

var SHEET_NAMES = {
  ArchivesList: 'ArchivesList',
  ArchiveGames: 'ArchiveGames',
  ActiveGames: 'ActiveGames'
};

var ARCHIVES_HEADERS = [ 'year','month','archive_url','status','list_etag','month_etag','last_checked_iso','api_game_count_last','sheet_game_count','last_url_api','last_url_seen' ];

var GAME_HEADERS = [
  'url','type','id',
  'time_control','base_time','increment','correspondence_time',
  'start_time','end_time','duration_seconds',
  'rated','time_class','rules','format',
  'player.username','player.color','player.rating','player.rating_last','player.rating_change','player.outcome','player.score',
  'opponent.username','opponent.color','opponent.rating','opponent.rating_last','opponent.rating_change','opponent.outcome','opponent.score',
  'end_reason','rating_is_exact'
];

var APIS = {
  archivesList: function(username){ return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/archives'; },
  archiveMonth: function(username, yyyy, mm){ return 'https://api.chess.com/pub/player/' + encodeURIComponent(username) + '/games/' + yyyy + '/' + mm; }
};

var RESULT_CODE_TO_OUTCOME = { win:'win', checkmated:'loss', agreed:'draw', repetition:'draw', timeout:'loss', resigned:'loss', stalemate:'draw', insufficient:'draw', '50move':'draw', abandoned:'loss' };

var VARIANT_FORMATS = { chess: function(timeClass){ if (timeClass==='daily') return 'daily'; if (timeClass==='bullet') return 'bullet'; if (timeClass==='blitz') return 'blitz'; if (timeClass==='rapid') return 'rapid'; return timeClass; } };

