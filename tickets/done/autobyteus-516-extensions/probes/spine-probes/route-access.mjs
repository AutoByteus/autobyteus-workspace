// Probe: how today's route table classifies the planned extension routes (node access model NA-7).
// Run with: node --experimental-strip-types route-access.mjs <server-src-dir>
const { routeAccessFor } = await import(`${process.argv[2]}/api/security/node-route-permissions.ts`);
for (const [method, route] of [['POST', '/rest/extensions/voice-input/actions/transcribe'], ['POST', '/graphql'], ['POST', '/rest/remote-access/settings']]) {
  const access = routeAccessFor({ method, route, isWebSocketUpgrade: false });
  console.log(`${method} ${route} -> ${access.kind}${access.permitted ? ' ' + [...access.permitted].join('+') : ''}`);
}
