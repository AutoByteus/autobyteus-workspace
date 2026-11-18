// autobyteus-534 API/E2E (from autobyteus-525) (temporary, ticket-owned; not a package probe): a phone in host Chrome on the held probe stack.
// Walks the phone screens and records, per screen, every visible text element (its nearest data-testid, its text, its
// computed font size and box) plus a screenshot. Used by API-05 (Standard: base bundle vs head bundle, same node and data),
// API-06 (the beta.9 step carried over a bundle update) and API-07 (head Standard vs head Largest: what does not scale).
//
// The phone reaches alpha as the Android emulator does: its origin is http://10.0.2.2:<alpha port>; Chrome sends that
// origin's requests through a local proxy to 127.0.0.1:<alpha port>, keeping Host and Origin (so the node sees the same
// request as from the emulator). The phone's stored pairing is copied from the emulator's WebView (STORAGE file, never
// printed or written to evidence).
//
// Usage: node screens.mjs walk  <label> <step|none> <outDir>       the screen walk (writes <outDir>/<label>.json + PNGs)
//        node screens.mjs upgrade <outDir>                           API-06 (needs the base bundle served at start)
// Env: HOLD (hold.json), STORAGE (phone localStorage JSON), SWAP (script that swaps the served bundle: `swap.sh base|head`)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import net from 'node:net';
import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const hold = JSON.parse(fs.readFileSync(process.env.HOLD, 'utf8'));
const storage = fs.existsSync(process.env.STORAGE) ? JSON.parse(fs.readFileSync(process.env.STORAGE, 'utf8')) : {};
const PORT = hold.alphaPort; const ORIGIN = `http://10.0.2.2:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = id => `[data-testid="${id}"]`;
const [cmd, ...args] = process.argv.slice(2);

// ---- proxy: 10.0.2.2:<port> -> 127.0.0.1:<port> (HTTP and CONNECT tunnels for WebSockets) ----
const NODE_HOST = '10.0.2.2';
const proxy = http.createServer((req, res) => {
  const u = new URL(req.url); const toNode = u.hostname === NODE_HOST;
  const headers = { ...req.headers }; delete headers['proxy-connection'];
  const up = http.request({ host: toNode ? '127.0.0.1' : u.hostname, port: Number(u.port || 80), method: req.method, path: u.pathname + u.search, headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', e => { proxyErrors.push(`${req.method} ${u.host}${u.pathname} ${e.code}`); if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up);
});
proxy.on('connect', (req, sock, head) => {
  const [host, port] = req.url.split(':');
  const up = net.connect(Number(port), host === NODE_HOST ? '127.0.0.1' : host, () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); up.write(head); up.pipe(sock); sock.pipe(up); });
  up.on('error', e => { proxyErrors.push(`CONNECT ${req.url} ${e.code}`); sock.destroy(); }); sock.on('error', () => up.destroy());
});
proxy.keepAliveTimeout = 120_000;
const proxyErrors = [];
await new Promise(r => proxy.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  proxy: { server: `http://127.0.0.1:${proxy.address().port}`, bypass: '<-loopback>' } });
const errors = [];
const phone = async ({ paired = true, step = null, width = 412, height = 915 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(({ entries, step, paired }) => {
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    if (paired) for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); else localStorage.clear();
    if (step === 'none') localStorage.removeItem('autobyteus.phone.textSize'); else if (step) localStorage.setItem('autobyteus.phone.textSize', step);
  }, { entries: storage, step, paired });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('requestfailed', r => errors.push(`requestfailed: ${r.url().replace(/pairing=[^&]+/, 'pairing=…').replace(/access_token=[^&]+/, 'access_token=…').slice(0, 120)} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) errors.push(`status ${r.status()}: ${r.request().method()} ${r.url().replace(/access_token=[^&]+/, 'access_token=…').slice(0, 120)}`); });
  return { context, page };
};

const fingerprint = page => page.evaluate(() => {
  const shown = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const out = []; const seen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || !shown(el)) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const anchor = el.closest('[data-testid]')?.getAttribute('data-testid') ?? '';
    const base = `${anchor}|${el.tagName.toLowerCase()}|${own.slice(0, 40)}`; const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    const s = getComputedStyle(el);
    out.push({ key: `${base}#${n}`, text: own.slice(0, 60), fontSize: parseFloat(s.fontSize), lineHeight: s.lineHeight,
      monaco: Boolean(el.closest('.monaco-editor')), preview: Boolean(el.closest('[data-testid^="mobile-text-size-"]')),
      cls: (el.getAttribute('class') ?? '').slice(0, 120), x: +r.left.toFixed(2), y: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
  }
  const de = document.documentElement;
  return { root: getComputedStyle(de).fontSize, step: de.getAttribute('data-phone-text-size'), sideways: de.scrollWidth > de.clientWidth, texts: out };
});

const toList = async page => {
  for (let i = 0; i < 6 && !(await page.locator(`${sel('mobile-run-list')}:visible`).count()); i++) {
    const back = page.locator(`${sel('mobile-screen-back')}:visible, ${sel('mobile-run-back')}:visible, ${sel('mobile-new-run-close')}:visible`).first();
    if (await back.count()) await back.click(); else await page.goBack(); await sleep(500);
  }
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 30_000 });
};
const openRun = async (page, name) => {
  await toList(page);
  await page.locator(`[data-test="mobile-run-row"]:has([data-testid="mobile-run-name"]:text-is("${name}")) ${sel('mobile-run-open')}`).first().click();
  await page.locator(sel('mobile-run-conversation')).waitFor({ timeout: 30_000 });
  await sleep(1200);
};
const menuOpen = async (page, view) => {
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
  if (view) await page.locator(sel(`mobile-run-menu-${view}`)).click();
};
const back = async page => { await page.locator(`${sel('mobile-screen-back')}:visible`).last().click(); await sleep(500); };

const walk = async (label, step, outDir) => {
  fs.mkdirSync(outDir, { recursive: true });
  const screens = {}; const skipped = {};
  const rec = async (page, key) => { await sleep(700); screens[key] = await fingerprint(page); await page.screenshot({ path: path.join(outDir, `${label}-${key}.png`) }); };
  let recover = async () => undefined;
  const tryScreen = async (key, fn) => { try { await fn(); } catch (e) { skipped[key] = e.message.split('\n')[0]; await recover().catch(r => { skipped[`${key} (recovery)`] = r.message.split('\n')[0]; }); } };
  const { context, page } = await phone({ step });
  await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 });
  await sleep(2500);
  await tryScreen('run-list', () => rec(page, 'run-list'));
  await tryScreen('on-this-phone-menu', async () => {
    if (!(await page.locator(sel('mobile-on-this-phone-button')).count())) throw new Error('no On this phone button (base bundle)');
    await page.locator(sel('mobile-on-this-phone-button')).click(); await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ timeout: 10_000 });
    await rec(page, 'on-this-phone-menu'); await page.keyboard.press('Escape'); await sleep(300);
  });
  await tryScreen('connection-sheet', async () => {
    await page.locator(sel('mobile-node-button')).click(); await page.locator(sel('mobile-connection-sheet')).waitFor({ timeout: 10_000 });
    await rec(page, 'connection-sheet');
    await page.locator(sel('mobile-unpair')).click(); await page.locator(sel('mobile-unpair-confirm')).waitFor({ timeout: 10_000 });
    await rec(page, 'unpair-confirm');
    await page.locator(sel('mobile-unpair-confirm')).getByRole('button', { name: 'Cancel', exact: true }).click();
    if (await page.locator(sel('mobile-connection-sheet')).count()) await page.locator(sel('mobile-sheet-close')).first().click();
    await page.locator(sel('mobile-connection-sheet')).waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
  });
  await tryScreen('new-run', async () => {
    await page.locator(sel('mobile-new-run-button')).click(); await page.locator(sel('mobile-new-run')).waitFor({ timeout: 10_000 }); await sleep(800);
    await rec(page, 'new-run');
    await page.locator(sel('mobile-run-target-select-toggle')).click(); await page.locator(sel('mobile-run-target-select-sheet')).waitFor({ timeout: 10_000 });
    await rec(page, 'new-run-agent-sheet');
    await page.locator(`${sel('mobile-run-target-select-sheet')} ${sel('mobile-sheet-close')}`).click();
    await page.locator(sel('mobile-new-run-close')).click(); await page.locator(sel('mobile-new-run')).waitFor({ state: 'detached', timeout: 10_000 });
  });
  recover = async () => { await page.keyboard.press('Escape'); await sleep(300); await openRun(page, process.env.RUN_NAME ?? 'Project Task Manager'); };
  await tryScreen('conversation', async () => { await openRun(page, process.env.RUN_NAME ?? 'Project Task Manager'); await rec(page, 'conversation'); });
  await tryScreen('run-menu', async () => { await menuOpen(page); await rec(page, 'run-menu'); await page.keyboard.press('Escape'); await sleep(300); });
  for (const [view, root] of [['artifacts', 'mobile-artifacts'], ['files', 'mobile-files'], ['messages', 'mobile-messages'], ['activity', 'mobile-activity'], ['settings', 'mobile-run-settings']]) {
    await tryScreen(view, async () => {
      await menuOpen(page, view); await page.locator(sel(root)).waitFor({ timeout: 20_000 }); await sleep(1000);
      await rec(page, view);
      if (view === 'activity') {
        // Unfold the first Activity item so its labels (and any 11 px chips) are shown.
        const item = page.locator(`${sel(root)} button[aria-expanded="false"]`).first();
        if (await item.count()) { await item.click(); await sleep(600); await rec(page, 'activity-open'); }
      }
      if (view === 'files') {
        const src = page.locator(sel('mobile-files-row')).filter({ hasText: /^\s*src\s*$/ }).first();
        if (await src.count()) {
          await src.click(); await sleep(1500);
          const names = await page.locator(sel('mobile-files-row')).allInnerTexts();
          const code = names.map(n => n.trim()).find(n => /\.(ts|js|json|py|vue)$/.test(n));
          if (!code) throw new Error(`no code file under src: ${names.join(', ')}`);
          screens['file-name'] = { root: null, step: null, sideways: false, texts: [], name: code };
          await page.locator(sel('mobile-files-row')).filter({ hasText: code }).first().click();
          await page.locator(`${sel('mobile-file-viewer')} .monaco-editor .view-line`).first().waitFor({ timeout: 30_000 });
          await rec(page, 'file-viewer'); await back(page);
          if (!(await page.locator(`${sel('mobile-files')}:visible`).count())) await back(page);
        }
      }
      await back(page);
      await page.locator(`${sel('mobile-run-conversation')}:visible`).waitFor({ timeout: 10_000 }).catch(() => undefined);
    });
  }
  await context.close();
  await tryScreen('setup', async () => {
    const u = await phone({ paired: false, step });
    await u.page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await u.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 60_000 });
    screens.setup = await fingerprint(u.page); await u.page.screenshot({ path: path.join(outDir, `${label}-setup.png`) });
    await u.context.close();
  });
  const result = { proxyErrors, label, step, origin: 'http://10.0.2.2:<alpha port>', viewport: '412x915@2', at: new Date().toISOString(), skipped, errors, screens };
  fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(result, null, 1));
  return result;
};

const sizes = page => page.evaluate(() => {
  const px = el => (el ? parseFloat(getComputedStyle(el).fontSize) : null);
  const name = [...document.querySelectorAll('[data-testid="mobile-run-name"]')].find(el => el.getBoundingClientRect().width > 0);
  return { stored: localStorage.getItem('autobyteus.phone.textSize'), step: document.documentElement.getAttribute('data-phone-text-size'), root: px(document.documentElement),
    runName: px(name), feed: px(document.querySelector('[data-testid="mobile-run-conversation"] .conv-feed')),
    homeButton: Boolean(document.querySelector('[data-testid="mobile-on-this-phone-button"]')) };
});

const upgrade = async (outDir) => {
  // API-06: the beta.9-era page (base bundle): run ⋮ → Text size → Largest; then the node's bundle is updated; the phone reloads.
  fs.mkdirSync(outDir, { recursive: true });
  const log = [];
  const { context, page } = await phone({ step: 'none' });
  await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 });
  await openRun(page, process.env.RUN_NAME ?? 'Project Task Manager');
  log.push({ at: 'base, before', ...(await sizes(page)) });
  await menuOpen(page);
  await page.locator(sel('mobile-text-size-largest')).click(); await sleep(600);
  await page.screenshot({ path: path.join(outDir, 'API-06-1-base-run-menu-largest.png') });
  await page.keyboard.press('Escape'); await sleep(400);
  log.push({ at: 'base, Largest chosen in the run ⋮', ...(await sizes(page)) });
  await toList(page); await sleep(500);
  log.push({ at: 'base, run list', ...(await sizes(page)) });
  await page.screenshot({ path: path.join(outDir, 'API-06-2-base-list-after-largest.png') });
  execFileSync(process.env.SWAP, ['head'], { stdio: 'inherit' });
  await page.addInitScript(() => {
    const record = () => { if (window.__first || !document.querySelector('[data-testid="mobile-run-list"], [data-testid="mobile-run-screen"]')) return;
      window.__first = { root: getComputedStyle(document.documentElement).fontSize, step: document.documentElement.getAttribute('data-phone-text-size') }; };
    new MutationObserver(record).observe(document, { childList: true, subtree: true });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(1500);
  log.push({ at: 'head after the update, run list', ...(await sizes(page)), firstScreen: await page.evaluate(() => window.__first ?? null) });
  await page.screenshot({ path: path.join(outDir, 'API-06-3-head-list.png') });
  await page.locator(sel('mobile-on-this-phone-button')).click(); await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ timeout: 10_000 });
  const pressed = await page.evaluate(() => document.querySelector('[data-testid="mobile-text-size"] [aria-pressed="true"]')?.getAttribute('data-testid') ?? null);
  await page.screenshot({ path: path.join(outDir, 'API-06-4-head-menu.png') });
  await page.keyboard.press('Escape');
  await openRun(page, process.env.RUN_NAME ?? 'Project Task Manager');
  log.push({ at: 'head after the update, conversation', ...(await sizes(page)), pressed });
  await page.screenshot({ path: path.join(outDir, 'API-06-5-head-conversation.png') });
  await context.close();
  const result = { log, errors };
  fs.writeFileSync(path.join(outDir, 'API-06-upgrade.json'), JSON.stringify(result, null, 1));
  return result;
};

const chips = async (step, outDir) => {
  // API-07b: Activity with items on the phone: every element with the 11 px class, its computed size, per run, at <step>.
  fs.mkdirSync(outDir, { recursive: true });
  const { context, page } = await phone({ step });
  await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(2000);
  const names = [...new Set((await page.locator(`[data-test="mobile-run-row"] ${sel('mobile-run-name')}`).allInnerTexts()).map(n => n.trim()))];
  const found = [];
  for (const name of names) {
    try {
      await openRun(page, name);
      const entries = await page.evaluate(() => { document.querySelector('[data-testid="mobile-run-menu-button"]')?.click(); return null; });
      await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
      if (!(await page.locator(sel('mobile-run-menu-activity')).count())) { await page.keyboard.press('Escape'); continue; }
      await page.locator(sel('mobile-run-menu-activity')).click(); await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 }); await sleep(1500);
      for (const b of await page.locator(`${sel('mobile-activity')} button[aria-expanded="false"]`).all()) { await b.click().catch(() => undefined); await sleep(300); }
      const r = await page.evaluate(() => ({ items: document.querySelectorAll('[data-testid="mobile-activity"] li, [data-testid="mobile-activity"] article').length,
        small: [...document.querySelectorAll('.text-\\[11px\\]')].filter(e => e.getBoundingClientRect().width > 0).map(e => ({ text: e.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(e).fontSize) })) }));
      if (r.small.length) { const f = `${step}-activity-${found.length}.png`; await page.screenshot({ path: path.join(outDir, f) }); found.push({ run: name, ...r, shot: f }); }
      else found.push({ run: name, items: r.items, small: [] });
      await back(page);
    } catch (e) { found.push({ run: name, error: e.message.split('\n')[0] }); }
  }
  await context.close();
  return { step, root: null, found, errors: errors.filter(e => !/401/.test(e)).slice(0, 20) };
};

const pairHost = async () => {
  // Round 3: the host phone pairs through the held stack's own link (http://10.0.2.2:<port>, single use, 5 minutes) and
  // keeps the phone's storage for the walks (STORAGE file; not evidence).
  const { context, page } = await phone({ paired: false });
  await page.goto(hold.links.emulator, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 });
  fs.writeFileSync(process.env.STORAGE, await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))));
  await context.close();
  return { paired: true };
};

const menuState = page => page.evaluate(() => {
  const m = document.querySelector('[data-testid="mobile-on-this-phone-menu"]');
  return m ? { label: m.getAttribute('aria-label'), header: m.querySelector('[data-testid="mobile-text-size-header"]')?.textContent?.trim() ?? null,
    heading: Boolean(m.querySelector('[data-testid="mobile-on-this-phone-title"]')), text: m.innerText.replace(/\s+/g, ' ').trim(),
    buttons: [...m.querySelectorAll('[data-testid^="mobile-text-size-"][aria-pressed]')].map(b => ({ id: b.getAttribute('data-testid'), label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') })),
    focused: document.activeElement?.getAttribute('data-testid') ?? null } : null;
});
const smallUpgrade = async (outDir) => {
  // API-05 (534): a beta.10 phone (the base bundle, bd2053ee51) chooses Small on the run list's ⋮; the node's bundle is
  // updated to this ticket's; the phone reloads. Expected: Standard everywhere from the first screen, Standard marked,
  // the stored value untouched, every other stored key unchanged, no console error.
  fs.mkdirSync(outDir, { recursive: true });
  const { context, page } = await phone({ step: 'none' });
  await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(1500);
  const log = [];
  await page.locator(sel('mobile-on-this-phone-button')).click(); await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ timeout: 10_000 });
  await page.locator(sel('mobile-text-size-small')).click(); await sleep(600);
  log.push({ at: 'base, Small chosen', ...(await sizes(page)), menu: await menuState(page) });
  await page.screenshot({ path: path.join(outDir, 'API-05-1-base-menu-small.png') });
  await page.keyboard.press('Escape'); await sleep(400);
  const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  execFileSync(process.env.SWAP, ['head'], { stdio: 'inherit' });
  await page.addInitScript(() => {
    const record = () => { if (window.__first || !document.querySelector('[data-testid="mobile-run-list"], [data-testid="mobile-run-screen"]')) return;
      window.__first = { root: getComputedStyle(document.documentElement).fontSize, step: document.documentElement.getAttribute('data-phone-text-size') }; };
    new MutationObserver(record).observe(document, { childList: true, subtree: true });
  });
  const errorsBefore = errors.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(2000);
  log.push({ at: 'head after the update, run list', ...(await sizes(page)), firstScreen: await page.evaluate(() => window.__first ?? null) });
  await page.screenshot({ path: path.join(outDir, 'API-05-2-head-list.png') });
  await page.locator(sel('mobile-on-this-phone-button')).click(); await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ timeout: 10_000 }); await sleep(500);
  log.push({ at: 'head, menu', menu: await menuState(page) });
  await page.screenshot({ path: path.join(outDir, 'API-05-3-head-menu.png') });
  await page.keyboard.press('Escape'); await sleep(400);
  await openRun(page, process.env.RUN_NAME ?? 'Project Task Manager');
  log.push({ at: 'head, conversation', ...(await sizes(page)) });
  await page.screenshot({ path: path.join(outDir, 'API-05-4-head-conversation.png') });
  const after = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const storage = { keys: keys.length, changed: keys.filter(k => before[k] !== after[k]), textSize: { before: before['autobyteus.phone.textSize'], after: after['autobyteus.phone.textSize'] } };
  await context.close();
  const result = { log, storage, errorsAfterUpdate: errors.slice(errorsBefore).filter(e => !/401|favicon/.test(e)) };
  fs.writeFileSync(path.join(outDir, 'API-05-small-upgrade.json'), JSON.stringify(result, null, 1));
  return result;
};
const menuZh = async (outDir) => {
  // API-06 (534): the menu with zh-CN labels, at Standard and at Largest (412 and 360 px).
  fs.mkdirSync(outDir, { recursive: true }); const out = [];
  for (const [width, step] of [[412, 'standard'], [360, 'largest']]) {
    const { context, page } = await phone({ step, width, height: 800 });
    await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await page.goto(`${ORIGIN}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 90_000 }); await sleep(1500);
    await page.locator(sel('mobile-on-this-phone-button')).click(); await page.locator(sel('mobile-on-this-phone-menu')).waitFor({ timeout: 10_000 }); await sleep(500);
    const m = await menuState(page);
    const box = await page.evaluate(() => { const r = document.querySelector('[data-testid="mobile-on-this-phone-menu"]').getBoundingClientRect(); return { left: r.left, right: r.right, width: innerWidth }; });
    await page.screenshot({ path: path.join(outDir, `API-06-zh-${width}-${step}-menu.png`) });
    out.push({ width, step, menu: m, box, visibleOnThisPhone: /本机设置|On this phone/.test(m.text) });
    await context.close();
  }
  fs.writeFileSync(path.join(outDir, 'API-06-menu-zh.json'), JSON.stringify({ out, errors: errors.filter(e => !/401|favicon/.test(e)) }, null, 1));
  return out;
};

try {
  const r = cmd === 'walk' ? await walk(args[0], args[1], args[2]) : cmd === 'upgrade' ? await upgrade(args[0]) : cmd === 'chips' ? await chips(args[0], args[1]) : cmd === 'pair' ? await pairHost() : cmd === 'small-upgrade' ? await smallUpgrade(args[0]) : cmd === 'menu-zh' ? await menuZh(args[0]) : (() => { throw new Error(`unknown ${cmd}`); })();
  console.log(JSON.stringify(cmd === 'walk' && r.screens ? { label: r.label, screens: Object.keys(r.screens), skipped: r.skipped, errors: r.errors.slice(0, 10) } : r, null, 1));
} finally { await browser.close(); proxy.close(); }
