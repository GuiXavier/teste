// Executa apenas testes isolados; nao inicia o servidor/provedor/TV.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f);
const run=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd:root,encoding:'utf8'});
fs.writeFileSync(path.join(__dirname,'testes-prioridade1.tap'),run.stdout||'');
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'inventario.json'),'utf8'))['app-local'];
const changes=inventory.flatMap(f=>{const bytes=fs.readFileSync(path.join(root,f.path));const sha=crypto.createHash('sha256').update(bytes).digest('hex');return sha===f.sha256?[]:[{path:f.path,before:f.sha256,after:sha}]});
const report={node:process.version,exitCode:run.status,tests:Number((run.stdout.match(/^# tests (\d+)/m)||[])[1]),passed:Number((run.stdout.match(/^# pass (\d+)/m)||[])[1]),failed:Number((run.stdout.match(/^# fail (\d+)/m)||[])[1]),testFiles:tests,changedOriginalFiles:changes};
fs.writeFileSync(path.join(__dirname,'validacao-prioridade1.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({exitCode:report.exitCode,tests:report.tests,passed:report.passed,failed:report.failed,changedOriginalFiles:changes.map(x=>x.path)},null,2));
if(run.status!==0){console.error(run.stdout,run.stderr);process.exitCode=1;}
