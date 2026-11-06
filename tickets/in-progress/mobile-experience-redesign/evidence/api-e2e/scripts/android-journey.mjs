#!/usr/bin/env node
// Temporary, ticket-owned Android journey for autobyteus-277 (API/E2E ADR-01…ADR-04). Not a repository harness: the
// repository has no Android emulator layer, and TESTING.md allows ticket-owned automation for a device check.
//
// Needs: a held stack (`pnpm -C autobyteus-web test:e2e:mobile-shell --hold --output-dir=<dir>`; its hold.json), this
// worktree's debug APK (`autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`), a booted emulator from the
// ticket-owned AVD `autobyteus277_api35` (adb device), playwright-core from autobyteus-web.
// The emulator reaches the host's 127.0.0.1 as 10.0.2.2. A probe-owned forwarding proxy (host port P) sits between the
// emulator and alpha and records every GraphQL operation (the network log), so the phone pairs with
// `http://10.0.2.2:P/mobile`, as a phone pairs with its node's private address over plain HTTP.
// The WebView of a debug build is inspectable: its DevTools socket is forwarded to the host and Playwright attaches over
// CDP for DOM assertions; taps and the system Back key go through adb (`input tap`, `KEYCODE_BACK`).
//
// Round 2 (SR-005): ADR-05 expects the WebView between the system bars and a centre tap on ⋮ to work (REQ-011, AC-011);
// ADR-06 sends a message to a delegated task agent over the HTTP pairing (AC-003a); ADR-07 types with the keyboard open and
// measures the composer against the keyboard (C-12). Round 3: ADR-07 also asserts the conversation is not scrolled
// (F-10); ADR-08 types into the Files search and New run's folder path with the keyboard open (C-16).
// `--only=ADR-01,ADR-07` runs a subset (ADR-01 pairs first).
// Usage: node android-journey.mjs <hold.json> <apk> <output dir> [--only=…]
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [holdFile, apk, outDir] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const only = (process.argv.find(arg => arg.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const hold = JSON.parse(await fs.readFile(holdFile, 'utf8'));
const alphaPort = hold.alphaPort;
const PKG = 'org.autobyteus.mobile';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const evidence = { startedAt: new Date().toISOString(), device: null, cases: {}, network: [], notes: [] };
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…');
const save = () => fs.writeFile(path.join(outDir, 'android-journey.json'), `${redact(JSON.stringify(evidence, null, 2))}\n`);
const waitFor = async (what, fn, ms = 60_000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { if (await fn()) return; } catch (error) { last = error; } await sleep(250); }
  throw new Error(`Timed out: ${what}${last ? ` (${last.message})` : ''}`);
};
await fs.mkdir(outDir, { recursive: true });

// The counting proxy (HTTP and WebSocket upgrade) in front of alpha.
const proxy = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    if (req.method === 'POST' && req.url.startsWith('/graphql')) {
      let op = 'unparsed'; let windowVar;
      try { const parsed = JSON.parse(body.toString('utf8')); op = parsed.operationName ?? 'anonymous'; windowVar = parsed.variables?.limitPerAgent; } catch { /* not JSON */ }
      evidence.network.push({ at: Date.now(), op, window: windowVar === undefined ? 'omitted' : windowVar });
    }
    const upstream = http.request({ host: '127.0.0.1', port: alphaPort, method: req.method, path: req.url, headers: { ...req.headers, host: `127.0.0.1:${alphaPort}` } }, (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers); up.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); });
    upstream.end(body);
  });
});
proxy.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(alphaPort, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries({ ...req.headers, host: `127.0.0.1:${alphaPort}` }).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket); socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy());
});
const proxyPort = await new Promise(resolve => proxy.listen(0, '127.0.0.1', () => resolve(proxy.address().port)));
const phoneBase = `http://10.0.2.2:${proxyPort}`;
const historyReads = (from, to = Infinity) => evidence.network.filter(entry => entry.op === 'ListWorkspaceRunHistory' && entry.at >= from && entry.at <= to);

// Native UI helpers (uiautomator).
const dumpUi = () => {
  for (let attempt = 0; ; attempt += 1) {
    try { adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml'); return adb('shell', 'cat', '/sdcard/ui.xml'); } catch (error) { if (attempt >= 4) throw error; execFileSync('sleep', ['1']); }
  }
};
const tapText = async (pattern, ms = 30_000) => {
  let bounds = null;
  await waitFor(`native "${pattern}"`, async () => {
    const xml = dumpUi();
    const match = [...xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)].find(m => new RegExp(pattern, 'i').test(m[1]));
    if (match) bounds = match.slice(2).map(Number);
    return Boolean(match);
  }, ms);
  adb('shell', 'input', 'tap', String(Math.round((bounds[0] + bounds[2]) / 2)), String(Math.round((bounds[1] + bounds[3]) / 2)));
};
const screenshot = name => { execFileSync('sh', ['-c', `adb exec-out screencap -p > "${path.join(outDir, `${name}.png`)}"`]); };
const back = () => adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');

// The WebView over CDP: a minimal client (Playwright's connectOverCDP needs browser-level commands a WebView lacks).
let browser = null;
const cdpPage = async () => {
  let target = null;
  await waitFor('the /mobile page target', async () => {
    const list = await (await fetch('http://127.0.0.1:9333/json')).json();
    target = list.find(entry => entry.type === 'page' && entry.url.includes('/mobile')) ?? null;
    return Boolean(target);
  }, 60_000);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const send = (method, params = {}) => new Promise(resolve => { id += 1; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (fn, arg) => {
    const expression = `(${fn.toString()})(${JSON.stringify(arg ?? null)})`;
    const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description ?? 'evaluate failed');
    return reply.result?.result?.value;
  };
  const locator = selector => ({
    count: () => evaluate(sel => document.querySelectorAll(sel).length, selector),
    innerText: () => evaluate(sel => document.querySelector(sel)?.innerText ?? '', selector),
    waitFor: async ({ timeout = 30_000 } = {}) => waitFor(`"${selector}"`, async () => (await evaluate(sel => { const el = document.querySelector(sel); return Boolean(el && el.getClientRects().length); }, selector)), timeout),
    first: () => locator(selector),
  });
  return { evaluate, locator, url: () => evaluate(() => location.href),
    goto: async url => { await evaluate(href => { location.href = href; }, url); await sleep(3_000); },
    close: () => socket.close() };
};
const attach = async () => {
  if (browser) { browser.close(); browser = null; }
  let socketName = null;
  await waitFor('the WebView DevTools socket', async () => {
    const pid = adb('shell', 'pidof', PKG).trim();
    socketName = adb('shell', 'cat', '/proc/net/unix').split('\n').map(line => line.trim().split(/\s+/).pop()).find(name => name === `@webview_devtools_remote_${pid}`)?.slice(1) ?? null;
    return Boolean(pid && socketName);
  }, 60_000);
  adb('forward', '--remove-all');
  adb('forward', 'tcp:9333', `localabstract:${socketName}`);
  browser = await cdpPage();
  return browser;
};
const screenOf = page => page.evaluate(() => (document.querySelector('[data-testid="mobile-file-viewer"]') ? 'file'
  : document.querySelector('[data-testid="mobile-team-reference-viewer"]') ? 'reference'
    : document.querySelector('[data-testid="mobile-files"]') ? 'files' : document.querySelector('[data-testid="mobile-messages"]') ? 'messages'
      : document.querySelector('[data-testid="mobile-run-screen"]') ? 'run' : document.querySelector('[data-testid="mobile-pairing-bootstrap"]') ? 'pairing'
        : document.querySelector('[data-testid="mobile-run-tree"]')?.offsetParent ? 'list' : 'other'));
/** A tap as the user makes it: adb at the element's center in device pixels (CSS px × devicePixelRatio). */
/** The system bars, the keyboard and the WebView, in device pixels. */
const frames = () => {
  const out = adb('shell', 'dumpsys', 'window');
  const frame = type => { const m = new RegExp(`type=${type} frame=\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\][^}]*? visible=(true|false)`).exec(out); return m ? { top: Number(m[2]), bottom: Number(m[4]), visible: m[5] === 'true' } : null; };
  const webView = /class="android\.webkit\.WebView"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(dumpUi());
  return { statusBars: frame('statusBars'), navigationBars: frame('navigationBars'), ime: frame('ime'), webView: webView ? { top: Number(webView[2]), bottom: Number(webView[4]) } : null };
};
/** The status bar's bottom edge in device pixels (Android 15 draws the app under it: edge-to-edge). */
let statusBarBottom = null;
const statusBar = () => {
  if (statusBarBottom === null) statusBarBottom = Number(/statusBars frame=\[0,0\]\[\d+,(\d+)\]/.exec(adb('shell', 'dumpsys', 'window'))?.[1] ?? 0);
  return statusBarBottom;
};
/** `where`: 'center' taps the element's center; 'visible' (default) taps below the status bar when the center is under it. */
const tapElement = async (page, selector, text = null, where = 'visible') => {
  await waitFor(`${selector} ${text ?? ''}`, async () => page.evaluate(({ sel, text }) => [...document.querySelectorAll(sel)].some(node => node.getClientRects().length && (!text || node.textContent.includes(text))), { sel: selector, text }), 30_000);
  const box = await page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find(node => !text || node.textContent.includes(text)); if (!el) return null;
    el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, dpr: window.devicePixelRatio }; }, { sel: selector, text });
  if (!box) throw new Error(`no element ${selector} ${text ?? ''}`);
  await sleep(300);
  const offset = await webViewOffset();
  let y = offset.y + box.y * box.dpr;
  if (where === 'visible' && y <= statusBar() + 8) y = statusBar() + 24;
  adb('shell', 'input', 'tap', String(Math.round(offset.x + box.x * box.dpr)), String(Math.round(y)));
  return { x: Math.round(offset.x + box.x * box.dpr), y: Math.round(y), centerY: Math.round(offset.y + box.y * box.dpr) };
};
let cachedOffset = null;
const webViewOffset = async () => {
  if (cachedOffset) return cachedOffset;
  const xml = dumpUi();
  const match = /class="android\.webkit\.WebView"[^>]*?bounds="\[(\d+),(\d+)\]/.exec(xml);
  cachedOffset = match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
  return cachedOffset;
};
const toList = async (page) => {
  for (let n = 0; n < 5 && (await screenOf(page)) !== 'list'; n += 1) { back(); await sleep(1_200); }
};
const runCase = async (id, fn) => {
  if (only.length && !only.includes(id)) return;
  try { evidence.cases[id] = { result: 'Pass', ...(await fn()) }; } catch (error) { evidence.cases[id] = { result: 'Fail', error: error.message }; try { screenshot(`${id}-failure`); } catch { /* none */ } }
  console.log(`[android] ${id} ${evidence.cases[id].result}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
  await save();
};

try {
  evidence.device = { model: adb('shell', 'getprop', 'ro.product.model').trim(), sdk: adb('shell', 'getprop', 'ro.build.version.sdk').trim(),
    webview: (adb('shell', 'dumpsys', 'webviewupdate').match(/Current WebView package \(name, version\): \(([^)]*)\)/) ?? [])[1] ?? null };
  adb('install', '-r', apk);
  adb('shell', 'pm', 'clear', PKG);
  const session = await (await fetch(`${hold.alpha}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serverBaseUrl: phoneBase, trustedPrivateHttpAcknowledged: true }) })).json();
  const link = session.mobileUrl;

  let page = null;
  await runCase('ADR-01', async () => {
    // The pairing link shared into the app (Android text share), the HTTP acknowledgement, Save and open, Pair.
    adb('shell', 'am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', link, '-n', `${PKG}/.MainActivity`);
    // No screenshot here: the screen shows the pairing link (QR-005).
    await tapText('^I understand HTTP');
    await tapText('^Save and open$');
    page = await attach();
    await page.locator('[data-testid="mobile-pair-button"]').waitFor({ timeout: 60_000 });
    screenshot('ADR-01-2-pairing');
    await tapElement(page, '[data-testid="mobile-pair-button"]');
    const pairedAt = Date.now();
    await page.locator('[data-test="mobile-run-row"]').first().waitFor({ timeout: 60_000 });
    const firstRowsAfterPairMs = Date.now() - pairedAt;
    await sleep(1_500);
    screenshot('ADR-01-3-run-list');
    const rows = await page.locator('[data-test="mobile-run-row"]').count();
    const layout = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio, horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      secure: window.isSecureContext, randomUUID: typeof crypto.randomUUID }));
    if (rows < 5) throw new Error(`rows: ${rows}`);
    return { rows, firstRowsAfterPairMs, layout };
  });

  await runCase('ADR-02', async () => {
    // The system Back key walks file → Files → run → list, and reference → Messages → run → list.
    const walk = [];
    const step = async () => { back(); await sleep(1_200); walk.push(await screenOf(page)); };
    await toList(page);
    const team = `[data-testid="mobile-run-row-team:${hold.runs.delivery}"] [data-testid="mobile-run-open"]`;
    await tapElement(page, team);
    await page.locator('[data-testid="mobile-run-screen"][data-state="open"]').waitFor({ timeout: 30_000 });
    await tapElement(page, '[data-testid="mobile-run-menu-button"]');
    await tapElement(page, '[data-testid="mobile-run-menu-files"]');
    await page.locator('[data-testid="mobile-files-row"]').first().waitFor({ timeout: 30_000 });
    await tapElement(page, '[data-testid="mobile-files-row"]', 'docs');
    await sleep(800);
    await tapElement(page, '[data-testid="mobile-files-row"]', 'guide.md');
    await page.locator('[data-testid="mobile-file-viewer"]').waitFor({ timeout: 30_000 });
    screenshot('ADR-02-1-file-open');
    for (let n = 0; n < 3; n += 1) await step();
    screenshot('ADR-02-2-back-to-list');
    const filesWalk = walk.splice(0);
    await tapElement(page, team);
    await page.locator('[data-testid="mobile-run-screen"][data-state="open"]').waitFor({ timeout: 30_000 });
    await tapElement(page, '[data-testid="mobile-run-menu-button"]');
    await tapElement(page, '[data-testid="mobile-run-menu-messages"]');
    await page.locator('[data-testid="mobile-team-reference-row"]').first().waitFor({ timeout: 30_000 });
    await tapElement(page, '[data-testid="mobile-team-reference-row"]');
    await page.locator('[data-testid="mobile-team-reference-viewer"]').waitFor({ timeout: 30_000 });
    screenshot('ADR-02-3-reference-open');
    for (let n = 0; n < 3; n += 1) await step();
    const referenceWalk = walk.splice(0);
    if (JSON.stringify(filesWalk) !== JSON.stringify(['files', 'run', 'list']) || JSON.stringify(referenceWalk) !== JSON.stringify(['messages', 'run', 'list'])) {
      throw new Error(`Back walks: ${JSON.stringify({ filesWalk, referenceWalk })}`);
    }
    return { filesWalk, referenceWalk };
  });

  await runCase('ADR-05', async () => {
    // The top bar under Android 15's status bar: a tap at the ⋮'s center, and one below the status bar.
    await toList(page);
    await tapElement(page, `[data-testid="mobile-run-row-team:${hold.runs.delivery}"] [data-testid="mobile-run-open"]`);
    await page.locator('[data-testid="mobile-run-screen"][data-state="open"]').waitFor({ timeout: 30_000 });
    await sleep(800);
    const bar = await page.evaluate(() => { const r = document.querySelector('[data-testid="mobile-run-menu-button"]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, dpr: window.devicePixelRatio, innerHeight: window.innerHeight }; });
    screenshot('ADR-05-1-run-screen-under-status-bar');
    const atCenter = await tapElement(page, '[data-testid="mobile-run-menu-button"]', null, 'center');
    await sleep(1_200);
    const openedByCenterTap = await page.locator('[data-testid="mobile-run-menu"]').count();
    // Close the menu with ⋮ itself (the system Back key would also leave the run screen; recorded below).
    if (openedByCenterTap) { await page.evaluate(() => document.querySelector('[data-testid="mobile-run-menu-button"]').click()); await sleep(800); }
    const below = await tapElement(page, '[data-testid="mobile-run-menu-button"]');
    await sleep(1_200);
    const openedByLowerTap = await page.locator('[data-testid="mobile-run-menu"]').count();
    screenshot('ADR-05-2-menu-after-lower-tap');
    const bars = frames();
    const facts = { bars, statusBarBottomPx: statusBar(), menuButtonCss: bar, menuButtonDevicePx: { top: Math.round(bar.top * bar.dpr), bottom: Math.round(bar.bottom * bar.dpr) }, atCenter, openedByCenterTap, below, openedByLowerTap,
      underStatusBarCss: Math.max(0, Math.round(statusBar() / bar.dpr - bar.top)) };
    const clear = bars.webView && bars.statusBars && bars.webView.top >= bars.statusBars.bottom && (!bars.navigationBars?.visible || bars.webView.bottom <= bars.navigationBars.top);
    if (openedByCenterTap === 0 || !clear) throw Object.assign(new Error(`⋮ centre tap or bars: ${JSON.stringify(facts)}`), {});
    return facts;
  });

  await runCase('ADR-06', async () => {
    // A message to a delegated task agent, typed and sent with real taps over the HTTP pairing (AC-003a, DEC-014).
    await toList(page);
    await tapElement(page, `[data-testid="mobile-run-row-agent:${hold.runs.ptm}/agent:${hold.runs.writerRun}"] [data-testid="mobile-run-open"]`);
    await page.locator('[data-testid="mobile-run-screen"][data-state="open"]').waitFor({ timeout: 30_000 });
    await sleep(1_000);
    await tapElement(page, '[data-testid="mobile-run-conversation"] textarea');
    await sleep(1_500);
    const marker = `ADR06${Date.now().toString(36).toUpperCase()}`;
    adb('shell', 'input', 'text', `From%sAndroid%s${marker}`);
    await sleep(800);
    back(); // closes the keyboard
    await sleep(1_000);
    await tapElement(page, '[data-testid="mobile-run-conversation"] button[aria-label="Send message"]');
    let reached = false;
    await waitFor('the message on the node', async () => {
      const body = await (await fetch(`${hold.alpha}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        query: 'query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}',
        variables: { h: hold.runs.ptm, m: '/release_notes_writer', a: hold.runs.writerRun } }) })).json();
      return (reached = JSON.stringify(body).includes(marker));
    }, 30_000).catch(() => undefined);
    const shown = (await page.locator('[data-testid="mobile-run-conversation"]').innerText()).includes(marker);
    const context = await page.evaluate(() => ({ secure: window.isSecureContext, randomUUID: typeof crypto.randomUUID }));
    screenshot('ADR-06-message-sent');
    if (!reached || !shown) throw new Error(`message: ${JSON.stringify({ reached, shown, context })}`);
    return { marker, reached, shown, context };
  });

  await runCase('ADR-07', async () => {
    // Typing with the keyboard open: the composer sits right above the keyboard, with no double padding (C-12).
    await toList(page);
    await tapElement(page, `[data-testid="mobile-run-row-team:${hold.runs.delivery}"] [data-testid="mobile-run-open"]`);
    await page.locator('[data-testid="mobile-run-screen"][data-state="open"]').waitFor({ timeout: 30_000 });
    await sleep(1_000);
    const closed = frames();
    await tapElement(page, '[data-testid="mobile-run-conversation"] textarea');
    await sleep(2_500);
    adb('shell', 'input', 'text', 'typing%swith%sthe%skeyboard');
    await sleep(1_000);
    const open = frames();
    const composer = await page.evaluate(() => { const area = document.querySelector('[data-testid="mobile-run-conversation"] textarea'); const r = area.getBoundingClientRect();
      const send = document.querySelector('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').getBoundingClientRect();
      return { textareaBottom: r.bottom, sendBottom: send.bottom, innerHeight: window.innerHeight, dpr: window.devicePixelRatio,
        safeBottom: getComputedStyle(document.documentElement).getPropertyValue('--probe') || null, focused: document.activeElement === area, value: area.value }; });
    screenshot('ADR-07-keyboard-open');
    const layout = await page.evaluate(() => {
      const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName, testid: el.getAttribute('data-testid'), cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 90), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), pb: cs.paddingBottom, mb: cs.marginBottom }; };
      const screen = document.querySelector('[data-testid="mobile-run-screen"]');
      const area = document.querySelector('[data-testid="mobile-run-conversation"] textarea');
      const chain = []; for (let el = area; el && el !== document.body; el = el.parentElement) chain.push(box(el));
      return { innerHeight: window.innerHeight, visualViewport: window.visualViewport ? { height: Math.round(visualViewport.height), offsetTop: Math.round(visualViewport.offsetTop) } : null,
        scrollY: window.scrollY, conversationScrollTop: document.querySelector('[data-testid="mobile-run-conversation"]')?.scrollTop ?? null, screen: box(screen), screenChildren: [...(screen?.children ?? [])].map(box),
        conversationChildren: [...(document.querySelector('[data-testid="mobile-run-conversation"]')?.children ?? [])].map(box), chain,
        keyboardInset: getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset') || null,
        virtualKeyboard: 'virtualKeyboard' in navigator ? { overlaysContent: navigator.virtualKeyboard.overlaysContent, rect: navigator.virtualKeyboard.boundingRect?.height ?? null } : null };
    });
    // Control: the conversation container scrolled back to 0, the keyboard still open.
    const control = await page.evaluate(() => { const c = document.querySelector('[data-testid="mobile-run-conversation"]'); c.scrollTop = 0;
      const send = document.querySelector('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').getBoundingClientRect(); return { sendBottom: send.bottom, scrollTop: c.scrollTop }; });
    screenshot('ADR-07-control-scrolltop-0');
    back();
    await sleep(800);
    const webViewTop = open.webView?.top ?? 0;
    const controlGapToKeyboard = open.ime?.visible ? open.ime.top - Math.round(webViewTop + control.sendBottom * composer.dpr) : null;
    const sendBottomPx = Math.round(webViewTop + composer.sendBottom * composer.dpr);
    const gapToKeyboard = open.ime?.visible ? open.ime.top - sendBottomPx : null;
    const facts = { sdk: evidence.device.sdk, closed, open, composer, sendBottomPx, gapToKeyboard, controlGapToKeyboard, layout };
    // C-12: the window is not padded twice (the WebView ends at the keyboard; the page is the WebView's height).
    facts.noDoublePadding = Boolean(open.ime?.visible && open.webView && Math.abs(open.webView.bottom - open.ime.top) <= 4 && Math.abs(layout.screen.h - layout.innerHeight) <= 1);
    // The composer sits right above the keyboard, with the conversation above it.
    facts.composerAboveKeyboard = gapToKeyboard !== null && gapToKeyboard >= 0 && gapToKeyboard <= 120 && (layout.conversationScrollTop ?? 0) === 0;
    if (!facts.noDoublePadding || !facts.composerAboveKeyboard || !composer.value.includes('typing with the keyboard')) {
      throw new Error(`keyboard: ${JSON.stringify(facts)}`);
    }
    return facts;
  });

  await runCase('ADR-08', async () => {
    // C-16: the Files search and New run's folder path, typed into with the keyboard open.
    const inView = sel => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), innerHeight: window.innerHeight, scrollY: window.scrollY, focused: document.activeElement === el, value: el.value ?? null }; }, sel);
    await toList(page);
    await tapElement(page, `[data-testid="mobile-run-row-team:${hold.runs.delivery}"] [data-testid="mobile-run-open"]`);
    await page.locator('[data-testid="mobile-run-screen"][data-state="open"]').waitFor({ timeout: 30_000 });
    await tapElement(page, '[data-testid="mobile-run-menu-button"]');
    await tapElement(page, '[data-testid="mobile-run-menu-files"]');
    await page.locator('[data-testid="mobile-files-row"]').first().waitFor({ timeout: 30_000 });
    await tapElement(page, '[data-testid="mobile-files-search-open"]');
    await sleep(2_000);
    adb('shell', 'input', 'text', 'app');
    await sleep(2_500);
    const filesBars = frames();
    const search = await inView('[data-testid="mobile-files-search"]');
    const result = await page.evaluate(() => { const row = [...document.querySelectorAll('[data-testid="mobile-files-row"]')].find(r => r.textContent.includes('app.ts')); if (!row) return null; const r = row.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
    const filesBar = await inView('[data-testid="mobile-files"] [data-testid="mobile-screen-bar"]');
    screenshot('ADR-08-1-files-search-keyboard');
    back(); await sleep(1_000);
    await toList(page);
    await tapElement(page, '[data-testid="mobile-new-run-button"]');
    await page.locator('[data-testid="mobile-new-run"]').waitFor({ timeout: 20_000 });
    await tapElement(page, '[data-testid="mobile-run-workspace-select-toggle"]');
    await page.locator('[data-testid="mobile-run-workspace-path-input"]').waitFor({ timeout: 20_000 });
    await tapElement(page, '[data-testid="mobile-run-workspace-path-input"]');
    await sleep(2_000);
    adb('shell', 'input', 'text', '/tmp/c16');
    await sleep(2_000);
    const sheetBars = frames();
    const pathInput = await inView('[data-testid="mobile-run-workspace-path-input"]');
    const sheetHeader = await page.evaluate(() => { const h = document.querySelector('[data-testid="mobile-run-workspace-select-sheet"] [role="dialog"] header'); if (!h) return null; const r = h.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
    screenshot('ADR-08-2-folder-path-keyboard');
    back(); await sleep(800);
    const facts = { filesBars, search, searchResult: result, filesBar, sheetBars, pathInput, sheetHeader };
    const ok = filesBars.ime?.visible && sheetBars.ime?.visible
      && search && search.focused && search.value === 'app' && search.top >= 0 && search.bottom <= search.innerHeight && filesBar && filesBar.top === 0
      && result && result.bottom <= search.innerHeight
      && pathInput && pathInput.focused && pathInput.value === '/tmp/c16' && pathInput.top >= 0 && pathInput.bottom <= pathInput.innerHeight && sheetHeader && sheetHeader.top >= 0;
    if (!ok) throw new Error(`C-16: ${JSON.stringify(facts)}`);
    return facts;
  });

  await runCase('ADR-04', async () => {
    // The app in the background: no history reads; the node changes meanwhile; back in front: current at once.
    await toList(page);
    await sleep(12_000);
    const t0 = Date.now(); await sleep(15_000);
    const inFront = historyReads(t0, Date.now()).length;
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
    await sleep(2_000);
    const hiddenFrom = Date.now();
    // Something new on the node while the phone is in the background.
    const created = await (await fetch(`${hold.alpha}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      query: 'mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success runId}}',
      variables: { i: { agentDefinitionId: hold.ids.checker, workspaceRootPath: hold.workspace, autoExecuteTools: true, runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null } } }) })).json();
    await sleep(25_000);
    const hiddenTo = Date.now();
    const inBackground = historyReads(hiddenFrom, hiddenTo).length;
    adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
    const frontAt = Date.now();
    await sleep(3_000);
    const readsBackInFront = historyReads(frontAt).map(entry => entry.at - frontAt);
    page = await attach();
    let listed = false;
    await waitFor('the run created in the background is listed', async () => (listed = (await page.locator(`[data-testid="mobile-run-row-agent:${created.data?.createAgentRun?.runId}"]`).count()) > 0), 15_000).catch(() => undefined);
    const listedAfterMs = Date.now() - frontAt;
    screenshot('ADR-04-back-in-front');
    if (inBackground !== 0 || !listed) throw new Error(`background reads ${inBackground}, listed ${listed}`);
    return { listed, listedAfterMs, inFront15s: inFront, inBackground25s: inBackground, readsAfterFront: readsBackInFront, created: created.data?.createAgentRun ?? created.errors };
  });

  await runCase('ADR-03', async () => {
    // App restart keeps the pairing; a desktop route shows the notice above the run list; Unpair from the sheet.
    adb('shell', 'am', 'force-stop', PKG);
    adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
    await sleep(3_000);
    // A saved node opens on launch, or is one tap away on the connection screen.
    const xml = dumpUi();
    if (/text="Open"/.test(xml) && !/android\.webkit\.WebView/.test(xml)) await tapText('^Open$');
    page = await attach();
    await page.locator('[data-testid="mobile-run-tree"], [data-testid="mobile-pairing-bootstrap"]').first().waitFor({ timeout: 60_000 });
    const afterRestart = await screenOf(page);
    screenshot('ADR-03-1-after-restart');
    await page.goto(`${phoneBase}/mobile?unsupported=desktopWorkspace`);
    await page.locator('[data-testid="mobile-unsupported-feature"]').waitFor({ timeout: 60_000 });
    const notice = (await page.locator('[data-testid="mobile-unsupported-feature"]').innerText()).replace(/\s+/g, ' ').trim();
    screenshot('ADR-03-2-notice');
    await tapElement(page, '[data-testid="mobile-node-button"]');
    await page.locator('[data-testid="mobile-unpair"]').waitFor({ timeout: 20_000 });
    await tapElement(page, '[data-testid="mobile-unpair"]');
    await sleep(1_000);
    screenshot('ADR-03-3-unpair-tapped');
    const confirmShown = await page.locator('[data-testid="mobile-unpair-confirm"]').count();
    const confirmOnTop = confirmShown ? await page.evaluate(() => { const button = [...document.querySelectorAll('[data-testid="mobile-unpair-confirm"] button')].find(b => b.textContent.trim() === 'Unpair');
      const r = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }) : false;
    // The user's tap on the confirmation's Unpair.
    if (confirmShown) await tapElement(page, '[data-testid="mobile-unpair-confirm"] button.bg-red-600');
    await sleep(2_000);
    const afterUnpairTap = await screenOf(page);
    screenshot('ADR-03-4-after-unpair-tap');
    const facts = { afterRestart, notice, confirmShown, confirmOnTop, afterUnpairTap };
    if (afterRestart !== 'list' || !notice.endsWith('The desktop workspace isn’t on the phone. Your runs are here.') || !confirmOnTop || afterUnpairTap !== 'pairing') throw new Error(`restart, notice, unpair: ${JSON.stringify(facts)}`);
    return facts;
  });
} catch (error) {
  evidence.error = error.stack ?? String(error);
} finally {
  if (browser) browser.close();
  try { adb('forward', '--remove-all'); } catch { /* none */ }
  proxy.close();
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(`android journey done${evidence.error ? `: ${evidence.error}` : ''}`);
  process.exit(0);
}
