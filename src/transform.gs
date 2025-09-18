/** Transformation utilities: JSON+PGN -> normalized row per GAME_HEADERS */

function parseTimeControl_(tc) {
  if (!tc) return { base: null, inc: null, corr: null };
  if (tc.indexOf('/') >= 0) {
    var parts = tc.split('/');
    return { base: null, inc: null, corr: Number(parts[1]) };
  }
  var inc = 0;
  var base = tc;
  if (tc.indexOf('+') >= 0) {
    var p = tc.split('+');
    base = p[0];
    inc = p[1];
  }
  return { base: Number(base), inc: Number(inc), corr: null };
}

function toLocalIso_(unixSeconds) {
  if (!unixSeconds && unixSeconds !== 0) return '';
  var dt = new Date(unixSeconds * 1000);
  return Utilities.formatDate(dt, getTimezone(), 'yyyy-MM-dd HH:mm:ss');
}

function deriveType_(timeClass) {
  return timeClass === 'daily' ? 'daily' : 'live';
}

function deriveFormat_(rules, timeClass, type) {
  var fn = VARIANT_FORMATS[rules];
  if (typeof fn === 'function') return fn(timeClass, type);
  return timeClass;
}

function identityFromSides_(gameJson, myUsername) {
  var white = gameJson.white || {};
  var black = gameJson.black || {};
  var meIsWhite = (white.username && white.username.toLowerCase() === myUsername.toLowerCase());
  var player = meIsWhite ? white : black;
  var opponent = meIsWhite ? black : white;
  var playerColor = meIsWhite ? 'white' : 'black';
  var opponentColor = meIsWhite ? 'black' : 'white';
  return {
    player: {
      username: player.username || '', color: playerColor, rating: Number(player.rating || 0), result: player.result || '', '@id': player['@id'] || '', uuid: player.uuid || ''
    },
    opponent: {
      username: opponent.username || '', color: opponentColor, rating: Number(opponent.rating || 0), result: opponent.result || '', '@id': opponent['@id'] || '', uuid: opponent.uuid || ''
    }
  };
}

function deriveOutcome_(resultCode) {
  return RESULT_CODE_TO_OUTCOME[resultCode] || '';
}

function scoreFromOutcome_(outcome) {
  if (outcome === 'win') return 1;
  if (outcome === 'draw') return 0.5;
  return 0;
}

function ratingLastAndChange_(priorRating, currentRating) {
  if (priorRating == null || isNaN(priorRating)) return { last: null, change: null };
  return { last: priorRating, change: (currentRating != null ? (currentRating - priorRating) : null) };
}

function urlToTypeAndId_(url) {
  if (!url) return { type: '', id: '' };
  var m = url.match(/\/game\/(live|daily)\/(\d+)/);
  return m ? { type: m[1], id: m[2] } : { type: '', id: '' };
}

function makeGameRow_(gameJson, pgnHeadersMap, priorRatingByFormat, myUsername) {
  var url = gameJson.url;
  var typeId = urlToTypeAndId_(url);
  var type = typeId.type || deriveType_(gameJson.time_class);
  var id = typeId.id || '';
  var tc = parseTimeControl_(gameJson.time_control);
  var start = gameJson.start_time ? toLocalIso_(gameJson.start_time) : '';
  var end = gameJson.end_time ? toLocalIso_(gameJson.end_time) : '';
  var duration = (gameJson.end_time && gameJson.start_time) ? (Number(gameJson.end_time) - Number(gameJson.start_time)) : '';
  var rules = gameJson.rules || 'chess';
  var timeClass = gameJson.time_class || '';
  var format = deriveFormat_(rules, timeClass, type);

  var ident = identityFromSides_(gameJson, myUsername);
  var outcome = deriveOutcome_(ident.player.result);
  var playerScore = scoreFromOutcome_(outcome);

  var priorKey = format;
  var prior = priorRatingByFormat[priorKey];
  var rc = ratingLastAndChange_(prior, ident.player.rating);

  var row = [
    url, type, id,
    gameJson.time_control || '', tc.base, tc.inc, tc.corr,
    start, end, duration,
    Boolean(gameJson.rated),
    gameJson.accuracies ? Number(gameJson.accuracies.white || '') : '',
    gameJson.accuracies ? Number(gameJson.accuracies.black || '') : '',
    gameJson.tcn || '', gameJson.uuid || '', gameJson.initial_setup || '', gameJson.fen || '',
    timeClass, rules, format,
    (pgnHeadersMap['Event'] || ''), (pgnHeadersMap['Site'] || ''), (pgnHeadersMap['Date'] || ''), (pgnHeadersMap['Round'] || ''), (pgnHeadersMap['White'] || ''), (pgnHeadersMap['Black'] || ''), (pgnHeadersMap['Result'] || ''), (pgnHeadersMap['ECO'] || ''), (pgnHeadersMap['ECOUrl'] || ''), (pgnHeadersMap['TimeControl'] || ''), (pgnHeadersMap['Termination'] || ''), (pgnHeadersMap['StartTime'] || ''), (pgnHeadersMap['EndDate'] || ''), (pgnHeadersMap['EndTime'] || ''), (pgnHeadersMap['Link'] || ''),
    ident.player.username, ident.player.color, ident.player.rating, rc.last, rc.change, ident.player.result, outcome, playerScore, ident.player['@id'], ident.player.uuid,
    ident.opponent.username, ident.opponent.color, ident.opponent.rating, (ident.opponent.rating - (rc.change || 0)), (rc.change != null ? -rc.change : null), ident.opponent.result, deriveOutcome_(ident.opponent.result), scoreFromOutcome_(deriveOutcome_(ident.opponent.result)), ident.opponent['@id'], ident.opponent.uuid,
    false
  ];
  return row;
}