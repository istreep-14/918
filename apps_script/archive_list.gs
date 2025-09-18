/**
 * ArchiveList ledger helpers: upsert and update per-month metadata.
 */

function getArchiveListSheet_() {
  var ss = getControlSpreadsheet_();
  var sh = getOrCreateSheet_(ss, SHEET_NAMES.ArchiveList);
  ensureHeaders_(sh, ARCHIVE_LIST_HEADERS);
  return sh;
}

function findArchiveListRowIndex_(yyyy, mm) {
  var sh = getArchiveListSheet_();
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var data = sh.getRange(2, 1, last - 1, ARCHIVE_LIST_HEADERS.length).getValues();
  var yIdx = ARCHIVE_LIST_HEADERS.indexOf('year');
  var mIdx = ARCHIVE_LIST_HEADERS.indexOf('month');
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][yIdx]) === String(yyyy) && String(data[i][mIdx]) === String(mm)) return i + 2;
  }
  return -1;
}

function upsertArchiveListRow_(yyyy, mm, archiveUrl) {
  var sh = getArchiveListSheet_();
  var rowIdx = findArchiveListRowIndex_(yyyy, mm);
  if (rowIdx === -1) {
    var arr = new Array(ARCHIVE_LIST_HEADERS.length).fill('');
    arr[ARCHIVE_LIST_HEADERS.indexOf('year')] = String(yyyy);
    arr[ARCHIVE_LIST_HEADERS.indexOf('month')] = String(mm);
    arr[ARCHIVE_LIST_HEADERS.indexOf('archive_url')] = archiveUrl || '';
    sh.appendRow(arr);
    rowIdx = sh.getLastRow();
  }
  return rowIdx;
}

function patchArchiveListRow_(yyyy, mm, patch) {
  var sh = getArchiveListSheet_();
  var rowIdx = upsertArchiveListRow_(yyyy, mm, patch && patch.archive_url);
  var headers = ARCHIVE_LIST_HEADERS;
  var current = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  for (var k in patch) {
    var c = headers.indexOf(k);
    if (c >= 0) current[c] = patch[k];
  }
  sh.getRange(rowIdx, 1, 1, headers.length).setValues([current]);
}

function updateArchiveListCounts_(yyyy, mm, fields) {
  patchArchiveListRow_(yyyy, mm, fields);
}

function getArchiveListRow_(yyyy, mm) {
  var sh = getArchiveListSheet_();
  var rowIdx = findArchiveListRowIndex_(yyyy, mm);
  if (rowIdx === -1) return null;
  var values = sh.getRange(rowIdx, 1, 1, ARCHIVE_LIST_HEADERS.length).getValues()[0];
  var obj = {};
  for (var i = 0; i < ARCHIVE_LIST_HEADERS.length; i++) obj[ARCHIVE_LIST_HEADERS[i]] = values[i];
  return obj;
}