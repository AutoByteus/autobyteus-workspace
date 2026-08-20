import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import {
  builtServerEntry,
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  serverRoot,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import { runMigrations } from '../../../../../../autobyteus-server-ts/dist/startup/migrations.js';

const root = path.resolve(serverRoot, '..');
const webRoot = path.join(root, 'autobyteus-web');
const ticketRoot = path.join(root, 'tickets/in-progress/token-usage-one-row-per-agent-run');
const screenshotRoot = path.join(ticketRoot, 'test-results/api-e2e/screenshots');
const evidencePath = path.join(ticketRoot, 'test-results/api-e2e/browser-probe-result.json');
await fsp.mkdir(screenshotRoot, { recursive: true });
const require = createRequire(path.join(webRoot, 'package.json'));
const { chromium } = require('playwright-core');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!fs.existsSync(chromePath)) throw new Error('CHROME_EXECUTABLE_MISSING');

const suffix = `${process.pid}-${Date.now()}`;
const targets = [];
const servers = [];
let browser;
const makeTarget = (label) => {
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  targets.push({ runtimeRoot, database });
  return { runtimeRoot, database };
};
const deploy = (target) => runMigrations({ appRoot: serverRoot, databaseUrl: target.database.databaseUrl });
const seedLegacy = (databasePath, runId, eventId) => {
  const database = new DatabaseSync(databasePath);
  try {
    database.prepare(`
      INSERT INTO token_usage_ledger_events (
        usage_event_id, idempotency_key, observed_at, run_id, task_id, agent_name,
        run_summary, run_created_at, runtime_kind,
        model_provider, model_identifier, model_value, ingestion_kind, usage_scope,
        input_token_semantic, reported_input_tokens, reported_output_tokens,
        reported_total_tokens, accounting_input_tokens, accounting_output_tokens,
        accounting_total_tokens, standard_input_tokens, cache_miss_input_tokens,
        billable_input_tokens, billable_output_tokens, pricing_status, api_cost_status
      ) VALUES (?, ?, '2026-08-18T10:00:00.000Z', ?, 'browser-task', 'Browser Normal Agent',
        'Browser normal migrated run', '2026-08-18T09:00:00.000Z', 'autobyteus', 'OPENAI',
        'gpt-browser', 'gpt-browser', 'browser-probe', 'per_turn', 'gross_includes_cache',
        42, 8, 50, 42, 8, 50, 42, 42, 42, 8, 'missing', 'price_missing')
    `).run(eventId, `${eventId}:idempotency`, runId);
  } finally { database.close(); }
};
const waitHttp = async (url, timeoutMs = 120_000) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`HTTP_START_TIMEOUT:${url}`);
};
const startWeb = async (backendUrl, label) => {
  const port = await reserveLoopbackPort();
  const url = `http://127.0.0.1:${port}`;
  let output = '';
  const child = spawn('pnpm', ['dev', '--port', String(port), '--host', '127.0.0.1'], {
    cwd: webRoot,
    env: {
      ...process.env,
      BACKEND_NODE_BASE_URL: backendUrl,
      BACKEND_GRAPHQL_BASE_URL: `${backendUrl}/graphql`,
      BACKEND_REST_BASE_URL: `${backendUrl}/rest`,
      BACKEND_GRAPHQL_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/graphql',
      NUXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'development',
    },
    stdio: 'pipe',
  });
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  try { await waitHttp(url); } catch (error) {
    child.kill('SIGKILL');
    throw new Error(`${label}:${error.message}\n${output}`);
  }
  return {
    url,
    output: () => output,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => child.once('close', resolve)),
        new Promise((resolve) => setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 10_000)),
      ]);
    },
  };
};
const openTokenStatistics = async (page, webUrl) => {
  await page.goto(`${webUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: 'Token Statistics' }).click();
  await page.locator('.token-usage-statistics').waitFor({ state: 'visible' });
};
const runFatalServer = async (target) => {
  const port = await reserveLoopbackPort();
  const host = '127.0.0.1';
  const runtime = materializeTestRuntime({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    serverUrlOverride: `http://${host}:${port}`,
  });
  let output = '';
  const child = spawn(process.execPath, [builtServerEntry, '--host', host, '--port', String(port), '--data-dir', runtime.runtimeRoot], {
    cwd: serverRoot,
    env: createSanitizedTestEnvironment(),
    stdio: 'pipe',
  });
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const exitCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('FATAL_SERVER_DID_NOT_EXIT'));
    }, 120_000);
    child.once('close', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  return { serverUrl: `http://${host}:${port}`, exitCode, output };
};

try {
  const normalTarget = makeTarget('token-browser-normal');
  deploy(normalTarget);
  seedLegacy(normalTarget.database.databasePath, 'browser-normal-run', 'browser-normal-event');
  const normalServer = await startBuiltTestServer({ runtimeRoot: normalTarget.runtimeRoot, databaseUrlOverride: normalTarget.database.databaseUrl });
  servers.push(normalServer);
  const degradedTarget = makeTarget('token-browser-degraded');
  deploy(degradedTarget);
  seedLegacy(degradedTarget.database.databasePath, ' ', 'browser-degraded-blank-event');
  const degradedServer = await startBuiltTestServer({ runtimeRoot: degradedTarget.runtimeRoot, databaseUrlOverride: degradedTarget.database.databaseUrl });
  servers.push(degradedServer);

  const fatalTarget = makeTarget('token-browser-fatal');
  deploy(fatalTarget);
  const fatalDb = new DatabaseSync(fatalTarget.database.databasePath);
  try { fatalDb.exec('DROP TABLE token_usage_run_records'); } finally { fatalDb.close(); }
  const fatal = await runFatalServer(fatalTarget);
  if (
    fatal.exitCode === 0
    || !fatal.output.includes('"protocol":"autobyteus.embedded-server.platform-fatal.v1"')
    || !fatal.output.includes('"code":"TOKEN_USAGE_CURRENT_SCHEMA_INVALID"')
  ) {
    throw new Error(`FATAL_PROTOCOL_NOT_OBSERVED:${fatal.exitCode}\n${fatal.output}`);
  }

  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
  const evidence = { chromeVersion: await browser.version(), normal: {}, degraded: {}, fatal: {} };

  const normalWeb = await startWeb(normalServer.serverUrl, 'normal-web');
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await openTokenStatistics(page, normalWeb.url);
    await page.getByText('The date range selects runs by creation time; totals show each selected run’s lifetime usage.').waitFor();
    await page.getByText('Browser Normal Agent', { exact: true }).waitFor({ timeout: 30_000 });
    const taskText = await page.locator('.token-usage-statistics').innerText();
    await page.locator('#token-usage-grouping').selectOption('model');
    await page.locator('.token-usage-statistics').getByText(/gpt-browser/).first().waitFor();
    const modelText = await page.locator('.token-usage-statistics').innerText();
    const screenshot = path.join(screenshotRoot, 'normal-token-statistics-chrome.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    evidence.normal = {
      taskRowObserved: taskText.includes('Browser Normal Agent'),
      lifetimeRangeCopyObserved: taskText.includes('lifetime usage'),
      modelRowObserved: modelText.includes('gpt-browser'),
      input42Observed: /\b42\b/.test(modelText),
      output8Observed: /\b8\b/.test(modelText),
      consoleErrors,
      screenshot,
    };
    await page.close();
  } finally { await normalWeb.stop(); }

  const degradedWeb = await startWeb(degradedServer.serverUrl, 'degraded-web');
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
    await openTokenStatistics(page, degradedWeb.url);
    const alert = page.getByRole('alert');
    await alert.waitFor({ timeout: 30_000 });
    const alertText = await alert.innerText();
    const screenshot = path.join(screenshotRoot, 'degraded-token-statistics-chrome.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    evidence.degraded = {
      alertText,
      migrationGuidanceObserved: alertText.includes('data migration is incomplete') && alertText.includes('New runs remain available'),
      navigationStillAvailable: await page.getByRole('button', { name: 'API Keys' }).isVisible(),
      screenshot,
    };
    await page.close();
  } finally { await degradedWeb.stop(); }

  const fatalWeb = await startWeb(fatal.serverUrl, 'fatal-web');
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
    await openTokenStatistics(page, fatalWeb.url);
    const alert = page.getByRole('alert');
    await alert.waitFor({ timeout: 30_000 });
    const alertText = await alert.innerText();
    const screenshot = path.join(screenshotRoot, 'fatal-server-unavailable-token-statistics-chrome.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    evidence.fatal = {
      serverExitCode: fatal.exitCode,
      fatalProtocolObserved: fatal.output.includes('"protocol":"autobyteus.embedded-server.platform-fatal.v1"'),
      currentSchemaReasonObserved: fatal.output.includes('TOKEN_USAGE_CURRENT_SCHEMA_COLUMNS_MISSING'),
      browserAlertText: alertText,
      browserErrorObserved: alertText.trim().length > 0,
      navigationStillAvailable: await page.getByRole('button', { name: 'API Keys' }).isVisible(),
      screenshot,
    };
    await page.close();
  } finally { await fatalWeb.stop(); }

  await fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.normal.taskRowObserved || !evidence.normal.modelRowObserved ||
      !evidence.normal.input42Observed || !evidence.normal.output8Observed ||
      !evidence.degraded.migrationGuidanceObserved || !evidence.degraded.navigationStillAvailable ||
      !evidence.fatal.fatalProtocolObserved || !evidence.fatal.currentSchemaReasonObserved ||
      !evidence.fatal.browserErrorObserved || !evidence.fatal.navigationStillAvailable) process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  for (const server of servers.reverse()) await server.stop().catch(() => undefined);
  for (const target of targets) await removeOwnedTestRuntime(target.runtimeRoot, target.database).catch(() => undefined);
}
