// API-13 / AC-013: a server on localhost:<p> (as an agent starts one) opened in the in-app browser. The page and its own
// server work; its requests to the embedded node are refused (REMOTE_ACCESS_ORIGIN_REFUSED origin http://localhost:<p>).
// args: <local server URL>
export default async ({ args, openTab, shot, refusals, nodeLog, assert, waitFor, sleep }) => {
  const [localUrl] = args;
  const before = nodeLog().length;
  const { page } = await openTab(localUrl);
  await waitFor('own server answer', async () => (await page.evaluate(() => document.body.dataset.own)) ?? false, 20_000);
  await sleep(5000);
  const state = await page.evaluate(() => ({ h: document.getElementById('h').textContent, ...document.body.dataset, origin: location.origin }));
  await shot(page, 'API-11-local-server-page');
  const lines = refusals(nodeLog().slice(before));
  const origin = new URL(localUrl).origin;
  const fetchLine = lines.find(l => l.includes('f=api11-fetch')); const wsLine = lines.find(l => l.includes('f=api11-ws'));
  assert(state.h === 'API11 LOCAL APP' && state.own === 'own server answered api11', 'the page and its own server work', state);
  assert(fetchLine?.includes('REMOTE_ACCESS_ORIGIN_REFUSED') && fetchLine.includes(`origin ${origin}`) && wsLine?.includes('REMOTE_ACCESS_ORIGIN_REFUSED'), 'its requests to the node are refused', lines);
  assert(!String(state.ws ?? '').startsWith('opened'), 'no WebSocket opened', state.ws);
  return { state, refusalLines: lines };
};
