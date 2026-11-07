#!/usr/bin/env node
// API-09 (autobyteus-403 round 2, after merging autobyteus-407): the paired phone's node desktop (VNC Viewer on the
// phone) under the origin gate and the phone WebSocket route limit, against a test-owned Docker node that runs this
// branch's server package. Paths (as in API-04):
//   chrome-lan       Chrome reaches the node as http://192.168.77.10:<published port> (host mapping; real Host/Origin).
//   chrome-tailscale a Tailscale-Serve-shaped HTTPS proxy (Host kept, X-Forwarded-Host/Proto/For) at
//                    https://node.tail-probe.ts.net:<port> in front of the node.
//   webkit-tailscale the same proxy from WebKit (the WKWebView engine) through a CONNECT proxy.
// Journey per path, phone viewport 390x844: pair; New run (a draft: a catalog model, no message, so no model is
// called); ⋮ → VNC Viewer; "Connected · View only"; taps on the picture do not move the node's mouse; Control →
// "Connected · Control"; a tap moves the node's mouse; then the node owner revokes every phone device and the OPEN
// node-desktop stream must close with 4403 REMOTE_ACCESS_DEVICE_REVOKED (live re-check). Records the WebSocket close
// codes in the page (a recording constructor that returns the browser's own WebSocket), the handshake Origin and status (Chrome: CDP; TS: the proxy), and the node
// log's refusal lines.
// Usage: node abx403-phone-node-desktop-probe.mjs <worktree> <output dir> <container> <published port>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const [worktree, outputDirArg, container, publishedPort] = process.argv.slice(2);
const outputDir = path.resolve(outputDirArg);
await fs.mkdir(outputDir, { recursive: true });
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const { chromium, webkit } = require('playwright-core');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const nodeUrl = `http://127.0.0.1:${publishedPort}`;
const LAN_HOST = '192.168.77.10';
const TS_HOST = 'node.tail-probe.ts.net';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/access_token=[^&\s"']+/g, 'access_token=…');
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const waitFor = async (description, fn, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs; let last;
  while (Date.now() < deadline) { try { const v = await fn(); if (v) return v; } catch (error) { last = error; } await sleep(250); }
  throw new Error(`Timed out waiting for ${description}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const inNode = (...args) => execFileSync('docker', ['exec', '--user', 'vncuser', '--env', 'DISPLAY=:99', container, ...args], { encoding: 'utf8' }).trim();
const mouse = () => inNode('xdotool', 'getmouselocation').split(' ').slice(0, 2).join(' ');
const nodeLogLines = () => execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).split('\n');
const rest = async (method, route, body) => {
  const response = await fetch(`${nodeUrl}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed };
};
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', container, nodeUrl, journeys: {}, proxyUpgrades: [], cleanup: {}, error: null };
const save = () => fs.writeFile(path.join(outputDir, 'API-09-phone-node-desktop.json'), `${redact(JSON.stringify(evidence, null, 2))}\n`);
const servers = []; const openSockets = new Set();
const track = socket => { openSockets.add(socket); socket.on('close', () => openSockets.delete(socket)); return socket; };
let currentJourney = 'setup';

const startTsProxy = async () => {
  const certDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'abx403-r2-cert-')));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', `/CN=${TS_HOST}`, '-addext', `subjectAltName=DNS:${TS_HOST}`,
    '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem')], { stdio: 'ignore' });
  const port = await freePort();
  const forwarded = req => ({ ...req.headers, 'x-forwarded-host': req.headers.host, 'x-forwarded-proto': 'https', 'x-forwarded-for': req.socket.remoteAddress });
  const server = https.createServer({ key: readFileSync(path.join(certDir, 'key.pem')), cert: readFileSync(path.join(certDir, 'cert.pem')) }, (req, res) => {
    const up = http.request({ host: '127.0.0.1', port: Number(publishedPort), method: req.method, path: req.url, headers: forwarded(req) }, upRes => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(up);
  });
  server.on('upgrade', (req, socket, head) => {
    track(socket);
    const entry = { journey: currentJourney, path: new URL(req.url, 'http://x').pathname, origin: req.headers.origin ?? null, host: req.headers.host, status: null };
    evidence.proxyUpgrades.push(entry);
    const up = track(net.connect(Number(publishedPort), '127.0.0.1', () => {
      up.write([`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(forwarded(req)).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(item => `${k}: ${item}`)), '', ''].join('\r\n'));
      if (head?.length) up.write(head);
      up.once('data', chunk => { entry.status = chunk.toString('latin1').split('\r\n', 1)[0]; });
      socket.pipe(up); up.pipe(socket);
    }));
    const end = () => { socket.destroy(); up.destroy(); };
    up.on('error', end); socket.on('error', end);
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  servers.push(server);
  evidence.tsProxy = { origin: `https://${TS_HOST}:${port}` };
  return { port, certDir };
};
const startConnectProxy = async (tsPort) => {
  const port = await freePort();
  const server = http.createServer((req, res) => { res.writeHead(403); res.end(); });
  server.on('connect', (req, socket, head) => {
    track(socket);
    const [host, targetPort] = req.url.split(':');
    if (host !== TS_HOST || Number(targetPort) !== tsPort) { (evidence.connectRefused ??= []).push(req.url); socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const up = track(net.connect(tsPort, '127.0.0.1', () => { socket.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if (head?.length) up.write(head); socket.pipe(up); up.pipe(socket); }));
    const end = () => { socket.destroy(); up.destroy(); };
    up.on('error', end); socket.on('error', end);
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  servers.push(server);
  return port;
};

// In the page: every WebSocket's URL (credential redacted), open, and close code/reason.
const WS_LOG_SUBCLASS = () => {
  const Native = window.WebSocket;
  window.__abxWs = [];
  window.WebSocket = class extends Native {
    constructor(url, protocols) {
      super(url, protocols);
      const entry = { url: String(url).replace(/access_token=[^&]+/, 'access_token=…'), open: false, close: null };
      window.__abxWs.push(entry);
      this.addEventListener('open', () => { entry.open = true; });
      this.addEventListener('close', event => { entry.close = { code: event.code, reason: event.reason }; });
    }
  };
};

// Same record, but the page gets the browser's own WebSocket objects (a constructor that returns the native instance),
// so a library sees exactly the object it would see without the probe.
const WS_LOG = () => {
  const Native = window.WebSocket;
  window.__abxWs = [];
  function Recorded(url, protocols) {
    const socket = protocols === undefined ? new Native(url) : new Native(url, protocols);
    const entry = { url: String(url).replace(/access_token=[^&]+/, 'access_token=…'), open: false, close: null };
    window.__abxWs.push(entry);
    socket.addEventListener('open', () => { entry.open = true; });
    socket.addEventListener('close', event => { entry.close = { code: event.code, reason: event.reason }; });
    return socket;
  }
  Recorded.prototype = Native.prototype;
  for (const key of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Object.defineProperty(Recorded, key, { value: Native[key] });
  window.WebSocket = Recorded;
};

const journey = async ({ name, browserType, launchOptions, contextOptions, origin }) => {
  currentJourney = name;
  const record = { name, origin, steps: {}, handshakes: [], sockets: [], browserErrors: [], startedAt: new Date().toISOString() };
  evidence.journeys[name] = record;
  const logStart = nodeLogLines().length;
  const browser = await browserType.launch({ headless: true, ...launchOptions });
  const sel = id => `[data-testid="${id}"]`;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: browserType === chromium, hasTouch: true, locale: 'en-US', timezoneId: 'UTC', ...contextOptions });
    if (process.env.ABX403_WS_WRAP !== 'none') await context.addInitScript(process.env.ABX403_WS_WRAP === 'subclass' ? WS_LOG_SUBCLASS : WS_LOG);
    await context.route(/^https?:\/\/localhost:8000\//, route => route.abort('connectionrefused'));
    const page = await context.newPage();
    page.on('pageerror', error => record.browserErrors.push(redact(`pageerror: ${error.message}`)));
    page.on('console', message => { if (message.type() === 'error') record.browserErrors.push(redact(`console: ${message.text()} @ ${message.location()?.url ?? ''}`)); });
    let byId = null;
    if (browserType === chromium) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      byId = new Map();
      cdp.on('Network.webSocketCreated', e => byId.set(e.requestId, { path: new URL(e.url).pathname }));
      cdp.on('Network.webSocketWillSendHandshakeRequest', e => { const h = byId.get(e.requestId) ?? {}; h.origin = e.request.headers.Origin ?? null; h.host = e.request.headers.Host ?? null; byId.set(e.requestId, h); });
      cdp.on('Network.webSocketHandshakeResponseReceived', e => { const h = byId.get(e.requestId) ?? {}; h.status = e.response.status; byId.set(e.requestId, h); });
    }
    const step = async (id, fn) => {
      try { record.steps[id] = { result: 'Pass', ...(await fn()) }; } catch (error) { record.steps[id] = { result: 'Fail', error: error.message, details: error.details ?? null }; }
      await page.screenshot({ path: path.join(outputDir, `API-09-${name}-${id}.png`) }).catch(() => undefined);
      await save();
    };
    const desktopSockets = () => page.evaluate(() => (window.__abxWs ?? []).filter(w => w.url.includes('/ws/node-desktop')));
    await step('pair', async () => {
      const settings = await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
      assert(settings.status === 200, 'Phone Access on', settings);
      const session = await rest('POST', '/remote-access/pairing-sessions', { serverBaseUrl: origin, ...(origin.startsWith('http:') ? { trustedPrivateHttpAcknowledged: true } : {}) });
      assert(session.status === 201 && session.body.mobileUrl, 'pairing session', session);
      await page.goto(session.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
      await page.locator(sel('mobile-new-run-button')).waitFor({ timeout: 60_000 });
      return { pageOrigin: await page.evaluate(() => location.origin) };
    });
    await step('openViewer', async () => {
      await page.locator(sel('mobile-new-run-button')).click({ timeout: 30_000 });
      await page.locator(sel('mobile-run-model-select-toggle')).click();
      await page.locator(sel('mobile-run-model-select-search')).fill('qwen3-max');
      await page.locator(sel('mobile-run-model-select-option')).first().click();
      await waitFor('Create run enabled', async () => !(await page.locator(sel('mobile-run-launch')).isDisabled()), 20_000);
      await page.locator(sel('mobile-run-launch')).click();
      await page.locator(sel('mobile-run-menu-button')).click({ timeout: 30_000 });
      await page.locator(sel('mobile-run-menu-desktop')).click({ timeout: 15_000 });
      const status = page.locator(sel('mobile-node-desktop-status'));
      await status.filter({ hasText: 'Connected · View only' }).waitFor({ timeout: 30_000 });
      await page.locator(`${sel('mobile-node-desktop-stage')} canvas`).waitFor({ timeout: 30_000 });
      return { status: (await status.textContent())?.trim(), query: new URL(page.url()).search, sockets: await desktopSockets() };
    });
    await step('viewOnly', async () => {
      inNode('xdotool', 'mousemove', '300', '300');
      const box = await page.locator(sel('mobile-node-desktop-stage')).boundingBox();
      await page.touchscreen.tap(box.x + 60, box.y + 60);
      await page.touchscreen.tap(box.x + box.width - 40, box.y + box.height - 40);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(900);
      const m = mouse();
      assert(m === 'x:300 y:300', 'View only: input does not reach the desktop', { m });
      return { mouseOnNode: m };
    });
    await step('control', async () => {
      await page.locator(sel('mobile-node-desktop-mode')).click();
      const status = page.locator(sel('mobile-node-desktop-status'));
      await status.filter({ hasText: 'Connected · Control' }).waitFor({ timeout: 30_000 });
      await sleep(1200);
      const canvas = page.locator(`${sel('mobile-node-desktop-stage')} canvas`);
      const box = await canvas.boundingBox();
      inNode('xdotool', 'mousemove', '300', '300');
      await page.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.75);
      await sleep(900);
      let m = mouse();
      if (m === 'x:300 y:300') { await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75); await sleep(900); m = mouse(); }
      const [x, y] = m.replace(/[xy:]/g, '').split(' ').map(Number);
      assert(Math.abs(x - 1440) < 40 && Math.abs(y - 810) < 40, 'Control: the tap reaches the desktop at the tapped point (1920x1080 × 0.75)', { m, box });
      return { status: (await status.textContent())?.trim(), mouseOnNode: m, expectedNear: 'x:1440 y:810', sockets: await desktopSockets() };
    });
    await step('liveRevocation', async () => {
      const openBefore = (await desktopSockets()).filter(w => w.open && !w.close);
      assert(openBefore.length === 1, 'one open node-desktop stream before revocation', openBefore);
      const revokedAt = Date.now();
      const revoked = await rest('DELETE', '/remote-access/devices');
      assert(revoked.status >= 200 && revoked.status < 300, 'devices revoked', revoked);
      const closed = await waitFor('the open stream closed', async () => (await desktopSockets()).find(w => w.url === openBefore[0].url && w.close), 90_000);
      assert(closed.close.code === 4403 && closed.close.reason === 'REMOTE_ACCESS_DEVICE_REVOKED', 'closed with 4403 REMOTE_ACCESS_DEVICE_REVOKED', closed);
      await sleep(1500);
      return { close: closed.close, secondsAfterRevocation: Math.round((Date.now() - revokedAt) / 100) / 10, uiStatus: (await page.locator(sel('mobile-node-desktop-status')).textContent().catch(() => null))?.trim() ?? null };
    });
    record.sockets = await page.evaluate(() => window.__abxWs ?? []).catch(() => []);
    if (byId) record.handshakes = [...byId.values()];
    await context.close();
  } finally {
    await browser.close().catch(() => undefined);
    record.nodeLogRefusals = nodeLogLines().slice(logStart).filter(line => /Remote Access request refused|Remote Access WebSocket rejected|PHONE_ACCESS_ROUTE_REFUSED|REMOTE_ACCESS_ORIGIN_REFUSED|DEVICE_REVOKED/.test(line)).map(redact);
    record.finishedAt = new Date().toISOString();
    await save();
  }
};

let ts;
try {
  ts = await startTsProxy();
  const connectPort = await startConnectProxy(ts.port);
  const chromeArgs = [`--host-resolver-rules=MAP ${LAN_HOST} 127.0.0.1, MAP ${TS_HOST} 127.0.0.1`, '--ignore-certificate-errors'];
  const only = process.env.ABX403_JOURNEYS ? new Set(process.env.ABX403_JOURNEYS.split(',')) : null;
  const run = async spec => { if (!only || only.has(spec.name)) await journey(spec); };
  await run({ name: 'chrome-lan', browserType: chromium, launchOptions: { executablePath: chromePath, args: chromeArgs }, origin: `http://${LAN_HOST}:${publishedPort}` });
  await run({ name: 'chrome-tailscale', browserType: chromium, launchOptions: { executablePath: chromePath, args: chromeArgs }, contextOptions: { ignoreHTTPSErrors: true }, origin: `https://${TS_HOST}:${ts.port}` });
  await run({ name: 'webkit-tailscale', browserType: webkit, launchOptions: { proxy: { server: `http://127.0.0.1:${connectPort}` } }, contextOptions: { ignoreHTTPSErrors: true }, origin: `https://${TS_HOST}:${ts.port}` });
  const failed = Object.values(evidence.journeys).flatMap(j => Object.entries(j.steps).filter(([, s]) => s.result !== 'Pass').map(([id]) => `${j.name}:${id}`));
  const desktopHandshakes = Object.values(evidence.journeys).flatMap(j => j.handshakes.filter(h => h.path === '/ws/node-desktop').map(h => ({ journey: j.name, ...h })));
  const proxyDesktop = evidence.proxyUpgrades.filter(u => u.path === '/ws/node-desktop');
  const unexpectedRefusals = Object.values(evidence.journeys).flatMap(j => j.nodeLogRefusals.filter(l => /REMOTE_ACCESS_ORIGIN_REFUSED|PHONE_ACCESS_ROUTE_REFUSED/.test(l)).map(l => `${j.name}: ${l}`));
  evidence.summary = { failed, desktopHandshakes, proxyDesktop, unexpectedRefusals };
  evidence.result = failed.length === 0 && unexpectedRefusals.length === 0
    && desktopHandshakes.every(h => h.status === 101 && h.origin === (h.journey === 'chrome-lan' ? `http://${LAN_HOST}:${publishedPort}` : `https://${TS_HOST}:${ts.port}`))
    && proxyDesktop.every(u => /^HTTP\/1\.1 101/.test(u.status ?? '')) ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = redact(`${error.stack ?? error.message}`);
} finally {
  for (const socket of openSockets) socket.destroy();
  for (const server of servers) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
  if (ts?.certDir) await fs.rm(ts.certDir, { recursive: true, force: true });
  evidence.cleanup = { proxiesClosed: true };
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(`API-09 phone node desktop: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  console.log(JSON.stringify(evidence.summary ?? {}, null, 1));
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}
