// IMP-17 (autobyteus-435 REQ-014, AC-014-1/2): the System instructions item expanded on the phone page and in the desktop
// Activity panel, against a probe-owned node (`--hold`). A ~12,000-character item (one 600-character unbroken line among
// them) is added to the open run's Activity through the page's own Pinia store, as the stream adds one.
// Usage: node render-system-instructions.mjs <hold.json> <evidence dir> <autobyteus-web dir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const [holdFile, outDir, webDir] = process.argv.slice(2);
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const hold = JSON.parse(await fs.readFile(holdFile, 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const CONTENT = ['You are the Project Task Manager.', 'U'.repeat(600), ...Array.from({ length: 220 }, (_, i) => `${i + 1}. Rule ${i + 1}: keep every Task's status current and say what you did.`)].join('\n');
const results = { startedAt: new Date().toISOString(), contentLength: CONTENT.length };
/** Adds the item to `runId`'s Activity through the page's Pinia (the app's own store action). */
const addItem = (page, runId) => page.evaluate(([runId, content]) => {
  const app = document.querySelector('#__nuxt')?.__vue_app__;
  const pinia = app?.config.globalProperties.$pinia;
  const store = pinia?._s.get('agentActivity');
  if (!store) return 'no agentActivity store';
  return store.upsertSystemInstructionActivity(runId, { kind: 'system_instruction', activityId: 'render-system-instructions', content, timestamp: new Date() });
}, [runId, CONTENT]);
const measure = (page) => page.evaluate(() => {
  const item = document.querySelector('article:has(> button[aria-controls^="system-instruction-content-"])');
  const pre = item?.querySelector('pre');
  if (!pre) return { found: false };
  const style = getComputedStyle(pre);
  const scrollers = []; for (let el = pre.parentElement; el; el = el.parentElement) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) { scrollers.push({ tag: el.tagName, testid: el.getAttribute('data-testid') ?? el.getAttribute('data-test'), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }); break; } }
  return { found: true, expanded: item.querySelector('button')?.getAttribute('aria-expanded'), preMaxHeight: style.maxHeight, preOverflowY: style.overflowY,
    preScrollHeight: pre.scrollHeight, preClientHeight: pre.clientHeight, preHasOwnScroll: pre.scrollHeight > pre.clientHeight + 1,
    preHorizontalOverflow: pre.scrollWidth > pre.clientWidth + 1, textLength: pre.textContent.length, tabindex: pre.getAttribute('tabindex'),
    pageHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth, outerScroller: scrollers[0] ?? null };
});
const expandAndCheck = async (page, prefix, label) => {
  // The item's article (the phone's row wrapper sets its own data-testid on it, so it is found by its region link).
  const item = page.locator('article:has(> button[aria-controls^="system-instruction-content-"])');
  await item.waitFor({ timeout: 20_000 });
  await item.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outDir, `${prefix}-collapsed.png`) });
  await item.locator('button').first().click(); await sleep(400);
  const expanded = await measure(page);
  await item.locator('pre').evaluate((pre) => pre.scrollIntoView({ block: 'start' })); await sleep(300);
  await page.screenshot({ path: path.join(outDir, `${prefix}-expanded-top.png`) });
  await item.locator('pre').evaluate((pre) => pre.scrollIntoView({ block: 'end' })); await sleep(300);
  await page.screenshot({ path: path.join(outDir, `${prefix}-expanded-end.png`) });
  await item.locator('button').first().scrollIntoViewIfNeeded();
  await item.locator('button').first().click(); await sleep(400);
  const collapsed = await measure(page);
  results[label] = { expanded, collapsedAgain: { expanded: collapsed.expanded, preVisible: await item.locator('pre').isVisible() } };
};
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--host-resolver-rules=MAP 10.0.2.2 127.0.0.1', '--no-sandbox'] });
try {
  // Phone page (390x844).
  const STATE = '/tmp/sfb435-render/phone-state.json'; const saved = await fs.stat(STATE).then(() => true, () => false);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, ...(saved ? { storageState: STATE } : {}) });
  const page = await phone.newPage();
  if (saved) await page.goto(new URL(hold.links.emulator).origin + '/mobile/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  else { await page.goto(hold.links.emulator, { waitUntil: 'domcontentloaded', timeout: 120_000 }); await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 }); }
  await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
  await phone.storageState({ path: STATE });
  const ptmKey = `agent:${hold.runs.ptm}`;
  await page.locator(`${sel(`mobile-run-row-${ptmKey}`)} ${sel('mobile-run-open')}`).click();
  await page.locator(sel('mobile-run-menu-button')).waitFor({ timeout: 30_000 });
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu-activity')).click();
  await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
  results.phoneAdd = await addItem(page, hold.runs.ptm);
  await expandAndCheck(page, 'IMP-17-phone', 'phone');

  // Desktop window (1440x900), the probe's owner credential on loopback requests only.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await desktop.setExtraHTTPHeaders({ authorization: `Bearer ${hold.ownerCredential}` });
  await desktop.route((url) => !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url.href), (route) => { const headers = { ...route.request().headers() }; delete headers.authorization; return route.fallback({ headers }); });
  const win = await desktop.newPage();
  await win.goto(hold.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
  await win.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 180_000 });
  if ((await win.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') {
    await win.locator('[data-test="run-section-view-menu"]').click();
    await win.locator('[data-test="run-section-view-runs"]').click();
  }
  const row = win.locator(`[data-test="run-list-row"][data-run-id="${hold.runs.ptm}"]`);
  await row.waitFor({ timeout: 60_000 });
  await row.locator('button').nth(1).click(); // the row's main button (the first is its fold toggle)
  await sleep(4000);
  results.desktopTabs = await win.locator('[data-test="right-side-tab-list"]').innerText().catch(() => null);
  await win.locator('[data-test="right-side-tab-list"]').getByText(/^\s*Activity\s*$/i).first().click();
  await win.locator('[data-test="activity-feed-scroll-container"]').waitFor({ timeout: 20_000 });
  results.desktopAdd = await addItem(win, hold.runs.ptm);
  await expandAndCheck(win, 'IMP-17-desktop', 'desktop');
} catch (error) {
  results.error = String(error?.stack ?? error);
} finally {
  results.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'IMP-17-render-system-instructions.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
