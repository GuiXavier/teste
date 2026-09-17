// Previa visual da interface: fixtures no IndexedDB real, sem provedor,
// sem PC e sem TV. Nao entra no IPK.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { expose } = require('./expose.cjs');
const root = path.resolve(__dirname, '../app');
const TIPOS = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };

http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/poster') {
    // posters http de verdade: data: URI nao passa pelo Catalog.logoURL
    const q = new URL(req.url, 'http://localhost').searchParams;
    const cor = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#0ea5e9', '#a855f7', '#ec4899'][Number(q.get('i') || 0) % 7];
    const texto = String(q.get('t') || '').slice(0, 18);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360">` +
      `<rect width="240" height="360" fill="${cor}"/>` +
      `<rect y="250" width="240" height="110" fill="rgba(0,0,0,.45)"/>` +
      `<text x="120" y="305" font-family="Arial" font-size="20" fill="#fff" text-anchor="middle">${texto}</text></svg>`);
  }
  if (pathname === '/fixture.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(fs.readFileSync(path.join(__dirname, 'preview-fixture.js')));
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, body) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', TIPOS[path.extname(file)] || 'application/octet-stream');
    if (pathname === '/' || pathname === '/index.html') {
      body = body.toString().replace('<script src="js/app.js">', '<script src="/fixture.js"></script><script src="js/app.js">');
    }
    // o app empacotado nao expoe nada; a previa injeta os ganchos na leitura
    if (pathname === '/js/app.js') { body = expose(body.toString()); }
    res.end(body);
  });
}).listen(8875, '127.0.0.1', () => console.log('Previa da interface: http://127.0.0.1:8875'));
