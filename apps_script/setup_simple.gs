/**
 * Simple one-stop setup and archive list writer.
 * Edit CONFIG in config_simple.gs first, then run setupSimple().
 */

function setupSimple() {
	var props = PropertiesService.getDocumentProperties();
	var name = (CONFIG && CONFIG.CONTROL_SPREADSHEET_NAME) ? CONFIG.CONTROL_SPREADSHEET_NAME : 'Chess Control';
	var ss = SpreadsheetApp.create(name);

	if (CONFIG && CONFIG.FOLDER_NAME) {
		var folder = ensureFolderSimple_(CONFIG.FOLDER_NAME);
		moveFileToFolderSimple_(ss.getId(), folder.getId());
	}

	props.setProperty(PROP.CONTROL_ID, ss.getId());
	if (CONFIG && CONFIG.USERNAME) {
		PropertiesService.getDocumentProperties().setProperty('USERNAME', String(CONFIG.USERNAME));
		PropertiesService.getDocumentProperties().setProperty('MY_USERNAME', String(CONFIG.USERNAME));
	}

	// Create tabs with headers
	var shArchiveList = getOrCreateSheet_(ss, CONFIG.SHEETS.ARCHIVE_LIST);
	ensureHeaders_(shArchiveList, ['archive_url','yyyy','mm','last_checked_at']);
	var shCurrent = getOrCreateSheet_(ss, CONFIG.SHEETS.CURRENT);
	ensureHeaders_(shCurrent, (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS);
	var shArchive = getOrCreateSheet_(ss, CONFIG.SHEETS.ARCHIVE);
	ensureHeaders_(shArchive, (ACTIVE_HEADERS && ACTIVE_HEADERS.length) ? ACTIVE_HEADERS : GAME_HEADERS);
	var shTotals = getOrCreateSheet_(ss, CONFIG.SHEETS.DAILY_TOTALS);
	ensureHeaders_(shTotals, DAILY_TOTALS_HEADERS);

	// Prime CURRENT_ACTIVE_MONTH from the latest archives list (optional)
	try {
		var username = CONFIG && CONFIG.USERNAME ? CONFIG.USERNAME : (PropertiesService.getDocumentProperties().getProperty('USERNAME') || '');
		if (username) {
			var res = fetchArchivesList_(username);
			if (res.status === 200 && res.json && res.json.archives && res.json.archives.length) {
				var latest = res.json.archives[res.json.archives.length - 1];
				var m = latest.match(/\/games\/(\d{4})\/(\d{2})$/);
				if (m) props.setProperty(PROP.CURRENT_ACTIVE_MONTH, m[1] + '-' + m[2]);
			}
		}
	} catch (e) {}

	return { controlSpreadsheetId: ss.getId() };
}

function fetchArchiveListToSheetSimple() {
	var props = PropertiesService.getDocumentProperties();
	var controlId = props.getProperty(PROP.CONTROL_ID);
	if (!controlId) throw new Error('Run setupSimple() first');
	var ss = SpreadsheetApp.openById(controlId);
	var sh = getOrCreateSheet_(ss, CONFIG.SHEETS.ARCHIVE_LIST);
	ensureHeaders_(sh, ['archive_url','yyyy','mm','last_checked_at']);

	var username = (CONFIG && CONFIG.USERNAME) ? CONFIG.USERNAME : (props.getProperty('USERNAME') || '');
	if (!username) throw new Error('Set CONFIG.USERNAME in config_simple.gs');
	var nowIso = formatIsoLocal(new Date());

	var res = fetchArchivesList_(username);
	if (!(res.status >= 200 && res.status < 300) || !res.json || !res.json.archives) return 0;
	var list = res.json.archives;

	// Build existing set for idempotent upsert
	var existing = {};
	var last = sh.getLastRow();
	if (last >= 2) {
		var vals = sh.getRange(2, 1, last - 1, 4).getValues();
		for (var i = 0; i < vals.length; i++) existing[String(vals[i][0])] = true;
	}

	var rows = [];
	for (var j = 0; j < list.length; j++) {
		var url = list[j];
		var m = url.match(/\/games\/(\d{4})\/(\d{2})$/);
		if (!m) continue;
		if (existing[url]) continue;
		rows.push([url, m[1], m[2], nowIso]);
	}
	if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
	return rows.length;
}

