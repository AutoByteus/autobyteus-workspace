#!/usr/bin/env node
// API-08 (AC-010, REQ-007): the Memory Sync card in a real browser against a real source node whose sync really fails
// for 23 files. Temporary probe (autobyteus-workspace-7, API/E2E engineer).
//
// Stack (all test-owned): hub server + source server (worktree `dist/app.js`), a corrupting relay between them (flips the
// first byte of every staged piece, as a bad disk or network would), the Nuxt dev server bound to the source, headless
// Chrome. 23 files of 8.5 MiB are staged, each rejected by the hub's verification, so 23 file failures are recorded; one of
// them has a very long path.
// Usage: node card-probe.mjs <worktree> <outputDir>
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [worktree, outputDir] = process.argv.slice(2);
const webDir = path.join(worktree, 'autobyteus-web');
const serverRoot = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const access = await import(path.join(webDir, 'tests/e2e/fixtures/probe-node-access.mjs'));
access.attachToProbeProcess();
const MiB = 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
fs.mkdirSync(outputDir, { recursive: true });
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'card-probe-')));
const evidence = { startedAt: new Date().toISOString(), node: process.version, cases: {}, browserErrors: [], cleanup: {}, error: null };
const children = [];
let frontend = null; let browser = null; let relay = null;
const frontPort = await freePort();
const frontOrigin = `http://127.0.0.1:${frontPort}`;

const startServer = async (name, logLevel) => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(root, name);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=${logLevel}\nHTTP_ACCESS_LOG_MODE=off\n`);
  const home = path.join(root, `${name}-home`); fs.mkdirSync(home, { recursive: true });
  const log = fs.createWriteStream(path.join(outputDir, `server-${name}.log`));
  const child = spawn(process.execPath, [path.join(serverRoot, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverRoot, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: logLevel, HTTP_ACCESS_LOG_MODE: 'off',
      AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_ALLOWED_ORIGINS: frontOrigin, ...access.probeNodeEnvironment() } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  children.push(child);
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`${name} exited`);
    if (await fetch(`${baseUrl}/rest/health`).then((r) => r.ok).catch(() => false)) break;
    if (Date.now() > deadline) throw new Error(`${name} health timeout`);
    await sleep(300);
  }
  return { name, port, baseUrl, dataDir, child };
};
const gql = async (server, query, variables) => {
  const r = await fetch(`${server.baseUrl}/graphql`, { method: 'POST', headers: access.ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) });
  const p = await r.json();
  if (!r.ok || p.errors?.length) throw new Error(`${server.name} graphql: ${JSON.stringify(p.errors ?? p)}`);
  return p.data;
};
const startRelay = async (hubBaseUrl) => {
  const control = { corrupt: true };
  const server = http.createServer(async (request, response) => {
    const chunks = []; for await (const c of request) chunks.push(c);
    let body = Buffer.concat(chunks);
    const method = request.method ?? 'GET';
    if (method === 'PUT' && control.corrupt && body.length) { body = Buffer.from(body); body[0] ^= 0xff; }
    const upstream = await fetch(`${hubBaseUrl}${request.url}`, { method, headers: { authorization: String(request.headers.authorization ?? ''),
      ...(request.headers['content-type'] ? { 'content-type': String(request.headers['content-type']) } : {}) }, body: method === 'GET' || method === 'HEAD' ? undefined : body });
    response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { baseUrl: `http://127.0.0.1:${port}`, control, close: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); }) };
};
const startFrontend = async (backend) => {
  const log = fs.createWriteStream(path.join(outputDir, 'frontend.log'));
  const child = spawn('npx', ['--yes', 'pnpm@10.28.2', 'dev', '--host', '127.0.0.1', '--port', String(frontPort)], { cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backend.baseUrl, AUTOBYTEUS_DEVELOPMENT_OWNER_CREDENTIAL: access.probeNodeEnvironment().AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL, AUTOBYTEUS_DEVELOPMENT_FRONTEND_URL: frontOrigin } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  frontend = child;
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('frontend exited');
    if (await fetch(`${frontOrigin}/nodes?nodeTab=memorySync`).then((r) => r.ok).catch(() => false)) return;
    await sleep(1000);
  }
  throw new Error('frontend timeout');
};

try {
  const hub = await startServer('hub', 'ERROR');
  const source = await startServer('source', 'WARN');
  relay = await startRelay(hub.baseUrl);
  const enabled = await gql(hub, 'mutation($i:UpdateMemoryHubConfigInput!){updateMemoryHubConfig(input:$i){oneTimePlaintextToken}}', { i: { enabled: true, advertisedHubBaseUrl: hub.baseUrl } });
  await gql(source, 'mutation($i:UpdateMemorySyncSourceConfigInput!){updateMemorySyncSourceConfig(input:$i){source{enabled}}}',
    { i: { enabled: true, memorySyncSourceId: 'card-probe', displayName: 'card probe', hubBaseUrl: relay.baseUrl, hubToken: enabled.updateMemoryHubConfig.oneTimePlaintextToken, backgroundEnabled: false, batchSize: 25 } });
  const memoryDir = path.join(source.dataDir, 'memory', 'agents');
  const longName = `${'very-long-attachment-name-'.repeat(7)}end.mp4`; // 180 characters
  const longDir = '000-run-with-a-deep-path/context_files/' + 'nested-folder-with-a-long-name/'.repeat(3);
  for (let i = 0; i < 23; i += 1) {
    const rel = i === 0 ? path.join(longDir, longName) : path.join(`run-${String(i).padStart(2, '0')}`, 'context_files', `video-${i}.mp4`);
    const file = path.join(memoryDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, randomBytes(Math.floor(8.5 * MiB)));
  }
  fs.mkdirSync(path.join(memoryDir, 'run-ok'), { recursive: true });
  fs.writeFileSync(path.join(memoryDir, 'run-ok', 'raw_traces_active.jsonl'), '{"ok":true}\n');
  const run = (await gql(source, 'mutation{startMemorySync{changedFiles committedBatches failedFiles}}')).startMemorySync;
  evidence.run = run;
  const state = (await gql(source, '{getMemorySyncStatus{sourceState{jobState lastError fileFailureCount fileFailures{relativePath size reason attempts nextAttemptAt}}}}')).getMemorySyncStatus.sourceState;
  evidence.graphqlState = { jobState: state.jobState, fileFailureCount: state.fileFailureCount, listed: state.fileFailures.length, firstReason: state.fileFailures[0]?.reason };
  fs.writeFileSync(path.join(outputDir, 'graphql-state.json'), JSON.stringify(state, null, 2));
  if (state.fileFailureCount !== 23) throw new Error(`expected 23 failures, got ${state.fileFailureCount} (run ${JSON.stringify(run)})`);

  await startFrontend(source);
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const locale of ['en', 'zh-CN']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: locale === 'en' ? 'en-US' : 'zh-CN', timezoneId: 'UTC' });
    await access.attachToBrowserContext(context);
    await context.addInitScript((mode) => localStorage.setItem('autobyteus.localization.preference-mode', mode), locale);
    const page = await context.newPage();
    page.on('pageerror', (e) => evidence.browserErrors.push(`${locale} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') evidence.browserErrors.push(`${locale} console: ${m.text()}`); });
    await page.goto(`${frontOrigin}/nodes?nodeTab=memorySync`, { waitUntil: 'networkidle', timeout: 240_000 });
    await page.locator('[data-testid="memory-sync-file-failures"]').waitFor({ state: 'visible', timeout: 120_000 });
    const box = page.locator('[data-testid="memory-sync-file-failures"]');
    const title = (await page.locator('[data-testid="memory-sync-file-failures-title"]').innerText()).trim();
    const rows = await page.locator('[data-testid="memory-sync-file-failure"]').allInnerTexts();
    const more = (await page.locator('[data-testid="memory-sync-file-failures-more"]').innerText()).trim();
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="memory-sync-file-failures"]');
      const r = card.getBoundingClientRect();
      const rowEls = [...document.querySelectorAll('[data-testid="memory-sync-file-failure"]')];
      return { boxLeft: r.left, boxRight: r.right, boxWidth: r.width, scrollWidth: card.scrollWidth, clientWidth: card.clientWidth,
        docOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        rowOverflows: rowEls.map((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > r.right + 1),
        firstRowHeight: rowEls[0].getBoundingClientRect().height, otherRowHeight: rowEls[1].getBoundingClientRect().height,
        amber: getComputedStyle(card).backgroundColor, borderColor: getComputedStyle(card).borderTopColor };
    });
    const statusLines = [await page.locator('[data-testid="memory-sync-current-job"]').innerText(), await page.locator('[data-testid="memory-sync-last-sync"]').innerText()];
    await box.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(outputDir, `card-${locale}-full.png`), fullPage: true });
    await box.screenshot({ path: path.join(outputDir, `card-${locale}-failures-block.png`) });
    fs.writeFileSync(path.join(outputDir, `card-${locale}-dom.txt`), [`locale: ${locale}`, `title: ${title}`, `rows: ${rows.length}`, ...rows.map((t, i) => `row ${i}: ${t.replace(/\s+/g, ' ')}`), `more: ${more}`, `status: ${statusLines.join(' | ').replace(/\s+/g, ' ')}`, ''].join('\n'));
    evidence.cases[locale] = { title, rowCount: rows.length, more, firstRow: rows[0]?.replace(/\s+/g, ' '), secondRow: rows[1]?.replace(/\s+/g, ' '), geometry, statusLines: statusLines.map((s) => s.replace(/\s+/g, ' ')) };
    await context.close();
  }
  evidence.result = 'Done';
} catch (error) {
  evidence.result = 'Error'; evidence.error = String(error?.stack ?? error); console.error(evidence.error);
} finally {
  try { await browser?.close(); } catch { /* gone */ }
  if (frontend && frontend.exitCode === null) { try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ } await sleep(5000); try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  await relay?.close();
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
  await sleep(3000);
  for (const c of children) if (c.exitCode === null) c.kill('SIGKILL');
  fs.rmSync(root, { recursive: true, force: true });
  evidence.cleanup = { rootRemoved: !fs.existsSync(root), serversStopped: children.every((c) => c.exitCode !== null || c.signalCode !== null), frontendStopped: !frontend || frontend.exitCode !== null || frontend.signalCode !== null };
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, 'card-probe-result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ result: evidence.result, cases: Object.keys(evidence.cases), errors: evidence.browserErrors.length, cleanup: evidence.cleanup }));
}
