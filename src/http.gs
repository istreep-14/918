/** HTTP utilities with retries, ETag support, and basic observability */

function buildDefaultHeaders_() {
  return {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip'
  };
}

function httpFetchJson(url, opt) {
  var options = opt || {};
  var maxRetries = options.maxRetries || 3;
  var backoffMs = options.backoffMs || 500;
  var headers = Object.assign({}, buildDefaultHeaders_(), options.headers || {});
  if (options.etag) headers['If-None-Match'] = options.etag;
  var lastError = null;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        headers: headers,
        contentType: 'application/json',
        validateHttpsCertificates: true,
        escaping: false,
        timeout: 30000
      });
      var status = resp.getResponseCode();
      var text = resp.getContentText();
      var allHeaders = resp.getAllHeaders();
      logInfo('HTTP', 'GET ' + url + ' -> ' + status, { attempt: attempt });
      if (status === 304) {
        return { status: status, json: null, headers: allHeaders };
      }
      if (status >= 200 && status < 300) {
        return { status: status, json: JSON.parse(text), headers: allHeaders };
      }
      if (status === 429 || status >= 500) {
        throw new Error('Transient HTTP ' + status + ' for ' + url);
      }
      // Non-retryable
      return { status: status, json: null, headers: allHeaders, error: text };
    } catch (e) {
      lastError = e;
      Utilities.sleep(backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
    }
  }
  logError('HTTP_ERR', 'Failed to fetch JSON after retries: ' + url, { error: String(lastError) });
  throw lastError;
}