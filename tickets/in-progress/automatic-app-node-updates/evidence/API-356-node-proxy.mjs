// TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
// A transparent logging HTTP proxy in front of a test-owned Docker node: the desktop registers the node at the
// proxy's address, so every C1 request it makes is recorded with its user agent ("node" = the desktop main
// process's fetch; "Mozilla" = the window) and the node's answer. A dead upstream (a stopped node) is answered 502.
// Each request is one JSON line {at, method, path, ua, status, body?, answer?} in <log>.
// Usage: node API-356-node-proxy.mjs <listen port> <upstream port> <log.jsonl>
import http from 'node:http';
import fs from 'node:fs';

const [listen, upstream, logFile] = process.argv.slice(2);
const log = (entry) => fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
const c1 = (p) => p.startsWith('/rest/node-update');
http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const up = http.request({ host: '127.0.0.1', port: Number(upstream), method: req.method, path: req.url, headers: req.headers, timeout: 30_000 }, (r) => {
      const out = [];
      r.on('data', (c) => out.push(c));
      r.on('end', () => {
        const answer = Buffer.concat(out);
        res.writeHead(r.statusCode ?? 502, r.headers); res.end(answer);
        log({ method: req.method, path: req.url, ua: String(req.headers['user-agent'] ?? '').slice(0, 30), status: r.statusCode,
          ...(c1(req.url) && body.length ? { body: body.toString('utf8').slice(0, 300) } : {}),
          ...(c1(req.url) ? { answer: answer.toString('utf8').slice(0, 600) } : {}) });
      });
    });
    up.on('error', (e) => { if (!res.headersSent) { res.writeHead(502); res.end(); } log({ method: req.method, path: req.url, ua: String(req.headers['user-agent'] ?? '').slice(0, 30), status: 502, error: e.code ?? String(e) }); });
    up.on('timeout', () => up.destroy(new Error('upstream timeout')));
    up.end(body);
  });
}).listen(Number(listen), '127.0.0.1', () => log({ event: 'listening', listen: Number(listen), upstream: Number(upstream) }));
