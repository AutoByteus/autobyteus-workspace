// autobyteus-525 API/E2E round 2, API-11 (temporary, ticket-owned): the real phone VNC Viewer, connected to a live node
// desktop, at every Text size. Host Chrome as a phone on node-525.mjs's node (origin http://10.0.2.2:<port> through a
// local proxy to 127.0.0.1:<port>, as from the Android emulator), paired once through the node's pairing link.
// For each width (360, 412) × step (small, standard, large, largest): open the run → ⋮ → VNC Viewer → wait until
// connected (View only) → measure → Control → measure the bar and the status row → screenshot. Then at Largest 360 px:
// Keyboard (the keyboard input takes focus) and Clipboard (the sheet opens, fits); and Largest 360 px with zh-CN labels.
// Usage: node vnc-live.mjs <outDir>     (reads /tmp/abtest525v/state.json and pairing-link.txt)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import net from 'node:net';
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const { port } = JSON.parse(fs.readFileSync('/tmp/abtest525v/state.json', 'utf8'));
const ORIGIN = `http://10.0.2.2:${port}`; const NODE_HOST = '10.0.2.2';
const sleep = ms => new Promise(r => setTimeout(r, ms)); const sel = id => `[data-testid="${id}"]`;
const proxy = http.createServer((req, res) => {
  const u = new URL(req.url); const toNode = u.hostname === NODE_HOST; const headers = { ...req.headers }; delete headers['proxy-connection'];
  const up = http.request({ host: toNode ? '127.0.0.1' : u.hostname, port: Number(u.port || 80), method: req.method, path: u.pathname + u.search, headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up);
});
proxy.on('connect', (req, sock, head) => { const [host, p] = req.url.split(':'); const up = net.connect(Number(p), host === NODE_HOST ? '127.0.0.1' : host, () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); up.write(head); up.pipe(sock); sock.pipe(up); }); up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy()); });
proxy.keepAliveTimeout = 120_000;
await new Promise(r => proxy.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, proxy: { server: `http://127.0.0.1:${proxy.address().port}`, bypass: '<-loopback>' } });
const errors = [];
const newPhone = async ({ width, step, storage, locale = 'en-US' }) => {
  const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale, timezoneId: 'UTC', ...(storage ? { storageState: storage } : {}) });
  if (step) await context.addInitScript((s) => localStorage.setItem('autobyteus.phone.textSize', s), step);
  if (locale !== 'en-US') await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${width}/${step}: pageerror ${e.message.slice(0, 160)}`));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|401/.test(m.text())) errors.push(`${width}/${step}: console ${m.text().slice(0, 160)}`); });
  return { context, page };
};
const measure = page => page.evaluate(() => {
  const b = id => { const e = [...document.querySelectorAll(`[data-testid="${id}"]`)].find(x => x.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), top: +r.top.toFixed(1), text: e.textContent.trim().slice(0, 40), sw: e.scrollWidth, cw: e.clientWidth }; };
  const de = document.documentElement; const bar = document.querySelector('[data-testid="mobile-node-desktop"] [data-testid="mobile-screen-bar"]');
  const row = document.querySelector('[data-testid="mobile-node-desktop-status-bar"]');
  const statusEl = document.querySelector('[data-testid="mobile-node-desktop-status"]');
  return { width: innerWidth, root: getComputedStyle(de).fontSize, step: de.getAttribute('data-phone-text-size'), mode: document.querySelector('[data-testid="mobile-node-desktop"]')?.getAttribute('data-mode'),
    barScrollWidth: bar?.scrollWidth, rowScrollWidth: row?.scrollWidth, title: b('mobile-screen-title'), modeButton: b('mobile-node-desktop-mode'), fullScreen: b('mobile-node-desktop-full-screen'),
    keyboard: b('mobile-node-desktop-keyboard'), clipboard: b('mobile-node-desktop-clipboard-open'), status: b('mobile-node-desktop-status'),
    statusEllipsis: statusEl ? getComputedStyle(statusEl).textOverflow : null, keyboardInBar: Boolean(bar?.querySelector('[data-testid="mobile-node-desktop-keyboard"]')),
    keyboardInRow: Boolean(row?.querySelector('[data-testid="mobile-node-desktop-keyboard"]')), sideways: de.scrollWidth > de.clientWidth,
    canvas: (() => { const c = document.querySelector('[data-testid="mobile-node-desktop-picture"] canvas'); return c ? { w: c.width, h: c.height } : null; })() };
});
const fits = m => [m.title, m.modeButton, m.fullScreen, m.keyboard, m.clipboard, m.status].filter(Boolean).every(x => x.left >= -0.5 && x.right <= m.width + 0.5) && m.barScrollWidth <= m.width && m.rowScrollWidth <= m.width && !m.sideways;
const openViewer = async (page) => {
  await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(1000);
  await page.locator(`[data-test="mobile-run-row"] ${sel('mobile-run-open')}`).first().click();
  await page.locator(sel('mobile-run-menu-button')).waitFor({ timeout: 30_000 }); await sleep(800);
  await page.locator(sel('mobile-run-menu-button')).click(); await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
  await page.locator(sel('mobile-run-menu-desktop')).click();
  await page.locator(sel('mobile-node-desktop')).waitFor({ timeout: 20_000 });
  if (await page.locator(sel('mobile-node-desktop-connect')).count()) await page.locator(sel('mobile-node-desktop-connect')).click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="mobile-node-desktop-mode"]')?.disabled, null, { timeout: 60_000 });
  await page.waitForFunction(() => { const c = document.querySelector('[data-testid="mobile-node-desktop-picture"] canvas'); return c && c.width > 100; }, null, { timeout: 60_000 }).catch(() => undefined);
  await sleep(1500);
};
const result = { origin: 'http://10.0.2.2:<node port>', layouts: [], journeys: {} };
let storage = null;
try {
  // Pair once through the node's pairing link (the phone's own page and Pair button).
  const link = fs.readFileSync('/tmp/abtest525v/pairing-link.txt', 'utf8').trim();
  { const { context, page } = await newPhone({ width: 412 });
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 });
    storage = await context.storageState(); await context.close(); }
  for (const width of [360, 412]) for (const step of ['small', 'standard', 'large', 'largest']) {
    const { context, page } = await newPhone({ width, step, storage });
    try {
      await openViewer(page);
      const view = await measure(page); await page.screenshot({ path: path.join(out, `API-11-${width}-${step}-view.png`), clip: { x: 0, y: 0, width, height: 260 } });
      await page.locator(sel('mobile-node-desktop-mode')).click();
      await page.locator(sel('mobile-node-desktop-keyboard')).waitFor({ timeout: 20_000 }); await sleep(800);
      const control = await measure(page); await page.screenshot({ path: path.join(out, `API-11-${width}-${step}-control.png`), clip: { x: 0, y: 0, width, height: 260 } });
      result.layouts.push({ width, step, view, control, viewFits: fits(view), controlFits: fits(control) });
      if (width === 360 && step === 'largest') {
        await page.locator(sel('mobile-node-desktop-keyboard')).click(); await sleep(800);
        const keyboardFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
        await page.screenshot({ path: path.join(out, 'API-11-360-largest-keyboard.png') });
        await page.keyboard.press('Escape').catch(() => undefined); await page.locator('body').click({ position: { x: 5, y: 700 } }).catch(() => undefined); await sleep(500);
        await page.locator(sel('mobile-node-desktop-clipboard-open')).click(); await sleep(1000);
        const sheet = await page.evaluate(() => { const s = document.querySelector('[data-testid="mobile-node-desktop"] [role="dialog"], [data-testid^="mobile-node-desktop-clipboard"]:not(button)'); if (!s) return null; const r = s.getBoundingClientRect(); return { testid: s.getAttribute('data-testid'), left: r.left, right: r.right, w: r.width, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
        await page.screenshot({ path: path.join(out, 'API-11-360-largest-clipboard.png') });
        result.journeys.keyboardClipboard = { keyboardFocus, sheet };
      }
    } catch (e) { result.layouts.push({ width, step, error: e.message.split('\n')[0] }); await page.screenshot({ path: path.join(out, `API-11-${width}-${step}-error.png`) }).catch(() => undefined); }
    await context.close(); await sleep(800);
  }
  { const { context, page } = await newPhone({ width: 360, step: 'largest', storage, locale: 'zh-CN' });
    try { await openViewer(page); await page.locator(sel('mobile-node-desktop-mode')).click(); await page.locator(sel('mobile-node-desktop-keyboard')).waitFor({ timeout: 20_000 }); await sleep(800);
      const control = await measure(page); await page.screenshot({ path: path.join(out, 'API-11-360-largest-control-zh.png'), clip: { x: 0, y: 0, width: 360, height: 260 } });
      result.journeys.zhLargest360 = { control, fits: fits(control) };
    } catch (e) { result.journeys.zhLargest360 = { error: e.message.split('\n')[0] }; }
    await context.close(); }
} finally {
  result.errors = errors.slice(0, 30);
  fs.writeFileSync(path.join(out, 'API-11-vnc-live.json'), JSON.stringify(result, null, 1));
  await browser.close(); proxy.close();
}
for (const l of result.layouts) console.log(JSON.stringify(l.error ? l : { width: l.width, step: l.step, viewFits: l.viewFits, controlFits: l.controlFits, root: l.control.root, kbInRow: l.control.keyboardInRow, kbInBar: l.control.keyboardInBar, fullRight: l.control.fullScreen?.right, title: l.control.title?.w, status: l.control.status?.text, clip: l.control.clipboard?.right, canvas: l.control.canvas }));
console.log(JSON.stringify(result.journeys)); console.log(JSON.stringify(result.errors.slice(0, 8)));
