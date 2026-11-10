// autobyteus-435 API/E2E API-13 (AC-003-1): the isolated desktop instance's Nodes page (the Electron window, file://)
// against real test nodes. Steps are passed as a JSON list; each step prints one JSON line.
// Usage: node electron-nodes.mjs <controlPort> <outDir> '<json steps>'
//   steps: {"do":"open"} | {"do":"add","address":"…","name":"…"} | {"do":"row","name":"…","label":"…"} | {"do":"askAgain","name":"…"}
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [controlPort, outDir, stepsJson] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const pages = browser.contexts().flatMap(c => c.pages());
const page = pages.find(p => !p.url().startsWith('devtools')) ?? pages[0];
const clean = v => (v ?? '').trim().replace(/\s+/g, ' ');
const rowKeyOf = async name => {
  for (const handle of await page.locator('[data-testid^="node-row-"]').all()) {
    const id = await handle.getAttribute('data-testid');
    if (!/^node-row-[^-]/.test(id ?? '')) continue;
    const key = id.slice('node-row-'.length);
    const n = await page.locator(`[data-testid="node-name-${key}"]`).first().innerText().catch(() => '');
    if (clean(n) === name) return key;
  }
  return null;
};
const lineOf = async key => { const el = page.locator(`[data-testid="node-line-${key}"]`); if (!(await el.count())) return null; const p = el.locator('p'); return clean(await ((await p.count()) ? p.first() : el.first()).innerText()); };
for (const step of JSON.parse(stepsJson)) {
  const out = { step: step.do, label: step.label ?? null, at: new Date().toISOString() };
  if (step.do === 'open') {
    out.url = page.url().replace(/access_token=[^&]+/, 'access_token=…');
    out.isElectron = await page.evaluate(() => Boolean(window.electronAPI));
    out.protocol = await page.evaluate(() => location.protocol);
    // The app's own navigation: the Nodes page, Manage tab (a client-side route, as the left navigation does).
    await page.evaluate(() => { const r = window.useNuxtApp?.().$router; if (r) return r.push('/nodes?nodeTab=manage'); location.hash = '#/nodes?nodeTab=manage'; });
    await page.locator('[data-testid="node-manager-panel-manage"]').waitFor({ state: 'visible', timeout: 60_000 });
    out.thisNode = clean(await page.locator('[data-testid="this-node-url"]').first().innerText().catch(() => ''));
  } else if (step.do === 'add') {
    await page.locator('[data-testid="add-node-address"]').fill(step.address);
    await page.locator('[data-testid="add-node-name"]').fill(step.name);
    const collab = page.locator('[data-testid="add-node-collaborate"]');
    if (await collab.count() && await collab.isChecked().catch(() => false)) await collab.uncheck().catch(() => undefined);
    const fetches = [];
    const onRequest = r => { if (r.url().includes('/rest/remote-access/status')) fetches.push({ url: r.url(), mode: r.headers()['sec-fetch-mode'] ?? null }); };
    page.on('request', onRequest);
    await page.locator('[data-testid="add-node-submit"]').click();
    let key = null;
    for (let i = 0; i < 60 && !key; i++) { await sleep(500); key = await rowKeyOf(step.name); }
    let line = null;
    for (let i = 0; i < 60; i++) { line = key ? await lineOf(key) : null; if (line && !/^Checking/.test(line)) break; await sleep(500); }
    page.off('request', onRequest);
    out.address = step.address; out.key = key; out.line = line; out.statusRequests = fetches;
    out.addPanel = clean(await page.locator('[data-testid="add-node-panel"]').first().innerText().catch(() => ''));
  } else if (step.do === 'row' || step.do === 'askAgain') {
    const key = await rowKeyOf(step.name);
    if (step.do === 'askAgain') { await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-testid="node-manager-panel-manage"]').waitFor({ state: 'visible', timeout: 60_000 }); }
    let line = null;
    for (let i = 0; i < 60; i++) { line = await lineOf(key); if (!line || !/^Checking/.test(line)) { if (i > 4) break; } await sleep(500); }
    out.name = step.name; out.key = key; out.line = line;
    out.dot = await page.locator(`[data-testid="node-dot-${key}"]`).first().getAttribute('aria-label').catch(() => null);
  }
  if (step.shot) await page.screenshot({ path: path.join(outDir, step.shot) });
  console.log(JSON.stringify(out));
}
await browser.close().catch(() => undefined);
