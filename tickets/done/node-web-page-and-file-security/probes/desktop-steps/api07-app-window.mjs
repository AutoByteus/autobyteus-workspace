// API-07 (AC-011 packaged app + embedded node; AC-010 alternate: the app's own file:// renderer still works).
// The packaged renderer (file://) loads, its own GraphQL and WebSocket calls to the embedded node work, and the node logs
// no refusal while the app starts and is used.
export default async ({ main, instance, shot, refusals, assert, waitFor, sleep }) => {
  const url = main.url();
  assert(url.startsWith('file://') && url.includes('/renderer/index.html'), 'the packaged file:// renderer', url);
  await main.locator('[data-test="run-target-switcher-trigger"]').waitFor({ timeout: 60_000 });
  // A request the renderer itself makes, as its stores do: Origin file:// is the desktop app's.
  const own = await main.evaluate(async (graphqlUrl) => {
    const r = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ agentDefinitions { id name } }' }) });
    const ws = await new Promise(resolve => { const s = new WebSocket(graphqlUrl.replace('http', 'ws').replace('/graphql', '/ws/agent-package-definitions')); s.onopen = () => { s.close(); resolve('opened'); }; s.onerror = () => resolve('error'); setTimeout(() => resolve('timeout'), 8000); });
    return { status: r.status, hasData: !!(await r.json()).data, ws };
  }, instance.graphqlUrl);
  await main.goto(url.split('#')[0] + '#/nodes').catch(() => undefined);
  await sleep(2500);
  const nodesText = (await main.locator('body').innerText()).slice(0, 600);
  await main.goto(url.split('#')[0] + '#/chat').catch(() => undefined);
  await sleep(1500);
  await shot(main, 'API-07-app-window');
  const lines = refusals().filter(l => !l.includes('f=logcheck')); // f=logcheck: the run's own log-location check (curl, Origin http://localhost:5173)
  assert(own.status === 200 && own.hasData && own.ws === 'opened', 'the renderer reaches its embedded node', own);
  assert(lines.length === 0, 'no refusal on the embedded node', lines);
  return { rendererUrl: url, own, nodesPageStart: nodesText, refusalLines: lines.length, backendUrl: instance.backendUrl };
};
