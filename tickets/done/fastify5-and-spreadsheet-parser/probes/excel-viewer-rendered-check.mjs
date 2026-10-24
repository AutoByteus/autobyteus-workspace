// Implementation self-check: renders the real ExcelViewer in headless Chrome through a
// temporary Nuxt page (generated workbooks only), asserts DOM state per case, takes
// screenshots, and cleans up (dev server process group, temporary page).
// Usage: node excel-viewer-rendered-check.mjs <web dir> <page source> <output dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [webDir, pageSource, outDir] = process.argv.slice(2);
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const installedPage = path.join(webDir, 'pages/zz-excel-viewer-check.vue');
const route = '/zz-excel-viewer-check';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
await fs.mkdir(outDir, { recursive: true });
const result = { startedAt: new Date().toISOString(), cases: {}, consoleErrors: [], pageErrors: [], cleanup: {} };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
async function until(label, fn, timeout = 240000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { if (await fn()) return; } catch (e) { last = e; } await delay(500); }
  throw new Error(`Timeout: ${label} ${last ?? ''}`);
}

let dev, browser;
assert(!existsSync(installedPage), 'Refusing to overwrite an existing page');
await fs.copyFile(pageSource, installedPage);
try {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const log = createWriteStream(path.join(outDir, 'nuxt-dev.log'));
  dev = spawn('pnpm', ['dev', '--port', String(port), '--host', '127.0.0.1'], {
    cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:9', NUXT_TELEMETRY_DISABLED: '1' },
  });
  dev.stdout.pipe(log); dev.stderr.pipe(log);
  await until('nuxt route', async () => (await fetch(base + route)).ok);

  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1500 } })).newPage();
  page.on('console', (m) => { if (m.type() === 'error') result.consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => result.pageErrors.push(String(e)));
  // Cold dev server: the first load may re-optimize dependencies and reload; warm up first.
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  result.consoleErrors.length = 0; result.pageErrors.length = 0;
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__excelCheckReady === true, null, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-case] .loading-state').length === 0
    && document.querySelectorAll('[data-case]').length === 9, null, { timeout: 60000 });
  await page.screenshot({ path: path.join(outDir, 'IMP-14-all-cases.png'), fullPage: true });

  const inspect = (id) => page.$eval(`[data-case="${id}"]`, (section) => {
    const table = section.querySelector('.sheet-table');
    const els = table ? [...table.querySelectorAll('*')] : [];
    return {
      cells: table ? [...table.querySelectorAll('td,th')].map((c) => c.textContent) : [],
      tags: [...new Set(els.map((e) => e.tagName.toLowerCase()))].sort(),
      attrs: [...new Set(els.flatMap((e) => [...e.attributes].map((a) => a.name)))].sort(),
      tabs: [...section.querySelectorAll('.sheet-tab')].map((t) => ({ text: t.textContent.trim(), active: t.classList.contains('active') })),
      error: section.querySelector('.error-text')?.textContent ?? null,
      retry: Boolean(section.querySelector('.retry-button')),
      tdCursor: table?.querySelector('td') ? getComputedStyle(table.querySelector('td')).cursor : null,
    };
  });

  for (const id of ['xlsx-tabs', 'xls', 'xlsm', 'csv-url', 'csv-content', 'merged', 'injection', 'links', 'error']) {
    result.cases[id] = await inspect(id);
  }
  const c = result.cases;
  assert.deepEqual(c['xlsx-tabs'].cells, ['Name', 'Qty', 'Price', 'Apple', '3', '1.25', 'Banana', '12', '0.5', 'Cherry', '200', '0.05']);
  assert.deepEqual(c['xlsx-tabs'].tabs, [{ text: 'Fruits', active: true }, { text: 'Notes', active: false }]);
  assert.deepEqual(c.xls.cells, c['xlsx-tabs'].cells);
  assert.deepEqual(c.xlsm.cells, c['xlsx-tabs'].cells);
  assert.deepEqual(c['csv-url'].cells, ['city', 'count', 'Oslo', '7', 'Lima', '12']);
  assert.deepEqual(c['csv-content'].cells, ['a', 'b', 'c', '1', '2', '3', '4', '5', '6']);
  assert.deepEqual(c.merged.attrs, ['colspan']);
  assert.deepEqual(c.injection.cells, ['x" onmouseover="window.__pwned=1" data-y="', '<img src=x onerror="window.__pwned=1">', '<script>window.__pwned=1</script>']);
  assert.deepEqual(c.links.cells, ['site', 'evil', 'plain']);
  for (const id of Object.keys(c).filter((k) => k !== 'error' && k !== 'merged')) {
    assert.deepEqual(c[id].attrs, [], `${id} has attributes`);
    assert(c[id].tags.every((t) => ['table', 'tbody', 'tr', 'td', 'th', 'br'].includes(t)), `${id} tags ${c[id].tags}`);
  }
  assert(c.error.error && c.error.retry, 'error state with Retry');

  // Interactions: switch sheet tab; hover and click the injection and link cells.
  await page.click('[data-case="xlsx-tabs"] .sheet-tab:nth-child(2)');
  result.afterTabSwitch = await inspect('xlsx-tabs');
  assert.deepEqual(result.afterTabSwitch.cells, ['Second sheet only']);
  assert.deepEqual(result.afterTabSwitch.tabs.map((t) => t.active), [false, true]);
  const urlBefore = page.url();
  await page.hover('[data-case="injection"] td >> nth=0');
  await page.click('[data-case="links"] td >> nth=0');
  await page.click('[data-case="links"] td >> nth=1');
  await page.waitForTimeout(300);
  result.afterClicks = { pwned: await page.evaluate(() => window.__pwned ?? null), urlUnchanged: page.url() === urlBefore };
  assert.equal(result.afterClicks.pwned, null);
  assert.equal(result.afterClicks.urlUnchanged, true);
  await page.click('[data-case="error"] .retry-button');
  await page.waitForTimeout(500);
  result.afterRetry = await inspect('error');
  await page.screenshot({ path: path.join(outDir, 'IMP-14-after-interactions.png'), fullPage: true });
  for (const id of ['xlsx-tabs', 'merged', 'links', 'error']) {
    await page.locator(`[data-case="${id}"]`).screenshot({ path: path.join(outDir, `IMP-14-case-${id}.png`) });
  }
  const unexpected = result.consoleErrors.filter((t) => !t.includes('[ExcelViewer] Error loading Excel file') && !t.includes('127.0.0.1:9'));
  result.unexpectedConsoleErrors = unexpected;
  assert.deepEqual(result.pageErrors, []);
  result.verdict = 'PASS';
} catch (error) {
  result.verdict = 'FAIL';
  result.error = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (dev) { try { process.kill(-dev.pid, 'SIGTERM'); } catch {} await delay(1500); try { process.kill(-dev.pid, 0); process.kill(-dev.pid, 'SIGKILL'); result.cleanup.devKilled = 'SIGKILL'; } catch { result.cleanup.devStopped = true; } }
  await fs.rm(installedPage, { force: true });
  result.cleanup.pageRemoved = !existsSync(installedPage);
  result.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'IMP-14-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ verdict: result.verdict, error: result.error, unexpectedConsoleErrors: result.unexpectedConsoleErrors, cleanup: result.cleanup }, null, 1));
}
