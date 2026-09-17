// Usa apenas testes isolados. Nao inicia servidor real ou conexao com provedor/TV.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const verified=require('../scripts/verify-project.cjs').inspect(root,false);
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f);
const run=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd:root,encoding:'utf8'});
fs.writeFileSync(path.join(__dirname,'testes-prioridade3.tap'),run.stdout||'');
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'inventario.json'),'utf8'))['app-local'];
const p1=JSON.parse(fs.readFileSync(path.join(__dirname,'validacao-prioridade1.json'),'utf8'));
const p2=JSON.parse(fs.readFileSync(path.join(__dirname,'validacao-prioridade2.json'),'utf8'));
const previous=new Map(inventory.map(f=>[f.path,f.sha256]));
p1.changedOriginalFiles.forEach(f=>previous.set(f.path,f.after));p2.changedSincePriority1.forEach(f=>previous.set(f.path,f.after));p2.addedCodeFiles.forEach(f=>previous.set(f.path,f.sha256));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const changes=[...previous].flatMap(([file,before])=>{const after=hash(file);return before===after?[]:[{path:file,before,after}]});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'build-manifest.json'),'utf8'));
const report={generatedAt:new Date().toISOString(),node:process.version,appVersion:manifest.appVersion,build:verified.id,
 exitCode:run.status,tests:Number((run.stdout.match(/^# tests (\d+)/m)||[])[1]),passed:Number((run.stdout.match(/^# pass (\d+)/m)||[])[1]),failed:Number((run.stdout.match(/^# fail (\d+)/m)||[])[1]),
 staticFiles:verified.files,testFiles:tests,changedSincePriority2:changes,newRuntimeFiles:manifest.files.filter(f=>!previous.has(f.path)),
 evidence:{tests:'Fixtures, IndexedDB e transportes simulados; scripts PowerShell executados em modo de verificacao/teste',ui:'Previa local 1920x1080: cadastro vazio e navegacao de rascunho conferidos no navegador',tv:false,providerAccess:false,packageGenerated:false}};
fs.writeFileSync(path.join(__dirname,'validacao-prioridade3.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({build:report.build,exitCode:report.exitCode,tests:report.tests,passed:report.passed,failed:report.failed,staticFiles:report.staticFiles},null,2));
if(run.status!==0){console.error(run.stdout,run.stderr);process.exitCode=1;}
