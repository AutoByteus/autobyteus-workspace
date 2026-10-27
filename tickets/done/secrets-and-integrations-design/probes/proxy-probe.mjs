// Probe V1: a local credential proxy. The "agent shell" holds no token; the proxy adds it outward,
// enforces a per-run capability and a method/path allow-list, redacts echoed secrets, and audits.
// Dummy values only; the "service" is a local test server standing in for an HTTPS API.
import http from 'node:http';
import { appendFileSync, writeFileSync } from 'node:fs';
const TOKEN = 'dummy-gh-token-ABC123';           // lives only in the proxy process (in real life: from the vault)
const CAP = 'cap-run-42';                          // per-run capability: lets a run USE the integration, is not the secret
const AUDIT = process.argv[2];
writeFileSync(AUDIT, '');
const seenByService = [];
const service = http.createServer((req, res) => {
  seenByService.push({ method: req.method, url: req.url, auth: req.headers.authorization ?? null });
  if (req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401).end('no auth'); return; }
  if (req.url === '/user') { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ login: 'octo', echoed_token: TOKEN })); return; }
  res.writeHead(200).end('ok');
});
const allow = [ { method: 'GET', path: /^\/user$/ }, { method: 'GET', path: /\/info\/refs$/ }, { method: 'POST', path: /\/git-upload-pack$/ } ];
let serviceUrl;
const proxy = http.createServer((req, res) => {
  const m = req.url.match(/^\/i\/([^/]+)\/github(\/.*)$/);
  const audit = (decision) => appendFileSync(AUDIT, JSON.stringify({ run: m?.[1] === CAP ? 'run-42' : null, method: req.method, path: m?.[2] ?? req.url, decision }) + '\n');
  if (!m || m[1] !== CAP) { audit('denied: capability'); res.writeHead(403).end('capability required'); return; }
  const [pathOnly] = m[2].split('?');
  if (!allow.some(r => r.method === req.method && r.path.test(pathOnly))) { audit('denied: not allowed'); res.writeHead(403).end('not allowed for this integration'); return; }
  const headers = { ...req.headers }; delete headers.authorization; delete headers.host;   // the agent cannot inject or override auth
  const up = http.request(serviceUrl + m[2], { method: req.method, headers: { ...headers, authorization: `Bearer ${TOKEN}` } }, (upRes) => {
    let body = ''; upRes.on('data', c => body += c); upRes.on('end', () => {
      audit(`forwarded ${upRes.statusCode}`);
      res.writeHead(upRes.statusCode, { 'content-type': upRes.headers['content-type'] ?? 'text/plain' }).end(body.split(TOKEN).join('[REDACTED]'));
    });
  });
  req.pipe(up);
});
await new Promise(r => service.listen(0, '127.0.0.1', r)); serviceUrl = `http://127.0.0.1:${service.address().port}`;
await new Promise(r => proxy.listen(0, '127.0.0.1', r));
console.log(`PROXY=http://127.0.0.1:${proxy.address().port}/i/${CAP}/github`);
console.log(`BADCAP=http://127.0.0.1:${proxy.address().port}/i/cap-other-run/github`);
process.on('SIGTERM', () => { writeFileSync(AUDIT + '.service.json', JSON.stringify(seenByService, null, 1)); process.exit(0); });
