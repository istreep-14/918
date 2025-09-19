/** Archives list + backfill for Option B */

function fetchArchivesListRaw_() {
  var props=PropertiesService.getDocumentProperties();
  var username=props.getProperty(PROP_KEYS.USERNAME); if(!username) throw new Error('USERNAME not set');
  var etag=props.getProperty(PROP_KEYS.LIST_ETAG);
  var res=httpGetJson_(APIS.archivesList(username), etag);
  if(res.etag) props.setProperty(PROP_KEYS.LIST_ETAG, res.etag);
  return res;
}

function parseArchivesList_(res){ if(res.status===304) return []; if(!(res.status>=200&&res.status<300)&&!res.json) return []; var list=res.json.archives||[]; var out=[]; for(var i=0;i<list.length;i++){ var u=list[i]; var m=u.match(/\/games\/(\d{4})\/(\d{2})$/); if(m) out.push({ yyyy:m[1], mm:m[2], url:u }); } return out; }

function fetchAndStoreArchivesList_(){
  var props=PropertiesService.getDocumentProperties();
  var ctl=SpreadsheetApp.openById(props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID));
  var sh=getOrCreateSheet_(ctl, SHEET_NAMES.ArchivesList); ensureHeaders_(sh, ARCHIVES_HEADERS);
  var res=fetchArchivesListRaw_(); var list=parseArchivesList_(res); var now=isoNow_();
  var idx={}; var last=sh.getLastRow(); if(last>=2){ var vals=sh.getRange(2,1,last-1,ARCHIVES_HEADERS.length).getValues(); var yI=0,mI=1; for(var r=0;r<vals.length;r++) idx[vals[r][yI]+'-'+vals[r][mI]]=r+2; }
  for(var j=0;j<list.length;j++){ var rec=list[j]; var k=rec.yyyy+'-'+rec.mm; var status=isCurrentOrFuture_(rec.yyyy, rec.mm)?'active':'inactive'; var row=[rec.yyyy, rec.mm, rec.url, status, '', '', now, '', '', '', '']; if(idx[k]) sh.getRange(idx[k],1,1,ARCHIVES_HEADERS.length).setValues([row]); else sh.appendRow(row); }
  return list;
}

function isCurrentOrFuture_(yyyy,mm){ var now=new Date(); var cy=now.getFullYear(), cm=now.getMonth()+1; var y=Number(yyyy), m=Number(mm); return (y>cy)||(y===cy&&m>=cm); }

function fetchMonth_(yyyy,mm){ var props=PropertiesService.getDocumentProperties(); var username=props.getProperty(PROP_KEYS.USERNAME); var etag=props.getProperty(PROP_KEYS.MONTH_ETAG_PREFIX+(yyyy+'-'+mm)); var res=httpGetJson_(APIS.archiveMonth(username,yyyy,mm), etag); if(res.etag) props.setProperty(PROP_KEYS.MONTH_ETAG_PREFIX+(yyyy+'-'+mm), res.etag); return res; }

function backfillAllArchives(){
  var props=PropertiesService.getDocumentProperties();
  var ctl=SpreadsheetApp.openById(props.getProperty(PROP_KEYS.CONTROL_SPREADSHEET_ID));
  var arch=SpreadsheetApp.openById(props.getProperty(PROP_KEYS.ARCHIVES_SPREADSHEET_ID));
  var act=SpreadsheetApp.openById(props.getProperty(PROP_KEYS.ACTIVE_SPREADSHEET_ID));
  var shLedger=getOrCreateSheet_(ctl, SHEET_NAMES.ArchivesList); ensureHeaders_(shLedger, ARCHIVES_HEADERS);
  var shArchive=getOrCreateSheet_(arch, SHEET_NAMES.ArchiveGames); ensureHeaders_(shArchive, GAME_HEADERS);
  var shActive=getOrCreateSheet_(act, SHEET_NAMES.ActiveGames); ensureHeaders_(shActive, GAME_HEADERS);

  var headers=ARCHIVES_HEADERS; var last=shLedger.getLastRow(); if(last<2) return 0; var rows=shLedger.getRange(2,1,last-1,headers.length).getValues();
  var yI=0,mI=1,statusI=3,apiCountI=7,sheetCountI=8,lastUrlApiI=9,lastUrlSeenI=10;

  function buildUrlIdx_(sheet){ var lr=sheet.getLastRow(); if(lr<2) return {}; var urls=sheet.getRange(2,1,lr-1,1).getValues(); var idx={}; for(var i=0;i<urls.length;i++){ var u=urls[i][0]; if(u) idx[u]=true; } return idx; }
  var idxArchive=buildUrlIdx_(shArchive); var idxActive=buildUrlIdx_(shActive);

  var total=0; for(var r=0;r<rows.length;r++){ var yyyy=String(rows[r][yI]), mm=String(rows[r][mI]); var status=String(rows[r][statusI]||'inactive'); var res=fetchMonth_(yyyy,mm); var apiGames=0, lastUrl=''; if(res.status!==304 && res.status>=200 && res.status<300 && res.json && res.json.games){ var games=res.json.games||[]; apiGames=games.length; lastUrl=apiGames?games[apiGames-1].url:''; var out=transformAll_(games); var dest=(status==='active')?shActive:shArchive; var idx=(status==='active')?idxActive:idxArchive; var append=[]; for(var i=0;i<out.length;i++){ var u=out[i][0]; if(!u||idx[u]) continue; append.push(out[i]); idx[u]=true; } if(append.length){ writeRowsAppend_(dest, GAME_HEADERS, append); total+=append.length; } }
    rows[r][apiCountI]=apiGames; rows[r][sheetCountI]=(status==='active'?Math.max(0, shActive.getLastRow()-1):Math.max(0, shArchive.getLastRow()-1)); rows[r][lastUrlApiI]=lastUrl; rows[r][lastUrlSeenI]=lastUrl; }
  shLedger.getRange(2,1,rows.length,headers.length).setValues(rows);
  return total;
}

