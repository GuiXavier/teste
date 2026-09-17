const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'inventario.json'), 'utf8'));
const changed = [];
for (const file of inventory['app-local']) {
  const location = path.join(root, file.path);
  if (!fs.existsSync(location) || crypto.createHash('sha256').update(fs.readFileSync(location)).digest('hex') !== file.sha256) changed.push(file.path);
}
const broken = [];
const markdown = fs.readdirSync(__dirname).filter(x => x.endsWith('.md'));
for (const file of markdown) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#)/.test(target)) continue;
    if (!fs.existsSync(path.resolve(__dirname, target.split('#')[0]))) broken.push({file, target});
  }
}
const report = {originalFilesChecked: inventory['app-local'].length, changedOriginalFiles: changed, markdownFilesChecked: markdown.length, brokenLocalLinks: broken};
fs.writeFileSync(path.join(__dirname, 'validacao-documentacao.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
// Hashes sao a linha de base historica; mudancas autorizadas sao informativas.
if (broken.length) process.exitCode = 1;
