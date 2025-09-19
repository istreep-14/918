/** Pure transform pipeline for Option B */

var Transform = {
  parseTimeControl: function(tc){ if(!tc) return {base:null,inc:null,corr:null}; if(tc.indexOf('/')>=0){ var parts=tc.split('/'); return {base:null,inc:null,corr:Number(parts[1])}; } var inc=0, base=tc; if(tc.indexOf('+')>=0){ var p=tc.split('+'); base=p[0]; inc=Number(p[1]); } return { base:Number(base), inc:Number(inc), corr:null }; },
  deriveType: function(timeClass){ return timeClass==='daily'?'daily':'live'; },
  deriveFormat: function(rules,timeClass,type){ var fn=VARIANT_FORMATS[rules]; return fn?fn(timeClass,type):timeClass; },
  deriveOutcome: function(code){ return RESULT_CODE_TO_OUTCOME[code]||''; },
  score: function(o){ if(o==='win') return 1; if(o==='draw') return 0.5; return 0; },
  urlInfo: function(url){ if(!url) return {type:'',id:''}; var m=url.match(/\/game\/(live|daily)\/(\d+)/); return m?{type:m[1],id:m[2]}:{type:'',id:''}; },
  identity: function(g,my){ var w=g.white||{}, b=g.black||{}; var mw=(w.username&&my&&w.username.toLowerCase()===my.toLowerCase()); var p=mw?w:b, o=mw?b:w; var pc=mw?'white':'black', oc=mw?'black':'white'; return { p:{u:p.username||'', c:pc, r:(p.rating!=null?Number(p.rating):null), res:p.result||''}, o:{u:o.username||'', c:oc, r:(o.rating!=null?Number(o.rating):null), res:o.result||''} }; },
  rc: function(prior, current){ if(prior==null||isNaN(prior)) return { last:null, change:null }; return { last:prior, change:(current!=null?(current-prior):null) }; }
};

function transformAll_(games){
  var props=PropertiesService.getDocumentProperties(); var my=props.getProperty(PROP_KEYS.USERNAME)||''; var priorByFmt={};
  games.sort(function(a,b){ var ae=Number(a.end_time||0),be=Number(b.end_time||0); if(ae!==be) return ae-be; var as=Number(a.start_time||0), bs=Number(b.start_time||0); return as-bs; });
  var rows=new Array(games.length);
  for(var i=0;i<games.length;i++){
    var g=games[i]; var info=Transform.urlInfo(g.url); var type=info.type||Transform.deriveType(g.time_class); var id=info.id||''; var tc=Transform.parseTimeControl(g.time_control);
    var start=g.start_time?toLocalIsoFromUnix_(g.start_time):''; var end=g.end_time?toLocalIsoFromUnix_(g.end_time):''; var dur=(g.start_time&&g.end_time)?Math.max(0,Number(g.end_time)-Number(g.start_time)):'';
    var rules=g.rules||'chess'; var timeClass=g.time_class||''; var fmt=Transform.deriveFormat(rules,timeClass,type); if(!(fmt in priorByFmt)) priorByFmt[fmt]=null;
    var idt=Transform.identity(g,my); var outcome=Transform.deriveOutcome(idt.p.res); var ps=Transform.score(outcome); var endReason=(function(){ var pr=idt.p.res||'', or=idt.o.res||''; if(pr==='win') return or||''; if(or==='win') return pr||''; if(pr&&or&&pr===or) return pr; return pr||or||''; })();
    var rc=Transform.rc(priorByFmt[fmt], idt.p.r); if(idt.p.r!=null && !isNaN(idt.p.r)) priorByFmt[fmt]=Number(idt.p.r);
    rows[i]=[
      g.url, type, id,
      g.time_control||'', tc.base, tc.inc, tc.corr,
      start, end, dur,
      Boolean(g.rated), timeClass, rules, fmt,
      idt.p.u, idt.p.c, idt.p.r, rc.last, rc.change, outcome, ps,
      idt.o.u, idt.o.c, idt.o.r, (rc.last!=null && idt.o.r!=null ? (idt.o.r - (idt.p.r!=null && rc.last!=null ? (idt.p.r - rc.last) : 0)) : null), (rc.change!=null ? -rc.change : null), Transform.deriveOutcome(idt.o.res), Transform.score(Transform.deriveOutcome(idt.o.res)),
      endReason, false
    ];
  }
  return rows;
}

