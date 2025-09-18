/**
 * Timezone and timestamp formatting utilities.
 */

function getTimezone() {
  return Session.getScriptTimeZone() || 'Etc/GMT';
}

function formatIsoLocal(dt) {
  if (!dt) return '';
  return Utilities.formatDate(dt, getTimezone(), 'yyyy-MM-dd HH:mm:ss');
}

function toLocalIsoFromUnix(unixSeconds) {
  if (!unixSeconds && unixSeconds !== 0) return '';
  var dt = new Date(Number(unixSeconds) * 1000);
  return formatIsoLocal(dt);
}

function parseLocalDateTimeString_(yyyyMmDdHhMmSs) {
  if (!yyyyMmDdHhMmSs) return null;
  var parts = String(yyyyMmDdHhMmSs).split(/[\- :]/);
  if (parts.length < 6) return null;
  var y = Number(parts[0]);
  var m = Number(parts[1]) - 1;
  var d = Number(parts[2]);
  var hh = Number(parts[3]);
  var mm = Number(parts[4]);
  var ss = Number(parts[5]);
  return new Date(y, m, d, hh, mm, ss);
}

function pgnUtcToLocalIso_(pgnHeadersMap) {
  var utcDate = pgnHeadersMap['UTCDate'] || pgnHeadersMap['Date'] || '';
  var utcTime = pgnHeadersMap['UTCTime'] || pgnHeadersMap['StartTime'] || '';
  if (!utcDate || !utcTime) return '';
  var d = String(utcDate).replace(/\./g, '-');
  var t = String(utcTime).split(' ')[0];
  var iso = d + 'T' + t + 'Z';
  try {
    var dt = new Date(iso);
    return formatIsoLocal(dt);
  } catch (e) {
    return '';
  }
}

function getDateKeyFromLocalIso_(iso) {
  if (!iso) return '';
  return iso.substring(0, 10);
}

function monthKeyFromIso_(iso) {
  if (!iso) return '';
  return iso.substring(0, 7);
}