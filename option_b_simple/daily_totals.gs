/** Daily totals for bullet/blitz/rapid and overall (Option B) */

function dateKey_(iso) { return iso ? String(iso).substring(0,10) : ''; }

function initBucket_(){ return { wins:0, losses:0, draws:0, rating_start:null, rating_end:null, rating_change:0, duration_seconds:0 }; }

function computeDailyTotalsForDates_(activeSs, datesSet){
  var shGames = getOrCreateSheet_(activeSs, SHEET_NAMES.ActiveGames);
  var last = shGames.getLastRow(); if (last < 2) return {};
  var data = shGames.getRange(2, 1, last - 1, GAME_HEADERS.length).getValues();
  var idx = {
    end_time: GAME_HEADERS.indexOf('end_time'),
    format: GAME_HEADERS.indexOf('format'),
    outcome: GAME_HEADERS.indexOf('player.outcome'),
    rating: GAME_HEADERS.indexOf('player.rating'),
    rating_last: GAME_HEADERS.indexOf('player.rating_last'),
    rating_change: GAME_HEADERS.indexOf('player.rating_change'),
    dur: GAME_HEADERS.indexOf('duration_seconds')
  };
  var results = {};
  function ensureDay_(k){ if(!results[k]){ results[k] = { bullet:initBucket_(), blitz:initBucket_(), rapid:initBucket_(), overall:{ wins:0, losses:0, draws:0, rating_change:0, duration_seconds:0, rating_start:null, rating_end:null } }; } }
  for (var r = 0; r < data.length; r++){
    var row = data[r];
    var dk = dateKey_(row[idx.end_time]); if (!dk || !datesSet[dk]) continue;
    ensureDay_(dk);
    var fmt = row[idx.format];
    if (fmt !== 'bullet' && fmt !== 'blitz' && fmt !== 'rapid') continue;
    var bucket = results[dk][fmt];
    var outcome = row[idx.outcome];
    if (outcome === 'win') bucket.wins++; else if (outcome === 'draw') bucket.draws++; else bucket.losses++;
    var rLast = row[idx.rating_last], rNow = row[idx.rating], rCh = row[idx.rating_change];
    if (bucket.rating_start == null && rLast != null && rLast !== '') bucket.rating_start = Number(rLast);
    if (rNow != null && rNow !== '') bucket.rating_end = Number(rNow);
    if (rCh != null && rCh !== '') bucket.rating_change += Number(rCh);
    var dur = row[idx.dur]; if (dur) bucket.duration_seconds += Number(dur || 0);
    // overall
    var o = results[dk].overall;
    if (outcome === 'win') o.wins++; else if (outcome === 'draw') o.draws++; else o.losses++;
    if (rCh != null && rCh !== '') o.rating_change += Number(rCh);
    if (dur) o.duration_seconds += Number(dur || 0);
  }
  // Compute overall rating_start/end from component starts/ends if available
  Object.keys(results).forEach(function(k){
    var d = results[k];
    var starts = [d.bullet.rating_start, d.blitz.rating_start, d.rapid.rating_start].filter(function(x){ return x!=null && x!==''; });
    var ends = [d.bullet.rating_end, d.blitz.rating_end, d.rapid.rating_end].filter(function(x){ return x!=null && x!==''; });
    if (starts.length) d.overall.rating_start = Math.round(starts.reduce(function(a,b){return a+b;},0) / starts.length);
    if (ends.length) d.overall.rating_end = Math.round(ends.reduce(function(a,b){return a+b;},0) / ends.length);
  });
  return results;
}

function refreshDailyTotalsForDates_(dates){
  var props = PropertiesService.getDocumentProperties();
  var act = SpreadsheetApp.openById(props.getProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID));
  var sh = getOrCreateSheet_(act, SHEET_NAMES.DailyTotals);
  ensureHeaders_(sh, DAILY_TOTALS_HEADERS);
  var set = {}; for (var i=0;i<dates.length;i++) if (dates[i]) set[dates[i]] = true;
  var agg = computeDailyTotalsForDates_(act, set);
  // Build index of existing rows
  var idx = {}; var last = sh.getLastRow(); if (last >= 2) { var vals = sh.getRange(2,1,last-1,1).getValues(); for (var r=0;r<vals.length;r++) idx[String(vals[r][0])] = r+2; }
  function v(x){ return (x==null)?'':x; }
  var rowsOut = [];
  var keys = Object.keys(agg).sort();
  for (var k=0;k<keys.length;k++){
    var dk = keys[k]; var d = agg[dk];
    var out = [dk,
      d.bullet.wins, d.bullet.losses, d.bullet.draws, v(d.bullet.rating_start), v(d.bullet.rating_end), v(d.bullet.rating_change), d.bullet.duration_seconds,
      d.blitz.wins, d.blitz.losses, d.blitz.draws, v(d.blitz.rating_start), v(d.blitz.rating_end), v(d.blitz.rating_change), d.blitz.duration_seconds,
      d.rapid.wins, d.rapid.losses, d.rapid.draws, v(d.rapid.rating_start), v(d.rapid.rating_end), v(d.rapid.rating_change), d.rapid.duration_seconds,
      d.overall.wins, d.overall.losses, d.overall.draws, d.overall.rating_change, d.overall.duration_seconds,
      v(d.overall.rating_start), v(d.overall.rating_end)
    ];
    var writeRow = idx[dk];
    if (writeRow) sh.getRange(writeRow, 1, 1, DAILY_TOTALS_HEADERS.length).setValues([out]);
    else rowsOut.push(out);
  }
  if (rowsOut.length) writeRowsAppend_(sh, DAILY_TOTALS_HEADERS, rowsOut);
}

