import http from 'node:http';
import net from 'node:net';

const listenPort = 3014;
const backend = { host: '127.0.0.1', port: 8013 };
const frontend = { host: '127.0.0.1', port: 3013 };
const selectTarget = (url = '') =>
  url.startsWith('/graphql') || url.startsWith('/rest') || url.startsWith('/ws')
    ? backend
    : frontend;

const server = http.createServer((req, res) => {
  const target = selectTarget(req.url);
  const upstream = http.request({
    hostname: target.host,
    port: target.port,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `${target.host}:${target.port}` },
  }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on('error', error => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`proxy error: ${error.message}`);
  });
  req.pipe(upstream);
});

server.on('upgrade', (req, socket, head) => {
  const target = selectTarget(req.url);
  const upstream = net.connect(target.port, target.host, () => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i];
      const value = name.toLowerCase() === 'host' ? `${target.host}:${target.port}` : req.rawHeaders[i + 1];
      lines.push(`${name}: ${value}`);
    }
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`SAME_ORIGIN_PROXY_READY http://127.0.0.1:${listenPort}`);
});
