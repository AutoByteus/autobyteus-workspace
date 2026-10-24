// Implementation smoke against a running server (isolated packaged app or test container).
// Usage: node instance-server-smoke.mjs <backend base URL> <ws module path> [healthPath]
// Checks: health, GraphQL POST, GraphiQL routes gone (404), GraphQL WebSocket handshake
// (graphql-transport-ws) and a subscription-capable connection ack.
import { createRequire } from 'node:module';
const [base, wsPath, healthPath = '/rest/health'] = process.argv.slice(2);
const WebSocket = createRequire(import.meta.url)(wsPath);
const out = {};
const health = await fetch(new URL(healthPath, base));
out.health = { status: health.status, body: (await health.text()).slice(0, 200) };
const gql = await fetch(new URL('/graphql', base), {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: '{ __typename }' }),
});
out.graphqlPost = { status: gql.status, body: await gql.text() };
for (const p of ['/graphiql', '/graphiql/main.js', '/graphiql/config.js']) {
  const r = await fetch(new URL(p, base));
  out[`GET ${p}`] = r.status;
}
out.graphqlWs = await new Promise((resolve) => {
  const url = new URL('/graphql', base); url.protocol = url.protocol.replace('http', 'ws');
  const ws = new WebSocket(url, 'graphql-transport-ws');
  const timer = setTimeout(() => { ws.terminate(); resolve({ error: 'timeout' }); }, 10000);
  ws.on('open', () => ws.send(JSON.stringify({ type: 'connection_init', payload: {} })));
  ws.on('message', (data) => {
    const msg = JSON.parse(String(data));
    clearTimeout(timer); ws.close(); resolve({ protocol: ws.protocol, firstMessage: msg.type });
  });
  ws.on('error', (e) => { clearTimeout(timer); resolve({ error: String(e) }); });
});
console.log(JSON.stringify(out, null, 1));
const ok = out.health.status === 200 && out.graphqlPost.status === 200 && out.graphqlPost.body.includes('"__typename":"Query"')
  && out['GET /graphiql'] === 404 && out['GET /graphiql/main.js'] === 404 && out.graphqlWs.firstMessage === 'connection_ack';
console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
process.exitCode = ok ? 0 : 1;
