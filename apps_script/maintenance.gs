/**
 * Daily maintenance: ensure active month exists, ingest, update daily totals, health, purge logs.
 */

function dailyMaintenance_() {
  return withStepLogging_('dailyMaintenance_', getActiveMonth_(), function() {
    var active = getActiveMonth_();
    ensureActiveMonthSpreadsheet_(active);

    // Ingest active month
    ingestActiveMonthOnce();

    // Update yesterday and today totals
    var tz = getTimezone();
    var now = new Date();
    var todayKey = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    var yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    var yKey = Utilities.formatDate(yest, tz, 'yyyy-MM-dd');
    recomputeDailyTotalsForDates_([yKey, todayKey]);

    // Health
    writeHealth_();

    // Purge logs older than 30 days (optional)
    purgeOldLogs_(30);

    // Finalize previous month if ready
    finalizePreviousMonthIfReady_();
  });
}

function purgeOldLogs_(days) {
  var sh = getOrCreateSheet_(getControlSpreadsheet_(), SHEET_NAMES.Logs);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var tsIdx = 0; // first column is timestamp_iso
  var vals = sh.getRange(2, 1, last - 1, 6).getValues();
  var cutoff = new Date().getTime() - (Number(days || 30) * 24*3600*1000);
  var keep = [];
  for (var i = 0; i < vals.length; i++) {
    var iso = vals[i][tsIdx];
    var dt = iso ? parseLocalDateTimeString_(String(iso)) : null;
    if (dt && dt.getTime() >= cutoff) keep.push(vals[i]);
  }
  sh.clearContents();
  ensureHeaders_(sh, ['timestamp_iso','level','step','month_key','message','context_json']);
  if (keep.length) sh.getRange(2, 1, keep.length, 6).setValues(keep);
  return keep.length;
}