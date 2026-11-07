#!/usr/bin/env node
// API-06 (autobyteus-416 AC-004, REQ-002 (e)): the phone shell through a company URL set in AUTOBYTEUS_SERVER_HOST.
// Node: alpha, this worktree's autobyteus-server-ts/dist/app.js on 127.0.0.1 (own data root and HOME, clean env), with
// AUTOBYTEUS_SERVER_HOST=https://node.corp-probe.example:<proxy port> and the scripted AGY CLI (no model). It serves the
// production phone bundle (`pnpm -C autobyteus-web build:mobile-web`) at /mobile.
// Path: a company-style HTTPS reverse proxy (self-signed TLS for node.corp-probe.example; Host preserved; X-Forwarded-Host,
// -Proto https, -For; WebSocket upgrades forwarded) in front of alpha. Chrome reaches it by name with --host-resolver-rules
// (real Host and Origin: node.corp-probe.example:<port>), at the phone viewport.
// Steps:
//   C1 before any pairing: /mobile at node.corp-probe.example is 200 (the AUTOBYTEUS_SERVER_HOST class);
//      /mobile at other.corp-probe.example is 403 REMOTE_ACCESS_HOST_REFUSED and alpha logs the hint line.
//   J1 pair through a pairing link on the company URL; the run list loads (GraphQL);
//   J2 New run: folder, agent "Phone Agent", Create run, first message; it reaches alpha (stored) and shows on screen.
//   Every WebSocket the phone opened answered 101 (CDP handshakes and the proxy's upgrade log); no refusal line on alpha
//   during J1/J2.
// Usage: node api-06-phone-company-host-probe.mjs <worktree> <output dir>
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdtempSync, realpathSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const [worktree, outArg] = process.argv.slice(2);
const out = path.resolve(outArg);
await fs.mkdir(out, { recursive: true });
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CORP = 'node.corp-probe.example';
const OTHER = 'other.corp-probe.example';
const redact = t => String(t).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/access_token=[^&\s"']+/g, 'access_token=…');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw Object.assign(new Error(m), { details: d }); };
const waitFor = async (what, fn, ms = 60_000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { if (await fn()) return; } catch (e) { last = e; } await sleep(200); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const ev = { startedAt: new Date().toISOString(), result: 'Fail', steps: {}, controls: [], proxyUpgrades: [], handshakes: [], sockets: [], browserErrors: [], cleanup: {}, error: null };
const save = () => fs.writeFile(path.join(out, 'API-06-phone-company-host.json'), `${redact(JSON.stringify(ev, null, 2))}\n`);
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'api416-06-')));
const logFile = path.join(out, 'server-alpha.log');
const openSockets = new Set();
const track = s => { openSockets.add(s); s.on('close', () => openSockets.delete(s)); return s; };
let child, proxy, browser;
const refusals = () => readFileSync(logFile, 'utf8').split('\n').filter(l => /Remote Access request refused|Remote Access WebSocket rejected/.test(l)).map(redact);

try {
  assert(existsSync(path.join(webDir, 'dist', 'public')), 'build the phone bundle first: pnpm -C autobyteus-web build:mobile-web');
  const port = await freePort(); const proxyPort = await freePort();
  const base = `http://127.0.0.1:${port}`; const corpUrl = `https://${CORP}:${proxyPort}`;
  const dataDir = path.join(root, 'data'); const home = path.join(root, 'home'); const workspace = path.join(root, 'api06-launch');
  for (const d of [dataDir, home, workspace]) await fs.mkdir(d, { recursive: true });
  await fs.writeFile(path.join(workspace, 'README.md'), '# API-06\n');
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${corpUrl}\nAPP_ENV=test\nLOG_LEVEL=INFO\n`);
  const log = createWriteStream(logFile);
  child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], { cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'INFO', AUTOBYTEUS_SERVER_HOST: corpUrl,
      ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills' } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  await waitFor('alpha health', async () => { if (child.exitCode !== null) throw new Error('alpha exited'); return fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000);
  ev.node = { base, serverHost: corpUrl };
  const gql = async (query, variables) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
  const rest = async (method, route, body) => { const r = await fetch(`${base}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let p; try { p = JSON.parse(t); } catch { p = t; } return { status: r.status, body: p }; };
  await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Phone Agent', role: 'assistant', description: 'API-06 agent', instructions: 'Help.', toolNames: [],
    defaultLaunchConfig: { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null } } });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });

  // Company-style TLS reverse proxy (Host kept).
  const certDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'api416-06-cert-')));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', `/CN=${CORP}`, '-addext', `subjectAltName=DNS:${CORP},DNS:${OTHER}`,
    '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem')], { stdio: 'ignore' });
  const fwd = req => ({ ...req.headers, 'x-forwarded-host': req.headers.host, 'x-forwarded-proto': 'https', 'x-forwarded-for': req.socket.remoteAddress });
  proxy = https.createServer({ key: readFileSync(path.join(certDir, 'key.pem')), cert: readFileSync(path.join(certDir, 'cert.pem')) }, (req, res) => {
    const up = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers: fwd(req) }, upRes => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up);
  });
  proxy.on('upgrade', (req, socket, head) => {
    track(socket);
    const entry = { path: redact(req.url), origin: req.headers.origin ?? null, host: req.headers.host, status: null }; ev.proxyUpgrades.push(entry);
    const up = track(net.connect(port, '127.0.0.1', () => {
      up.write([`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(fwd(req)).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(i => `${k}: ${i}`)), '', ''].join('\r\n'));
      if (head?.length) up.write(head);
      up.once('data', c => { entry.status = c.toString('latin1').split('\r\n', 1)[0]; });
      socket.pipe(up); up.pipe(socket);
    }));
    const end = () => { socket.destroy(); up.destroy(); }; up.on('error', end); socket.on('error', end);
  });
  await new Promise(r => proxy.listen(proxyPort, '127.0.0.1', r));
  ev.certDir = certDir;

  browser = await chromium.launch({ headless: true, executablePath: chromePath, args: [`--host-resolver-rules=MAP ${CORP} 127.0.0.1, MAP ${OTHER} 127.0.0.1`, '--ignore-certificate-errors'] });
  // C1 controls before pairing.
  const control = async (name, host) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true }); const p = await ctx.newPage();
    const r = await p.goto(`https://${host}:${proxyPort}/mobile`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const body = await r.text().catch(() => ''); let code = null; try { code = JSON.parse(body).code ?? null; } catch { code = null; }
    const e = { name, host, status: r.status(), code, servesPhoneBundle: body.includes('/mobile/_nuxt/') }; ev.controls.push(e); await ctx.close(); return e;
  };
  const r0 = refusals().length;
  const c1a = await control('corp-unpaired', CORP);
  const c1b = await control('other-unpaired', OTHER);
  await sleep(500);
  ev.controlRefusalLines = refusals().slice(r0);
  assert(c1a.status === 200 && c1a.servesPhoneBundle, 'the AUTOBYTEUS_SERVER_HOST name serves /mobile before any pairing', c1a);
  assert(c1b.status === 403 && c1b.code === 'REMOTE_ACCESS_HOST_REFUSED', 'another company name is refused', c1b);
  // One line per refused request (the page and Chrome's /favicon.ico), each naming the host and the setting.
  assert(ev.controlRefusalLines.length >= 1 && ev.controlRefusalLines.every(l => l.includes(`host ${OTHER}`) && l.includes('REMOTE_ACCESS_HOST_REFUSED') && l.includes('add it to AUTOBYTEUS_ALLOWED_HOSTS')), 'hint lines only for the refused name', ev.controlRefusalLines);
  ev.steps.C1 = { result: 'Pass' };

  // J1/J2: the phone.
  const r1 = refusals().length;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'UTC', ignoreHTTPSErrors: true });
  await ctx.route(/^https?:\/\/localhost:8000\//, route => route.abort('connectionrefused'));
  await ctx.routeWebSocket(/^wss?:\/\/localhost:8000\//, ws => ws.close());
  const page = await ctx.newPage();
  page.on('pageerror', e => ev.browserErrors.push(redact(`pageerror: ${e.message}`)));
  page.on('console', m => { if (m.type() === 'error') ev.browserErrors.push(redact(`console: ${m.text()}`)); });
  page.on('websocket', ws => { const u = new URL(ws.url()); if (u.host === 'localhost:8000') return; const e = { url: redact(ws.url()), frames: 0 }; ev.sockets.push(e); ws.on('framereceived', () => { e.frames += 1; }); });
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); const hs = new Map();
  cdp.on('Network.webSocketCreated', e => hs.set(e.requestId, { url: redact(e.url) }));
  cdp.on('Network.webSocketWillSendHandshakeRequest', e => { const h = hs.get(e.requestId) ?? {}; h.origin = e.request.headers.Origin ?? null; h.host = e.request.headers.Host ?? null; hs.set(e.requestId, h); });
  cdp.on('Network.webSocketHandshakeResponseReceived', e => { const h = hs.get(e.requestId) ?? {}; h.status = e.response.status; hs.set(e.requestId, h); });
  const sel = id => `[data-testid="${id}"]`;
  const settings = await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  assert(settings.status === 200, 'Phone Access on', settings);
  const session = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'company_address', serverBaseUrl: corpUrl });
  assert(session.status === 201 && session.body.mobileUrl && new URL(session.body.mobileUrl).origin === corpUrl, 'pairing link on the company URL', { status: session.status, body: redact(JSON.stringify(session.body)) });
  await page.goto(session.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  // A fresh node has no runs: the list shows its empty state (mobile-run-list-empty) once GraphQL answered.
  await page.locator(`${sel('mobile-run-tree')}, ${sel('mobile-run-list-empty')}`).first().waitFor({ timeout: 60_000 });
  ev.steps.J1 = { result: 'Pass', pageOrigin: await page.evaluate(() => location.origin), listState: await page.locator(sel('mobile-run-list-empty')).count() ? 'empty' : 'tree' };
  await page.screenshot({ path: path.join(out, 'API-06-J1-run-list.png') });

  await page.locator(sel('mobile-new-run-button')).click();
  await page.locator(sel('mobile-new-run')).waitFor({ timeout: 20_000 });
  await page.locator(sel('mobile-run-workspace-select-toggle')).click();
  await page.locator(sel('mobile-run-workspace-select-option')).filter({ hasText: 'api06-launch' }).first().click();
  await sleep(500);
  await page.locator(sel('mobile-run-target-select-toggle')).click();
  await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Phone Agent' }).first().click();
  await waitFor('Create run enabled', async () => !(await page.locator(sel('mobile-run-launch')).isDisabled()), 20_000);
  await page.locator(sel('mobile-run-launch')).click();
  const screen = () => page.evaluate(() => { const s = document.querySelector('[data-testid="mobile-run-screen"]'); return s ? { state: s.getAttribute('data-state'), name: s.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? null, conversation: s.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? '' } : { state: null }; });
  await waitFor('the new run screen', async () => { const s = await screen(); return s.state === 'open' && s.name === 'Phone Agent'; }, 30_000);
  const marker = `API416-06-${randomUUID().slice(0, 6)}`;
  const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
  const send = page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last();
  await waitFor('Send enabled', async () => { if (!(await box.inputValue().catch(() => ''))) await box.fill(`First message. Marker ${marker}`).catch(() => undefined); return (await send.count()) > 0 && await send.isEnabled(); }, 20_000);
  await send.click();
  await waitFor('the message on screen', async () => (await screen()).conversation.includes(marker), 30_000);
  let stored = false;
  await waitFor('the first message stored on alpha', async () => {
    const runs = await gql('{ listWorkspaceRunHistory(limitPerAgent: 5) { agentDefinitions { agentName runs { runId } } } }');
    ev.runHistory = runs;
    const runIds = JSON.stringify(runs).match(/"runId":"([^"]+)"/g)?.map(x => x.split('"')[3]) ?? [];
    for (const id of runIds) { const p = await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id }); if (JSON.stringify(p?.getRunProjection?.conversation ?? '').includes(marker)) { stored = true; ev.storedRunId = id; return true; } }
    return false;
  }, 30_000).catch(e => { ev.storedCheckError = e.message; });
  await page.screenshot({ path: path.join(out, 'API-06-J2-new-run.png') });
  ev.steps.J2 = { result: stored ? 'Pass' : 'Fail', marker, storedOnAlpha: stored };
  await sleep(1_000);
  ev.handshakes = [...hs.values()];
  ev.journeyRefusalLines = refusals().slice(r1);
  const unknownErrors = ev.browserErrors.filter(l => l !== 'console: Failed to load resource: net::ERR_CONNECTION_REFUSED');
  const badHs = ev.handshakes.filter(h => h.status !== 101); const badUp = ev.proxyUpgrades.filter(u => !/^HTTP\/1\.1 101/.test(u.status ?? ''));
  ev.summary = { handshakes: ev.handshakes.length, badHandshakes: badHs, badProxyUpgrades: badUp, journeyRefusals: ev.journeyRefusalLines.length, unknownErrors };
  ev.result = stored && ev.handshakes.length > 0 && badHs.length === 0 && badUp.length === 0 && ev.journeyRefusalLines.length === 0 && unknownErrors.length === 0 ? 'Pass' : 'Fail';
  await ctx.close();
} catch (error) {
  ev.error = redact(`${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}`);
} finally {
  await browser?.close().catch(() => undefined);
  for (const s of openSockets) s.destroy();
  if (proxy) { proxy.closeAllConnections?.(); await new Promise(r => proxy.close(r)); }
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await Promise.race([new Promise(r => child.once('close', r)), sleep(15_000)]); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
  await fs.rm(root, { recursive: true, force: true }); if (ev.certDir) await fs.rm(ev.certDir, { recursive: true, force: true });
  ev.cleanup = { serverExited: !child || child.exitCode !== null || child.signalCode !== null, rootRemoved: true, proxyClosed: true };
  ev.finishedAt = new Date().toISOString();
  await save();
  console.log(`API-06 phone company host: ${ev.result}${ev.error ? `\n${ev.error}` : ''}`);
  console.log(JSON.stringify(ev.summary ?? {}, null, 1));
  process.exit(ev.result === 'Pass' ? 0 : 1);
}
