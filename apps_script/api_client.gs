/**
 * API client with ETag support for archives list and monthly archives.
 */

function httpFetchJsonWithEtag_(url, etag) {
  var options = {
    muteHttpExceptions: true,
    method: 'get',
    headers: {}
  };
  if (etag) options.headers['If-None-Match'] = etag;
  var resp = UrlFetchApp.fetch(url, options);
  var code = resp.getResponseCode();
  var headers = resp.getAllHeaders();
  var newEtag = headers && (headers.ETag || headers.Etag || headers['ETag']);
  if (code === 304) {
    return { status: 304, etag: newEtag || etag, json: null };
  }
  if (code < 200 || code >= 300) {
    return { status: code, etag: newEtag || null, json: null, error: resp.getContentText() };
  }
  var text = resp.getContentText();
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) {}
  return { status: code, etag: newEtag || null, json: json };
}

function fetchArchivesList_(username) {
  var props = PropertiesService.getDocumentProperties();
  var etag = props.getProperty(PROP_KEYS.LIST_ETAG);
  var res = httpFetchJsonWithEtag_(APIS.archivesList(username), etag);
  if (res.etag) props.setProperty(PROP_KEYS.LIST_ETAG, res.etag);
  return res;
}

function fetchMonthArchive_(username, yyyy, mm) {
  var props = PropertiesService.getDocumentProperties();
  var key = PROP_KEYS.MONTH_ETAG_PREFIX + (yyyy + '-' + mm);
  var etag = props.getProperty(key);
  var res = httpFetchJsonWithEtag_(APIS.archiveMonth(username, yyyy, mm), etag);
  if (res.etag) props.setProperty(key, res.etag);
  return res;
}