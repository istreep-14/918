/** Monthly rollover: create new month entry, mark prior inactive, refresh totals */

function monthlyRollover() {
  var username = getUsername();
  var archives = fetchArchivesList_();
  // Ensure newest month spreadsheet exists
  var now = new Date();
  var yyyy = '' + now.getFullYear();
  var mm = (now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1);
  ensureArchiveSpreadsheet_(yyyy, mm);

  // Re-check prior month and mark inactive in meta
  var prior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var py = '' + prior.getFullYear();
  var pm = (prior.getMonth() + 1 < 10 ? '0' : '') + (prior.getMonth() + 1);
  var priorUrl = ENDPOINTS.archiveMonth(username, py, pm);
  if (archives.indexOf(priorUrl) !== -1) {
    ingestArchiveMonth(priorUrl); // will set status inactive if not current
  }

  // Refresh daily totals active; archiving historical months into separate spreadsheets can be added later
  refreshDailyTotalsActive();
}