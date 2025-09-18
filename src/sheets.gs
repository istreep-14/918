/** Google Sheets and Drive helpers */

function ensureHeaders_(sheet, headers) {
  var rng = sheet.getRange(1, 1, 1, headers.length);
  var existing = rng.getValues()[0];
  var needs = false;
  for (var i = 0; i < headers.length; i++) {
    if (existing[i] !== headers[i]) { needs = true; break; }
  }
  if (needs) {
    sheet.clear();
    rng = sheet.getRange(1, 1, 1, headers.length);
    rng.setValues([headers]);
    sheet.setFrozenRows(1);
    autoSizeColumns_(sheet, headers.length);
  }
}

function autoSizeColumns_(sheet, numCols) {
  for (var c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
  }
}

function createSpreadsheetInFolder_(name, folderId) {
  var ss = SpreadsheetApp.create(name);
  if (folderId) {
    var file = DriveApp.getFileById(ss.getId());
    var folder = DriveApp.getFolderById(folderId);
    var parents = file.getParents();
    while (parents.hasNext()) {
      var p = parents.next();
      p.removeFile(file);
    }
    folder.addFile(file);
  }
  return ss;
}

function getOrCreateSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}