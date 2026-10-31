// Usage: node <this file> <absolute path of autobyteus-server-ts>
// P-003: does Fastify 5.12.7 close() wait for a TCP connection that never sent a request? (temporary probe)
import { createRequire } from 'node:module';
import net from 'node:net';
const require = createRequire(process.argv[2] + '/package.json');
const fastify = require('fastify');
for (const mode of ['default', 'forceCloseConnections:true']) {
  const app = fastify(mode === 'default' ? {} : { forceCloseConnections: true });
  let closed = false; app.addHook('onClose', async () => { closed = true; });
  app.get('/x', async () => 'ok');
  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = app.server.address().port;
  const used = await fetch(`http://127.0.0.1:${port}/x`).then(r => r.text()); // one used keep-alive connection
  const silent = net.connect(port, '127.0.0.1'); await new Promise(r => silent.once('connect', r)); // never sends a request
  const t0 = Date.now(); const done = app.close().then(() => Date.now() - t0);
  const r = await Promise.race([done, new Promise(r => setTimeout(() => r('still waiting at 5000 ms'), 5000))]);
  console.log(JSON.stringify({ node: process.version, mode, usedReply: used, closeMs: r, onCloseRan: closed }));
  silent.destroy(); await done;
}
