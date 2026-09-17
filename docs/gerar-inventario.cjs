// Inventário reproduzível: somente leitura do app/referências; grava em docs/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e =>
    ['.git','node_modules'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
function sha(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
function symbols(text, ext) {
  if (!['.js','.cjs','.py','.cs','.ps1'].includes(ext)) return [];
  const out=[];
  text.split(/\r?\n/).forEach((l,i)=>{
    let m;
    const patterns = [/^\s*(?:async\s+)?function\s*\*?\s*(\w+)\s*\(/, /^\s*(?:class|def|async def)\s+(\w+)/,
      /^\s*(\w+(?:\.prototype)?\.\w+)\s*=\s*(?:async\s+)?function/,
      /^\s*(?:async\s+)?(\w+)\s*\([^;]*\)\s*\{\s*$/,
      /^\s*(?:public|private|protected|internal)\s+(?:static\s+)?(?:partial\s+)?(?:class|enum)\s+(\w+)/,
      /^function\s+(\w+)/];
    for (const re of patterns) if ((m=re.exec(l)) && !['if','for','while','switch','catch','with'].includes(m[1])) {
      out.push({name:m[1],line:i+1}); break;
    }
  }); return out;
}
const groups=[['app-local',root],...['nodecast-tv','hypnotix','SFVIP-Player'].map(n=>[n,path.join(__dirname,'referencias',n)])];
const all={};
for (const [name,dir] of groups) {
  const files=walk(dir).filter(f=>name!=='app-local'||!path.relative(root,f).startsWith('docs'+path.sep));
  all[name]=files.map(f=>{
    const b=fs.readFileSync(f), rel=path.relative(dir,f).replaceAll('\\','/'), ext=path.extname(f);
    const binary=b.includes(0)||['.png','.jpg','.ipk','.ico','.gif','.ttf'].includes(ext);
    const t=binary?'':b.toString('utf8');
    return {path:rel,bytes:b.length,sha256:sha(b),lines:binary?null:t.split(/\r?\n/).length,binary,symbols:symbols(t,ext)};
  });
  let md=`# Inventário: ${name}\n\nTodos os arquivos presentes, exceto metadados internos de Git. SHA-256 calculado sobre o conteúdo original. Símbolos extraídos por heurística, não por um compilador. Binários são identificados, não tratados como código-fonte.\n\nTotal: ${all[name].length} arquivos.\n\n`;
  for (const f of all[name]) {
    md+=`## ${f.path}\n\n- Tamanho: ${f.bytes} bytes; linhas: ${f.lines??'binário'}.\n- SHA-256: \`${f.sha256}\`.\n`;
    if(f.symbols.length) md+=`- Funções/classes identificadas: ${f.symbols.map(s=>`\`${s.name}\` (L${s.line})`).join('; ')}.\n`;
    if(f.path.endsWith('.po')) {
      const t=fs.readFileSync(path.join(dir,f.path),'utf8');
      md+=`- Catálogo de tradução gettext; ${[...t.matchAll(/^msgid /gm)].length} entradas, ${[...t.matchAll(/^#,.*fuzzy/gm)].length} marcações fuzzy. Não contém lógica de reprodução.\n`;
    }
    md+='\n';
  }
  fs.writeFileSync(path.join(__dirname,`inventario-${name}.md`),md);
}
fs.writeFileSync(path.join(__dirname,'inventario.json'),JSON.stringify(all,null,2));
const diffs=[];
for(const f of all['app-local'].filter(f=>f.path.startsWith('_backup/'))) {
  const current=f.path.split('/').slice(2).join('/');
  const dest=path.join(root,current);
  if(!fs.existsSync(dest)) { diffs.push({backup:f.path,current,missing:true});continue; }
  const a=fs.readFileSync(path.join(root,f.path),'utf8'),b=fs.readFileSync(dest,'utf8');
  const before=new Set(symbols(a,path.extname(current)).map(s=>s.name));
  const after=new Set(symbols(b,path.extname(current)).map(s=>s.name));
  const diff=cp.spawnSync('git',['diff','--no-index','--numstat','--',path.join(root,f.path),dest],{encoding:'utf8'});
  diffs.push({backup:f.path,current,identical:a===b,delta:diff.stdout.trim().split('\t').slice(0,2),addedSymbols:[...after].filter(n=>!before.has(n)),removedSymbols:[...before].filter(n=>!after.has(n))});
}
fs.writeFileSync(path.join(__dirname,'backups-comparados.json'),JSON.stringify(diffs,null,2));
let md='# Comparação de cada backup com o arquivo atual\n\nSão cópias parciais anteriores a alterações, não snapshots completos nem commits. Deltas em linhas: adições/remoções do backup para o arquivo atual.\n\n| Backup | Arquivo atual | Igual | + / − | Símbolos novos desde essa cópia |\n|---|---|---|---|---|\n';
for(const d of diffs) md+=`| ${d.backup} | ${d.current} | ${d.identical?'sim':'não'} | ${(d.delta||[]).join(' / ')} | ${(d.addedSymbols||[]).join(', ')} |\n`;
fs.writeFileSync(path.join(__dirname,'backups-comparados.md'),md);
console.log(JSON.stringify(Object.fromEntries(Object.entries(all).map(([k,v])=>[k,{files:v.length,bytes:v.reduce((n,x)=>n+x.bytes,0),lines:v.reduce((n,x)=>n+(x.lines||0),0)}])),null,2));
