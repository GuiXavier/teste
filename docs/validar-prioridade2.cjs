// Testes isolados: nao inicia backend real, provedor ou TV.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f);
const run=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd:root,encoding:'utf8'});
fs.writeFileSync(path.join(__dirname,'testes-prioridade2.tap'),run.stdout||'');
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'inventario.json'),'utf8'))['app-local'];
const p1=JSON.parse(fs.readFileSync(path.join(__dirname,'validacao-prioridade1.json'),'utf8'));
const base=new Map(p1.changedOriginalFiles.map(f=>[f.path,f.after]));
const changes=inventory.flatMap(f=>{
 const sha=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.path))).digest('hex');
 const previous=base.get(f.path)||f.sha256;
 return sha===previous?[]:[{path:f.path,before:previous,after:sha}];
});
const added=['server/lib/mediaFile.js','services/lib/mediaFile.js','tests/playback-autonomy.test.cjs'].map(f=>({path:f,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')}));
const report={generatedAt:new Date().toISOString(),node:process.version,appVersion:'0.1.2',build:'0912-p2',exitCode:run.status,
 tests:Number((run.stdout.match(/^# tests (\d+)/m)||[])[1]),passed:Number((run.stdout.match(/^# pass (\d+)/m)||[])[1]),failed:Number((run.stdout.match(/^# fail (\d+)/m)||[])[1]),
 validation:'Fixtures e transportes simulados; sem execucao no aparelho ou provedor real',testFiles:tests,changedSincePriority1:changes,addedCodeFiles:added};
fs.writeFileSync(path.join(__dirname,'validacao-prioridade2.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({exitCode:report.exitCode,tests:report.tests,passed:report.passed,failed:report.failed,changedSincePriority1:changes.map(f=>f.path)},null,2));
if(run.status!==0){console.error(run.stdout,run.stderr);process.exitCode=1;}
