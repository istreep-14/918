/** Profile and player stats ingestion */

function fetchAndStoreProfile() {
  var username = getUsername();
  var res = httpFetchJson(ENDPOINTS.profile(username), {});
  if (!(res.status >= 200 && res.status < 300) || !res.json) throw new Error('Profile fetch failed');
  var json = res.json;
  var joinedIso = json.joined ? Utilities.formatDate(new Date(json.joined * 1000), getTimezone(), 'yyyy-MM-dd HH:mm:ss') : '';
  var ss = SpreadsheetApp.openById(getOpsSpreadsheetId());
  var sheet = ss.getSheetByName(SHEET_NAMES.profile);
  ensureHeaders_(sheet, PROFILE_HEADERS);
  sheet.clear();
  sheet.getRange(1,1,1,PROFILE_HEADERS.length).setValues([PROFILE_HEADERS]);
  sheet.appendRow([isoNow(), json.username || '', json.player_id || '', json.uuid || '', joinedIso, json.status || '']);
}

function fetchAndAppendPlayerStats() {
  var username = getUsername();
  var res = httpFetchJson(ENDPOINTS.stats(username), {});
  if (!(res.status >= 200 && res.status < 300) || !res.json) throw new Error('Stats fetch failed');
  var json = res.json;
  var sheet = SpreadsheetApp.openById(getOpsSpreadsheetId()).getSheetByName(SHEET_NAMES.playerStatsTimeline);
  ensureHeaders_(sheet, PLAYER_STATS_TIMELINE_HEADERS);
  var ts = isoNow();
  function appendMetric(tc, obj) {
    if (!obj || !obj.last) return;
    var rating = obj.last.rating;
    sheet.appendRow([ts, 'rating', tc, rating, JSON.stringify({ best: obj.best || null, record: obj.record || null })]);
    if (obj.record) {
      sheet.appendRow([ts, 'wins', tc, obj.record.win || 0, '']);
      sheet.appendRow([ts, 'losses', tc, obj.record.loss || 0, '']);
      sheet.appendRow([ts, 'draws', tc, obj.record.draw || 0, '']);
    }
  }
  appendMetric('bullet', json.chess_bullet);
  appendMetric('blitz', json.chess_blitz);
  appendMetric('rapid', json.chess_rapid);
  appendMetric('daily', json.chess_daily);
}