// Verificacao estatica e identidade por conteudo; nao certifica execucao na TV.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])}
function inspect(base=root,write=false){
 const acorn=require(path.join(base,'tests/node_modules/acorn'));
 const read=f=>fs.readFileSync(path.join(base,f),'utf8');
 const all=['app','services','server/lib','scripts'].flatMap(d=>files(path.join(base,d))).concat(['server/server.js','server/package.json','build.ps1','auditar.ps1','corrigir.ps1'].map(f=>path.join(base,f)));
 const inputs=all.map(f=>path.relative(base,f).replaceAll('\\','/')).filter(f=>f!=='app/js/build-info.js').sort();
 const psFiles=inputs.filter(f=>f.endsWith('.ps1')).map(f=>"'"+path.join(base,f).replaceAll("'","''")+"'").join(',');
 const psCommand=`$problems=@(); foreach($file in @(${psFiles})) { $tokens=$null; $parseErrors=$null; [System.Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$parseErrors) | Out-Null; $problems += $parseErrors }; if($problems.Count) { $problems | ForEach-Object { Write-Output $_.Message }; exit 1 }`;
 const ps=cp.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(psCommand,'utf16le').toString('base64')],{encoding:'utf8'});
 if(ps.status!==0)throw Error('Falha na verificacao sintatica PowerShell: '+(ps.error?ps.error.message:ps.stdout));
 for(const file of inputs){
  if(file.endsWith('.js')||file.endsWith('.cjs')){
   const source=read(file);
   if(file.startsWith('app/'))acorn.parse(source,{ecmaVersion:file==='app/hls.min.js'?2019:5});
   else if(file.startsWith('services/'))acorn.parse(source,{ecmaVersion:2017});
   else new vm.Script(source,{filename:file});
   if(file.startsWith('app/')||file.startsWith('services/')){
    const tree=acorn.parse(source,{ecmaVersion:2020});
    function walk(node){if(!node||typeof node!=='object')return;
     if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&['replaceAll','hasOwn','at','structuredClone','any'].includes(node.callee.property.name))throw Error(file+': API exige revisao de compatibilidade: '+node.callee.property.name);
     if(node.type==='CallExpression'&&node.callee.name==='require'&&node.arguments[0]&&typeof node.arguments[0].value==='string'&&node.arguments[0].value.startsWith('.')){
      const dep=path.resolve(path.dirname(path.join(base,file)),node.arguments[0].value);
      if(![dep,dep+'.js',dep+'.json'].some(f=>fs.existsSync(f)&&fs.statSync(f).isFile()))throw Error(file+': dependencia ausente');
     }
     for(const key in node){const v=node[key];if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
    }walk(tree);
   }
  }
  if(file.endsWith('.json'))JSON.parse(read(file));
 }
 const html=read('app/index.html');
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(/^https?:/.test(m[1]))throw Error('Dependencia remota nao empacotada: '+m[1]);
  if(m[1]==='js/build-info.js'&&write)continue;
  if(!fs.existsSync(path.join(base,'app',m[1])))throw Error('Referencia ausente: '+m[1]);
 }
 for(const f of inputs.filter(f=>f.startsWith('app/js/')&&f.endsWith('.js'))){if(!html.includes('src="'+f.slice(4)+'"'))throw Error('Script proprio nao incluido: '+f);}
 const app=JSON.parse(read('app/appinfo.json')),service=JSON.parse(read('services/package.json'));
 if(app.version!==service.version)throw Error('Versoes de app e servico divergem');
 if(!fs.existsSync(path.join(base,'services',service.main)))throw Error('Entrada do servico ausente');
 for(const f of ['sources.js','playlist.js','mediaFile.js'])if(read('server/lib/'+f)!==read('services/lib/'+f))throw Error('Copias divergentes: '+f);
 for(const f of inputs.filter(f=>f.endsWith('.css'))){const css=read(f).replace(/\/\*[\s\S]*?\*\//g,'');if(/(?:^|[;{])\s*(?:inset|aspect-ratio|content-visibility)\s*:|:is\(|:where\(/m.test(css))throw Error('CSS requer revisao para Chromium 79: '+f);}
 const entries=inputs.map(f=>({path:f,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(base,f))).digest('hex')}));
 const sha=crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex'),id=app.version+'-'+sha.slice(0,12);
 const manifest={version:1,appVersion:app.version,id,sha256:sha,files:entries};
 const stamp='/* Gerado por scripts/verify-project.cjs. */\nwindow.IPTV_BUILD = '+JSON.stringify({id,sha256:sha})+';\n';
 if(write){fs.writeFileSync(path.join(base,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(base,'app/js/build-info.js'),stamp);}
 else {const saved=JSON.parse(read('build-manifest.json'));if(JSON.stringify(saved)!==JSON.stringify(manifest)||read('app/js/build-info.js')!==stamp)throw Error('Conteudo mudou: gere novamente o manifesto de build');}
 return {id,files:inputs.length,status:'Verificacao estatica aprovada; execucao na TV nao verificada'};
}
exports.inspect=inspect;
if(require.main===module){try{console.log(JSON.stringify(inspect(root,process.argv.includes('--write')),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
