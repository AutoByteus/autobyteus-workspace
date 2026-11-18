// autobyteus-435 API/E2E: a test TCP/HTTP proxy in front of the test node, standing for the phone's path to the node.
// Modes (POST http://127.0.0.1:<control>/mode/<m>): pass (forward raw TCP), 502 (answer every request with HTTP 502),
// 502page (only the page GET /mobile answers 502; the rest passes),
// stopped (close the listener: connection refused). Usage: node proxy.mjs <listen port> <target port> <control port>
import net from 'node:net';
import http from 'node:http';
const [listenPort, targetPort, controlPort] = process.argv.slice(2).map(Number);
let mode = process.argv[5] ?? 'pass';
let server = null;
const log = (line) => console.log(`${new Date().toISOString()} ${line}`);
const start = () => new Promise((resolve) => {
  server = net.createServer((client) => {
    sockets.add(client); client.on('close', () => sockets.delete(client));
    if (mode === '502page') {
      // Only the node's page (a GET of /mobile, not its assets) answers 502; everything else passes (the status check too).
      client.once('data', (chunk) => {
        const line = String(chunk).split('\r\n')[0];
        if (/^GET \/mobile\/?(\?|\s)/.test(line)) { log(`502 for ${line.split(' ').slice(0, 2).join(' ').replace(/pairing=[^& ]+/, 'pairing=…')}`);
          client.end('HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: 11\r\nConnection: close\r\n\r\nBad Gateway'); return; }
        const upstream = net.connect(targetPort, '127.0.0.1', () => { upstream.write(chunk); client.pipe(upstream).pipe(client); });
        upstream.on('error', () => client.destroy()); client.on('error', () => upstream.destroy());
      });
      return;
    }
    if (mode === '502') {
      client.once('data', (chunk) => { log(`502 for ${String(chunk).split(' ').slice(0, 2).join(' ').replace(/pairing=[^& ]+/, 'pairing=…')}`);
        client.end('HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: 11\r\nConnection: close\r\n\r\nBad Gateway'); });
      return;
    }
    const upstream = net.connect(targetPort, '127.0.0.1');
    client.pipe(upstream).pipe(client);
    upstream.on('error', () => client.destroy()); client.on('error', () => upstream.destroy());
  });
  server.listen(listenPort, '127.0.0.1', resolve);
});
const sockets = new Set();
const stop = () => new Promise((resolve) => { if (!server) return resolve(); const s = server; server = null; s.close(() => resolve()); for (const c of sockets) c.destroy(); });
http.createServer(async (req, res) => {
  const next = req.url.split('/').pop();
  if (next === 'stopped') { await stop(); } else { if (!server) await start(); }
  mode = next; log(`mode ${mode}`); res.end(mode);
}).listen(controlPort, '127.0.0.1');
if (mode !== 'stopped') await start();
log(`proxy ${listenPort} -> 127.0.0.1:${targetPort}, control ${controlPort}, mode ${mode}`);
