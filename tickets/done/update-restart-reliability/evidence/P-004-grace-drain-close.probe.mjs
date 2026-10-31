// P-004 (temporary probe): Fastify defaults + one preClose step that destroys connections that never sent a request,
// lets in-flight requests finish within a grace, then closes the rest. Usage: node p004.mjs <abs autobyteus-server-ts>
import { createRequire } from 'node:module';
import net from 'node:net';
const require = createRequire(process.argv[2] + '/package.json');
const fastify = require('fastify');
const run = async (graceMs, handlerMs) => {
  const app = fastify();
  const used = new WeakSet(); const sockets = new Set(); let inflight = 0; let drained = () => {};
  app.server.on('connection', s => { sockets.add(s); s.once('close', () => sockets.delete(s)); });
  app.server.on('request', (req, res) => { used.add(req.socket); inflight++; res.once('close', () => { if (--inflight === 0) drained(); }); });
  app.server.on('upgrade', (req, s) => { sockets.delete(s); });
  app.addHook('preClose', async () => {
    for (const s of sockets) if (!used.has(s)) s.destroy();               // never sent a request
    if (inflight > 0) await Promise.race([new Promise(r => { drained = r; }), new Promise(r => setTimeout(r, graceMs))]);
    app.server.closeAllConnections();                                     // idle keep-alive and anything left
  });
  let onCloseAt = null; app.addHook('onClose', async () => { onCloseAt = Date.now(); });
  app.get('/slow', async () => { await new Promise(r => setTimeout(r, handlerMs)); return 'done'; });
  app.get('/x', async () => 'ok');
  await app.listen({ port: 0, host: '127.0.0.1' }); const port = app.server.address().port;
  await fetch(`http://127.0.0.1:${port}/x`).then(r => r.text());          // a keep-alive connection, now idle
  const silent = net.connect(port, '127.0.0.1'); await new Promise(r => silent.once('connect', r));
  const slow = fetch(`http://127.0.0.1:${port}/slow`).then(r => r.text(), e => `error: ${e.cause?.code ?? e.message}`);
  await new Promise(r => setTimeout(r, 20));
  const t0 = Date.now(); await Promise.race([app.close(), new Promise(r => setTimeout(r, 5000))]);
  console.log(JSON.stringify({ node: process.version, graceMs, handlerMs, closeMs: Date.now() - t0, onCloseRelMs: onCloseAt && onCloseAt - t0, slowResult: await slow, silentDestroyed: silent.destroyed || silent.readyState !== 'open' }));
  silent.destroy();
};
await run(2000, 300);   // in-flight finishes inside the grace
await run(500, 3000);   // in-flight outlasts the grace: cut at the grace
