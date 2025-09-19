/** Pure transform pipeline object for normalization */

var Transform = {
  parseTimeControl: function(tc) {
    if (!tc) return { base:null, inc:null, corr:null };
    if (tc.indexOf('/') >= 0) { var parts = tc.split('/'); return { base:null, inc:null, corr:Number(parts[1]) }; }
    var inc = 0; var base = tc;
    if (tc.indexOf('+') >= 0) { var p = tc.split('+'); base = p[0]; inc = Number(p[1]); }
    return { base: Number(base), inc: Number(inc), corr: null };
  },
  deriveType: function(timeClass) { return timeClass === 'daily' ? 'daily' : 'live'; },
  deriveFormat: function(rules, timeClass, type) { var fn = VARIANT_FORMATS[rules]; return fn ? fn(timeClass, type) : timeClass; },
  deriveOutcome: function(resultCode) { return RESULT_CODE_TO_OUTCOME[resultCode] || ''; },
  scoreFromOutcome: function(o) { if (o==='win') return 1; if (o==='draw') return 0.5; return 0; },
  urlTypeId: function(url){ if (!url) return { type:'', id:'' }; var m = url.match(/\/game\/(live|daily)\/(\d+)/); return m ? { type:m[1], id:m[2] } : { type:'', id:'' }; },
  identity: function(g, myUsername) {
    var white = g.white || {}; var black = g.black || {};
    var mineIsWhite = (white.username && myUsername && white.username.toLowerCase() === myUsername.toLowerCase());
    var player = mineIsWhite ? white : black; var opponent = mineIsWhite ? black : white;
    var playerColor = mineIsWhite ? 'white' : 'black'; var opponentColor = mineIsWhite ? 'black' : 'white';
    return { player: { username: player.username || '', color: playerColor, rating: (player.rating != null ? Number(player.rating) : null), result: player.result || '' }, opponent: { username: opponent.username || '', color: opponentColor, rating: (opponent.rating != null ? Number(opponent.rating) : null), result: opponent.result || '' } };
  },
  ratingLastAndChange: function(prior, current) { if (prior == null || isNaN(prior)) return { last:null, change:null }; return { last: prior, change: (current != null ? (current - prior) : null) }; }
};

function transformAll_(games) {
  var props = PropertiesService.getDocumentProperties();
  var my = props.getProperty(PROP_KEYS.USERNAME) || '';
  var priorByFormat = {};
  // Sort by end_time then start_time
  games.sort(function(a,b){ var ae=Number(a.end_time||0), be=Number(b.end_time||0); if (ae!==be) return ae-be; var as=Number(a.start_time||0), bs=Number(b.start_time||0); return as-bs; });

  var rows = new Array(games.length);
  for (var i = 0; i < games.length; i++) {
    var g = games[i];
    var typeId = Transform.urlTypeId(g.url);
    var type = typeId.type || Transform.deriveType(g.time_class);
    var id = typeId.id || '';
    var tc = Transform.parseTimeControl(g.time_control);
    var start = g.start_time ? toLocalIsoFromUnix_(g.start_time) : '';
    var end = g.end_time ? toLocalIsoFromUnix_(g.end_time) : '';
    var duration = (g.start_time && g.end_time) ? Math.max(0, Number(g.end_time) - Number(g.start_time)) : '';
    var rules = g.rules || 'chess';
    var timeClass = g.time_class || '';
    var fmt = Transform.deriveFormat(rules, timeClass, type);
    if (!(fmt in priorByFormat)) priorByFormat[fmt] = null;
    var ident = Transform.identity(g, my);
    var outcome = Transform.deriveOutcome(ident.player.result);
    var playerScore = Transform.scoreFromOutcome(outcome);
    var endReason = (function(){ var pr=ident.player.result||'', or=ident.opponent.result||''; if (pr==='win') return or||''; if (or==='win') return pr||''; if (pr&&or&&pr===or) return pr; return pr||or||''; })();
    var rc = Transform.ratingLastAndChange(priorByFormat[fmt], ident.player.rating);
    if (ident.player.rating != null && !isNaN(ident.player.rating)) priorByFormat[fmt] = Number(ident.player.rating);

    rows[i] = [
      g.url, type, id,
      g.time_control || '', tc.base, tc.inc, tc.corr,
      start, end, duration,
      Boolean(g.rated), timeClass, rules, fmt,
      ident.player.username, ident.player.color, ident.player.rating, rc.last, rc.change, outcome, playerScore,
      ident.opponent.username, ident.opponent.color, ident.opponent.rating, (rc.last!=null && ident.opponent.rating!=null ? (ident.opponent.rating - (ident.player.rating!=null && rc.last!=null ? (ident.player.rating - rc.last) : 0)) : null), (rc.change!=null ? -rc.change : null), Transform.deriveOutcome(ident.opponent.result), Transform.scoreFromOutcome(Transform.deriveOutcome(ident.opponent.result)),
      endReason, false
    ];
  }
  return rows;
}

