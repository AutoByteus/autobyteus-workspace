// autobyteus-405 API-08: the node-desktop route behind a TLS-terminating reverse proxy (the role Tailscale Serve
// plays for a cloud node, SCN-003). A local https server with a self-signed certificate forwards HTTP requests and
// WebSocket upgrades to the node's backend; a raw client then uses https:// and wss:// only.
// Usage: node API-08-wss-through-tls-proxy.mjs <ws package.json> <node backend host> <node backend port> <cert.pem> <key.pem> <container>
import { createRequire } from 'node:module';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [nodeHost, nodePort, certPath, keyPath, container] = process.argv.slice(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inNode = (...a) => execFileSync('docker', ['exec', '--user', 'vncuser', '--env', 'DISPLAY=:99', container, ...a], { encoding: 'utf8' }).trim();
const u16 = (n) => [(n >> 8) & 255, n & 255];
const pointer = (x, y) => Buffer.from([5, 0, ...u16(x), ...u16(y)]);
const setDesktopSize = (w, h) => Buffer.from([251, 0, ...u16(w), ...u16(h), 1, 0, ...Array(16).fill(0)]);

// The proxy: plain byte forwarding of each TLS-terminated connection to the backend (like Tailscale Serve's
// HTTPS-to-HTTP proxy, which keeps the Host path and forwards Upgrade).
const counts = { http: 0, upgrade: 0 };
const proxy = https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) });
const forwardRaw = (req, clientSocket, head) => {
  const upstream = net.connect(Number(nodePort), nodeHost, () => {
    const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(clientSocket); clientSocket.pipe(upstream);
  });
  upstream.on('error', () => clientSocket.destroy()); clientSocket.on('error', () => upstream.destroy());
};
proxy.on('request', (req, res) => {
  counts.http += 1;
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const up = net.connect(Number(nodePort), nodeHost, () => {
      const headers = { ...req.headers, connection: 'close' };
      up.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
      up.write(Buffer.concat(chunks));
    });
    res.socket.on('error', () => up.destroy());
    up.pipe(res.socket);
  });
});
proxy.on('upgrade', (req, socket, head) => { counts.upgrade += 1; forwardRaw(req, socket, head); });
await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
const port = proxy.address().port;
const base = `https://127.0.0.1:${port}`;
const out = { proxy: base, upstream: `http://${nodeHost}:${nodePort}` };

out.rest = await new Promise((resolve) => {
  https.get(`${base}/rest/node-desktop`, { rejectUnauthorized: false }, (res) => {
    let body = ''; res.on('data', (d) => { body += d; }); res.on('end', () => resolve({ status: res.statusCode, body }));
  }).on('error', (e) => resolve({ error: String(e) }));
});

const viewer = (mode) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`wss://127.0.0.1:${port}/ws/node-desktop?mode=${mode}`, { rejectUnauthorized: false });
  let buf = Buffer.alloc(0); let stage = 'version'; const r = { mode, url: ws.url };
  const timer = setTimeout(() => reject(new Error(`timeout ${mode} at ${stage}`)), 15000);
  ws.on('close', (code) => { r.closedCode = code; });
  ws.on('error', reject);
  ws.on('message', async (data) => {
    buf = Buffer.concat([buf, data]);
    if (stage === 'version' && buf.length >= 12) { r.serverVersion = buf.subarray(0, 11).toString(); buf = buf.subarray(12); ws.send(Buffer.from('RFB 003.008\n')); stage = 'sec'; }
    if (stage === 'sec' && buf.length >= 1 + buf[0]) { buf = buf.subarray(1 + buf[0]); ws.send(Buffer.from([1])); stage = 'res'; }
    if (stage === 'res' && buf.length >= 4) { buf = buf.subarray(4); ws.send(Buffer.from([0])); stage = 'init'; }
    if (stage === 'init' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) {
      clearTimeout(timer); stage = 'ready'; r.size = `${buf.readUInt16BE(0)}x${buf.readUInt16BE(2)}`; buf = Buffer.alloc(0);
      const x = mode === 'view' ? 200 : 777, y = mode === 'view' ? 200 : 444;
      r.mouseBefore = inNode('xdotool', 'getmouselocation');
      ws.send(pointer(x, y)); ws.send(setDesktopSize(1024, 768)); await sleep(1500);
      r.sentPointerTo = `${x},${y}`; r.mouseAfter = inNode('xdotool', 'getmouselocation');
      r.desktopAfterSetDesktopSize = /dimensions:\s+(\d+x\d+)/.exec(inNode('xdpyinfo'))?.[1];
      r.openAtEnd = ws.readyState === WebSocket.OPEN; ws.close(1000); await sleep(300); resolve(r);
    }
  });
});

out.view = await viewer('view');
out.control = await viewer('control');
out.proxiedConnections = counts;
proxy.close();
console.log(JSON.stringify(out, null, 2));
process.exit(0);
