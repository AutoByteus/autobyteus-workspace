// node listen-probe.mjs <fastify dir>: prints what listen() resolves to for host 0.0.0.0 and what the gate would see for a request to it.
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import { createRequire } from 'node:module';
const dir = process.argv[2]; const fastify = createRequire(path.join(dir, 'package.json'))(dir);
const app = fastify(); app.get('/x', async (req) => ({ ip: req.ip, host: req.headers.host }));
const address = await app.listen({ port: 0, host: '0.0.0.0' });
const res = await (await fetch(new URL('/x', address))).json();
console.log(app.version, 'listen() ->', address, '| request ip:', res.ip, 'host header:', res.host, '| addresses():', JSON.stringify(app.addresses().map(a => a.address)));
await app.close();
