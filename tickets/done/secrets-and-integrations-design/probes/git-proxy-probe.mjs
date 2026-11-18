// Probe V1b: a real `git clone` over smart HTTP through the credential proxy. The git service is git's own
// http-backend (CGI) and requires the token; the agent's git has no token, only the proxy URL with its capability.
import http from 'node:http'; import { spawn } from 'node:child_process';
const TOKEN = 'dummy-git-token-XYZ'; const CAP = 'cap-run-7'; const ROOT = process.argv[2]; const seen = [];
const service = http.createServer((req, res) => {
  seen.push(`${req.method} ${req.url.split('?')[0]} auth=${req.headers.authorization === 'Bearer ' + TOKEN ? 'valid' : 'missing'}`);
  if (req.headers.authorization !== 'Bearer ' + TOKEN) { res.writeHead(401, { 'www-authenticate': 'Basic' }).end(); return; }
  const [p, q = ''] = req.url.split('?');
  const cgi = spawn('git', ['http-backend'], { env: { PATH: process.env.PATH, GIT_PROJECT_ROOT: ROOT, GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: p, QUERY_STRING: q, REQUEST_METHOD: req.method, CONTENT_TYPE: req.headers['content-type'] ?? '' } });
  req.pipe(cgi.stdin); let out = Buffer.alloc(0); cgi.stdout.on('data', d => out = Buffer.concat([out, d]));
  cgi.on('close', () => { const i = out.indexOf('\r\n\r\n'); const head = out.subarray(0, i).toString(); const body = out.subarray(i + 4);
    const h = {}; let status = 200; for (const line of head.split('\r\n')) { const [k, ...v] = line.split(':'); if (k.toLowerCase() === 'status') status = parseInt(v.join(':')); else h[k] = v.join(':').trim(); }
    res.writeHead(status, h).end(body); });
});
let svc;
const proxy = http.createServer((req, res) => {
  const m = req.url.match(/^\/i\/([^/]+)\/github(\/.*)$/);
  if (!m || m[1] !== CAP) { res.writeHead(403).end('capability required'); return; }
  const headers = { ...req.headers }; delete headers.authorization; delete headers.host;
  const up = http.request(svc + m[2], { method: req.method, headers: { ...headers, authorization: 'Bearer ' + TOKEN } }, (u) => { res.writeHead(u.statusCode, u.headers); u.pipe(res); });
  req.pipe(up);
});
await new Promise(r => service.listen(0, '127.0.0.1', r)); svc = `http://127.0.0.1:${service.address().port}`;
await new Promise(r => proxy.listen(0, '127.0.0.1', r));
console.log(`PROXY=http://127.0.0.1:${proxy.address().port}/i/${CAP}/github`); console.log(`DIRECT=${svc}`);
process.on('SIGTERM', () => { console.error('SERVICE SAW:\n' + seen.join('\n')); process.exit(0); });
