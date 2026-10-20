// Reproduce: does mercurius 13.4.1 (as AutoByteus registers it: graphiql + subscription) load undici at run time?
// Run from autobyteus-server-ts so its fastify/mercurius resolve. Prints every loaded module path under an undici package.
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const Fastify = require('fastify'); const mercurius = require('mercurius');
const app = Fastify();
await app.register(mercurius, { schema: 'type Query { ping: String } type Subscription { tick: String }', resolvers: { Query: { ping: () => 'pong' } }, path: '/graphql', graphiql: true, subscription: true });
await app.ready();
const q = await app.inject({ method: 'POST', url: '/graphql', payload: { query: '{ ping }' } });
const g = await app.inject({ method: 'GET', url: '/graphiql' });
const loaded = Object.keys(require.cache);
console.log(JSON.stringify({ query: q.json(), graphiqlStatus: g.statusCode, modulesLoaded: loaded.length,
  undiciModules: loaded.filter(p => /[\\/]undici[@\\/]/.test(p)).length,
  staticLoaded: loaded.some(p => p.includes('@fastify+static@7') || p.includes('@fastify/static')) }));
await app.close();
