/**
 * Health check: freshness, parity, queue backlog, finalization readiness.
 */

function getHealthSheet_() {
  var ss = getControlSpreadsheet_();
  var sh = getOrCreateSheet_(ss, SHEET_NAMES.Health);
  ensureHeaders_(sh, ['checked_at_iso','active_month','list_etag_age_hours','active_month_etag_age_minutes','api_vs_sheet_count_diff','last_url_match','pending_queue_total','failed_queue_24h','daily_totals_yesterday_fresh','finalization_ready_prev_month','severity','summary']);
  return sh;
}

function computeHealth_() {
  var props = PropertiesService.getDocumentProperties();
  var now = new Date();
  var nowIso = formatIsoLocal(now);
  var active = getActiveMonth_();
  var parts = { yyyy: active.substring(0,4), mm: active.substring(5,7) };

  // ETag freshness estimates: since Apps Script cannot get header ages, we use last check timestamps from ArchiveList
  var ledger = getArchiveListRow_(parts.yyyy, parts.mm) || {};
  function ageMinutes(iso) { var dt = parseLocalDateTimeString_(String(iso || '')); return dt ? Math.round((now.getTime() - dt.getTime())/60000) : null; }
  var listAgeH = null;
  var listRow = getLatestArchiveListRow_();
  if (listRow && listRow.last_list_check_at) listAgeH = Math.round((ageMinutes(listRow.last_list_check_at) || 0) / 60);
  var monthAgeM = ageMinutes(ledger.last_month_check_at);

  // Parity and url match
  var diff = (Number(ledger.api_game_count_last || 0) - Number(ledger.sheet_game_count || 0));
  var lastUrlMatch = (String(ledger.last_url_api || '') === String(ledger.last_url_seen || ''));

  // Queue backlog
  var q = getQueueSheet_();
  var pending = 0, failed24 = 0;
  var last = q.getLastRow();
  if (last >= 2) {
    var vals = q.getRange(2, 1, last - 1, CALLBACKS_QUEUE_HEADERS.length).getValues();
    var sIdx = CALLBACKS_QUEUE_HEADERS.indexOf('status');
    var laIdx = CALLBACKS_QUEUE_HEADERS.indexOf('last_attempt_iso');
    for (var i = 0; i < vals.length; i++) {
      var s = vals[i][sIdx];
      if (s === 'queued' || s === 'in_progress') pending++;
      if (s === 'failed') {
        var la = vals[i][laIdx];
        var dt = la ? parseLocalDateTimeString_(String(la)) : null;
        if (dt && (now.getTime() - dt.getTime() <= 24*3600*1000)) failed24++;
      }
    }
  }

  // Daily totals freshness (yesterday)
  var tz = getTimezone();
  var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  var yKey = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');
  var shTotals = getDailyTotalsActiveSheet_();
  var freshDaily = false;
  if (shTotals.getLastRow() >= 2) {
    var dates = shTotals.getRange(2, 1, shTotals.getLastRow() - 1, 1).getValues();
    for (var j = 0; j < dates.length; j++) if (String(dates[j][0]) === yKey) { freshDaily = true; break; }
  }

  // Finalization readiness for previous month
  var readyFinalize = false;
  var listRes = fetchArchivesList_(props.getProperty(PROP_KEYS.USERNAME) || '');
  if (listRes.status === 200 && listRes.json && listRes.json.archives && listRes.json.archives.length) {
    var latest = listRes.json.archives[listRes.json.archives.length - 1];
    var m = latest.match(/\/games\/(\d{4})\/(\d{2})$/);
    if (m) {
      var newest = m[1] + '-' + m[2];
      readyFinalize = (newest !== active) && lastUrlMatch && diff === 0;
    }
  }

  var severity = 'ok';
  var summary = [];
  if (diff !== 0) { severity = 'warn'; summary.push('count diff ' + diff); }
  if (!lastUrlMatch) { severity = 'warn'; summary.push('last url mismatch'); }
  if (pending > 100) { severity = 'warn'; summary.push('queue backlog ' + pending); }

  return {
    checked_at_iso: nowIso,
    active_month: active,
    list_etag_age_hours: (listAgeH != null ? listAgeH : ''),
    active_month_etag_age_minutes: (monthAgeM != null ? monthAgeM : ''),
    api_vs_sheet_count_diff: diff,
    last_url_match: lastUrlMatch ? 'yes' : 'no',
    pending_queue_total: pending,
    failed_queue_24h: failed24,
    daily_totals_yesterday_fresh: freshDaily ? 'yes' : 'no',
    finalization_ready_prev_month: readyFinalize ? 'yes' : 'no',
    severity: severity,
    summary: summary.join('; ')
  };
}

function getLatestArchiveListRow_() {
  var sh = getArchiveListSheet_();
  var last = sh.getLastRow();
  if (last < 2) return null;
  var row = sh.getRange(last, 1, 1, ARCHIVE_LIST_HEADERS.length).getValues()[0];
  var obj = {};
  for (var i = 0; i < ARCHIVE_LIST_HEADERS.length; i++) obj[ARCHIVE_LIST_HEADERS[i]] = row[i];
  return obj;
}

function writeHealth_() {
  var sh = getHealthSheet_();
  var h = computeHealth_();
  var headers = readHeaders_(sh);
  var row = [];
  for (var i = 0; i < headers.length; i++) row.push(h[headers[i]]);
  writeRowsAppend_(sh, headers, [row]);
  return h;
}