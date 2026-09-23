#!/usr/bin/env node
// Isolated, synthetic-key browser/API regression for the Settings credential return path.
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/provider-api-key-save'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '120000'));
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default',
  cases: {}, graphql: [], browserErrors: [], cleanup: {}, error: null,
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const start = (command, args, cwd, env, logPath) => {
  const log = createWriteStream(logPath);
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('close', () => log.end());
  return child;
};
const run = (command, args, cwd, env, logPath) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, logPath);
  child.once('error', reject);
  child.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}/${signal}; see ${logPath}`)));
});
const stop = async child => {
  if (!child) return 'not-started';
  if (!exited(child)) {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  if (!exited(child)) {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(5000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};
const operationName = request => {
  if (request.method() !== 'POST' || !request.url().includes('/graphql')) return null;
  try {
    const payload = request.postDataJSON();
    return payload.operationName || payload.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1] || null;
  } catch { return null; }
};
const statusQuery = `query GetProviderCredentialSettings($runtimeKind: String) { providerCredentialSettings(runtimeKind: $runtimeKind) { provider { id name providerType isCustom baseUrl catalogMode } apiKeyConfigured } }`;
const readStatus = async backendUrl => {
  const response = await fetch(`${backendUrl}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: statusQuery, operationName: 'GetProviderCredentialSettings', variables: { runtimeKind: 'autobyteus' } }),
  });
  const body = await response.json();
  assert(response.ok && !body.errors?.length, `Credential status query failed: HTTP ${response.status}`);
  const rows = body.data?.providerCredentialSettings;
  assert(Array.isArray(rows), 'Credential status query did not return an array');
  assert(rows.every(row => Object.keys(row).sort().join(',') === 'apiKeyConfigured,provider'), 'Status row leaked fields beyond provider and configured flag');
  return rows.map(row => ({ id: row.provider.id, configured: row.apiKeyConfigured }));
};

let ownedRoot, backend, frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  if (!skipServerBuild) {
    await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  }
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the worktree server with pnpm -C autobyteus-server-ts build first');
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-provider-key-e2e-'));
  const dataRoot = path.join(ownedRoot, 'server-data');
  const databasePath = path.join(dataRoot, 'db', 'provider-key-e2e.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const [backendPort, frontendPort] = await Promise.all([choosePort(), choosePort()]);
  assert(backendPort !== frontendPort, 'Backend and frontend port collision');
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const backendEnv = {
    ...process.env, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl,
    AUTOBYTEUS_SERVER_HOST: backendUrl, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    DISABLE_HTTP_REQUEST_LOGS: 'false',
  };
  for (const folder of ['logs', 'memory', 'temp_workspace']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  await fs.writeFile(path.join(dataRoot, '.env'), [
    'APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${backendUrl}`, 'DISABLE_HTTP_REQUEST_LOGS=false',
  ].join('\n') + '\n');
  evidence.isolation = { tempRoot: ownedRoot, backendPort, frontendPort, liveCredentialTouched: false };
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'],
    root, backendEnv, path.join(outputDir, 'database-migrate.log'));
  backend = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot],
    serverDir, backendEnv, path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => {
    if (exited(backend)) throw new Error(`backend exited ${backend.exitCode}/${backend.signalCode}`);
    return fetch(`${backendUrl}/rest/health`).then(response => response.ok).catch(() => false);
  });
  const initial = await readStatus(backendUrl);
  assert(initial.find(row => row.id === 'ANTHROPIC')?.configured === false, 'Fresh isolated Anthropic status is not false');
  assert(initial.find(row => row.id === 'OPENAI')?.configured === false, 'Fresh isolated OpenAI status is not false');
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend readiness', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}/${frontend.signalCode}`);
    return fetch(`${frontendUrl}/settings?section=api-keys`).then(response => response.ok).catch(() => false);
  });
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });
  page.on('response', async response => {
    const name = operationName(response.request());
    if (!name || !['SaveProviderApiKey', 'GetProviderCredentialSettings'].includes(name)) return;
    let body = null;
    try { body = await response.json(); } catch { /* retain HTTP status */ }
    evidence.graphql.push({ operation: name, httpStatus: response.status(),
      errorCount: body?.errors?.length || 0,
      providerId: body?.data?.saveProviderApiKey?.provider?.id || null,
      configured: body?.data?.saveProviderApiKey?.apiKeyConfigured ?? null,
      responseHasApiKey: /"apiKey"|"keyValue"|synthetic-/i.test(JSON.stringify(body?.data ?? {})),
    });
  });
  await page.goto(`${frontendUrl}/settings?section=api-keys`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.getByText('Not Configured', { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
  const input = page.locator('.provider-api-key-manager input[type="password"]');
  const save = page.getByRole('button', { name: 'Save Key' });
  assert(await input.count() === 1, 'Anthropic editor not selected');
  await page.screenshot({ path: path.join(outputDir, 'before-save.png'), fullPage: true });

  // A GraphQL rejection is a genuine failed command, unlike the former post-commit store error.
  let rejected = false;
  await page.route('**/graphql', async route => {
    if (!rejected && operationName(route.request()) === 'SaveProviderApiKey') {
      rejected = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        data: null, errors: [{ message: 'Synthetic rejected save' }],
      }) });
      return;
    }
    await route.continue();
  });
  await input.fill('synthetic-rejection-not-a-real-key');
  await save.click();
  await page.getByRole('alert').filter({ hasText: 'Failed to save API key for Anthropic' }).waitFor({ state: 'visible', timeout: timeoutMs });
  assert(await input.inputValue() === 'synthetic-rejection-not-a-real-key', 'Rejected save cleared the input');
  assert(await page.getByText('Not Configured', { exact: true }).count() > 0, 'Rejected save claimed Configured');
  assert((await readStatus(backendUrl)).find(row => row.id === 'ANTHROPIC')?.configured === false, 'Rejected save mutated backend');
  evidence.cases['API-CASE-003'] = { result: 'Pass', rejected, inputRetained: true, statusUnchanged: true, backendUnchanged: true };
  await page.unroute('**/graphql');
  const browserErrorsAfterRejection = evidence.browserErrors.length;

  const saveAndCheck = async (label, syntheticValue) => {
    await input.fill(syntheticValue);
    const beforeCount = evidence.graphql.filter(item => item.operation === 'SaveProviderApiKey').length;
    await save.click();
    await waitFor(`${label} GraphQL response`, () => evidence.graphql.filter(item => item.operation === 'SaveProviderApiKey').length > beforeCount);
    const response = evidence.graphql.filter(item => item.operation === 'SaveProviderApiKey').at(-1);
    assert(response.httpStatus === 200 && response.errorCount === 0 && response.providerId === 'ANTHROPIC' && response.configured === true,
      `${label} mutation did not return successful configured state`);
    assert(response.responseHasApiKey === false, `${label} mutation response leaked key-like data`);
    await page.getByRole('status').filter({ hasText: 'API key for Anthropic saved successfully' }).waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByText('Configured', { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    assert(await input.inputValue() === '', `${label} did not clear input`);
    assert(await page.getByRole('alert').filter({ hasText: 'Failed to save API key for Anthropic' }).count() === 0,
      `${label} showed false failure`);
  };
  await saveAndCheck('first save', 'synthetic-anthropic-not-a-real-key');
  await page.screenshot({ path: path.join(outputDir, 'after-save.png'), fullPage: true });
  await saveAndCheck('repeat save', 'synthetic-anthropic-replacement-not-a-real-key');
  const after = await readStatus(backendUrl);
  assert(after.find(row => row.id === 'ANTHROPIC')?.configured === true, 'Backend status did not persist');
  assert(after.find(row => row.id === 'OPENAI')?.configured === false, 'Unrelated OpenAI status changed');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.getByText('Configured', { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
  assert(await input.inputValue() === '', 'Refresh exposed a credential in input');
  await page.locator('nav').getByRole('button', { name: /OpenAI/ }).click();
  await page.getByText('Not Configured', { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
  assert(evidence.browserErrors.slice(browserErrorsAfterRejection).every(item => !/Cannot assign to read only|Failed to save API key/i.test(item)),
    'Read-only mutation or false save error after successful browser save');
  assert(evidence.graphql.every(item => !item.responseHasApiKey), 'Credential response leaked key-like field');
  evidence.cases['API-CASE-002'] = { result: 'Pass', initialAnthropic: false, firstAndRepeatSave: true,
    refreshConfigured: true, unrelatedOpenAIUnchanged: true, valueFreeResponse: true, noReadOnlyError: true };
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
