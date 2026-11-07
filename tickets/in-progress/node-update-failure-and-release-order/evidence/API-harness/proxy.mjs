// autobyteus-412 API/E2E harness: a transparent logging reverse proxy in front of the test-owned Docker node.
// The desktop's node entry points at this proxy, so every request the desktop (main process or window) makes to the
// node is logged with its method, path and status. Usage: node proxy.mjs <listenPort> <targetPort> <logFile>
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';

const [listenPort, targetPort, logFile] = process.argv.slice(2);
const log = (record) => fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...record }) + '\n');

const server = http.createServer((req, res) => {
  const upstream = http.request(
    { host: '127.0.0.1', port: Number(targetPort), method: req.method, path: req.url, headers: req.headers },
    (up) => {
      log({ method: req.method, url: req.url, status: up.statusCode, ua: req.headers['user-agent']?.slice(0, 40) ?? null });
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', (error) => {
    log({ method: req.method, url: req.url, status: 'upstream-error', error: error.code ?? String(error) });
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});

server.on('upgrade', (req, socket, head) => {
  log({ method: req.method, url: req.url, status: 'upgrade' });
  const upstream = net.connect(Number(targetPort), '127.0.0.1', () => {
    const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(Number(listenPort), '127.0.0.1', () => log({ event: 'proxy-listening', listenPort, targetPort }));
