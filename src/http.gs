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
      // Normalize header keys to lowercase for reliable access
      var normHeaders = {};
      try {
        for (var k in allHeaders) {
          if (allHeaders.hasOwnProperty(k)) normHeaders[String(k).toLowerCase()] = allHeaders[k];
        }
      } catch (e) {}
      logInfo('HTTP', 'GET ' + url + ' -> ' + status, { attempt: attempt });
      if (status === 304) {
        return { status: status, json: null, headers: normHeaders };
      }
      if (status >= 200 && status < 300) {
        var parsed = null;
        try { parsed = JSON.parse(text); }
        catch (e) {
          logError('HTTP_JSON_PARSE', 'Failed to parse JSON', { url: url, snippet: (text || '').substring(0, 200) });
          throw e;
        }
        return { status: status, json: parsed, headers: normHeaders };
      }
      if (status === 429 || status >= 500) {
        throw new Error('Transient HTTP ' + status + ' for ' + url);
      }
      // Non-retryable
      return { status: status, json: null, headers: normHeaders, error: text };
    } catch (e) {
      lastError = e;
      Utilities.sleep(backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
    }
  }
  logError('HTTP_ERR', 'Failed to fetch JSON after retries: ' + url, { error: String(lastError) });
  throw lastError;
}

function httpFetchText(url, opt) {
  var options = opt || {};
  var maxRetries = options.maxRetries || 3;
  var backoffMs = options.backoffMs || 500;
  var headers = Object.assign({}, buildDefaultHeaders_(), options.headers || {});
  // Favor HTML/text
  headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  var lastError = null;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, {
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        headers: headers,
        validateHttpsCertificates: true,
        escaping: false,
        timeout: 30000
      });
      var status = resp.getResponseCode();
      var text = resp.getContentText();
      var allHeaders = resp.getAllHeaders();
      var normHeaders = {};
      try {
        for (var k in allHeaders) {
          if (allHeaders.hasOwnProperty(k)) normHeaders[String(k).toLowerCase()] = allHeaders[k];
        }
      } catch (e) {}
      logInfo('HTTP_TEXT', 'GET ' + url + ' -> ' + status, { attempt: attempt });
      if (status >= 200 && status < 300) {
        return { status: status, text: text, headers: normHeaders };
      }
      if (status === 429 || status >= 500) {
        throw new Error('Transient HTTP ' + status + ' for ' + url);
      }
      return { status: status, text: '', headers: normHeaders };
    } catch (e) {
      lastError = e;
      Utilities.sleep(backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
    }
  }
  logError('HTTP_TEXT_ERR', 'Failed to fetch TEXT after retries: ' + url, { error: String(lastError) });
  throw lastError;
}