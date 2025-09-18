/**
 * Pure transforms: JSON + PGN -> normalized row per GAME_HEADERS.
 */

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
    inc = Number(p[1]);
  }
  return { base: Number(base), inc: Number(inc), corr: null };
}

function parsePgnHeadersToMap_(pgn) {
  var map = {};
  if (!pgn) return map;
  var lines = pgn.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('[') === 0 && line.lastIndexOf(']') === line.length - 1) {
      var inner = line.substring(1, line.length - 1);
      var spaceIdx = inner.indexOf(' ');
      if (spaceIdx > 0) {
        var key = inner.substring(0, spaceIdx);
        var raw = inner.substring(spaceIdx + 1).trim();
        var val = raw.replace(/^"|"$/g, '');
        map[key] = val;
      }
    }
  }
  return map;
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
  var meIsWhite = (white.username && myUsername && white.username.toLowerCase() === myUsername.toLowerCase());
  var player = meIsWhite ? white : black;
  var opponent = meIsWhite ? black : white;
  var playerColor = meIsWhite ? 'white' : 'black';
  var opponentColor = meIsWhite ? 'black' : 'white';
  return {
    player: {
      username: player.username || '', color: playerColor, rating: (player.rating != null ? Number(player.rating) : null), result: player.result || '', '@id': player['@id'] || '', uuid: player.uuid || ''
    },
    opponent: {
      username: opponent.username || '', color: opponentColor, rating: (opponent.rating != null ? Number(opponent.rating) : null), result: opponent.result || '', '@id': opponent['@id'] || '', uuid: opponent.uuid || ''
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

function computeDurationSeconds_(startIsoLocal, endIsoLocal, gameJson) {
  if (gameJson && gameJson.start_time && gameJson.end_time) {
    return Math.max(0, Number(gameJson.end_time) - Number(gameJson.start_time));
  }
  var s = parseLocalDateTimeString_(startIsoLocal);
  var e = parseLocalDateTimeString_(endIsoLocal);
  if (s && e) return Math.max(0, Math.floor((e.getTime() - s.getTime()) / 1000));
  return '';
}

function makeGameRow_(gameJson, pgnHeadersMap, priorRatingByFormat, myUsername) {
  var url = gameJson.url;
  var typeId = urlToTypeAndId_(url);
  var type = typeId.type || deriveType_(gameJson.time_class);
  var id = typeId.id || '';
  var tc = parseTimeControl_(gameJson.time_control);
  var start = gameJson.start_time ? toLocalIsoFromUnix(gameJson.start_time) : pgnUtcToLocalIso_(pgnHeadersMap);
  var end = gameJson.end_time ? toLocalIsoFromUnix(gameJson.end_time) : (pgnHeadersMap['EndDate'] || pgnHeadersMap['EndTime'] ? pgnUtcToLocalIso_({ UTCDate: pgnHeadersMap['EndDate'], UTCTime: pgnHeadersMap['EndTime'] }) : '');
  var duration = computeDurationSeconds_(start, end, gameJson);
  var rules = gameJson.rules || 'chess';
  var timeClass = gameJson.time_class || '';
  var format = deriveFormat_(rules, timeClass, type);

  var ident = identityFromSides_(gameJson, myUsername);
  var outcome = deriveOutcome_(ident.player.result);
  var playerScore = scoreFromOutcome_(outcome);
  var endReason = (function(){
    var pr = ident.player.result || '';
    var or = ident.opponent.result || '';
    if (pr === 'win') return or || '';
    if (or === 'win') return pr || '';
    if (pr && or && pr === or) return pr;
    return pr || or || '';
  })();

  var priorKey = format;
  var prior = priorRatingByFormat[priorKey];
  var rc = ratingLastAndChange_(prior, ident.player.rating);
  var hasPrior = prior != null && !isNaN(prior);

  return [
    url, type, id,
    gameJson.time_control || '', tc.base, tc.inc, tc.corr,
    start, end, duration,
    Boolean(gameJson.rated),
    gameJson.accuracies ? Number(gameJson.accuracies.white || '') : '',
    gameJson.accuracies ? Number(gameJson.accuracies.black || '') : '',
    gameJson.tcn || '', gameJson.uuid || '', gameJson.initial_setup || '', gameJson.fen || '',
    timeClass, rules, format,
    (pgnHeadersMap['ECO'] || ''), (pgnHeadersMap['ECOUrl'] || ''),
    ident.player.username, ident.player.color, ident.player.rating, rc.last, rc.change, ident.player.result, outcome, playerScore, ident.player['@id'], ident.player.uuid,
    ident.opponent.username, ident.opponent.color, ident.opponent.rating, (rc.last != null && ident.opponent.rating != null ? (ident.opponent.rating - (ident.player.rating != null && rc.last != null ? (ident.player.rating - rc.last) : 0)) : null), (rc.change != null ? -rc.change : null), ident.opponent.result, deriveOutcome_(ident.opponent.result), scoreFromOutcome_(deriveOutcome_(ident.opponent.result)), ident.opponent['@id'], ident.opponent.uuid,
    endReason,
    hasPrior
  ];
}