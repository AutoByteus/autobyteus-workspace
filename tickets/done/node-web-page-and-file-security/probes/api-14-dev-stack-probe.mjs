#!/usr/bin/env node
// API-14 (autobyteus-416 AC-006, REQ-005, design D7 "Dev stack"): `pnpm dev` works with no manual setting.
// Starts the repository's dev stack exactly as a developer does (`pnpm dev` at the worktree root: server build, backend
// 127.0.0.1:8000 with the worktree-owned data root <worktree>/.autobyteus/development, Nuxt dev on :3000), then opens the
// app in headless Chrome at both origins the launcher lists (http://127.0.0.1:3000 and http://localhost:3000). Each
// window must load the app and get answers to its GraphQL POSTs and WebSockets from the backend (no 403); the backend
// log must have no refusal line. Control: an unlisted localhost origin (http://localhost:5173) is still refused.
// The stack is stopped with SIGINT to its process group (as Ctrl+C), and ports 8000/3000 are checked free afterwards.
// Usage: node api-14-dev-stack-probe.mjs <worktree> <output dir>
import { spawn } from 'node:child_process';
import { createWriteStream, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';

const [worktree, outArg] = process.argv.slice(2);
const out = path.resolve(outArg);
await fs.mkdir(out, { recursive: true });
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw Object.assign(new Error(m), { details: d }); };
const waitFor = async (what, fn, ms) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { if (await fn()) return; } catch (e) { last = e; } await sleep(500); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const portFree = port => new Promise(res => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, '127.0.0.1', () => s.close(() => res(true))); });
const ev = { startedAt: new Date().toISOString(), result: 'Fail', windows: {}, control: null, cleanup: {}, error: null };
const logFile = path.join(out, 'pnpm-dev.log');
let stack, browser;
try {
  assert(await portFree(8000) && await portFree(3000), 'ports 8000 and 3000 are free');
  const log = createWriteStream(logFile);
  stack = spawn('pnpm', ['dev'], { cwd: worktree, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, USER: process.env.USER } });
  stack.stdout.pipe(log); stack.stderr.pipe(log);
  await waitFor('backend health', async () => (await fetch('http://127.0.0.1:8000/rest/health')).ok, 300_000);
  await waitFor('frontend', async () => (await fetch('http://127.0.0.1:3000/')).status < 500, 300_000);
  ev.backendEnvLine = readFileSync(path.join(worktree, '.autobyteus/development/server-data/.env'), 'utf8').split('\n').filter(l => l.startsWith('AUTOBYTEUS_ALLOWED_ORIGINS') || l.startsWith('AUTOBYTEUS_SERVER_HOST'));
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  for (const origin of ['http://127.0.0.1:3000', 'http://localhost:3000']) {
    const w = ev.windows[origin] = { responses: {}, sockets: [], errors: [] };
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('response', r => { if (r.url().startsWith('http://127.0.0.1:8000')) { const key = `${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`; w.responses[key] = (w.responses[key] ?? 0) + 1; } });
    page.on('pageerror', e => w.errors.push(`pageerror: ${e.message}`));
    const cdp = await context.newCDPSession(page); await cdp.send('Network.enable'); const hs = new Map();
    cdp.on('Network.webSocketCreated', e => hs.set(e.requestId, { url: e.url }));
    cdp.on('Network.webSocketWillSendHandshakeRequest', e => { const h = hs.get(e.requestId) ?? {}; h.origin = e.request.headers.Origin ?? null; hs.set(e.requestId, h); });
    cdp.on('Network.webSocketHandshakeResponseReceived', e => { const h = hs.get(e.requestId) ?? {}; h.status = e.response.status; hs.set(e.requestId, h); });
    // A cold Nuxt dev server re-optimizes and reloads (TESTING.md § Browser probes): warm up, then load for real.
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 300_000 }); await sleep(8000);
    for (const k of Object.keys(w.responses)) delete w.responses[k];
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await page.locator('[data-test="run-target-switcher-trigger"]').waitFor({ timeout: 120_000 });
    await sleep(6000);
    w.sockets = [...hs.values()].filter(h => h.url?.startsWith('ws://127.0.0.1:8000'));
    w.title = await page.title();
    await page.screenshot({ path: path.join(out, `API-14-${new URL(origin).hostname}.png`) });
    await context.close();
  }
  const ctl = await fetch('http://127.0.0.1:8000/graphql', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: '{"query":"{ __typename }"}' });
  ev.control = { origin: 'http://localhost:5173', status: ctl.status, body: (await ctl.text()).slice(0, 200) };
  await sleep(500);
  ev.refusalLines = readFileSync(logFile, 'utf8').split('\n').filter(l => /Remote Access request refused|Remote Access WebSocket rejected/.test(l));
  for (const [origin, w] of Object.entries(ev.windows)) {
    const gqlOk = Object.keys(w.responses).some(k => k.startsWith('POST /graphql 200'));
    const forbidden = Object.keys(w.responses).filter(k => k.endsWith(' 403'));
    assert(gqlOk && forbidden.length === 0, `${origin}: GraphQL answers, nothing refused`, w.responses);
    assert(w.sockets.length > 0 && w.sockets.every(s => s.status === 101 && s.origin === origin), `${origin}: WebSockets open with the page's origin`, w.sockets);
  }
  assert(ev.control.status === 403 && ev.control.body.includes('REMOTE_ACCESS_ORIGIN_REFUSED'), 'an unlisted localhost origin is refused', ev.control);
  const others = ev.refusalLines.filter(l => !l.includes('origin http://localhost:5173'));
  assert(others.length === 0, 'no refusal line except the control', ev.refusalLines);
  ev.result = 'Pass';
} catch (error) {
  ev.error = `${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}`;
} finally {
  await browser?.close().catch(() => undefined);
  if (stack) { try { process.kill(-stack.pid, 'SIGINT'); } catch { /* gone */ } await Promise.race([new Promise(r => stack.once('close', r)), sleep(30_000)]); try { process.kill(-stack.pid, 'SIGKILL'); } catch { /* gone */ } }
  await sleep(2000);
  ev.cleanup = { port8000Free: await portFree(8000), port3000Free: await portFree(3000) };
  ev.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'API-14-dev-stack.json'), `${JSON.stringify(ev, null, 2)}\n`);
  console.log(`API-14 dev stack: ${ev.result}${ev.error ? `\n${ev.error}` : ''}`);
  process.exit(ev.result === 'Pass' ? 0 : 1);
}
