/** Daily totals grouped by end_time in local timezone */

function getDateKeyFromLocalIso_(iso) {
  if (!iso) return '';
  return iso.substring(0, 10); // yyyy-MM-dd
}

function computeDailyTotalsForRange_(startDate, endDate) {
  // Aggregate from all archive months overlapping range; for performance, only current/prior months in incremental.
  var results = {};
  function ensureDay(dateKey) {
    if (!results[dateKey]) {
      var init = { date: dateKey };
      var keys = ['bullet','blitz','rapid','daily'];
      keys.forEach(function(k){
        init[k] = { wins:0, losses:0, draws:0, rating_start:null, rating_end:null, rating_change:0, duration_seconds:0 };
      });
      init.overall = { wins:0, losses:0, draws:0, rating_change:0, duration_seconds:0 };
      results[dateKey] = init;
    }
  }

  // Walk current/prior months for speed
  var months = getCurrentAndPriorMonth_();
  for (var i = 0; i < months.length; i++) {
    var ss = getArchiveSpreadsheetByMonth_(months[i].yyyy, months[i].mm);
    if (!ss) continue;
    var sheet = ss.getSheetByName(SHEET_NAMES.games);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var data = sheet.getRange(2, 1, lastRow - 1, GAME_HEADERS.length).getValues();
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var endIso = row[8]; // end_time
      var dateKey = getDateKeyFromLocalIso_(endIso);
      if (!dateKey) continue;
      var dt = new Date(dateKey + ' 00:00:00');
      if (dt < startDate || dt > endDate) continue;
      ensureDay(dateKey);
      var fmt = row[19]; // format
      var outcome = row[38]; // player.outcome
      var rating = row[36]; // player.rating (at end)
      var ratingLast = row[37];
      var ratingChange = row[38 + 1]; // wrong index guard later
      // Fix ratingChange index: player.rating_change is at index 38? Let's recompute:
      // GAME_HEADERS indices: ... player.username(35), player.color(36), player.rating(37), player.rating_last(38), player.rating_change(39), player.result(40), player.outcome(41), player.score(42)
      var playerOutcome = row[41];
      var playerRating = row[37];
      var playerRatingLast = row[38];
      var playerRatingChange = row[39];
      var dur = row[10];

      var bucket = results[dateKey][fmt] || results[dateKey][fmt === 'daily' ? 'daily' : (fmt === 'bullet' || fmt === 'blitz' || fmt === 'rapid' ? fmt : null)];
      if (!bucket) continue; // skip variants outside four

      if (playerOutcome === 'win') bucket.wins++;
      else if (playerOutcome === 'draw') bucket.draws++;
      else bucket.losses++;

      if (bucket.rating_start == null && playerRatingLast != null && playerRatingLast !== '') bucket.rating_start = Number(playerRatingLast);
      if (playerRating != null && playerRating !== '') bucket.rating_end = Number(playerRating);
      if (playerRatingChange != null && playerRatingChange !== '') bucket.rating_change += Number(playerRatingChange);
      if (dur) bucket.duration_seconds += Number(dur || 0);

      // overall
      var o = results[dateKey].overall;
      if (playerOutcome === 'win') o.wins++; else if (playerOutcome === 'draw') o.draws++; else o.losses++;
      if (playerRatingChange != null && playerRatingChange !== '') o.rating_change += Number(playerRatingChange);
      if (dur) o.duration_seconds += Number(dur || 0);
    }
  }
  return results;
}

function generateContinuousDates_(fromDate, toDate) {
  var days = [];
  var cur = new Date(fromDate.getTime());
  while (cur <= toDate) {
    days.push(Utilities.formatDate(cur, getTimezone(), 'yyyy-MM-dd'));
    cur = new Date(cur.getTime() + 24*3600*1000);
  }
  return days;
}

function refreshDailyTotalsActive() {
  var id = getDailyTotalsActiveSpreadsheetId();
  if (!id) return;
  var ss = SpreadsheetApp.openById(id);
  var sheet = getOrCreateSheet_(ss, SHEET_NAMES.dailyTotals);
  ensureHeaders_(sheet, DAILY_TOTALS_HEADERS);

  // From account creation date to today if available; else from first of prior month
  var opsId = getOpsSpreadsheetId();
  var profileSheet = opsId ? SpreadsheetApp.openById(opsId).getSheetByName(SHEET_NAMES.profile) : null;
  var joinedDate = null;
  if (profileSheet && profileSheet.getLastRow() >= 2) {
    var val = profileSheet.getRange(2, 4).getValue(); // joined_iso
    if (val) joinedDate = new Date(val);
  }
  var start = joinedDate || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  var end = new Date();

  var agg = computeDailyTotalsForRange_(start, end);
  var days = generateContinuousDates_(start, end);
  var rows = [];
  for (var i = 0; i < days.length; i++) {
    var k = days[i];
    var d = agg[k] || { bullet:initDay_(), blitz:initDay_(), rapid:initDay_(), daily:initDay_(), overall:{wins:0,losses:0,draws:0,rating_change:0,duration_seconds:0} };
    function v(x){ return x==null?'':x; }
    rows.push([
      k,
      d.bullet.wins, d.bullet.losses, d.bullet.draws, v(d.bullet.rating_start), v(d.bullet.rating_end), v(d.bullet.rating_change), d.bullet.duration_seconds,
      d.blitz.wins, d.blitz.losses, d.blitz.draws, v(d.blitz.rating_start), v(d.blitz.rating_end), v(d.blitz.rating_change), d.blitz.duration_seconds,
      d.rapid.wins, d.rapid.losses, d.rapid.draws, v(d.rapid.rating_start), v(d.rapid.rating_end), v(d.rapid.rating_change), d.rapid.duration_seconds,
      d.daily.wins, d.daily.losses, d.daily.draws, v(d.daily.rating_start), v(d.daily.rating_end), v(d.daily.rating_change), d.daily.duration_seconds,
      d.overall.wins, d.overall.losses, d.overall.draws, d.overall.rating_change, d.overall.duration_seconds
    ]);
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, DAILY_TOTALS_HEADERS.length).setValues([DAILY_TOTALS_HEADERS]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, DAILY_TOTALS_HEADERS.length).setValues(rows);
}

function initDay_() { return { wins:0, losses:0, draws:0, rating_start:null, rating_end:null, rating_change:0, duration_seconds:0 }; }