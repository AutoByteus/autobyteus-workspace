#!/usr/bin/env node
// autobyteus-533 reproduction (Solution Designer, scratch): Stop clicked twice in the real renderer.
// Built server (dist/app.js) with the scripted AGY CLI (HOLD_TURN keeps a turn running), Nuxt dev, headless Chrome.
// Optional --latency-ms <n>: every WebSocket chunk between the page and the node is delayed by n ms in each direction
// (a small TCP proxy), as a phone on a remote path sees it.
// Cases: for each click gap, hold a turn, click Stop twice, then read the toasts the page shows.
// Run: node tests/e2e/interrupt-twice-repro-scratch.mjs --output-dir <fresh dir> [--latency-ms 150]
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';
attachToProbeProcess();
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const outputDir = path.resolve(arg('output-dir', '/tmp/sd533/browser'));
const latencyMs = Number(arg('latency-ms', '0'));
const gaps = (arg('gaps', '0,60,150,300,600')).split(',').map(Number);
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(outputDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(50); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null, proxy: null };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => { if (exited(child)) return; process.kill(-child.pid, 'SIGTERM'); await until('exit', () => exited(child), 15000).catch(() => process.kill(-child.pid, 'SIGKILL')); };
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = ''; child.stdout.on('data', (d) => { child.output += d; log.write(d); }); child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  return child;
};
/** A TCP proxy that delays every chunk by `delay` ms, keeping order. */
const delayProxy = (targetPort, delay) => new Promise((resolve) => {
  const server = net.createServer((client) => {
    const upstream = net.connect(targetPort, '127.0.0.1');
    const pipe = (from, to) => { let chain = Promise.resolve(); from.on('data', (d) => { const due = Date.now() + delay; chain = chain.then(() => sleep(Math.max(0, due - Date.now()))).then(() => { if (!to.destroyed) to.write(d); }); }); from.on('close', () => chain.then(() => to.destroy())); from.on('error', () => to.destroy()); };
    pipe(client, upstream); pipe(upstream, client);
  });
  server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
});
const backendEnv = () => ({ APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') });
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json(); if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body)); return body.data;
};
const evidence = { latencyMs, gaps, cases: {} };
let browser;
try {
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'sd533-repro-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills', HOME: stack.dataRoot };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot], serverDir, withNodeCredential(env), 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  let wsPort = backendPort;
  if (latencyMs > 0) { stack.proxy = await delayProxy(backendPort, latencyMs); wsPort = stack.proxy.port; }
  const ws = `ws://127.0.0.1:${wsPort}`;
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${wsPort}`,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  const workspace = path.join(stack.dataRoot, 'workspace');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const name = `Stopper ${randomUUID().slice(0, 4)}`;
  const agentId = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
    { input: { agentDefinitionId: agentId, workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await attachToBrowserContext(context);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  evidence.sockets = []; page.on('websocket', (w) => evidence.sockets.push(w.url()));
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 180000 });
  await sleep(3000);
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 180000 });
  await until('workspace row', async () => (await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).count()) >= 1, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
  await page.locator('[data-test="workspace-agent-row"]', { hasText: name }).click();
  await page.locator('[data-test="workspace-agent-run-row"]').first().click();
  const textarea = page.locator('textarea').first();
  await until('composer', async () => (await textarea.count()) === 1, 30000);
  const stopButton = page.locator('button[aria-label="Stop generation"]');
  const sendButton = page.locator('button[aria-label="Send message"]');
  const toastTexts = async () => page.locator('[data-testid="toast-container"]').innerText().catch(() => '');
  // Case 0: the first message (starts the run's runtime), answered at once.
  await sleep(3000);
  await until('first send enabled', async () => { await textarea.fill('hello'); await sleep(300); return sendButton.isEnabled(); }, 60000)
    .catch(async (e) => { await page.screenshot({ path: path.join(outputDir, 'first-send.png') }); throw e; });
  await sendButton.click();
  await sleep(4000);
  for (const gap of gaps) {
    const key = `gap${gap}`;
    await textarea.fill(`HOLD_TURN ${key}`);
    await until('send enabled', async () => sendButton.isEnabled(), 30000);
    await sendButton.click();
    await until('Stop shown', async () => (await stopButton.count()) === 1 && stopButton.isEnabled(), 60000);
    await sleep(800);
    const t0 = Date.now();
    await stopButton.click({ timeout: 2000 });
    const firstClickMs = Date.now() - t0;
    let second = 'not clicked';
    if (gap >= 0) {
      await sleep(Math.max(0, gap - (Date.now() - t0)));
      // A user's second tap lands wherever the button was: click the same point whatever it shows now.
      const box = await page.locator('button[aria-label="Send message"], button[aria-label="Stop generation"]').first().boundingBox();
      const label = await page.locator('button[aria-label="Send message"], button[aria-label="Stop generation"]').first().getAttribute('aria-label');
      if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); second = `${label} at ${Date.now() - t0}ms`; }
    }
    await sleep(2500);
    const toasts = await toastTexts();
    evidence.cases[key] = { firstClickMs, second, toasts };
    console.log(key, JSON.stringify(evidence.cases[key]));
    await page.screenshot({ path: path.join(outputDir, `${key}.png`) });
    // Clear toasts by reload-free wait.
    await sleep(6000);
  }
  // Stale-status case: open the run in a second page right after the turn ended? Covered by the server repro.
  evidence.errors = errors;
} catch (error) {
  evidence.failure = String(error?.stack ?? error);
  console.error(error);
} finally {
  await browser?.close().catch(() => undefined);
  await stopGroup(stack.frontend); await stopGroup(stack.backend);
  stack.proxy?.server.close();
  if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }).catch(() => undefined);
  fs.writeFileSync(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
}
