// API-13 helper: reads the Electron dev window over CDP. The window must be the dev renderer (http://localhost:3000),
// show the app, and its own GraphQL and WebSocket calls to the embedded node must answer (Origin http://localhost:3000).
// Usage: node api-13-renderer-check.mjs <worktree> <cdp port> <node port> <out dir>
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const [worktree, cdpPort, nodePort, out] = process.argv.slice(2);
const { chromium } = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'))('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
let page;
for (let i = 0; i < 120 && !page; i += 1) { page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('http://localhost:3000')); if (!page) await sleep(1000); }
const result = { pages: browser.contexts().flatMap(c => c.pages()).map(p => p.url()) };
if (page) {
  await page.locator('[data-test="run-target-switcher-trigger"]').waitFor({ timeout: 240_000 }).then(() => { result.appShown = true; }, e => { result.appShown = false; result.waitError = e.message; });
  result.url = page.url();
  result.own = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ agentDefinitions { name } }' }) });
    const ws = await new Promise(res => { const s = new WebSocket(`${base.replace('http', 'ws')}/ws/agent-package-definitions`); s.onopen = () => { s.close(); res('opened'); }; s.onerror = () => res('error'); setTimeout(() => res('timeout'), 8000); });
    return { origin: location.origin, graphqlStatus: r.status, hasData: !!(await r.json()).data, ws, electronApi: typeof window.electronAPI };
  }, `http://127.0.0.1:${nodePort}`);
  await page.screenshot({ path: path.join(out, 'API-13-dev-window.png') });
}
await fs.writeFile(path.join(out, 'API-13-renderer-check.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
process.exit(0);
