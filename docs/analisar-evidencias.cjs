const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lines=read('server/logs/app-2026-09-11.jsonl').split(/\r?\n/).filter(Boolean);
let invalid=0; const events=lines.flatMap(l=>{try{return [JSON.parse(l)]}catch{invalid++;return []}});
const count=(xs,key)=>xs.reduce((o,x)=>{const k=key(x);o[k]=(o[k]||0)+1;return o},{});
const pb=events.filter(e=>e.tag==='playback').map(e=>e.data||{});
const median=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null};
const summary={lines:lines.length,invalid,first:events[0]?.ts,last:events.at(-1)?.ts,sessions:new Set(events.map(e=>e.session)).size,
 levels:count(events,e=>e.level),tags:count(events,e=>e.tag),builds:events.filter(e=>e.tag==='boot'&&e.msg==='build').map(e=>({ts:e.ts,...e.data})),
 playback:{records:pb.length,withFirstFrame:pb.filter(p=>p.tFirstFrame!=null).length,withError:pb.filter(p=>p.error).length,engines:count(pb,p=>p.engine||'?'),firstFrameMedian:median(pb.map(p=>p.tFirstFrame)),stalls:pb.reduce((n,p)=>n+(p.stalls||0),0)},
 sync:events.filter(e=>e.tag==='sync.concluida'||e.tag==='sync.fundo').map(e=>({ts:e.ts,...e.data})),
 service:events.filter(e=>e.tag==='jsservice.ping'||e.tag==='jsservice.fetch').map(e=>({ts:e.ts,...e.data})),
 lastEvents:events.slice(-15).map(e=>({ts:e.ts,tag:e.tag,level:e.level,msg:e.msg}))};
// Não exporta URLs, usuários, senhas, nomes de canais ou payloads arbitrários.
summary.sync=summary.sync.map(({ts,origem,live,podados,vodCats,seriesCats,ms,erros})=>({ts,origem,live,podados,vodCats,seriesCats,ms,warningCount:erros?.length}));
summary.lastEvents=summary.lastEvents.map(({ts,tag,level})=>({ts,tag,level}));
fs.writeFileSync(path.join(__dirname,'evidencias-logs.json'),JSON.stringify(summary,null,2));
const sourceData=JSON.parse(read('server/data/sources.json'));
const status=JSON.parse(read('server/data/status.json'));
const pl=require('../server/lib/playlist').parse(read('server/data/playlist.m3u'));
const data={sources:sourceData.map(s=>({type:s.type,active:s.active,hasUsername:!!s.username,hasPassword:!!s.password})),statusRecords:status.length,status:count(status,s=>s.status),m3u:{parsedChannels:pl.channels.length,categories:pl.categories.length,discarded:pl.descartados},csv:['channels','feeds'].map(n=>({file:'db-'+n+'.csv',lines:read('server/data/db-'+n+'.csv').split('\n').filter(Boolean).length,header:read('server/data/db-'+n+'.csv').split('\n')[0]})),duplicates:['sources','playlist'].map(n=>({name:n,identical:read('server/lib/'+n+'.js')===read('services/lib/'+n+'.js')}))};
fs.writeFileSync(path.join(__dirname,'evidencias-dados.json'),JSON.stringify(data,null,2));
const inventory=JSON.parse(read('docs/inventario.json'))['app-local'];
const syntax=inventory.filter(f=>f.path.endsWith('.js')).map(f=>{const r=cp.spawnSync(process.execPath,['--check',path.join(root,f.path)],{encoding:'utf8'});return {file:f.path,ok:r.status===0,error:r.status===0?null:r.stderr};});
fs.writeFileSync(path.join(__dirname,'verificacao-sintaxe.json'),JSON.stringify({runtime:process.version,checks:syntax},null,2));
console.log(JSON.stringify({logs:summary,data,syntax:{total:syntax.length,failed:syntax.filter(s=>!s.ok)}},null,2));
