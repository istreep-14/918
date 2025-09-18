/**
 * Script-wide logging utilities writing into a Logs sheet in the Control file.
 */

function logRow_(level, step, monthKey, message, contextObj) {
  try {
    var ss = getControlSpreadsheet_();
    var sheet = getOrCreateSheet_(ss, SHEET_NAMES.Logs);
    ensureHeaders_(sheet, ['timestamp_iso','level','step','month_key','message','context_json']);
    var ts = formatIsoLocal(new Date());
    var ctx = contextObj ? JSON.stringify(contextObj) : '';
    sheet.appendRow([ts, String(level || 'INFO'), String(step || ''), String(monthKey || ''), String(message || ''), ctx]);
  } catch (e) {
    // Swallow to avoid recursive failures
  }
}

function logInfo(step, monthKey, message, contextObj) { logRow_('INFO', step, monthKey, message, contextObj); }
function logWarn(step, monthKey, message, contextObj) { logRow_('WARN', step, monthKey, message, contextObj); }
function logError(step, monthKey, message, contextObj) { logRow_('ERROR', step, monthKey, message, contextObj); }

function withStepLogging_(stepName, monthKey, fn) {
  try {
    return fn();
  } catch (e) {
    logError(stepName, monthKey, e && e.message ? e.message : String(e), { stack: e && e.stack ? String(e.stack) : '' });
    throw e;
  }
}