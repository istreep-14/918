/**
 * Daily totals: seed month days, recompute per affected dates, recompute whole month.
 */

function initDay_() { return { wins:0, losses:0, draws:0, rating_start:null, rating_end:null, rating_change:0, duration_seconds:0 }; }

function getDailyTotalsActiveSheet_() {
  var ss = getControlSpreadsheet_();
  var sh = getOrCreateSheet_(ss, SHEET_NAMES.DailyTotalsActive);
  ensureHeaders_(sh, DAILY_TOTALS_HEADERS);
  return sh;
}

function generateMonthDates_(yyyy, mm) {
  var tz = getTimezone();
  var start = new Date(Number(yyyy), Number(mm) - 1, 1, 0, 0, 0);
  var next = new Date(Number(yyyy), Number(mm), 1, 0, 0, 0);
  var out = [];
  for (var d = new Date(start.getTime()); d < next; d = new Date(d.getTime() + 24*3600*1000)) {
    out.push(Utilities.formatDate(d, tz, 'yyyy-MM-dd'));
  }
  return out;
}

function seedDailyTotalsForNewMonth_(yyyy, mm) {
  var sh = getDailyTotalsActiveSheet_();
  var existing = {};
  var last = sh.getLastRow();
  if (last >= 2) {
    var dates = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < dates.length; i++) existing[String(dates[i][0])] = true;
  }
  var toAdd = [];
  var datesAll = generateMonthDates_(yyyy, mm);
  for (var j = 0; j < datesAll.length; j++) {
    var k = datesAll[j];
    if (existing[k]) continue;
    var row = [k];
    // bullet, blitz, rapid, daily blocks (7 columns each)
    for (var b = 0; b < 4; b++) row = row.concat([0,0,0,'','',0,0]);
    // overall (5 columns)
    row = row.concat([0,0,0,0,0]);
    toAdd.push(row);
  }
  if (toAdd.length) writeRowsAppend_(sh, DAILY_TOTALS_HEADERS, toAdd);
}

function recomputeDailyTotalsForDates_(dateKeys) {
  if (!dateKeys || !dateKeys.length) return 0;
  var set = {};
  for (var i = 0; i < dateKeys.length; i++) if (dateKeys[i]) set[dateKeys[i]] = true;
  var shGames = getOrCreateSheet_(getControlSpreadsheet_(), SHEET_NAMES.ActiveGames);
  if (shGames.getLastRow() < 2) return 0;
  var headers = readHeaders_(shGames);
  var data = shGames.getRange(2, 1, shGames.getLastRow() - 1, headers.length).getValues();
  var END_TIME = headers.indexOf('end_time');
  var FORMAT = headers.indexOf('format');
  var OUTCOME = headers.indexOf('player.outcome');
  var RATING = headers.indexOf('player.rating');
  var RATING_LAST = headers.indexOf('player.rating_last');
  var RATING_CHANGE = headers.indexOf('player.rating_change');
  var DURATION = headers.indexOf('duration_seconds');

  var grouped = {};
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var endIso = row[END_TIME];
    if (!endIso) continue;
    var dateKey = getDateKeyFromLocalIso_(String(endIso));
    if (!set[dateKey]) continue;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(row);
  }

  var shTotals = getDailyTotalsActiveSheet_();
  var idxByDate = {};
  var last = shTotals.getLastRow();
  if (last >= 2) {
    var dates = shTotals.getRange(2, 1, last - 1, 1).getValues();
    for (var i2 = 0; i2 < dates.length; i2++) idxByDate[String(dates[i2][0])] = i2 + 2;
  }

  var updated = 0;
  for (var dateKey in grouped) {
    var rows = grouped[dateKey];
    // sort rows by end_time, then start_time if present
    rows.sort(function(a, b){
      var ae = String(a[END_TIME]) || '', be = String(b[END_TIME]) || '';
      if (ae !== be) return ae < be ? -1 : 1;
      return 0;
    });

    var agg = { bullet: initDay_(), blitz: initDay_(), rapid: initDay_(), daily: initDay_(), overall: { wins:0, losses:0, draws:0, rating_change:0, duration_seconds:0 } };

    for (var j = 0; j < rows.length; j++) {
      var rr = rows[j];
      var fmt = rr[FORMAT];
      var bucket = (fmt === 'bullet' || fmt === 'blitz' || fmt === 'rapid' || fmt === 'daily') ? agg[fmt] : null;
      if (!bucket) continue;
      var outcome = rr[OUTCOME];
      if (outcome === 'win') bucket.wins++; else if (outcome === 'draw') bucket.draws++; else bucket.losses++;
      var rLast = rr[RATING_LAST];
      var rNow = rr[RATING];
      var rCh = rr[RATING_CHANGE];
      if (bucket.rating_start == null && rLast != null && rLast !== '') bucket.rating_start = Number(rLast);
      if (rNow != null && rNow !== '') bucket.rating_end = Number(rNow);
      if (rCh != null && rCh !== '') bucket.rating_change += Number(rCh);
      var dur = rr[DURATION];
      if (dur) bucket.duration_seconds += Number(dur || 0);

      // overall
      var o = agg.overall;
      if (outcome === 'win') o.wins++; else if (outcome === 'draw') o.draws++; else o.losses++;
      if (rCh != null && rCh !== '') o.rating_change += Number(rCh);
      if (dur) o.duration_seconds += Number(dur || 0);
    }

    function v(x){ return (x==null)?'':x; }
    var outRow = [
      dateKey,
      agg.bullet.wins, agg.bullet.losses, agg.bullet.draws, v(agg.bullet.rating_start), v(agg.bullet.rating_end), v(agg.bullet.rating_change), agg.bullet.duration_seconds,
      agg.blitz.wins, agg.blitz.losses, agg.blitz.draws, v(agg.blitz.rating_start), v(agg.blitz.rating_end), v(agg.blitz.rating_change), agg.blitz.duration_seconds,
      agg.rapid.wins, agg.rapid.losses, agg.rapid.draws, v(agg.rapid.rating_start), v(agg.rapid.rating_end), v(agg.rapid.rating_change), agg.rapid.duration_seconds,
      agg.daily.wins, agg.daily.losses, agg.daily.draws, v(agg.daily.rating_start), v(agg.daily.rating_end), v(agg.daily.rating_change), agg.daily.duration_seconds,
      agg.overall.wins, agg.overall.losses, agg.overall.draws, agg.overall.rating_change, agg.overall.duration_seconds
    ];

    var writeRow = idxByDate[dateKey];
    if (!writeRow) {
      writeRowsAppend_(shTotals, DAILY_TOTALS_HEADERS, [outRow]);
      // refresh index for potential next writes
      var newLast = shTotals.getLastRow();
      idxByDate[dateKey] = newLast;
    } else {
      shTotals.getRange(writeRow, 1, 1, DAILY_TOTALS_HEADERS.length).setValues([outRow]);
    }
    updated++;
  }
  return updated;
}

function recomputeDailyTotalsForMonth_(yyyy, mm) {
  var dates = generateMonthDates_(yyyy, mm);
  return recomputeDailyTotalsForDates_(dates);
}