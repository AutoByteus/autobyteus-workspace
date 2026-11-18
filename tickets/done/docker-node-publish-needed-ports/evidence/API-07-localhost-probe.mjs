// autobyteus-402 API-07: how the VNC Viewer port answers the address forms a client on this Mac uses.
// Usage: node API-07-localhost-probe.mjs <ws package.json path> <lanIp> <backendPort> <vncViewerPort>
import { createRequire } from 'node:module';
import net from 'node:net';
import dns from 'node:dns/promises';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [lanIp, backend, vnc] = process.argv.slice(3);

const tcp = (host, port) => new Promise((resolve) => {
  const s = net.connect({ host, port: Number(port) });
  const done = (result) => { s.destroy(); resolve({ host, port: Number(port), result, remote: result === 'connected' ? undefined : undefined }); };
  s.setTimeout(3000, () => done('timeout'));
  s.on('connect', () => { const r = { host, port: Number(port), result: 'connected', remoteAddress: s.remoteAddress }; s.destroy(); resolve(r); });
  s.on('error', (e) => done(e.code));
});

const rfbVersion = (url) => new Promise((resolve) => {
  const ws = new WebSocket(url, ['binary']);
  const t = setTimeout(() => { ws.terminate(); resolve({ url, error: 'timeout' }); }, 8000);
  ws.on('error', (e) => { clearTimeout(t); resolve({ url, error: e.code || String(e) }); });
  ws.on('message', (d) => { clearTimeout(t); const r = { url, remoteAddress: ws._socket?.remoteAddress, serverVersion: Buffer.from(d).subarray(0, 11).toString() }; ws.close(); resolve(r); });
});

const out = {
  node: process.version,
  defaultAutoSelectFamily: net.getDefaultAutoSelectFamily?.(),
  localhostLookupAll: await dns.lookup('localhost', { all: true }),
  tcp: [],
};
for (const [label, port] of [['backend', backend], ['vncViewer', vnc]]) {
  for (const host of ['127.0.0.1', '::1', 'localhost', lanIp]) out.tcp.push({ label, ...(await tcp(host, port)) });
}
out.wsLocalhost = await rfbVersion(`ws://localhost:${vnc}`);
console.log(JSON.stringify(out, null, 2));
