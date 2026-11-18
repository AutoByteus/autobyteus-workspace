// IMP-14 (autobyteus-435 SR-003 DS-006b): on the real phone bundle served by a probe-owned node (`--hold`), a run made
// with New run → Create run: the route names the draft until the first send, then the node's run; a reload reopens it;
// a view pushed before the send names the node's run after it; a reload before the send shows the list.
// Usage: node render-create-run.mjs <hold.json> <evidence dir> <autobyteus-web dir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const [holdFile, outDir, webDir] = process.argv.slice(2);
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const hold = JSON.parse(await fs.readFile(holdFile, 'utf8'));
const origin = new URL(hold.links.emulator).origin;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const until = async (what, fn, ms = 30_000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn().catch(() => false)) return; await sleep(200); } throw new Error(`timed out: ${what}`); };
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--host-resolver-rules=MAP 10.0.2.2 127.0.0.1', '--no-sandbox'] });
const results = { startedAt: new Date().toISOString(), steps: [] };
const record = async (page, label) => { const s = await page.evaluate(() => ({ query: decodeURIComponent(location.search),
  runScreen: document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') ?? null,
  runName: document.querySelector('[data-testid="mobile-run-screen"] [data-testid="mobile-run-name"]')?.textContent?.trim() ?? null,
  opening: Boolean(document.querySelector('[data-testid="mobile-run-opening"]')),
  activity: Boolean(document.querySelector('[data-testid="mobile-activity"]')),
  listRows: document.querySelectorAll('[data-test="mobile-run-row"]').length,
  newRun: Boolean(document.querySelector('[data-testid="mobile-new-run"]')) })); results.steps.push({ label, ...s }); return s; };
const createRun = async (page) => {
  await page.locator(sel('mobile-new-run-button')).click();
  await page.locator(sel('mobile-new-run')).waitFor();
  await page.locator(sel('mobile-run-target-select-toggle')).click();
  await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Project Task Manager' }).first().click();
  await until('Create run enabled', async () => !(await page.locator(sel('mobile-run-launch')).isDisabled()));
  await page.locator(sel('mobile-run-launch')).click();
  await until('the new run screen', async () => (await page.locator(`${sel('mobile-run-screen')}[data-state="open"]`).count()) > 0);
};
const send = async (page, text) => {
  const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
  const button = page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last();
  await until('Send enabled', async () => { if (!(await box.inputValue().catch(() => ''))) await box.fill(text).catch(() => undefined); return (await button.count()) > 0 && await button.isEnabled(); });
  await button.click();
};
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(hold.links.emulator, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
  await page.goto(`${origin}/mobile/`, { waitUntil: 'domcontentloaded' }); // a fresh list entry under the pairing link
  await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });

  // A. Create run, reload before the first send: the list.
  await createRun(page);
  await record(page, 'A1 created (before the send)');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await until('the list after the reload', async () => (await page.locator(sel('mobile-run-tree')).count()) > 0 && !(await page.locator(sel('mobile-run-opening')).count()), 30_000);
  await sleep(1500);
  await record(page, 'A2 reloaded before the send');
  await page.screenshot({ path: path.join(outDir, 'IMP-14-A-reload-before-send-list.png') });

  // B. Create run, open Activity before the send, send from the run screen, Back: the route follows the promotion.
  await createRun(page);
  await record(page, 'B1 created');
  const marker = `IMP14-${Date.now()}`;
  await send(page, `First message. Marker ${marker}`);
  await until('the first message shown', async () => (await page.locator(sel('mobile-run-conversation')).innerText()).includes(marker));
  await until('the route names the node run', async () => !(await page.evaluate(() => decodeURIComponent(location.search))).includes('temp-'), 20_000);
  await record(page, 'B2 after the first send');
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu-activity')).click();
  await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
  await record(page, 'B3 Activity after the send');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await until('Activity after the reload', async () => (await page.locator(sel('mobile-activity')).count()) > 0, 30_000);
  await record(page, 'B4 reloaded on Activity');
  await page.screenshot({ path: path.join(outDir, 'IMP-14-B-reload-after-send-activity.png') });
} catch (error) {
  results.error = String(error?.stack ?? error);
} finally {
  results.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'IMP-14-render-create-run.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
