/**
 * Prior rating cache per format across runs/months.
 */

function loadPriorRatings_() {
  var raw = PropertiesService.getDocumentProperties().getProperty(PROP_KEYS.PRIOR_BY_FORMAT);
  try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
}

function savePriorRatings_(map) {
  PropertiesService.getDocumentProperties().setProperty(PROP_KEYS.PRIOR_BY_FORMAT, JSON.stringify(map || {}));
}