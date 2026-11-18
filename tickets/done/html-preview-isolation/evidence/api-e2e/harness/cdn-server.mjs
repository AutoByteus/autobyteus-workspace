// api417: stand-in "other site" (CDN) on its own origin.
import http from 'node:http';
const port = Number(process.argv[2]);
http.createServer((req, res) => {
  console.log(new Date().toISOString(), req.method, req.url, 'origin=' + (req.headers.origin ?? '(none)'));
  if (req.url.startsWith('/cdn/lib.js')) { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end('window.CDN_LOADED = true;\n'); return; }
  res.writeHead(404); res.end();
}).listen(port, '127.0.0.1', () => console.log('cdn listening', port));
