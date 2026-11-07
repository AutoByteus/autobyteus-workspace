#!/usr/bin/env node
// API-04 (autobyteus-403): the paired phone shell on the browser's OWN network stack, through the two product paths a phone
// uses, against the mobile-shell probe's --hold stack (alpha + beta, this worktree's dist, scripted AGY runs):
//   LAN  — Chrome reaches alpha as http://192.168.77.10:<alpha port> (--host-resolver-rules MAP to 127.0.0.1): the
//          browser's real Host and Origin are 192.168.77.10:<port> on HTTP and WebSocket, as on a phone on the LAN.
//   TS   — a Tailscale-Serve-shaped HTTPS reverse proxy (self-signed TLS for alpha.tail-probe.ts.net; Host preserved;
//          X-Forwarded-Host = incoming Host, X-Forwarded-Proto https, X-Forwarded-For; WebSocket upgrades forwarded),
//          from Chrome (MAP) and from WebKit (the WKWebView engine; through an HTTP CONNECT proxy, as WebKit has no
//          host mapping).
// Journey per (browser, path): pair; run list (Show older); open an agent run and send a message (it must reach the
// node); a Team run (its coordinator); an Org run (its first member); the delegated tree under the PTM run and a task
// agent opened from it; a remote run on beta; Files (folder, file text); New run (+, folder, agent, Create run, first
// message reaches the node). Records every WebSocket the phone opened (route pattern; for Chrome the handshake Origin and
// status via CDP; for TS the proxy's own upgrade log with Origin, Host and the node's status line), and greps alpha's and
// beta's logs for refusal lines written during the journeys.
// Usage: node abx403-phone-origins-probe.mjs <worktree> <output dir>
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, readFileSync, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const [worktree, outputDirArg] = process.argv.slice(2);
const outputDir = path.resolve(outputDirArg);
await fs.mkdir(outputDir, { recursive: true });
const webDir = path.join(worktree, 'autobyteus-web');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium, webkit } = require('playwright-core');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LAN_HOST = '192.168.77.10';
const TS_HOST = 'alpha.tail-probe.ts.net';
const PHONE_ROUTES = ['/ws/agent/:runId', '/ws/agent-team/:teamRunId', '/ws/agent-org/:orgRunId', '/ws/agent-collaboration/:runId', '/ws/projects',
  '/ws/agent-package-definitions', '/ws/file-explorer/:workspaceId', '/ws/node-desktop'];
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/access_token=[^&\s"']+/g, 'access_token=…');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs; let last;
  while (Date.now() < deadline) { try { if (await fn()) return; } catch (error) { last = error; } await sleep(200); }
  throw new Error(`Timed out waiting for ${description}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const toPattern = (pathname) => {
  const rules = [[/^\/ws\/agent\/[^/]+$/, '/ws/agent/:runId'], [/^\/ws\/agent-team\/[^/]+$/, '/ws/agent-team/:teamRunId'], [/^\/ws\/agent-org\/[^/]+$/, '/ws/agent-org/:orgRunId'],
    [/^\/ws\/agent-collaboration\/[^/]+$/, '/ws/agent-collaboration/:runId'], [/^\/ws\/file-explorer\/[^/]+$/, '/ws/file-explorer/:workspaceId'], [/^\/ws\/terminal\/[^/]+$/, '/ws/terminal/:sessionId'],
    [/^\/ws\/applications\//, '/ws/applications/…']];
  for (const [re, pattern] of rules) if (re.test(pathname)) return pattern;
  return pathname;
};

const evidence = { startedAt: new Date().toISOString(), result: 'Fail', worktree, journeys: {}, proxyUpgrades: [], logCheck: {}, cleanup: {}, error: null };
const save = () => fs.writeFile(path.join(outputDir, 'API-04-phone-origins.json'), `${redact(JSON.stringify(evidence, null, 2))}\n`);
const children = new Set();
const servers = [];
const openSockets = new Set();
const track = socket => { openSockets.add(socket); socket.on('close', () => openSockets.delete(socket)); return socket; };
let hold; let holdDir;

const startHold = async () => {
  holdDir = path.join(outputDir, 'hold-stack');
  await fs.mkdir(holdDir, { recursive: true });
  const log = createWriteStream(path.join(holdDir, 'hold-probe.log'));
  const child = spawn(process.execPath, [path.join(webDir, 'tests/e2e/mobile-shell-probe.mjs'), '--hold', `--output-dir=${holdDir}`], { cwd: webDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR ?? os.tmpdir() } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  children.add(child);
  await waitFor('the hold stack', async () => { if (child.exitCode !== null) throw new Error(`hold exited ${child.exitCode}`); return existsSync(path.join(holdDir, 'hold.json')); }, 600_000);
  hold = JSON.parse(readFileSync(path.join(holdDir, 'hold.json'), 'utf8'));
  hold.child = child;
};

const alphaRest = async (method, route, body) => {
  const response = await fetch(`${hold.alpha}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed };
};
const gql = async (baseUrl, query, variables) => (await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()).data;
const storedHas = async (baseUrl, runId, marker) => JSON.stringify((await gql(baseUrl, 'query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId }))?.getRunProjection?.conversation ?? '').includes(marker);
const pairingLink = async (serverBaseUrl) => {
  const settings = await alphaRest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  assert(settings.status === 200, 'Phone Access on', settings);
  const session = await alphaRest('POST', '/remote-access/pairing-sessions', { serverBaseUrl, ...(serverBaseUrl.startsWith('http:') ? { trustedPrivateHttpAcknowledged: true } : {}) });
  assert(session.status === 201 && session.body.mobileUrl, 'pairing session', session);
  return session.body.mobileUrl;
};

/** Tailscale-Serve-shaped reverse proxy: TLS ends here; Host kept; X-Forwarded-*; upgrades forwarded. */
const startTsProxy = async () => {
  const certDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'abx403-ts-cert-')));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', `/CN=${TS_HOST}`, '-addext', `subjectAltName=DNS:${TS_HOST}`,
    '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem')], { stdio: 'ignore' });
  const port = await freePort();
  const forwarded = (req) => ({ ...req.headers, 'x-forwarded-host': req.headers.host, 'x-forwarded-proto': 'https', 'x-forwarded-for': req.socket.remoteAddress });
  const server = https.createServer({ key: readFileSync(path.join(certDir, 'key.pem')), cert: readFileSync(path.join(certDir, 'cert.pem')) }, (req, res) => {
    const up = http.request({ host: '127.0.0.1', port: hold.alphaPort, method: req.method, path: req.url, headers: forwarded(req) }, (upRes) => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(up);
  });
  server.on('upgrade', (req, socket, head) => {
    track(socket);
    const entry = { at: new Date().toISOString(), journey: currentJourney, path: redact(req.url), pattern: toPattern(new URL(req.url, 'http://x').pathname), origin: req.headers.origin ?? null, host: req.headers.host, status: null };
    evidence.proxyUpgrades.push(entry);
    const up = track(net.connect(hold.alphaPort, '127.0.0.1', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(forwarded(req)).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(item => `${k}: ${item}`)), '', ''];
      up.write(lines.join('\r\n')); if (head?.length) up.write(head);
      up.once('data', chunk => { entry.status = chunk.toString('latin1').split('\r\n', 1)[0]; });
      socket.pipe(up); up.pipe(socket);
    }));
    const end = () => { socket.destroy(); up.destroy(); };
    up.on('error', end); socket.on('error', end);
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  servers.push(server);
  evidence.tsProxy = { origin: `https://${TS_HOST}:${port}`, upstream: hold.alpha, certDir };
  return { port, certDir };
};

/** HTTP CONNECT proxy for WebKit: tunnels <TS_HOST>:<port> to the TS proxy; everything else is refused (never the network). */
const startConnectProxy = async (tsPort) => {
  const port = await freePort();
  const server = http.createServer((req, res) => { res.writeHead(403); res.end(); });
  server.on('connect', (req, socket, head) => {
    track(socket);
    const [host, targetPort] = req.url.split(':');
    if (host !== TS_HOST || Number(targetPort) !== tsPort) { evidence.connectRefused = evidence.connectRefused ?? []; evidence.connectRefused.push(req.url); socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const up = track(net.connect(tsPort, '127.0.0.1', () => { socket.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if (head?.length) up.write(head); socket.pipe(up); up.pipe(socket); }));
    const end = () => { socket.destroy(); up.destroy(); };
    up.on('error', end); socket.on('error', end);
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  servers.push(server);
  return port;
};

let currentJourney = 'setup';
const sel = id => `[data-testid="${id}"]`;
const rowSel = key => `[data-testid="mobile-run-row-${key}"]`;
const runScreen = page => page.evaluate(() => {
  const s = document.querySelector('[data-testid="mobile-run-screen"]');
  return s ? { state: s.getAttribute('data-state'), name: s.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? null,
    chip: s.querySelector('[data-test="remote-node-chip"]')?.textContent?.trim() ?? null, conversation: s.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? '' } : { state: null };
});
const toList = async (page) => {
  for (let step = 0; step < 6 && !(await page.locator(`${sel('mobile-run-list')}:visible`).count()); step += 1) {
    const back = page.locator(`${sel('mobile-screen-back')}:visible, ${sel('mobile-run-back')}:visible, ${sel('mobile-new-run-close')}:visible`).first();
    if (await back.count()) await back.click(); else await page.goBack();
    await sleep(400);
  }
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
};
const showOlder = async (page) => { const fold = page.locator(sel('mobile-run-list-show-older')); if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click(); await sleep(400); };
const openRow = async (page, key) => {
  await toList(page); await showOlder(page);
  await page.locator(`${rowSel(key)} ${sel('mobile-run-open')}`).click({ timeout: 20_000 });
  await waitFor(`the run screen of ${key}`, async () => (await runScreen(page)).state === 'open', 30_000);
  await sleep(600);
  return runScreen(page);
};
const composerSend = async (page, text) => {
  const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
  const send = page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last();
  await waitFor('Send enabled', async () => { if (!(await box.inputValue().catch(() => ''))) await box.fill(text).catch(() => undefined); return (await send.count()) > 0 && await send.isEnabled(); }, 20_000);
  await send.click();
};

const journey = async ({ name, browserType, launchOptions, contextOptions, origin }) => {
  currentJourney = name;
  const record = { name, origin, steps: {}, sockets: [], handshakes: [], browserErrors: [], blockedLocalhost8000: 0, startedAt: new Date().toISOString() };
  evidence.journeys[name] = record;
  const browser = await browserType.launch({ headless: true, ...launchOptions });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: browserType === chromium, hasTouch: true, locale: 'en-US', timezoneId: 'UTC', ...contextOptions });
    // The phone bundle's app-wide definitions feed defaults to localhost:8000 (known, pre-existing): never let it reach a
    // process on this machine that is not ours.
    await context.route(/^https?:\/\/localhost:8000\//, route => { record.blockedLocalhost8000 += 1; return route.abort('connectionrefused'); });
    await context.routeWebSocket(/^wss?:\/\/localhost:8000\//, ws => { record.blockedLocalhost8000 += 1; ws.close(); });
    const page = await context.newPage();
    page.on('pageerror', error => record.browserErrors.push(redact(`pageerror: ${error.message}`)));
    page.on('console', message => { if (message.type() === 'error') record.browserErrors.push(redact(`console: ${message.text()}${message.location()?.url ? ` @ ${message.location().url}` : ''}`)); });
    page.on('requestfailed', request => { record.failedRequests = record.failedRequests ?? []; record.failedRequests.push(redact(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`)); });
    page.on('websocket', ws => { const u = new URL(ws.url()); if (u.host === 'localhost:8000') return; const entry = { url: redact(ws.url()), pattern: toPattern(u.pathname), closed: false, framesReceived: 0 }; record.sockets.push(entry);
      ws.on('framereceived', () => { entry.framesReceived += 1; }); ws.on('close', () => { entry.closed = true; }); });
    if (browserType === chromium) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      const byId = new Map();
      cdp.on('Network.webSocketCreated', e => byId.set(e.requestId, { url: redact(e.url), pattern: toPattern(new URL(e.url).pathname) }));
      cdp.on('Network.webSocketWillSendHandshakeRequest', e => { const h = byId.get(e.requestId) ?? {}; h.origin = e.request.headers.Origin ?? e.request.headers.origin ?? null; h.host = e.request.headers.Host ?? null; byId.set(e.requestId, h); });
      cdp.on('Network.webSocketHandshakeResponseReceived', e => { const h = byId.get(e.requestId) ?? {}; h.status = e.response.status; byId.set(e.requestId, h); });
      record.handshakesMap = byId;
    }
    const runs = hold.runs;
    const step = async (id, fn) => {
      try { record.steps[id] = { result: 'Pass', ...(await fn()) }; } catch (error) { record.steps[id] = { result: 'Fail', error: error.message, details: error.details ?? null }; }
      await page.screenshot({ path: path.join(outputDir, `API-04-${name}-${id}.png`) }).catch(() => undefined);
    };
    await step('pair', async () => {
      const link = await pairingLink(origin);
      assert(new URL(link).origin === origin, 'the pairing link is on this path', redact(link));
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
      await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
      return { pageOrigin: await page.evaluate(() => location.origin), secure: await page.evaluate(() => window.isSecureContext) };
    });
    await step('runList', async () => {
      await sleep(1_500); await showOlder(page);
      const keys = await page.locator('[data-test="mobile-run-row"]').evaluateAll(list => list.map(li => li.getAttribute('data-testid').replace('mobile-run-row-', '')));
      const top = keys.filter(key => !key.includes('/'));
      assert(top.includes(`agent:${runs.ptm}`) && top.includes(`team:${runs.delivery}`) && top.includes(`org:${runs.org}`) && top.length >= 7, 'Agent, Team and Org runs listed', top);
      return { topLevel: top.length, rows: keys.length };
    });
    await step('agentRun', async () => {
      const screen = await openRow(page, `agent:${runs.plain[0]}`);
      const marker = `ABX403-${name}-AGENT-${randomUUID().slice(0, 6)}`;
      await composerSend(page, `Phone origin check. Marker ${marker}`);
      await waitFor('the message on screen', async () => (await runScreen(page)).conversation.includes(marker), 30_000);
      await waitFor('the message stored on alpha', () => storedHas(hold.alpha, runs.plain[0], marker), 30_000);
      return { name: screen.name, marker, storedOnAlpha: true };
    });
    await step('teamRun', async () => { const s = await openRow(page, `team:${runs.delivery}`); assert(s.name === 'lead' && s.conversation.length > 0, 'the Team run opens its coordinator', s); return { name: s.name }; });
    await step('orgRun', async () => { const s = await openRow(page, `org:${runs.org}`); assert(s.name === 'planner', 'the Org run opens its first member', s); return { name: s.name }; });
    await step('delegatedTree', async () => {
      await toList(page); await showOlder(page);
      const ptmKey = `agent:${runs.ptm}`;
      const children = await page.locator(`[data-testid^="mobile-run-row-${ptmKey}/"]`).evaluateAll(list => list.map(li => li.getAttribute('data-testid').replace('mobile-run-row-', '')));
      assert(children.includes(`${ptmKey}/agent:${runs.writerRun}`) && children.includes(`${ptmKey}/team:${runs.squadRun}`) && children.some(key => key.endsWith(runs.remoteAgentRun)), 'the PTM run\'s delegated rows (task agent, task team, remote run)', children);
      const s = await openRow(page, `${ptmKey}/agent:${runs.writerRun}`);
      assert(/release notes writer/i.test(s.name ?? ''), 'the task agent opens', s);
      return { children: children.length, opened: s.name };
    });
    await step('remoteRun', async () => {
      const ptmKey = `agent:${runs.ptm}`;
      await toList(page); await showOlder(page);
      const key = (await page.locator(`[data-testid^="mobile-run-row-${ptmKey}/"]`).evaluateAll(list => list.map(li => li.getAttribute('data-testid').replace('mobile-run-row-', '')))).find(k => k.endsWith(runs.remoteAgentRun));
      const s = await openRow(page, key);
      assert(s.chip?.includes('beta-node'), 'the remote run with its node chip', s);
      const marker = `ABX403-${name}-REMOTE-${randomUUID().slice(0, 6)}`;
      await composerSend(page, `Remote check. Marker ${marker}`);
      await waitFor('the message stored on beta', () => storedHas(hold.beta, runs.remoteAgentRun, marker), 45_000);
      return { chip: s.chip, marker, storedOnBeta: true };
    });
    await step('files', async () => {
      await openRow(page, `team:${runs.delivery}`);
      await page.locator(sel('mobile-run-menu-button')).click();
      await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
      await page.locator(sel('mobile-run-menu-files')).click();
      await page.locator(sel('mobile-files-list')).waitFor({ timeout: 30_000 });
      const top = (await page.locator(sel('mobile-files-row')).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
      await page.locator(sel('mobile-files-row')).filter({ hasText: 'docs' }).first().click();
      await page.locator(sel('mobile-files-row')).filter({ hasText: 'guide.md' }).first().click({ timeout: 15_000 });
      await page.locator(sel('mobile-file-viewer')).waitFor({ timeout: 20_000 });
      await waitFor('the file text', async () => (await page.locator(sel('mobile-file-viewer')).innerText()).includes('GUIDE-TEXT-7731'), 20_000);
      // Close the file viewer (an overlay above the Files screen) before the next step walks back to the list.
      await page.locator(`${sel('mobile-file-viewer')} ${sel('mobile-screen-back')}`).click();
      await page.locator(sel('mobile-files-list')).waitFor({ timeout: 10_000 });
      return { top: top.slice(0, 8), fileText: 'GUIDE-TEXT-7731' };
    });
    await step('newRun', async () => {
      await toList(page);
      await page.locator(sel('mobile-new-run-button')).click();
      await page.locator(sel('mobile-new-run')).waitFor({ timeout: 20_000 });
      await page.locator(sel('mobile-run-workspace-select-toggle')).click();
      await page.locator(sel('mobile-run-workspace-select-option')).filter({ hasText: hold.workspace }).first().click();
      await sleep(500);
      await page.locator(sel('mobile-run-target-select-toggle')).click();
      await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Project Task Manager' }).first().click();
      await waitFor('Create run enabled', async () => !(await page.locator(sel('mobile-run-launch')).isDisabled()), 20_000);
      await page.locator(sel('mobile-run-launch')).click();
      await waitFor('the new run\'s screen', async () => { const s = await runScreen(page); return s.state === 'open' && s.name === 'Project Task Manager'; }, 30_000);
      const marker = `ABX403-${name}-NEWRUN-${randomUUID().slice(0, 6)}`;
      await composerSend(page, `First message. Marker ${marker}`);
      await waitFor('the first message on screen', async () => (await runScreen(page)).conversation.includes(marker), 30_000);
      await sleep(3_000);
      await toList(page); await sleep(1_000);
      const topKey = await page.locator('[data-test="mobile-run-row"]').first().getAttribute('data-testid');
      const newRunId = topKey?.replace('mobile-run-row-agent:', '');
      await waitFor('the first message stored on alpha', () => storedHas(hold.alpha, newRunId, marker), 30_000);
      return { newRunId, marker, storedOnAlpha: true };
    });
    await sleep(1_000);
    if (record.handshakesMap) { record.handshakes = [...record.handshakesMap.values()]; delete record.handshakesMap; }
    await context.close();
  } finally {
    await browser.close().catch(() => undefined);
    record.finishedAt = new Date().toISOString();
    await save();
  }
};

const refusalLines = async (file, sinceIso) => {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  return text.split('\n').filter(line => /Remote Access request refused|Remote Access WebSocket rejected/.test(line)).map(redact);
};

try {
  await startHold();
  evidence.hold = { alpha: hold.alpha, beta: hold.beta, runs: hold.runs };
  const alphaLog = path.join(holdDir, 'server-alpha.log');
  const betaLog = path.join(holdDir, 'server-beta.log');
  const before = { alpha: (await refusalLines(alphaLog)).length, beta: (await refusalLines(betaLog)).length };
  const ts = await startTsProxy();
  const connectPort = await startConnectProxy(ts.port);
  const chromeArgs = [`--host-resolver-rules=MAP ${LAN_HOST} 127.0.0.1, MAP ${TS_HOST} 127.0.0.1`, '--ignore-certificate-errors'];
  const only = process.env.ABX403_JOURNEYS ? new Set(process.env.ABX403_JOURNEYS.split(',')) : null;
  const run = async (spec) => { if (!only || only.has(spec.name)) await journey(spec); };
  await run({ name: 'chrome-lan', browserType: chromium, launchOptions: { executablePath: chromePath, args: chromeArgs }, origin: `http://${LAN_HOST}:${hold.alphaPort}` });
  await run({ name: 'chrome-tailscale', browserType: chromium, launchOptions: { executablePath: chromePath, args: chromeArgs }, contextOptions: { ignoreHTTPSErrors: true }, origin: `https://${TS_HOST}:${ts.port}` });
  await run({ name: 'webkit-tailscale', browserType: webkit, launchOptions: { proxy: { server: `http://127.0.0.1:${connectPort}` } }, contextOptions: { ignoreHTTPSErrors: true }, origin: `https://${TS_HOST}:${ts.port}` });
  await sleep(2_000);
  const after = { alpha: await refusalLines(alphaLog), beta: await refusalLines(betaLog) };
  evidence.logCheck = { refusalLinesBefore: before, refusalLinesDuringJourneys: { alpha: after.alpha.slice(before.alpha), beta: after.beta.slice(before.beta) } };
  const routesUsed = [...new Set(Object.values(evidence.journeys).flatMap(j => j.sockets.map(s => s.pattern)))].sort();
  evidence.asm002 = { routesUsed, outsidePhoneList: routesUsed.filter(r => !PHONE_ROUTES.includes(r)) };
  const failedSteps = Object.values(evidence.journeys).flatMap(j => Object.entries(j.steps).filter(([, s]) => s.result !== 'Pass').map(([id]) => `${j.name}:${id}`));
  // The only allowed browser line: the blocked localhost:8000 definitions feed of the phone bundle (known, pre-existing).
  for (const j of Object.values(evidence.journeys)) j.unknownBrowserErrors = j.browserErrors.filter(line => !(line === 'console: Failed to load resource: net::ERR_CONNECTION_REFUSED' && j.blockedLocalhost8000 > 0));
  const unknownErrors = Object.values(evidence.journeys).flatMap(j => j.unknownBrowserErrors.map(line => `${j.name}: ${line}`));
  const badHandshakes = Object.values(evidence.journeys).flatMap(j => j.handshakes.filter(h => h.status !== 101).map(h => `${j.name}:${h.pattern}:${h.status}`));
  const badProxyUpgrades = evidence.proxyUpgrades.filter(u => !/^HTTP\/1\.1 101/.test(u.status ?? '')).map(u => `${u.journey}:${u.pattern}:${u.status}`);
  const refusals = [...evidence.logCheck.refusalLinesDuringJourneys.alpha, ...evidence.logCheck.refusalLinesDuringJourneys.beta];
  evidence.summary = { failedSteps, unknownErrors, badHandshakes, badProxyUpgrades, refusals: refusals.length, outsidePhoneList: evidence.asm002.outsidePhoneList };
  evidence.result = failedSteps.length === 0 && unknownErrors.length === 0 && badHandshakes.length === 0 && badProxyUpgrades.length === 0 && refusals.length === 0 && evidence.asm002.outsidePhoneList.length === 0 ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = redact(`${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}`);
} finally {
  for (const socket of openSockets) socket.destroy();
  for (const server of servers) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
  if (hold?.child && hold.child.exitCode === null) { hold.child.kill('SIGTERM'); await Promise.race([new Promise(resolve => hold.child.once('close', resolve)), sleep(40_000)]); }
  if (evidence.tsProxy?.certDir) await fs.rm(evidence.tsProxy.certDir, { recursive: true, force: true });
  const holdEvidence = holdDir ? JSON.parse(await fs.readFile(path.join(holdDir, 'mobile-shell-probe.json'), 'utf8').catch(() => '{}')) : {};
  evidence.cleanup = { holdExited: hold?.child ? hold.child.exitCode !== null || hold.child.signalCode !== null : null, holdCleanup: holdEvidence.cleanup ?? null, proxiesClosed: true };
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(`API-04 phone origins: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  console.log(JSON.stringify(evidence.summary ?? {}, null, 1));
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}
