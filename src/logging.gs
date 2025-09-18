/** Logging and metrics helpers */

function withLogsSheet_(fn) {
  var opsId = getOpsSpreadsheetId();
  if (!opsId) return null;
  var ss = SpreadsheetApp.openById(opsId);
  var sheet = ss.getSheetByName(SHEET_NAMES.logs) || ss.insertSheet(SHEET_NAMES.logs);
  ensureHeaders_(sheet, LOGS_HEADERS);
  return { sheet: sheet, done: function() { SpreadsheetApp.flush(); } };
}

function logStructured(level, code, message, context) {
  try {
    var payload = [isoNow(), level, code || '', message || '', context ? JSON.stringify(context) : '' ];
    var holder = withLogsSheet_();
    if (holder && holder.sheet) {
      holder.sheet.appendRow(payload);
      holder.done();
    }
  } catch (e) {
    // Best-effort logging
    console.log('logStructured failed: ' + e);
  }
}

function logInfo(code, message, context) { logStructured('INFO', code, message, context); }
function logWarn(code, message, context) { logStructured('WARN', code, message, context); }
function logError(code, message, context) { logStructured('ERROR', code, message, context); }

function metricRecord(metric, value, context) {
  try {
    var opsId = getOpsSpreadsheetId();
    if (!opsId) return;
    var ss = SpreadsheetApp.openById(opsId);
    var sheet = ss.getSheetByName(SHEET_NAMES.metrics) || ss.insertSheet(SHEET_NAMES.metrics);
    ensureHeaders_(sheet, METRICS_HEADERS);
    sheet.appendRow([isoNow(), metric, value, context ? JSON.stringify(context) : '' ]);
  } catch (e) {
    console.log('metricRecord failed: ' + e);
  }
}