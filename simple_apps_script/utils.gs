/** Utility helpers: time, sheets, http */

function getTz_() {
  var tz = PropertiesService.getDocumentProperties().getProperty(PROP_KEYS.TIMEZONE);
  return tz || Session.getScriptTimeZone() || 'Etc/GMT';
}

function isoNow_() { return Utilities.formatDate(new Date(), getTz_(), 'yyyy-MM-dd HH:mm:ss'); }

function parseLocalDateTime_(s) {
  if (!s) return null;
  var p = String(s).split(/[- :]/);
  if (p.length < 6) return null;
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(p[3]), Number(p[4]), Number(p[5]));
}

function toLocalIsoFromUnix_(unixSeconds) {
  if (!unixSeconds && unixSeconds !== 0) return '';
  return Utilities.formatDate(new Date(Number(unixSeconds) * 1000), getTz_(), 'yyyy-MM-dd HH:mm:ss');
}

function getOrCreateSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function ensureHeaders_(sheet, headers) {
  var last = sheet.getLastRow();
  if (last === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }
  var current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var missing = [];
  for (var i = 0; i < headers.length; i++) if (current.indexOf(headers[i]) === -1) missing.push(headers[i]);
  if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  return current.concat(missing);
}

function writeRowsAppend_(sheet, headers, rows) {
  if (!rows || !rows.length) return;
  var ensured = ensureHeaders_(sheet, headers);
  var startRow = Math.max(2, sheet.getLastRow() + 1);
  sheet.getRange(startRow, 1, rows.length, ensured.length).setValues(rows);
}

function httpGetJson_(url, etag) {
  var opt = { muteHttpExceptions: true, method: 'get', headers: { 'Accept': 'application/json' } };
  if (etag) opt.headers['If-None-Match'] = etag;
  var resp = UrlFetchApp.fetch(url, opt);
  var code = resp.getResponseCode();
  var headers = resp.getAllHeaders();
  var newEtag = headers && (headers.ETag || headers.Etag || headers['ETag']);
  if (code === 304) return { status: 304, etag: newEtag || etag, json: null };
  if (code < 200 || code >= 300) return { status: code, etag: newEtag || null, json: null, error: resp.getContentText() };
  var text = resp.getContentText();
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) {}
  return { status: code, etag: newEtag || null, json: json };
}

