// IMP-11 (autobyteus-435): rendered check of the phone restore on the real phone bundle served by a probe-owned node
// (`test:e2e:mobile-shell --hold`). Usage: node render-restore.mjs <hold.json> <evidence dir> <web dir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const [holdFile, outDir, webDir] = process.argv.slice(2);
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const hold = JSON.parse(await fs.readFile(holdFile, 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--host-resolver-rules=MAP 10.0.2.2 127.0.0.1', '--no-sandbox'] });
const results = { startedAt: new Date().toISOString(), cases: {} };
const consoleErrors = [];
const refused = [];
let step = 'start';
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`[${step}] ${m.text()}`); });
  page.on('response', r => { if (r.status() === 401 || r.status() === 403) refused.push({ step, status: r.status(), url: r.url().replace(/access_token=[^&]+/, 'access_token=…'), method: r.request().method(), op: (() => { try { return JSON.parse(r.request().postData() ?? '{}').operationName ?? null; } catch { return null; } })() }); });
  step = 'pair';
  await page.goto(hold.links.emulator, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
  step = 'paired-list';
  await sleep(2000);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => ({ key: li.getAttribute('data-testid').replace('mobile-run-row-', ''), depth: Number(li.getAttribute('data-depth')) })));
  /** Samples the page every 40 ms across a reload: what shows, in order (deduplicated). */
  const traceReload = async (until) => {
    const seen = [];
    await page.reload({ waitUntil: 'commit' });
    const end = Date.now() + 30_000;
    while (Date.now() < end) {
      const s = await page.evaluate(() => ({
        opening: Boolean(document.querySelector('[data-testid="mobile-run-opening"]')),
        list: Boolean([...document.querySelectorAll('[data-testid="mobile-run-list"]')].some(e => e.offsetParent !== null)),
        activity: Boolean(document.querySelector('[data-testid="mobile-activity"]')),
        runOpen: document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') === 'open',
        query: location.search,
      })).catch(() => null);
      if (s) { const label = JSON.stringify(s); if (seen.at(-1) !== label) seen.push(label); if (until(s)) break; }
      await sleep(40);
    }
    return seen.map(s => JSON.parse(s));
  };
  // 1. An agent run's Activity view, reloaded.
  const agentKey = rows.find(r => r.depth === 0 && r.key.startsWith('agent:'))?.key;
  await page.locator(`${sel(`mobile-run-row-${agentKey}`)} ${sel('mobile-run-open')}`).click();
  await page.locator(sel('mobile-run-menu-button')).waitFor({ timeout: 30_000 });
  const runName = await page.locator(`${sel('mobile-run-screen')} ${sel('mobile-run-name')}`).first().textContent().catch(() => null);
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu-activity')).click();
  await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
  const before = await page.evaluate(() => location.search);
  await page.screenshot({ path: path.join(outDir, 'IMP-11-1-agent-activity-before-reload.png') });
  step = 'reload-agent-activity';
  const trace1 = await traceReload(s => s.activity);
  await sleep(3000);
  await page.screenshot({ path: path.join(outDir, 'IMP-11-1-agent-activity-after-reload.png') });
  results.cases.agentActivity = { agentKey, runName, before, trace: trace1, listShownBeforeRestore: trace1.some(s => s.list && !s.activity) };
  // 2. A Team run's run screen, reloaded.
  const consoleBeforeCase2 = consoleErrors.length;
  // A fresh start on the list (the history below holds the used pairing link).
  step = 'list-start';
  await page.goto(`${new URL(hold.links.emulator).origin}/mobile/`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const teamKey = rows.find(r => r.depth === 0 && r.key.startsWith('team:'))?.key ?? null;
  if (teamKey) {
    await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 20_000 });
    await page.locator(`${sel(`mobile-run-row-${teamKey}`)} ${sel('mobile-run-open')}`).click();
    await page.locator(sel('mobile-run-menu-button')).waitFor({ timeout: 30_000 });
    const teamBefore = await page.evaluate(() => location.search);
    step = 'reload-team-run';
    const trace2 = await traceReload(s => s.runOpen);
    await page.screenshot({ path: path.join(outDir, 'IMP-11-2-team-run-after-reload.png') });
    results.cases.teamRun = { teamKey, before: teamBefore, trace: trace2, consoleErrorsInCase: consoleErrors.slice(consoleBeforeCase2) };
  }
  // 3. A row the list no longer has: the list.
  step = 'gone-row';
  await page.goto(`${new URL(hold.links.emulator).origin}/mobile/?row=agent:no-such-run&screen=activity`, { waitUntil: 'commit' });
  const end = Date.now() + 30_000; const seen3 = [];
  while (Date.now() < end) {
    const s = await page.evaluate(() => ({ opening: Boolean(document.querySelector('[data-testid="mobile-run-opening"]')),
      list: Boolean([...document.querySelectorAll('[data-testid="mobile-run-list"]')].some(e => e.offsetParent !== null)), query: location.search })).catch(() => null);
    if (s) { const l = JSON.stringify(s); if (seen3.at(-1) !== l) seen3.push(l); if (s.list) break; }
    await sleep(40);
  }
  await page.screenshot({ path: path.join(outDir, 'IMP-11-3-gone-row-list.png') });
  results.cases.goneRow = { trace: seen3.map(s => JSON.parse(s)) };
} catch (error) {
  results.error = String(error?.stack ?? error);
} finally {
  results.consoleErrors = consoleErrors;
  results.refusedResponses = refused;
  results.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'IMP-11-render-restore.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 1).slice(0, 4000));
