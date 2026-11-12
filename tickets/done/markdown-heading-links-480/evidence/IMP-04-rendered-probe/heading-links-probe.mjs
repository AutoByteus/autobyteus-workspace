#!/usr/bin/env node
// autobyteus-480 implementation self-check (rendered result; not the API/E2E sign-off). Adapted from the autobyteus-452 harness.
//
// One isolated node from this worktree (launch owner credential, scripted AGY: `ECHO_INPUT <text>` answers `ECHO:"<text>"`,
// so the agent's message carries Markdown links to absolute paths) and a desktop window (`nuxt dev`) in headless Chrome.
// Test files only: the workspace holds a copy of the design-principles.md fixture and a links file.
//   1. Open docs/design-principles.md from its link; for every Contents entry (`#anchor`): scroll the viewer to the top,
//      click the entry, and record whether the heading is in view near the viewer's top, and whether the URL stayed.
//   2. In the same file, click a relative link to another file (`ticket-scope.md#common-situations`).
//   3. Open docs/links.md; click a broken anchor and relative/root-relative links; the URL and the viewer must stay.
// Usage: node heading-links-probe.mjs --output-dir=<fresh dir>
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.env.IMP480_WORKTREE ?? '/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480';
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const access = await import(path.join(webDir, 'tests', 'e2e', 'fixtures', 'probe-node-access.mjs'));
access.attachToProbeProcess();
const arg = (n, f) => { const h = process.argv.find(v => v.startsWith(`--${n}=`)); return h ? h.slice(h.indexOf('=') + 1) : f; };
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `imp480-probe-${Date.now()}`)));
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const redact = t => access.redactCredentials(String(t)).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const summary = { startedAt: new Date().toISOString(), contents: [], relativeInDoc: null, linksFile: [], error: null };
const log = (event, d = {}) => console.log(redact(JSON.stringify({ t: Date.now() - t0, event, ...d })));
const waitFor = async (what, fn, ms = 60_000, every = 250) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { if (await fn()) return true; } catch (e) { last = e; } await sleep(every); } throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`); };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });

await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'imp480-probe-')));
const port = await freePort(); const frontendPort = await freePort();
const base = `http://127.0.0.1:${port}`; const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${base}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const server = spawn(process.execPath, [path.join(serverDir, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...access.probeNodeEnvironment(), PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'INFO',
    AUTOBYTEUS_SERVER_HOST: base, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' } });
const serverLog = createWriteStream(path.join(outputDir, 'server.log')); server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
let frontend, browser;
try {
  await waitFor('node', async () => { if (server.exitCode !== null) throw new Error('server exited'); return fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000, 300);
  const gql = async (q, v) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (b.errors?.length || !b.data) throw new Error(JSON.stringify(b).slice(0, 500)); return b.data; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const defId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Writer', role: 'assistant', description: '480 probe', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const ws = path.join(root, 'workspace');
  const files = { doc: path.join(ws, 'docs', 'design-principles.md'), links: path.join(ws, 'docs', 'links.md') };
  await fs.mkdir(path.dirname(files.doc), { recursive: true });
  await fs.copyFile(path.join(webDir, 'utils', '__tests__', 'fixtures', 'design-principles.md'), files.doc);
  const linkTargets = ['#no-such-heading', 'other.md', 'other.md#x', '/x.md', './x.md'];
  await fs.writeFile(files.links, `# Links\n\n${linkTargets.map((href, i) => `- [link ${i}](${href})`).join('\n')}\n\n## Section\n\nLINKS-FILE-BODY\n`);
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: ws } }).catch(() => undefined);
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: defId, workspaceRootPath: ws, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const runId = run.runId;
  const projection = async () => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const sock = new WebSocket(access.ownerSocketUrl(`${base.replace('http', 'ws')}/ws/agent/${runId}`)); await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; }); await sleep(300);
  sock.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: runId,
    content: `ECHO_INPUT LINKS ${Object.entries(files).map(([k, p]) => `[${k}](${p})`).join(' ')}` } }));
  await waitFor('the links message', async () => (await projection()).includes('ECHO:'), 60_000); sock.close();
  log('stack', { runId });

  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const control = (page, filePath) => page.locator(`body [data-event-monitor-file-action-control="true"][title="${filePath}"]`).last();
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: base } });
  const feLog = createWriteStream(path.join(outputDir, 'frontend.log')); frontend.stdout.pipe(feLog); frontend.stderr.pipe(feLog);
  await waitFor('frontend', async () => fetch(frontendUrl).then(r => r.ok).catch(() => false), 300_000, 1000);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await access.attachToBrowserContext(ctx); await ctx.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const popups = []; let step = 'start';
  ctx.on('page', (p) => { const entry = { step, url: p.url() }; popups.push(entry); p.waitForLoadState().then(() => { entry.url = p.url(); }).catch(() => undefined); });
  const page = await ctx.newPage();
  await page.goto(frontendUrl, { waitUntil: 'networkidle', timeout: 300_000 }).catch(() => undefined); await sleep(3000);
  await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 300_000 });
  await page.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 180_000 });
  if ((await page.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') { await page.locator('[data-test="run-section-view-menu"]').click(); await page.locator('[data-test="run-section-view-runs"]').click(); }
  await page.locator(`[data-test="run-list-row"][data-run-id="${runId}"]`).first().click({ timeout: 120_000 });
  const open = async (key) => { await control(page, files[key]).scrollIntoViewIfNeeded(); await control(page, files[key]).click(); await sleep(2500); };

  // Measures, inside the viewer, the heading's position relative to its scroll container, and resets the container to the top.
  const measure = (id) => page.evaluate((headingId) => {
    const viewer = document.querySelector('#contentViewer');
    const heading = [...(viewer?.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? [])].find((h) => h.id === headingId);
    if (!heading) return { found: false };
    let box = heading.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    const h = heading.getBoundingClientRect(); const c = (box ?? document.documentElement).getBoundingClientRect();
    return { found: true, offsetFromViewerTop: Math.round(h.top - c.top), inView: h.top >= c.top - 1 && h.bottom <= c.bottom + 1, scrollTop: box ? Math.round(box.scrollTop) : null };
  }, id);
  const resetScroll = () => page.evaluate(() => {
    const viewer = document.querySelector('#contentViewer');
    viewer?.querySelectorAll('*').forEach((el) => { if (el.scrollTop > 0) el.scrollTop = 0; });
  });
  const viewerText = async () => (await page.locator('#contentViewer').innerText().catch(() => '')).replace(/\s+/g, ' ');

  step = 'open run'; await sleep(1000);
  step = 'open doc'; await open('doc');
  const anchors = await page.locator('#contentViewer a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const href of anchors) {
    await resetScroll(); await sleep(150);
    step = `contents ${href}`;
    const before = page.url();
    await page.locator(`#contentViewer a[href="${href}"]`).first().click();
    await sleep(500);
    const m = await measure(`user-content-${decodeURIComponent(href.slice(1))}`);
    summary.contents.push({ href, urlUnchanged: page.url() === before, ...m });
  }
  await resetScroll(); await page.locator('#contentViewer a[href="#the-approach-spine-first-practices-in-context"]').first().click(); await sleep(500);
  await page.screenshot({ path: path.join(outputDir, 'desktop-after-contents-click.png') });
  {
    const href = 'ticket-scope.md#common-situations';
    step = href;
    const before = page.url();
    await page.locator(`#contentViewer a[href="${href}"]`).first().click(); await sleep(800);
    summary.relativeInDoc = { href, urlUnchanged: page.url() === before, docStillShown: (await viewerText()).includes('Design Principles'), popups: popups.length };
  }

  step = 'open links'; await open('links');
  for (const href of linkTargets) {
    step = href;
    const before = page.url();
    await page.locator(`#contentViewer a[href="${href}"]`).first().click(); await sleep(800);
    const text = await viewerText();
    summary.linksFile.push({ href, urlUnchanged: page.url() === before, linksFileStillShown: text.includes('LINKS-FILE-BODY'), notFoundShown: /404|not found/i.test(text), popups: popups.length });
  }
  await page.screenshot({ path: path.join(outputDir, 'desktop-links-file-after-clicks.png') });
  summary.totals = {
    contentsEntries: summary.contents.length,
    contentsFound: summary.contents.filter((c) => c.found).length,
    contentsInView: summary.contents.filter((c) => c.inView).length,
    contentsUrlUnchanged: summary.contents.filter((c) => c.urlUnchanged).length,
    linksUrlUnchanged: summary.linksFile.filter((l) => l.urlUnchanged && l.linksFileStillShown && !l.notFoundShown).length,
    popups,
  };
  log('result', summary.totals);
} catch (error) {
  summary.error = redact(error.stack ?? String(error)); console.error(summary.error); process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend) { try { process.kill(-frontend.pid, 'SIGTERM'); } catch {} await sleep(3000); try { process.kill(-frontend.pid, 'SIGKILL'); } catch {} }
  server.kill('SIGTERM'); await Promise.race([new Promise(r => server.once('close', r)), sleep(10_000)]); if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  summary.cleanup = { serverExited: server.exitCode !== null || server.signalCode !== null, rootRemoved: !existsSync(root) };
  await fs.writeFile(path.join(outputDir, 'probe-summary.json'), `${redact(JSON.stringify(summary, null, 2))}\n`);
  process.exit(process.exitCode ?? 0);
}
