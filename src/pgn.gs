/** Simple PGN header parser: returns a map of header -> value */

function parsePgnHeadersToMap_(pgn) {
  var map = {};
  if (!pgn) return map;
  var lines = pgn.split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('[') && line.endsWith(']')) {
      var inner = line.substring(1, line.length - 1);
      var spaceIdx = inner.indexOf(' ');
      if (spaceIdx > 0) {
        var key = inner.substring(0, spaceIdx);
        var raw = inner.substring(spaceIdx + 1).trim();
        var val = raw.replace(/^"|"$/g, '');
        map[key] = val;
      }
    }
  }
  return map;
}