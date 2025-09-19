/** Common helpers for Option B */

function tz_() { return PropertiesService.getDocumentProperties().getProperty(PROP_KEYS.TIMEZONE) || Session.getScriptTimeZone() || 'Etc/GMT'; }
function isoNow_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss'); }
function toLocalIsoFromUnix_(unix) { if (!unix && unix !== 0) return ''; return Utilities.formatDate(new Date(Number(unix)*1000), tz_(), 'yyyy-MM-dd HH:mm:ss'); }

function getOrCreateSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function ensureHeaders_(sheet, headers) { var last=sheet.getLastRow(); if (last===0){ sheet.getRange(1,1,1,headers.length).setValues([headers]); return headers; } var cur=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]; var missing=[]; for (var i=0;i<headers.length;i++) if (cur.indexOf(headers[i])===-1) missing.push(headers[i]); if (missing.length) sheet.getRange(1,cur.length+1,1,missing.length).setValues([missing]); return cur.concat(missing); }
function writeRowsAppend_(sheet, headers, rows){ if(!rows||!rows.length)return; var ensured=ensureHeaders_(sheet, headers); var start=Math.max(2, sheet.getLastRow()+1); sheet.getRange(start,1,rows.length,ensured.length).setValues(rows); }

function httpGetJson_(url, etag) {
  var opt={ muteHttpExceptions:true, method:'get', headers:{ 'Accept':'application/json' } };
  if (etag) opt.headers['If-None-Match']=etag;
  var resp=UrlFetchApp.fetch(url,opt); var code=resp.getResponseCode(); var headers=resp.getAllHeaders(); var newEtag=headers && (headers.ETag||headers.Etag||headers['ETag']);
  if (code===304) return { status:304, etag:(newEtag||etag), json:null };
  if (code<200||code>=300) return { status:code, etag:(newEtag||null), json:null, error:resp.getContentText() };
  var text=resp.getContentText(); var json=null; try{ json=text?JSON.parse(text):null; }catch(e){}
  return { status:code, etag:(newEtag||null), json:json };
}

