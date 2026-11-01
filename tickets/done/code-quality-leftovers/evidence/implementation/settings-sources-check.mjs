#!/usr/bin/env node
// Ticket-owned rendered check for autobyteus-357 AC-002 (implementation stage; not durable test code).
// Settings → provider section with dynamic model sources after `modelKind` left ModelSourceStatus (54.3/54.4):
//   - a custom OpenAI-compatible provider (a fake endpoint owned by this script) loads its models (READY);
//   - "Reload Models" with the endpoint stopped keeps the last models and shows the stale notice (STALE_ERROR);
//   - LM Studio pointed at a closed port shows "Models unavailable" (ERROR).
// Every GraphQL answer the page receives must carry no errors and source statuses without `modelKind`.
// Owned stack: free ports, a private data root and HOME (removed afterwards), the built server
// (autobyteus-server-ts/dist/app.js), Nuxt dev, headless Chrome. Never the installed app or user data.
// Run from the worktree root after `pnpm -C autobyteus-server-ts build`:
//   env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node tickets/in-progress/code-quality-leftovers/evidence/implementation/settings-sources-check.mjs --output-dir <fresh dir>
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const webDir = path.join(rootDir, 'autobyteus-web');
const serverDir = path.join(rootDir, 'autobyteus-server-ts');
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const argOf = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const outputDir = path.resolve(argOf('output-dir') ?? path.join(os.tmpdir(), `settings-sources-${Date.now()}`));
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .find((c) => fs.existsSync(c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const evidence = { startedAt: new Date().toISOString(), checks: {}, graphql: { responses: 0, errors: [], sourceKeySets: [] }, cleanup: {} };
const save = () => fsp.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
const stack = { dataRoot: '', backend: null, frontend: null, fake: null };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return 'not-running';
  process.kill(-child.pid, 'SIGTERM');
  await until('exit', () => exited(child), 15000).catch(async () => { process.kill(-child.pid, 'SIGKILL'); await until('killed', () => exited(child), 5000); });
  return 'terminated';
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`));
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  for (const s of [child.stdout, child.stderr]) s.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};
const callerEnv = () => Object.fromEntries(Object.entries(process.env)
  .filter(([k]) => !k.startsWith('AUTOBYTEUS_') && !/(_API_KEY|_TOKEN|_SECRET|_ACCESS_KEY)$/i.test(k) && !/^(ANTHROPIC|OPENAI|GEMINI|AWS|AZURE)_/i.test(k)));

/** A minimal OpenAI-compatible endpoint: GET /v1/models lists two models. */
const startFakeEndpoint = async () => {
  const port = await freePort();
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url?.startsWith('/v1/models')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ object: 'list', data: [{ id: 'fake-model-a', object: 'model' }, { id: 'fake-model-b', object: 'model' }] }));
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { server, baseUrl: `http://127.0.0.1:${port}/v1`, stop: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
};

let browser;
let result = 'Pass';
try {
  await fsp.mkdir(outputDir, { recursive: true });
  stack.dataRoot = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'settings-sources-')));
  for (const d of ['db', 'logs', 'memory', 'temp_workspace', 'home']) await fsp.mkdir(path.join(stack.dataRoot, d));
  const backendPort = await freePort(), frontendPort = await freePort(), closedPort = await freePort();
  const backendUrl = `http://127.0.0.1:${backendPort}`, frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const backendEnv = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
    AUTOBYTEUS_SERVER_HOST: backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace'),
    LMSTUDIO_HOSTS: `http://127.0.0.1:${closedPort}`, OLLAMA_HOSTS: `http://127.0.0.1:${closedPort}` };
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  stack.fake = await startFakeEndpoint();
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot],
    serverDir, { ...callerEnv(), ...backendEnv, HOME: path.join(stack.dataRoot, 'home') }, 'backend');
  await until('backend GraphQL', async () => (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: '{"query":"{__typename}"}' })).ok, 180000);
  const ws = backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...callerEnv(), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => (await fetch(frontendUrl)).ok, 240000);
  evidence.stack = { backendUrl, frontendUrl, dataRoot: stack.dataRoot, fakeEndpoint: stack.fake.baseUrl, closedPort };

  // The user's custom provider, created through the app's own GraphQL mutation.
  const created = await (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'mutation($input:CustomProviderInputObject!){createCustomProvider(input:$input){provider{id name}}}',
      variables: { input: { name: 'Fake Gateway', baseUrl: stack.fake.baseUrl, apiKey: 'synthetic-not-a-key' } } }) })).json();
  assert(!created.errors?.length, 'custom provider not created', created.errors);
  evidence.customProvider = created.data.createCustomProvider.provider;

  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('response', async (response) => {
    if (!response.url().endsWith('/graphql') || response.request().method() !== 'POST') return;
    const body = await response.json().catch(() => null);
    if (!body) return;
    evidence.graphql.responses += 1;
    if (body.errors?.length) evidence.graphql.errors.push(body.errors.map((e) => e.message));
    const visit = (v) => {
      if (Array.isArray(v)) return v.forEach(visit);
      if (!v || typeof v !== 'object') return;
      if (Array.isArray(v.sources)) for (const s of v.sources) evidence.graphql.sourceKeySets.push(Object.keys(s).sort().join(','));
      Object.values(v).forEach(visit);
    };
    visit(body.data);
  });
  const shot = async (name) => { await sleep(400); await page.screenshot({ path: path.join(outputDir, `${name}.png`) }); };
  const nav = page.getByRole('navigation', { name: 'Providers' });
  const main = page.locator('body');
  const select = async (name) => { await nav.getByRole('button', { name: new RegExp(name) }).first().click(); };

  await page.goto(`${frontendUrl}/settings`, { waitUntil: 'networkidle', timeout: 180000 });
  await until('providers listed', async () => (await nav.getByRole('button').count()) > 3, 120000);
  await sleep(2000); // a cold Nuxt dev server may reload once for dependency optimization
  await page.goto(`${frontendUrl}/settings`, { waitUntil: 'networkidle', timeout: 180000 });
  await until('providers listed again', async () => (await nav.getByRole('button').count()) > 3, 120000);

  // READY: the custom provider's discovered models are listed.
  await select('Fake Gateway');
  await until('custom models listed', async () => (await main.getByText('fake-model-a').count()) > 0 && (await main.getByText('fake-model-b').count()) > 0, 60000);
  evidence.checks.ready = { models: ['fake-model-a', 'fake-model-b'] };
  await shot('01-custom-provider-ready');

  // STALE_ERROR: the endpoint goes away; Reload Models keeps the last models with the stale notice.
  await stack.fake.stop();
  await main.getByRole('button', { name: 'Reload Models' }).first().click();
  await until('stale notice', async () => (await main.getByText('Could not refresh models. Showing last known models.').count()) > 0, 60000);
  assert((await main.getByText('fake-model-a').count()) > 0, 'last known models not kept');
  evidence.checks.staleAfterReload = { notice: 'Could not refresh models. Showing last known models.', modelsKept: true };
  await shot('02-custom-provider-stale-after-reload');

  // ERROR: LM Studio on a closed port.
  await select('LM Studio');
  await until('LM Studio unavailable', async () => (await main.getByText('Models unavailable').count()) > 0, 60000);
  evidence.checks.lmStudioUnavailable = { notice: 'Models unavailable' };
  await shot('03-lmstudio-unavailable');

  const keySets = [...new Set(evidence.graphql.sourceKeySets)];
  evidence.graphql.distinctSourceKeySets = keySets;
  assert(evidence.graphql.errors.length === 0, 'GraphQL errors', evidence.graphql.errors);
  assert(keySets.length > 0 && keySets.every((k) => !k.split(',').includes('modelKind')), 'a source status carries modelKind', keySets);
  assert(pageErrors.length === 0, 'page errors', pageErrors);
  await context.close();
} catch (error) {
  result = 'Fail';
  evidence.failure = { message: error.message, details: error.details };
  try { for (const p of browser?.contexts().flatMap((c) => c.pages()) ?? []) await p.screenshot({ path: path.join(outputDir, 'failure.png') }); } catch { /* best effort */ }
} finally {
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = e.message; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = e.message; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = e.message; }
  try { if (stack.fake?.server.listening) await stack.fake.stop(); evidence.cleanup.fakeEndpoint = 'stopped'; } catch (e) { evidence.cleanup.fakeEndpoint = e.message; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = e.message; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  await save();
}
process.stdout.write(`settings sources check: ${result}. Evidence: ${path.join(outputDir, 'evidence.json')}\n`);
process.exit(result === 'Pass' ? 0 : 1);
