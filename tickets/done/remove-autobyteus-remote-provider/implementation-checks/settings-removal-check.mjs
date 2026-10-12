#!/usr/bin/env node
// Implementation self-check for remove-autobyteus-remote-provider (not API/E2E sign-off).
// Starts this worktree's built server on a probe-owned data root whose .env still carries a
// leftover AUTOBYTEUS_LLM_SERVER_HOSTS value, starts the Nuxt dev server, and inspects the
// rendered Settings surfaces in headless Chrome.
// Usage: node settings-removal-check.mjs --output-dir=<fresh dir>   (requires `pnpm -C autobyteus-server-ts build`)
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const webDir = path.join(root, 'autobyteus-web');
const serverDir = path.join(root, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const arg = (name, fallback) => process.argv.find(item => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `settings-removal-check-${Date.now()}`)));
const timeoutMs = 180_000;
const LEFTOVER_KEY = 'AUTOBYTEUS_LLM_SERVER_HOSTS';
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', checks: {}, browserErrors: [], cleanup: {}, error: null };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => { const { port } = socket.address(); socket.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const start = (command, args, cwd, env, logPath) => {
  const log = createWriteStream(logPath);
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); child.once('close', () => log.end());
  return child;
};
const run = (command, args, cwd, env, logPath) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, logPath);
  child.once('error', reject);
  child.once('close', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}; see ${logPath}`)));
});
const stop = async child => {
  if (!child) return 'not-started';
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    if (exited(child)) break;
    try { process.kill(-child.pid, signal); } catch { /* already gone */ }
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};
const graphql = async (backendUrl, query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }),
  });
  return response.json();
};

let ownedRoot, backend, frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the worktree server first');
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-settings-removal-'));
  const dataRoot = path.join(ownedRoot, 'server-data');
  const databasePath = path.join(dataRoot, 'db', 'settings-removal.db');
  for (const folder of ['db', 'logs', 'memory', 'temp_workspace']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const [backendPort, frontendPort] = await Promise.all([choosePort(), choosePort()]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const cleanEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR ?? os.tmpdir() };
  const backendEnv = {
    ...cleanEnv, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl,
    AUTOBYTEUS_SERVER_HOST: backendUrl, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
  };
  // Leftover remote-provider host value from an upgraded install; local discovery hosts point at a closed port.
  await fs.writeFile(path.join(dataRoot, '.env'), [
    'APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${backendUrl}`,
    `${LEFTOVER_KEY}=https://remote-llm.example.invalid:8000`,
    'OLLAMA_HOSTS=http://127.0.0.1:9', 'LMSTUDIO_HOSTS=http://127.0.0.1:9',
  ].join('\n') + '\n');
  evidence.isolation = { tempRoot: ownedRoot, backendPort, frontendPort };
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'],
    root, backendEnv, path.join(outputDir, 'database-migrate.log'));
  backend = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot],
    serverDir, backendEnv, path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => {
    if (exited(backend)) throw new Error(`backend exited ${backend.exitCode}`);
    return fetch(`${backendUrl}/rest/health`).then(response => response.ok).catch(() => false);
  });

  // Server contract with the leftover present (AC-003, AC-005).
  const credentials = await graphql(backendUrl, `query { providerCredentialSettings(runtimeKind: "autobyteus") { provider { id name catalogMode } } }`);
  const providerIds = credentials.data.providerCredentialSettings.map(row => row.provider.id);
  assert(!providerIds.includes('AUTOBYTEUS'), 'Credential settings still list AUTOBYTEUS');
  assert(['OPENAI', 'OLLAMA', 'LMSTUDIO'].every(id => providerIds.includes(id)), 'Expected built-in providers missing');
  const snapshots = await graphql(backendUrl, `query { providerModelCatalogSnapshots(runtimeKind: "autobyteus") { ownerProvider { id } } }`);
  const snapshotIds = snapshots.data.providerModelCatalogSnapshots.map(row => row.ownerProvider.id);
  assert(!snapshotIds.includes('AUTOBYTEUS'), 'Catalog snapshots still list AUTOBYTEUS');
  const ensure = await graphql(backendUrl, `mutation { ensureProviderModelCatalog(providerId: "AUTOBYTEUS", runtimeKind: "autobyteus") { ownerProvider { id } } }`);
  assert(ensure.errors?.length && !ensure.data?.ensureProviderModelCatalog, 'Ensuring AUTOBYTEUS was not rejected');
  const saveKey = await graphql(backendUrl, `mutation { saveProviderApiKey(providerId: "AUTOBYTEUS", apiKey: "synthetic-not-a-key") { apiKeyConfigured } }`);
  assert(saveKey.errors?.length && !saveKey.data?.saveProviderApiKey, 'Saving an AUTOBYTEUS key was not rejected');
  const settingsQuery = `query { getServerSettings { key value description isEditable isDeletable } }`;
  const leftover = (await graphql(backendUrl, settingsQuery)).data.getServerSettings.find(row => row.key === LEFTOVER_KEY);
  assert(leftover?.isDeletable === true && leftover.isEditable === true && leftover.description === 'Custom user-defined setting',
    'Leftover host value is not an ordinary deletable custom setting');
  evidence.checks.server = { result: 'Pass', providerIds, snapshotIds, ensureError: ensure.errors[0].message,
    saveKeyError: saveKey.errors[0].message, leftover };

  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...cleanEnv, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend readiness', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(`${frontendUrl}/settings?section=api-keys`).then(response => response.ok).catch(() => false);
  });
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });
  page.on('dialog', dialog => dialog.accept());

  // Warm the cold dev server (dependency optimisation reloads), then assert.
  await page.goto(`${frontendUrl}/settings?section=api-keys`, { waitUntil: 'load', timeout: timeoutMs });
  await sleep(5000);
  await page.goto(`${frontendUrl}/settings?section=api-keys`, { waitUntil: 'load', timeout: timeoutMs });
  const providerNav = page.locator('.provider-api-key-manager nav');
  await providerNav.getByRole('button', { name: /LM Studio/ }).waitFor({ state: 'visible', timeout: timeoutMs });
  const providerLabels = (await providerNav.getByRole('button').allInnerTexts()).map(text => text.trim().split('\n')[0]);
  assert(!providerLabels.some(label => /^AutoByteus\b/.test(label)), `Provider list shows AutoByteus: ${providerLabels.join(', ')}`);
  assert(['OpenAI', 'Ollama', 'LM Studio'].every(name => providerLabels.some(label => label.startsWith(name))), 'Expected providers missing');
  await page.screenshot({ path: path.join(outputDir, 'api-keys.png'), fullPage: true });
  evidence.checks.apiKeys = { result: 'Pass', providerLabels };

  await page.goto(`${frontendUrl}/settings?section=server-settings&mode=quick`, { waitUntil: 'load', timeout: timeoutMs });
  await page.locator('[data-testid="quick-setting-card-OLLAMA_HOSTS"]').waitFor({ state: 'visible', timeout: timeoutMs });
  const cards = await page.locator('[data-testid^="quick-setting-card-"]').evaluateAll(nodes => nodes.map(node => node.dataset.testid));
  assert(!cards.includes(`quick-setting-card-${LEFTOVER_KEY}`), 'AutoByteus LLM Hosts card still rendered');
  assert((await page.getByText('AutoByteus LLM Hosts').count()) === 0, 'AutoByteus LLM Hosts text still rendered');
  assert((await page.getByText('AutoByteus VNC Hosts').count()) > 0, 'VNC hosts card missing');
  await page.screenshot({ path: path.join(outputDir, 'server-settings-quick.png'), fullPage: true });
  evidence.checks.quickSetup = { result: 'Pass', cards };

  await page.goto(`${frontendUrl}/settings?section=server-settings&mode=advanced`, { waitUntil: 'load', timeout: timeoutMs });
  const removeButton = page.locator(`[data-testid="server-setting-remove-${LEFTOVER_KEY}"]`);
  await removeButton.waitFor({ state: 'visible', timeout: timeoutMs });
  await page.screenshot({ path: path.join(outputDir, 'server-settings-advanced-leftover.png'), fullPage: true });
  await removeButton.click();
  await waitFor('leftover deletion', async () => !(await graphql(backendUrl, settingsQuery)).data.getServerSettings.some(row => row.key === LEFTOVER_KEY));
  await removeButton.waitFor({ state: 'detached', timeout: timeoutMs });
  await page.screenshot({ path: path.join(outputDir, 'server-settings-advanced-after-delete.png'), fullPage: true });
  evidence.checks.advanced = { result: 'Pass', leftoverShownAsCustomAndDeleted: true };

  const unexpectedErrors = evidence.browserErrors.filter(item => !/Failed to load resource|ws:\/\/|WebSocket|favicon|net::ERR_CONNECTION_REFUSED/i.test(item));
  evidence.unexpectedBrowserErrors = unexpectedErrors;
  evidence.result = 'Pass';
  await context.close();
} catch (error) {
  evidence.error = error?.stack || String(error);
  process.stderr.write(`${evidence.error}\n`);
} finally {
  if (browser) await browser.close().catch(error => { evidence.cleanup.browserError = error.message; });
  try { evidence.cleanup.frontend = await stop(frontend); } catch (error) { evidence.cleanup.frontendError = error.message; }
  try { evidence.cleanup.backend = await stop(backend); } catch (error) { evidence.cleanup.backendError = error.message; }
  if (ownedRoot) {
    try { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.tempRoot = 'removed'; }
    catch (error) { evidence.cleanup.tempRootError = error.message; }
  }
  if (Object.keys(evidence.cleanup).some(key => key.endsWith('Error'))) evidence.result = 'Fail';
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  process.stdout.write(`${evidence.result}: ${path.join(outputDir, 'result.json')}\n`);
  if (evidence.result !== 'Pass') process.exitCode = 1;
}
