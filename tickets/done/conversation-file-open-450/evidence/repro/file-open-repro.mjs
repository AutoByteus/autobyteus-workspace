#!/usr/bin/env node
// autobyteus-450 reproduction (Solution Designer, investigation only; not a product test).
//
// One isolated node from this worktree (temp data root and HOME, launch owner credential, scripted AGY CLI:
// `ECHO_INPUT <text>` makes the agent answer `ECHO:"<text>"`, so its message can carry Markdown links to absolute paths).
// A desktop window (`nuxt dev` against the node, carrying the owner credential as the desktop's main process does) and a
// paired phone (the node's production bundle at /mobile, 390x844, private-address host).
//
// BUG 2 (a file link opened again shows old content), desktop FIRST, then the phone:
//   D1 the agent's message links post.md (VERSION-ONE); click it: the viewer shows it.
//   D2 the file is rewritten (VERSION-TWO) and the agent links it again; click the new link: what does the viewer show?
//   D3 wait 10 s on the open viewer (the live file feed): does it change?
//   D4 close the file's tab, click the link again; D5 reload the page, click again.
//   P1..P3 the same on the phone (tap, Back, rewrite VERSION-THREE, tap the new link; then reload).
// BUG 1 (an attached image on the phone): the phone sends a message with an attached PNG and a text file; is the chip a
//   thumbnail or a name; a tap: where does it go (viewer, a new window or a navigation of the page) and what does the node
//   answer to that request.
//
// Usage: node file-open-repro.mjs --output-dir=<fresh dir>
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.env.SD450_WORKTREE ?? '/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450';
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const access = await import(path.join(webDir, 'tests', 'e2e', 'fixtures', 'probe-node-access.mjs'));
access.attachToProbeProcess();
const arg = (n, f) => { const h = process.argv.find(v => v === `--${n}` || v.startsWith(`--${n}=`)); return h ? (h.includes('=') ? h.slice(h.indexOf('=') + 1) : true) : f; };
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `sd450-repro-${Date.now()}`)));
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PHONE_HOST = '192.168.77.10';
const redact = t => access.redactCredentials(String(t)).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/(access_token|pairing)=[^&\s"']+/g, '$1=…');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const summary = { startedAt: new Date().toISOString(), timeline: [], desktop: {}, phone: {}, bug1: {}, error: null };
const log = (event, d = {}) => { const e = JSON.parse(redact(JSON.stringify({ t: Date.now() - t0, event, ...d }))); summary.timeline.push(e); console.log(JSON.stringify(e)); };
const waitFor = async (what, fn, ms = 60_000, every = 250) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { if (await fn()) return true; } catch (e) { last = e; } await sleep(every); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'sd450-repro-')));
const port = await freePort(); const frontendPort = await freePort();
const base = `http://127.0.0.1:${port}`; const frontendUrl = `http://127.0.0.1:${frontendPort}`; const phoneOrigin = `http://${PHONE_HOST}:${port}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${base}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const server = spawn(process.execPath, [path.join(serverDir, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...access.probeNodeEnvironment(), PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
    AUTOBYTEUS_SERVER_HOST: base, AUTOBYTEUS_ALLOWED_HOSTS: PHONE_HOST, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl, AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'all',
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' } });
const serverLog = createWriteStream(path.join(outputDir, 'server.log')); server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
let frontend, browser;
try {
  await waitFor('node', async () => { if (server.exitCode !== null) throw new Error('server exited'); return fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000, 300);
  const gql = async (q, v) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (b.errors?.length || !b.data) throw new Error(JSON.stringify(b).slice(0, 500)); return b.data; };
  const rest = async (m, r, body) => { const x = await fetch(`${base}/rest${r}`, { method: m, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); return { status: x.status, body: await x.json().catch(() => null) }; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const defId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Content Creator', role: 'assistant', description: '450 repro', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const workspace = path.join(root, 'workspace'); const postPath = path.join(workspace, 'posts', 'post.md');
  await fs.mkdir(path.dirname(postPath), { recursive: true }); await fs.writeFile(postPath, '# Post\n\nVERSION-ONE-1111 the first draft.\n');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: defId, workspaceRootPath: workspace, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const runId = run.runId;
  const projection = async () => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const say = async (content) => { const ws = new WebSocket(access.ownerSocketUrl(`${base.replace('http', 'ws')}/ws/agent/${runId}`)); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await sleep(300);
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:repro:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content } })); await sleep(600); ws.close(); };
  const linkMessage = async (marker) => { await say(`ECHO_INPUT ${marker} Read the post: [post.md](${postPath})`); await waitFor(`echo ${marker}`, async () => (await projection()).includes(`ECHO:`) && (await projection()).includes(marker), 60_000); };
  await linkMessage('LINK-A');
  log('stack', { runId, postPath: postPath.replace(root, '<root>') });

  // ---- desktop window -----------------------------------------------------------------------------------------------
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: base } });
  const feLog = createWriteStream(path.join(outputDir, 'frontend.log')); frontend.stdout.pipe(feLog); frontend.stderr.pipe(feLog);
  await waitFor('frontend', async () => fetch(frontendUrl).then(r => r.ok).catch(() => false), 300_000, 1000);
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await access.attachToBrowserContext(dctx); await dctx.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const desk = await dctx.newPage();
  await desk.goto(frontendUrl, { waitUntil: 'networkidle', timeout: 300_000 }).catch(() => undefined); await sleep(3000);
  await desk.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  const control = (page, scope = 'body') => page.locator(`${scope} [data-event-monitor-file-action-control="true"][title="${postPath}"]`);
  const openDeskRun = async () => {
    await desk.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 180_000 });
    if ((await desk.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') {
      await desk.locator('[data-test="run-section-view-menu"]').click(); await desk.locator('[data-test="run-section-view-runs"]').click();
    }
    await desk.locator(`[data-test="run-list-row"][data-run-id="${runId}"]`).first().click({ timeout: 120_000 });
    await control(desk).first().waitFor({ timeout: 60_000 });
  };
  const deskViewerText = async () => (await desk.locator('#contentViewer').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const versionIn = text => (text.match(/VERSION-[A-Z]+-\d{4}/g) ?? []).join(',') || 'none';
  const deskClickLast = async () => { await control(desk).last().scrollIntoViewIfNeeded(); await control(desk).last().click(); await sleep(2500); return versionIn(await deskViewerText()); };
  await openDeskRun();
  summary.desktop.D1_firstOpen = await deskClickLast();
  await desk.screenshot({ path: path.join(outputDir, 'desktop-D1.png') });
  await fs.writeFile(postPath, '# Post\n\nVERSION-TWO-2222 the rewritten post.\n');
  await linkMessage('LINK-B');
  await waitFor('the second link on the desktop', async () => (await control(desk).count()) >= 2, 30_000).catch(() => undefined);
  summary.desktop.D2_newLinkAfterRewrite = await deskClickLast();
  await desk.screenshot({ path: path.join(outputDir, 'desktop-D2.png') });
  await sleep(10_000);
  summary.desktop.D3_after10sOpen = versionIn(await deskViewerText());
  // D4: close the file's tab (its close button in the file tabs), click the link again.
  const closeBtn = desk.locator('#contentViewer').locator('xpath=..').locator('button[aria-label*="Close"], button[title*="Close"]').first();
  summary.desktop.D4_closeButtonFound = (await closeBtn.count()) > 0;
  if (summary.desktop.D4_closeButtonFound) { await closeBtn.click().catch(() => undefined); await sleep(800); summary.desktop.D4_afterCloseAndReopen = await deskClickLast(); }
  await desk.reload({ waitUntil: 'domcontentloaded' }); await openDeskRun();
  summary.desktop.D5_afterReload = await deskClickLast();
  log('desktop', summary.desktop);

  // ---- phone ---------------------------------------------------------------------------------------------------------
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Repro Node', trustedPrivateHttpAcknowledged: true });
  if (pairing.status !== 201) throw new Error(`pairing ${pairing.status}`);
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
  const phone = await pctx.newPage();
  const nodeResponses = [];
  pctx.on('response', r => { if (r.url().includes('/rest/')) nodeResponses.push({ url: redact(r.url()).replace(phoneOrigin, ''), status: r.status(), type: r.request().resourceType(), mainFrame: r.request().isNavigationRequest() }); });
  const popups = [];
  pctx.on('page', p => { if (p !== phone) popups.push(p); });
  await phone.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await phone.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
  await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
  const openPhoneRun = async () => {
    await phone.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).click();
    await waitFor('run screen', async () => (await phone.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
    await control(phone, '[data-testid="mobile-run-conversation"]').first().waitFor({ timeout: 30_000 });
  };
  const phoneViewer = () => phone.locator('[data-testid="mobile-file-viewer"]');
  const phoneTapLast = async () => {
    const c = control(phone, '[data-testid="mobile-run-conversation"]'); await c.last().scrollIntoViewIfNeeded(); await c.last().tap();
    await phoneViewer().waitFor({ timeout: 20_000 }).catch(() => undefined); await sleep(2000);
    return versionIn((await phoneViewer().innerText().catch(() => '')).replace(/\s+/g, ' '));
  };
  await openPhoneRun();
  summary.phone.P1_firstOpen = await phoneTapLast();
  await phone.goBack(); await sleep(1200);
  await fs.writeFile(postPath, '# Post\n\nVERSION-THREE-3333 the third post.\n');
  await linkMessage('LINK-C');
  await waitFor('the third link on the phone', async () => (await control(phone, '[data-testid="mobile-run-conversation"]').count()) >= 3, 30_000).catch(() => undefined);
  summary.phone.P2_newLinkAfterRewrite = await phoneTapLast();
  await phone.screenshot({ path: path.join(outputDir, 'phone-P2.png') });
  await phone.goBack(); await sleep(1000);
  await phone.reload({ waitUntil: 'domcontentloaded' }); await phone.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 }); await openPhoneRun();
  summary.phone.P3_afterReload = await phoneTapLast();
  await phone.goBack(); await sleep(800);
  log('phone', summary.phone);

  // ---- BUG 1: an attached image on the phone --------------------------------------------------------------------------
  const pngPath = path.join(root, 'attach-450.png');
  await fs.writeFile(pngPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  const conv = phone.locator('[data-testid="mobile-run-conversation"]');
  const fileInput = conv.locator('input[type="file"]').first();
  summary.bug1.fileInputFound = (await fileInput.count()) > 0;
  await fileInput.setInputFiles(pngPath);
  await sleep(2500);
  const box = conv.locator('textarea').last(); await box.fill('ATTACH-450 here is a screenshot');
  const send = conv.locator('button[aria-label="Send message"]').last();
  await waitFor('send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 30_000); await send.click();
  const chipSel = 'button.message-attachment-thumbnail-button, button.message-attachment-chip';
  await waitFor('the sent message with its attachment', async () => (await conv.locator(chipSel).count()) > 0, 60_000);
  await sleep(3000);
  const chip = conv.locator(chipSel).last();
  summary.bug1.chipKind = await chip.evaluate(el => el.classList.contains('message-attachment-thumbnail-button') ? 'thumbnail' : 'name-chip');
  summary.bug1.chipLabel = (await chip.innerText().catch(() => '')).trim().slice(0, 60);
  summary.bug1.thumbnailRequests = nodeResponses.filter(r => r.type === 'image').slice(-4);
  await phone.screenshot({ path: path.join(outputDir, 'phone-bug1-chip.png') });
  const before = { url: phone.url(), responses: nodeResponses.length, popups: popups.length };
  await chip.tap(); await sleep(3000);
  summary.bug1.afterTap = {
    phoneUrlChanged: phone.url() !== before.url, phoneUrl: redact(phone.url()).replace(phoneOrigin, ''),
    newWindow: popups.length > before.popups ? redact(popups.at(-1).url()).replace(phoneOrigin, '') : null,
    viewerOpen: await phoneViewer().count(),
    requestsAfterTap: nodeResponses.slice(before.responses),
  };
  if (popups.length > before.popups) await popups.at(-1).screenshot({ path: path.join(outputDir, 'phone-bug1-newwindow.png') }).catch(() => undefined);
  await phone.screenshot({ path: path.join(outputDir, 'phone-bug1-after-tap.png') });
  log('bug1', summary.bug1);
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
