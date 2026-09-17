// Validacao atual sem substituir os relatórios historicos das prioridades 1-3.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const result={date:new Date().toISOString(),build:require('../scripts/verify-project.cjs').inspect(root,true),tvValidated:false,packageGenerated:false};
// Preserva evidencias de empacotamento/TV apenas quando pertencem ao mesmo build.
const reportFile=path.join(__dirname,'validacao-biblioteca.json');
if(fs.existsSync(reportFile)){
 const previous=JSON.parse(fs.readFileSync(reportFile,'utf8'));
 if(previous.build&&previous.build.id===result.build.id){
  for(const field of ['tvChecks','visual'])if(previous[field])result[field]=previous[field];
  if(previous.package&&fs.existsSync(previous.package.package)){
   const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(previous.package.package)).digest('hex');
   if(hash===previous.package.sha256.toLowerCase()){result.packageGenerated=true;result.package=previous.package;}
  }
 }
}
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>path.join(root,'tests',f));
const run=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd:root,encoding:'utf8',timeout:120000});
fs.writeFileSync(path.join(__dirname,'testes-biblioteca.tap'),run.stdout||'');
result.tests={exitCode:run.status,total:Number((/^# tests (\d+)/m.exec(run.stdout||'')||[])[1])||0,passed:Number((/^# pass (\d+)/m.exec(run.stdout||'')||[])[1])||0,failed:Number((/^# fail (\d+)/m.exec(run.stdout||'')||[])[1])||0};
if(run.error)result.tests.error=run.error.message;
fs.writeFileSync(path.join(__dirname,'validacao-biblioteca.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(run.status!==0)process.exitCode=1;
