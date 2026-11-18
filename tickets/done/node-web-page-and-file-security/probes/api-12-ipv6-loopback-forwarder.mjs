// API-12 helper: a loopback-only TCP forwarder [::1]:<port> -> 127.0.0.1:<port>. The host test node listens on
// 127.0.0.1 only; the Mac's .local name resolves to ::1 first in Chromium, as for a node that listens on every
// interface. This keeps the test node off the LAN. Usage: node api-12-ipv6-loopback-forwarder.mjs <port>
import net from 'node:net';
const port = Number(process.argv[2]);
net.createServer(c => { const u = net.connect(port, '127.0.0.1'); c.pipe(u); u.pipe(c); const end = () => { c.destroy(); u.destroy(); }; c.on('error', end); u.on('error', end); })
  .listen(port, '::1', () => console.log(`forwarding [::1]:${port} -> 127.0.0.1:${port}`));
