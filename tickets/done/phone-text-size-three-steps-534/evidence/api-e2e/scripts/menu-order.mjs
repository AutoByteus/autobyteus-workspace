// autobyteus-534 API/E2E API-08 (temporary, ticket-owned): the run's ⋮ order (SR-002, REQ-005/AC-005) on the real phone
// page of node-534 (a node with a node desktop): the agent run (no Messages) and the Team's lead (Messages), each with VNC
// Viewer. Reads the menu's entries in order, takes a screenshot, then opens Settings and VNC Viewer from the menu (views
// open by id). At Standard 412 px and at Largest 360 px. Host Chrome as a phone through the 10.0.2.2 proxy, paired with
// the node's link.   Usage: node menu-order.mjs <outDir>   (reads /tmp/abtest534v/state.json, pairing-link.txt)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import net from 'node:net';
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const { port } = JSON.parse(fs.readFileSync('/tmp/abtest534v/state.json', 'utf8'));
const ORIGIN = `http://10.0.2.2:${port}`; const NODE_HOST = '10.0.2.2';
const sleep = ms => new Promise(r => setTimeout(r, ms)); const sel = id => `[data-testid="${id}"]`;
const proxy = http.createServer((req, res) => {
  const u = new URL(req.url); const headers = { ...req.headers }; delete headers['proxy-connection'];
  const up = http.request({ host: u.hostname === NODE_HOST ? '127.0.0.1' : u.hostname, port: Number(u.port || 80), method: req.method, path: u.pathname + u.search, headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up);
});
proxy.on('connect', (req, sock, head) => { const [host, p] = req.url.split(':'); const up = net.connect(Number(p), host === NODE_HOST ? '127.0.0.1' : host, () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); up.write(head); up.pipe(sock); sock.pipe(up); }); up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy()); });
proxy.keepAliveTimeout = 120_000;
await new Promise(r => proxy.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, proxy: { server: `http://127.0.0.1:${proxy.address().port}`, bypass: '<-loopback>' } });
const errors = [];
const newPhone = async ({ width = 412, height = 915, step, storage }) => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC', ...(storage ? { storageState: storage } : {}) });
  if (step) await context.addInitScript((s) => localStorage.setItem('autobyteus.phone.textSize', s), step);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror ${e.message.slice(0, 160)}`));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|401|secure context/.test(m.text())) errors.push(`console ${m.text().slice(0, 160)}`); });
  return { context, page };
};
const toList = async page => {
  for (let i = 0; i < 6 && !(await page.locator(`${sel('mobile-run-list')}:visible`).count()); i++) {
    const back = page.locator(`${sel('mobile-screen-back')}:visible, ${sel('mobile-run-back')}:visible`).first();
    if (await back.count()) await back.click(); else await page.goBack(); await sleep(500);
  }
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 30_000 });
};
const rows = page => page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => ({ key: li.getAttribute('data-testid').replace('mobile-run-row-', ''),
  depth: Number(li.getAttribute('data-depth')), expanded: li.getAttribute('aria-expanded'), name: li.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() })));
const openByName = async (page, name, depth) => {
  await toList(page);
  if (depth > 0) { const team = (await rows(page)).find(r => r.depth === 0 && r.name === 'Desk Team'); if (team?.expanded === 'false') { await page.locator(`${sel(`mobile-run-row-${team.key}`)} ${sel('mobile-run-toggle')}`).click(); await sleep(1500); } }
  let row = null; for (let i = 0; i < 40 && !(row = (await rows(page)).find(r => r.depth === depth && r.name.toLowerCase() === name.toLowerCase())); i++) await sleep(500);
  if (!row) throw new Error(`no row ${name} at depth ${depth}: ${JSON.stringify(await rows(page))}`);
  await page.locator(`${sel(`mobile-run-row-${row.key}`)} ${sel('mobile-run-open')}`).click();
  await page.locator(sel('mobile-run-menu-button')).waitFor({ timeout: 30_000 }); await sleep(1000);
};
const menuEntries = async (page) => {
  await page.locator(sel('mobile-run-menu-button')).click(); await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 }); await sleep(400);
  return page.evaluate(() => { const m = document.querySelector('[data-testid="mobile-run-menu"]'); const r = m.getBoundingClientRect();
    return { entries: [...m.querySelectorAll('[role="menuitem"]')].map(i => i.textContent.trim()), ids: [...m.querySelectorAll('[role="menuitem"]')].map(i => i.getAttribute('data-testid')),
      box: { left: r.left, right: r.right, width: innerWidth }, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
};
const result = { cases: [] };
try {
  const link = fs.readFileSync('/tmp/abtest534v/pairing-link.txt', 'utf8').trim();
  let storage;
  { const { context, page } = await newPhone({});
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 120_000 }); await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); storage = await context.storageState(); await context.close(); }
  for (const [width, height, step] of [[412, 915, 'standard'], [360, 800, 'largest']]) {
    const { context, page } = await newPhone({ width, height, step, storage });
    await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(2000);
    for (const [label, name, depth] of [['agent run', 'Desktop Helper', 0], ['Team lead', 'lead', 1]]) {
      try {
        await openByName(page, name, depth);
        const menu = await menuEntries(page);
        const shot = `API-08-${width}-${step}-${label.replace(' ', '-')}-menu.png`; await page.screenshot({ path: path.join(out, shot) });
        // Settings and VNC Viewer open their own views from this order.
        await page.locator(sel('mobile-run-menu-settings')).click(); const settings = await page.locator(sel('mobile-run-settings')).waitFor({ timeout: 20_000 }).then(() => true, () => false);
        await page.locator(`${sel('mobile-screen-back')}:visible`).last().click(); await sleep(800);
        await page.locator(sel('mobile-run-menu-button')).click(); await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
        await page.locator(sel('mobile-run-menu-desktop')).click(); const vnc = await page.locator(sel('mobile-node-desktop')).waitFor({ timeout: 20_000 }).then(() => true, () => false);
        await page.locator(`${sel('mobile-screen-back')}:visible`).last().click(); await sleep(800);
        result.cases.push({ width, step, label, ...menu, settingsOpened: settings, vncOpened: vnc, shot });
      } catch (e) { result.cases.push({ width, step, label, error: e.message.split('\n')[0] }); await page.screenshot({ path: path.join(out, `API-08-${width}-${label.replace(' ', '-')}-error.png`) }).catch(() => undefined); }
    }
    await context.close();
  }
} finally { result.errors = errors.slice(0, 20); fs.writeFileSync(path.join(out, 'API-08-menu-order.json'), JSON.stringify(result, null, 1)); await browser.close(); proxy.close(); }
for (const c of result.cases) console.log(JSON.stringify(c.error ? c : { width: c.width, step: c.step, label: c.label, entries: c.entries, box: c.box, sideways: c.sideways, settingsOpened: c.settingsOpened, vncOpened: c.vncOpened }));
console.log('errors', JSON.stringify(result.errors));
