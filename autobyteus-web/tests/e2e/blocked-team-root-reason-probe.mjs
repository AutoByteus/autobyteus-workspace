#!/usr/bin/env node
// A team root its restore admission refuses shows the admission's reason in the web (autobyteus-461 CR-461-069, CR-461-073;
// API-REV-010): real Nuxt dev frontend + built backend + fresh headless Chrome, on a released-shape data root that a server
// test kept while its token consolidation was still blocked (synthesized data, never user data):
//   cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER TEAM_RUN_V1_KEEP_BLOCKED=<dir> pnpm exec vitest run \
//     tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts -t "keeps the server healthy" --no-watch
// Then, from the repository root: node autobyteus-web/tests/e2e/blocked-team-root-reason-probe.mjs --kept <dir> --output-dir <fresh dir>
// BTR-01: the backend's answer at the team view's connect (its own stream: the admission's code and text, then 4004); the
// user opens the root from the run list; the page shows that reason (its code or its text), not a schema error.
// If the run list does not offer the root, the probe records what it lists instead.
// The probe owns a copy of the kept root, free ports, the backend and Nuxt process groups and Chrome, and removes them in
// finally. It never uses the installed app or user data.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';
attachToProbeProcess();

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const outputDir = path.resolve(getArg('output-dir', 'test-results/blocked-team-root-reason'));
const keptDir = path.resolve(getArg('kept', ''));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((c) => fs.existsSync(c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 15000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await until('owned process killed', () => exited(child), 5000);
  });
  return { pid: child.pid, status: 'terminated', exit: child.exitCode ?? child.signalCode };
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};

const startStack = async (kept) => {
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'blocked-team-root-'));
  const dataDir = path.join(stack.dataRoot, 'root');
  await fsp.cp(path.join(keptDir, 'root'), dataDir, { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'db'), { recursive: true });
  const dbPath = path.join(dataDir, 'db', 'production.db');
  await fsp.copyFile(path.join(keptDir, 'production.db'), dbPath);
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  // The kept root's settings, pointed at this copy's database and ports.
  const fixed = { DATABASE_URL: `file:${dbPath}`, AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl };
  const lines = (await fsp.readFile(path.join(dataDir, '.env'), 'utf8').catch(() => '')).split('\n')
    .filter((line) => line && !Object.keys(fixed).some((key) => line.startsWith(`${key}=`)));
  await fsp.writeFile(path.join(dataDir, '.env'), `${[...lines, ...Object.entries(fixed).map(([k, v]) => `${k}=${v}`)].join('\n')}\n`, { mode: 0o600 });
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_') && k !== 'DATABASE_URL')),
    ...fixed, HOME: path.join(stack.dataRoot, 'home') };
  await fsp.mkdir(env.HOME, { recursive: true });
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataDir],
    serverDir, withNodeCredential(env), 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, rootTeamRunId: kept.rootTeamRunId };
};

/** The backend's own answer at the team view's connect: its frames and close code. */
const connectAnswer = async (teamRunId) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent-team/${teamRunId}`);
  const frames = [];
  socket.on('message', (raw) => frames.push(JSON.parse(String(raw))));
  const closed = new Promise((resolve) => socket.once('close', (code) => resolve(code)));
  const code = await Promise.race([closed, sleep(20000).then(() => 'open after 20 s')]);
  socket.terminate();
  return { closeCode: code, frames: frames.map((f) => ({ type: f.type, code: f.payload?.code, message: f.payload?.message })) };
};

let result = 'Pass';
let browser = null;
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  if (!keptDir || !fs.existsSync(path.join(keptDir, 'kept.json'))) throw new Error('Pass --kept <dir> written by the server test (TEAM_RUN_V1_KEEP_BLOCKED)');
  if (!executablePath) throw new Error('No Chrome found; pass --browser-executable');
  const kept = JSON.parse(await fsp.readFile(path.join(keptDir, 'kept.json'), 'utf8'));
  await startStack(kept);
  const details = { expectedCode: kept.expectedCode };
  evidence.cases['BTR-01'] = { description: "the token-blocked team root's reason, at the connect and in the page", details };
  details.connect = await connectAnswer(kept.rootTeamRunId);
  const error = details.connect.frames.find((f) => f.type === 'ERROR');
  if (!error || error.code !== kept.expectedCode || /missing required field|rootTeam\.members/.test(error.message ?? '')) {
    throw Object.assign(new Error(`the connect does not answer ${kept.expectedCode}`), { details: details.connect });
  }
  details.listed = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{listWorkspaceRunHistory{workspaceRootPath teamDefinitions{teamDefinitionId teamDefinitionName runs{teamRunId}}}}' }) })
    .then((r) => r.json()).catch((e) => ({ error: String(e) }));
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US' });
  await attachToBrowserContext(context);
  const page = await context.newPage();
  try {
    await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
    await sleep(3000);
    // Expand every workspace and team definition the run list offers, then look for the root's row.
    for (const row of await page.locator('[data-test="workspace-row"]').all()) await row.click().catch(() => undefined);
    await sleep(1000);
    for (const row of await page.locator('[data-test^="workspace-team-definition-row-"]').all()) await row.click().catch(() => undefined);
    await sleep(1500);
    const rowSelector = `[data-test="workspace-team-row-${kept.rootTeamRunId}"]`;
    details.rowOffered = (await page.locator(rowSelector).count()) > 0;
    details.teamRowsShown = await page.locator('[data-test^="workspace-team-row-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-test')));
    if (!details.rowOffered) {
      await page.screenshot({ path: path.join(outputDir, 'BTR-01-run-list.png'), fullPage: true });
      throw Object.assign(new Error('the run list does not offer the blocked root'), { details });
    }
    await page.locator(rowSelector).first().click();
    const reason = new RegExp(`${kept.expectedCode}|token usage|migration`, 'i');
    await until('the reason shown', async () => reason.test(await page.locator('body').innerText()), 30000).catch(() => undefined);
    const body = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(outputDir, 'BTR-01-opened.png'), fullPage: true });
    details.shown = body.split('\n').filter((line) => reason.test(line) || /cannot|not available|error/i.test(line)).slice(0, 12);
    details.schemaErrorShown = /missing required field|rootTeam\.members/.test(body);
    if (!reason.test(body) || details.schemaErrorShown) throw Object.assign(new Error('the page does not show the admission\'s reason'), { details });
  } finally { await context.close(); }
  evidence.cases['BTR-01'].result = 'Pass';
} catch (error) {
  result = 'Fail';
  if (evidence.cases['BTR-01']) evidence.cases['BTR-01'].result = 'Fail';
  evidence.failures.push({ id: 'BTR-01', message: error.message, details: error.details });
} finally {
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = `failed: ${e.message}`; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = `failed: ${e.message}`; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = `failed: ${e.message}`; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`Blocked team root reason probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);
