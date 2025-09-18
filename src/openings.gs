/** Openings queue and processor: extract openingData from chess.com opening pages */

function enqueueOpeningsForGames(limit) {
  var activeId = getGamesActiveSpreadsheetId();
  if (!activeId) return 0;
  var ss = SpreadsheetApp.openById(activeId);
  var sheet = getOrCreateSheet_(ss, SHEET_NAMES.games);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  // Read ECO and ECOUrl columns dynamically based on headers
  var ecoCol = GAME_HEADERS.indexOf('pgn.ECO') + 1;
  var ecoUrlCol = GAME_HEADERS.indexOf('pgn.ECOUrl') + 1;
  if (ecoCol <= 0 || ecoUrlCol <= 0) return 0;
  var startRow = Math.max(2, lastRow - 1000);
  var numRows = Math.min(1000, lastRow - 1);
  var data = sheet.getRange(startRow, 1, numRows, Math.max(ecoUrlCol, ecoCol)).getValues();

  var qId = getOpeningsQueueSpreadsheetId();
  if (!qId) return 0;
  var q = getOrCreateSheet_(SpreadsheetApp.openById(qId), SHEET_NAMES.openingsQueue);
  ensureHeaders_(q, OPENINGS_QUEUE_HEADERS);

  var queued = 0;
  var nowIso = isoNow();
  // Build existing queue index to avoid duplicating
  var qLast = q.getLastRow();
  var existing = {};
  if (qLast >= 2) {
    var qVals = q.getRange(2, 1, qLast - 1, OPENINGS_QUEUE_HEADERS.length).getValues();
    for (var i = 0; i < qVals.length; i++) {
      var url = qVals[i][0];
      if (url) existing[url] = true;
    }
  }

  for (var r = 0; r < data.length && queued < (limit || 100); r++) {
    var row = data[r];
    var eco = row[ecoCol - 1];
    var ecoUrl = row[ecoUrlCol - 1];
    if (!ecoUrl) continue;
    // Normalize to chess.com opening page URL; ECOUrl is usually that already
    var url = String(ecoUrl);
    if (existing[url]) continue;
    q.appendRow([url, eco || '', '', nowIso, 'queued', '', 0]);
    existing[url] = true;
    queued++;
  }
  return queued;
}

function processOpeningsBatch(maxBatch) {
  var qId = getOpeningsQueueSpreadsheetId();
  var rId = getOpeningsResultsSpreadsheetId();
  if (!qId || !rId) return 0;
  var qSheet = getOrCreateSheet_(SpreadsheetApp.openById(qId), SHEET_NAMES.openingsQueue);
  var rSheet = getOrCreateSheet_(SpreadsheetApp.openById(rId), SHEET_NAMES.openingsResults);
  ensureHeaders_(qSheet, OPENINGS_QUEUE_HEADERS);
  ensureHeaders_(rSheet, OPENINGS_RESULTS_HEADERS);
  var lastRow = qSheet.getLastRow();
  if (lastRow < 2) return 0;
  var rows = qSheet.getRange(2, 1, lastRow - 1, OPENINGS_QUEUE_HEADERS.length).getValues();
  var processed = 0;
  var start = new Date().getTime();
  for (var i = 0; i < rows.length && processed < (maxBatch || 25); i++) {
    var rec = rows[i];
    if (rec[4] !== 'queued') continue;
    var url = rec[0];
    var ecoCode = rec[1] || '';
    var ecoName = rec[2] || '';
    // Fetch HTML
    var res = httpFetchText(url, {});
    if (res.status >= 200 && res.status < 300 && res.text) {
      var parsed = parseOpeningDataFromHtml_(res.text);
      if (parsed) {
        rSheet.appendRow([
          url,
          parsed.code || ecoCode || '',
          parsed.name || ecoName || '',
          parsed.clean_url || '',
          parsed.fen || '',
          parsed.is_starting_position === true,
          (typeof parsed.eval !== 'undefined' ? parsed.eval : ''),
          (typeof parsed.number_of_games !== 'undefined' ? parsed.number_of_games : ''),
          (parsed.children || ''),
          isoNow()
        ]);
        qSheet.getRange(i + 2, 5, 1, 3).setValues([['done', isoNow(), (rec[6] || 0) + 1]]);
        processed++;
      } else {
        // mark attempt and keep queued
        qSheet.getRange(i + 2, 6, 1, 2).setValues([[isoNow(), (rec[6] || 0) + 1]]);
      }
    } else {
      qSheet.getRange(i + 2, 6, 1, 2).setValues([[isoNow(), (rec[6] || 0) + 1]]);
    }
    if (new Date().getTime() - start > 4 * 60 * 1000) {
      logWarn('OPENINGS_TIME', 'Stopping early due to time limit', { processed: processed });
      break;
    }
  }
  return processed;
}

function parseOpeningDataFromHtml_(html) {
  try {
    // Extract the window.chesscom.openingData = { ... } block
    var m = html.match(/window\.chesscom\s*=\s*window\.chesscom\s*\|\|\s*\{\};\s*\n\s*window\.chesscom\.openingData\s*=\s*\{[\s\S]*?\};/);
    if (!m) m = html.match(/window\.chesscom\.openingData\s*=\s*\{[\s\S]*?\};/);
    if (!m) return null;
    var snippet = m[0];
    var objMatch = snippet.match(/window\.chesscom\.openingData\s*=\s*(\{[\s\S]*\});/);
    if (!objMatch) return null;
    var jsonLike = objMatch[1];
    // The block is JS object literal; attempt to sanitize to JSON:
    // - Replace single quotes? Typically uses JSON-like; rely on eval in sandbox? Avoid. We'll parse specific fields via regex fallbacks if JSON.parse fails.
    try {
      var normalized = jsonLike
        .replace(/,(\s*[}\]])/g, '$1');
      var data = JSON.parse(normalized);
      var eco = data && data.explorerEco ? data.explorerEco : null;
      return {
        code: eco ? eco.code : '',
        name: eco ? eco.name : '',
        move_list: eco ? eco.move_list : '',
        clean_url: eco ? eco.clean_url : '',
        fen: eco ? eco.fen : '',
        is_starting_position: eco ? Boolean(eco.is_starting_position) : false,
        eval: eco && typeof eco.eval !== 'undefined' ? eco.eval : undefined,
        number_of_games: eco && typeof eco.number_of_games !== 'undefined' ? eco.number_of_games : undefined,
        children: eco && typeof eco.children !== 'undefined' ? String(eco.children) : ''
      };
    } catch (e) {
      // Regex pick essential pieces if JSON parsing fails
      var code = (jsonLike.match(/"code"\s*:\s*"([^"]+)"/) || [])[1] || '';
      var name = (jsonLike.match(/"name"\s*:\s*"([^"]+)"/) || [])[1] || '';
      var clean = (jsonLike.match(/"clean_url"\s*:\s*"([^"]+)"/) || [])[1] || '';
      var fen = (jsonLike.match(/"fen"\s*:\s*"([^"]+)"/) || [])[1] || '';
      var isStart = ((jsonLike.match(/"is_starting_position"\s*:\s*(true|false)/) || [])[1] === 'true');
      var evalNum = (jsonLike.match(/"eval"\s*:\s*([-\d\.]+)/) || [])[1];
      var numGames = (jsonLike.match(/"number_of_games"\s*:\s*(\d+)/) || [])[1];
      var children = (jsonLike.match(/"children"\s*:\s*"([\s\S]*?)"\s*,\s*"explicit_transpose"/) || [])[1] || '';
      return {
        code: code,
        name: name,
        clean_url: clean,
        fen: fen,
        is_starting_position: isStart,
        eval: (evalNum != null ? Number(evalNum) : undefined),
        number_of_games: (numGames != null ? Number(numGames) : undefined),
        children: children
      };
    }
  } catch (e) {
    logWarn('OPENINGS_PARSE_FAIL', 'Failed to parse openingData', { error: String(e) });
    return null;
  }
}

