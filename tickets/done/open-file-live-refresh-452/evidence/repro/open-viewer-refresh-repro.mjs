#!/usr/bin/env node
// autobyteus-452 reproduction (Solution Designer, investigation only; not a product test).
//
// One isolated node from this worktree (launch owner credential, scripted AGY: `ECHO_INPUT <text>` answers `ECHO:"<text>"`,
// so the agent's message carries Markdown links to absolute paths), a desktop window (`nuxt dev`, carrying the credential)
// and a paired phone (the node's /mobile bundle).
//
// For each case the file is opened from its link in the conversation and the viewer is LEFT OPEN; then the file changes on
// disk and the script waits 8 s. Measured: what the viewer shows (text cases) and whether the window read the file's content
// again after the change (all cases: a GraphQL GetFileContent for the path, or a GET of its content URL).
//   A  text in an unexpanded folder (deep/inner/a.md), rewritten in place
//   B  text rewritten atomically (write b.md.tmp, rename over b.md)
//   C  image (c.png) rewritten in place with a different image
//   D  PDF (d.pdf) rewritten in place
//   E  control: text at the workspace root (e.md), rewritten in place
// Usage: node open-viewer-refresh-repro.mjs --output-dir=<fresh dir> [--surfaces=desktop,phone]
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.env.SD452_WORKTREE ?? '/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452';
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const access = await import(path.join(webDir, 'tests', 'e2e', 'fixtures', 'probe-node-access.mjs'));
access.attachToProbeProcess();
const arg = (n, f) => { const h = process.argv.find(v => v === `--${n}` || v.startsWith(`--${n}=`)); return h ? (h.includes('=') ? h.slice(h.indexOf('=') + 1) : true) : f; };
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `sd452-repro-${Date.now()}`)));
const surfaces = new Set(String(arg('surfaces', 'desktop,phone')).split(','));
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PHONE_HOST = '192.168.77.10';
const redact = t => access.redactCredentials(String(t)).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/(access_token|pairing)=[^&\s"']+/g, '$1=…');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const summary = { startedAt: new Date().toISOString(), timeline: [], desktop: {}, phone: {}, error: null };
const log = (event, d = {}) => { const e = JSON.parse(redact(JSON.stringify({ t: Date.now() - t0, event, ...d }))); summary.timeline.push(e); console.log(JSON.stringify(e)); };
const waitFor = async (what, fn, ms = 60_000, every = 250) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { if (await fn()) return true; } catch (e) { last = e; } await sleep(every); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
// Two valid PNGs of different sizes (1x1 and 2x2) and two minimal PDFs with different text.
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const PNG2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8DwnwEJMCJzAFYgBP3+3w0rAAAAAElFTkSuQmCC', 'base64');
const pdf = (text) => {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream = `BT /F1 12 Tf 10 50 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let body = '%PDF-1.4\n'; const offsets = [];
  objs.forEach((o, i) => { offsets.push(body.length); body += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = body.length;
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
};

await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'sd452-repro-')));
const port = await freePort(); const frontendPort = await freePort();
const base = `http://127.0.0.1:${port}`; const frontendUrl = `http://127.0.0.1:${frontendPort}`; const phoneOrigin = `http://${PHONE_HOST}:${port}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${base}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const server = spawn(process.execPath, [path.join(serverDir, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...access.probeNodeEnvironment(), PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'INFO',
    AUTOBYTEUS_SERVER_HOST: base, AUTOBYTEUS_ALLOWED_HOSTS: PHONE_HOST, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' } });
const serverLog = createWriteStream(path.join(outputDir, 'server.log')); server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
let frontend, browser;
try {
  await waitFor('node', async () => { if (server.exitCode !== null) throw new Error('server exited'); return fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000, 300);
  const gql = async (q, v) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (b.errors?.length || !b.data) throw new Error(JSON.stringify(b).slice(0, 500)); return b.data; };
  const rest = async (m, r, body) => { const x = await fetch(`${base}/rest${r}`, { method: m, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); return { status: x.status, body: await x.json().catch(() => null) }; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const defId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Writer', role: 'assistant', description: '452 repro', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const ws = path.join(root, 'workspace');
  const files = {
    A: path.join(ws, 'deep', 'inner', 'a.md'), B: path.join(ws, 'b.md'), C: path.join(ws, 'pics', 'c.png'), D: path.join(ws, 'docs', 'd.pdf'), E: path.join(ws, 'e.md'),
  };
  await fs.mkdir(path.dirname(files.A), { recursive: true }); await fs.mkdir(path.dirname(files.C), { recursive: true }); await fs.mkdir(path.dirname(files.D), { recursive: true });
  const writeV1 = async () => {
    await fs.writeFile(files.A, 'A-VERSION-1\n'); await fs.writeFile(files.B, 'B-VERSION-1\n'); await fs.writeFile(files.C, PNG1);
    await fs.writeFile(files.D, pdf('D VERSION 1')); await fs.writeFile(files.E, 'E-VERSION-1\n');
  };
  const rewrite = async (key, v) => {
    if (key === 'A') await fs.writeFile(files.A, `A-VERSION-${v}\n`);
    if (key === 'B') { await fs.writeFile(`${files.B}.tmp`, `B-VERSION-${v}\n`); await fs.rename(`${files.B}.tmp`, files.B); }
    if (key === 'C') await fs.writeFile(files.C, v % 2 ? PNG1 : PNG2);
    if (key === 'D') await fs.writeFile(files.D, pdf(`D VERSION ${v}`));
    if (key === 'E') await fs.writeFile(files.E, `E-VERSION-${v}\n`);
  };
  await writeV1();
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: ws } }).catch(() => undefined);
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: defId, workspaceRootPath: ws, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const runId = run.runId;
  const projection = async () => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const sock = new WebSocket(access.ownerSocketUrl(`${base.replace('http', 'ws')}/ws/agent/${runId}`)); await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; }); await sleep(300);
  sock.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:repro:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: runId,
    content: `ECHO_INPUT LINKS ${Object.entries(files).map(([k, p]) => `[${k}](${p})`).join(' ')}` } }));
  await waitFor('the links message', async () => (await projection()).includes('ECHO:'), 60_000); sock.close();
  log('stack', { runId });

  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const control = (page, filePath, scope = 'body') => page.locator(`${scope} [data-event-monitor-file-action-control="true"][title="${filePath}"]`).last();
  const track = (ctx, label) => { const reads = []; ctx.on('request', (req) => {
    const url = req.url(); const body = req.postData() ?? '';
    for (const [k, p] of Object.entries(files)) {
      const rel = path.relative(ws, p);
      if ((url.includes('/graphql') && body.includes('GetFileContent') && body.includes(rel)) || (url.includes('/rest/') && (url.includes(encodeURIComponent(rel)) || url.includes(rel) || url.includes(encodeURIComponent(p))))) reads.push({ key: k, at: Date.now() });
    }
  }); return reads; };
  const runCases = async (page, label, reads, scope, viewerSel, openOne) => {
    const out = {};
    for (const key of ['E', 'A', 'B', 'C', 'D']) {
      await openOne(key);
      await sleep(2500);
      const before = (await page.locator(viewerSel).innerText().catch(() => '')).replace(/\s+/g, ' ');
      const changedAt = Date.now(); await rewrite(key, 2); await sleep(8000);
      const after = (await page.locator(viewerSel).innerText().catch(() => '')).replace(/\s+/g, ' ');
      const reread = reads.filter(r => r.key === key && r.at >= changedAt).map(r => r.at - changedAt);
      const textKey = ['A', 'B', 'E'].includes(key);
      out[key] = { textBefore: textKey ? (before.match(new RegExp(`${key}-VERSION-\\d`)) ?? ['none'])[0] : undefined,
        textAfter8s: textKey ? (after.match(new RegExp(`${key}-VERSION-\\d`)) ?? ['none'])[0] : undefined, contentReadsAfterChangeMs: reread };
      await page.screenshot({ path: path.join(outputDir, `${label}-${key}.png`) });
      await rewrite(key, 1); await sleep(1500);
    }
    return out;
  };

  if (surfaces.has('desktop')) {
    frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: base } });
    const feLog = createWriteStream(path.join(outputDir, 'frontend.log')); frontend.stdout.pipe(feLog); frontend.stderr.pipe(feLog);
    await waitFor('frontend', async () => fetch(frontendUrl).then(r => r.ok).catch(() => false), 300_000, 1000);
    const dctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await access.attachToBrowserContext(dctx); await dctx.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const reads = track(dctx, 'desktop');
    const desk = await dctx.newPage();
    await desk.goto(frontendUrl, { waitUntil: 'networkidle', timeout: 300_000 }).catch(() => undefined); await sleep(3000);
    await desk.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 300_000 });
    await desk.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 180_000 });
    if ((await desk.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') { await desk.locator('[data-test="run-section-view-menu"]').click(); await desk.locator('[data-test="run-section-view-runs"]').click(); }
    await desk.locator(`[data-test="run-list-row"][data-run-id="${runId}"]`).first().click({ timeout: 120_000 });
    await control(desk, files.E).waitFor({ timeout: 60_000 });
    summary.desktop = await runCases(desk, 'desktop', reads, 'body', '#contentViewer', async (key) => { await control(desk, files[key]).scrollIntoViewIfNeeded(); await control(desk, files[key]).click(); });
    log('desktop', summary.desktop);
  }
  if (surfaces.has('phone')) {
    await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Repro Node', trustedPrivateHttpAcknowledged: true });
    if (pairing.status !== 201) throw new Error(`pairing ${pairing.status}`);
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
    const reads = track(pctx, 'phone');
    const phone = await pctx.newPage();
    await phone.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await phone.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    await phone.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).click();
    const conv = '[data-testid="mobile-run-conversation"]';
    await control(phone, files.E, conv).waitFor({ timeout: 30_000 });
    summary.phone = await runCases(phone, 'phone', reads, conv, '[data-testid="mobile-file-viewer"]', async (key) => {
      if (await phone.locator('[data-testid="mobile-file-viewer"]').count()) { await phone.goBack(); await sleep(1200); }
      await control(phone, files[key], conv).scrollIntoViewIfNeeded(); await control(phone, files[key], conv).tap();
      await phone.locator('[data-testid="mobile-file-viewer"]').waitFor({ timeout: 20_000 }).catch(() => undefined);
    });
    log('phone', summary.phone);
  }
  const serverText = await fs.readFile(path.join(outputDir, 'server.log'), 'utf8').catch(() => '');
  summary.serverWatcher = { modificationLines: (serverText.match(/Watcher detected modification/g) ?? []).length, creationLines: (serverText.match(/Watcher detected creation/g) ?? []).length, deletionLines: (serverText.match(/Watcher detected deletion/g) ?? []).length };
} catch (error) {
  summary.error = redact(error.stack ?? String(error)); console.error(summary.error); process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend) { try { process.kill(-frontend.pid, 'SIGTERM'); } catch {} await sleep(3000); try { process.kill(-frontend.pid, 'SIGKILL'); } catch {} }
  server.kill('SIGTERM'); await Promise.race([new Promise(r => server.once('close', r)), sleep(10_000)]); if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  summary.cleanup = { serverExited: server.exitCode !== null || server.signalCode !== null, rootRemoved: !existsSync(root) };
  await fs.writeFile(path.join(outputDir, 'repro-summary.json'), `${redact(JSON.stringify(summary, null, 2))}\n`);
  process.exit(process.exitCode ?? 0);
}
