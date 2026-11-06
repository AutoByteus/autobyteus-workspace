// autobyteus-407 API/E2E: access-logging reverse proxy in front of the test node (the node keeps no access log).
// The emulator reaches the node only through it, so stopping it makes the node unreachable for the phone (CR-001).
// Every HTTP request and WebSocket upgrade is forwarded unchanged and logged (method, path without query, kind).
// Usage: node access-proxy.mjs <listen port> <node host> <node port> <log.jsonl>
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
const [listenPort, nodeHost, nodePort, logPath] = process.argv.slice(2);
const log = fs.createWriteStream(logPath, { flags: 'a' });
const record = (kind, req) => log.write(JSON.stringify({ t: new Date().toISOString(), kind, method: req.method, path: req.url.split('?')[0] }) + '\n');
// Fault switch for CR-001: while /private/tmp/abx407-api/fail-node-desktop exists, GET /rest/node-desktop gets a 502
// (as if that one request lost its connection to the node); everything else is forwarded.
const failNodeDesktop = () => fs.existsSync('/private/tmp/abx407-api/fail-node-desktop');
const server = http.createServer((req, res) => {
  record('http', req);
  if (req.url.split('?')[0] === '/rest/node-desktop' && failNodeDesktop()) {
    log.write(JSON.stringify({ t: new Date().toISOString(), kind: 'injected-502', path: '/rest/node-desktop' }) + '\n');
    res.writeHead(502); res.end(); return;
  }
  const up = http.request({ host: nodeHost, port: Number(nodePort), method: req.method, path: req.url, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode, r.headers); r.pipe(res);
  });
  up.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(up);
});
server.on('upgrade', (req, socket, head) => {
  record('upgrade', req);
  const up = net.connect(Number(nodePort), nodeHost, () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
    if (head?.length) up.write(head);
    up.pipe(socket); socket.pipe(up);
  });
  up.on('error', () => socket.destroy()); socket.on('error', () => up.destroy());
});
server.listen(Number(listenPort), '127.0.0.1', () => console.log(`access proxy 127.0.0.1:${listenPort} -> ${nodeHost}:${nodePort}`));
