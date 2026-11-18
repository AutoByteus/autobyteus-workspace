// autobyteus-415 API/E2E: an access-logging reverse proxy in front of the test node, so the run can count the
// requests the node receives (the node itself keeps no access log). Every HTTP request and WebSocket upgrade is
// forwarded unchanged and logged as one JSON line (method, path without its query, kind).
// Usage: node access-proxy.mjs <listen port> <node host> <node port> <log.jsonl>
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
const [listenPort, nodeHost, nodePort, logPath] = process.argv.slice(2);
const log = fs.createWriteStream(logPath, { flags: 'a' });
const record = (kind, req) => log.write(JSON.stringify({ t: new Date().toISOString(), kind, method: req.method, path: req.url.split('?')[0] }) + '\n');
const server = http.createServer((req, res) => {
  record('http', req);
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
