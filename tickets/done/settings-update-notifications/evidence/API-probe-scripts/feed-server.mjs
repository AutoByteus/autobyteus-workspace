// Ticket-owned generic electron-updater feed (loopback). Usage: node feed-server.mjs <dir> <portFile> <logFile>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [dir, portFile, logFile] = process.argv.slice(2);
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1));
  const file = path.join(dir, path.basename(name));
  const exists = name && fs.existsSync(file) && fs.statSync(file).isFile();
  fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), method: req.method, url: req.url, range: req.headers.range ?? null, ua: req.headers['user-agent'] ?? null, status: exists ? 200 : 404 }) + '\n');
  if (!exists) { res.writeHead(404); res.end(); return; }
  const size = fs.statSync(file).size;
  res.writeHead(200, { 'content-length': size, 'content-type': name.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream' });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
});
server.listen(0, '127.0.0.1', () => { fs.writeFileSync(portFile, String(server.address().port)); });
