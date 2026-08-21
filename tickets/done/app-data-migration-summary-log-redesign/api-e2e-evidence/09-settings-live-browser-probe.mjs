import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  executeGraphql,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  serverRoot,
  startBuiltTestServer,
  workspaceRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const requireFromWeb = createRequire(path.join(workspaceRoot, 'autobyteus-web', 'package.json'));
const { chromium } = requireFromWeb('playwright-core');
const evidenceDir = path.dirname(new URL(import.meta.url).pathname);
const webRoot = path.join(workspaceRoot, 'autobyteus-web');
const runToken = `api-e2e-browser-${process.pid}-${Date.now()}`;
const runtimeRoot = path.join(serverRoot, 'tests', '.tmp', runToken);
const databaseUrl = `file:./db/${runToken}.db`;
const screenshotPath = path.join(evidenceDir, '09-settings-live-browser.png');
const resultPath = path.join(evidenceDir, '09-settings-live-browser.json');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const summaryPattern = /^Scanned \d+; migrated \d+; skipped \d+; failed \d+\.$/;

let server;
let frontend;
let browser;
let frontendOutput = '';
const browserConsole = [];
const failedRequests = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHttp = async (url, child, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Frontend exited before readiness with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // Retry until the bounded deadline.
    }
    await delay(100);
  }
  throw new Error(`Frontend readiness timed out for ${url}`);
};

const stopFrontend = async () => {
  if (!frontend || frontend.exitCode !== null) return;
  try {
    process.kill(-frontend.pid, 'SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
  const closed = await Promise.race([
    new Promise((resolve) => frontend.once('close', () => resolve(true))),
    delay(15_000).then(() => false),
  ]);
  if (!closed && frontend.exitCode === null) {
    try {
      process.kill(-frontend.pid, 'SIGKILL');
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
};

try {
  const frontendPort = await reserveLoopbackPort();
  server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: databaseUrl });
  const backendUrl = server.serverUrl;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;

  frontend = spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      BACKEND_NODE_BASE_URL: backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/ws/agent',
      BACKEND_TEAM_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/ws/agent-team',
      BACKEND_GRAPHQL_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/graphql',
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/ws/transcribe',
      BACKEND_TERMINAL_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/ws/terminal',
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: backendUrl.replace(/^http/, 'ws') + '/ws/file-explorer',
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [frontend.stdout, frontend.stderr]) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      frontendOutput += chunk;
      process.stdout.write(`[frontend] ${chunk}`);
    });
  }
  await waitForHttp(frontendUrl, frontend);

  const data = await executeGraphql(backendUrl, `
    query GetAppDataMigrations {
      getAppDataMigrations {
        migrationId
        displayName
        status
        attempts
        summary
        errorMessage
        logPath
        recoveryAction
        canRetry
      }
    }
  `);
  const records = data.getAppDataMigrations;
  assert(Array.isArray(records) && records.length > 0, 'Expected startup migration records');
  const summarized = records.filter((record) => record.summary !== null);
  assert(summarized.length > 0, 'Expected at least one completed migration summary');
  for (const record of summarized) {
    assert.equal(typeof record.summary, 'string');
    assert.match(record.summary, summaryPattern);
  }
  const displayRecord = summarized.find((record) => record.logPath) ?? summarized[0];
  assert(displayRecord, 'Expected a record to display');

  browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      browserConsole.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' });
  });

  const settingsUrl = `${frontendUrl}/settings?section=server-settings&mode=migrations`;
  await page.goto(settingsUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('[data-testid="app-data-migrations-refresh"]').waitFor({ timeout: 30_000 });
  await page.getByText(displayRecord.summary, { exact: true }).first().waitFor({ timeout: 30_000 });

  const bodyTextBeforeRefresh = await page.locator('body').innerText();
  assert(bodyTextBeforeRefresh.includes('App Data Migrations'));
  assert(bodyTextBeforeRefresh.includes(displayRecord.migrationId));
  assert(bodyTextBeforeRefresh.includes(displayRecord.summary));
  if (displayRecord.logPath) assert(bodyTextBeforeRefresh.includes(displayRecord.logPath));
  assert.equal(await page.locator('details').count(), 0, 'Obsolete rich-summary details control must not render');

  const graphqlRefresh = page.waitForResponse((response) => {
    if (!response.url().includes('/graphql') || response.request().method() !== 'POST') return false;
    return response.request().postData()?.includes('GetAppDataMigrations') ?? false;
  }, { timeout: 30_000 });
  await page.locator('[data-testid="app-data-migrations-refresh"]').click();
  const refreshResponse = await graphqlRefresh;
  assert(refreshResponse.ok(), `Refresh GraphQL request failed: ${refreshResponse.status()}`);
  await page.getByText(displayRecord.summary, { exact: true }).first().waitFor({ timeout: 30_000 });
  assert.equal(await page.locator('details').count(), 0);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  const result = {
    result: 'Pass',
    scenarioId: 'AE2E-BROWSER-001',
    backendUrl,
    frontendUrl,
    settingsUrl,
    browserExecutable: chromePath,
    viewport: { width: 1440, height: 1000 },
    graphql: {
      recordCount: records.length,
      summarizedCount: summarized.length,
      allSummariesAreCanonicalStrings: true,
      displayedRecord: displayRecord,
      refreshStatus: refreshResponse.status(),
    },
    dom: {
      migrationsHeadingVisible: true,
      migrationIdVisible: true,
      exactSummaryVisible: true,
      logPathVisible: Boolean(displayRecord.logPath),
      detailsElementCount: 0,
      refreshPreservedSummary: true,
    },
    failedRequests: failedRequests.filter((item) => /\/graphql|\/rest\/health/.test(item.url)),
    browserConsole,
    screenshotPath,
    cleanup: {
      browserClosed: false,
      frontendStopped: false,
      backendStopped: false,
      runtimeRemoved: false,
    },
  };
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`AE2E_BROWSER_PASS ${JSON.stringify({ recordCount: records.length, displayedMigrationId: displayRecord.migrationId, summary: displayRecord.summary, logPath: displayRecord.logPath })}`);
} finally {
  if (browser) await browser.close();
  await stopFrontend();
  if (server) {
    await server.stop();
    await removeOwnedTestRuntime(server.runtimeRoot, server.database);
  }
  try {
    const result = JSON.parse(await fs.readFile(resultPath, 'utf8'));
    result.cleanup = {
      browserClosed: Boolean(browser),
      frontendStopped: Boolean(frontend),
      backendStopped: Boolean(server),
      runtimeRemoved: Boolean(server),
    };
    result.backendOutputTail = server?.output().split('\n').slice(-30).join('\n') ?? '';
    result.frontendOutputTail = frontendOutput.split('\n').slice(-30).join('\n');
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + '\n');
  } catch {
    // Preserve the original failure when the result file was not created.
  }
}
