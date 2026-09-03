#!/usr/bin/env node

import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const fixturePath = path.join(scriptDir, 'fixtures/standalone-agent-error-stop.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-standalone-agent-error-stop.vue');
const routePath = '/api-e2e-standalone-agent-error-stop';
const ACTIVE_ERROR_RUN = 'run-active-error';
const INACTIVE_ERROR_RUN = 'run-inactive-error';
const HEALTHY_RUN = 'run-healthy';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/standalone-agent-error-stop'));
const explicitPort = getArg('port');
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));

const assert = (condition, message, details = undefined) => {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const choosePort = async () => explicitPort ? Number(explicitPort) : await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});
const listenOnFreePort = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    server.off('error', reject);
    const address = server.address();
    if (!address || typeof address === 'string') {
      reject(new Error('Fixture API server did not expose a TCP address.'));
      return;
    }
    resolve(address.port);
  });
});
const closeServer = (server) => new Promise((resolve, reject) => {
  if (!server?.listening) {
    resolve();
    return;
  }
  server.closeAllConnections?.();
  server.close((error) => error ? reject(error) : resolve());
});
const childExited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = async (child, timeout) => childExited(child) ? true : await new Promise((resolve) => {
  const finish = (exited) => { clearTimeout(timer); child.off('exit', onExit); resolve(exited); };
  const onExit = () => finish(true);
  const timer = setTimeout(() => finish(childExited(child)), timeout);
  child.once('exit', onExit);
});
const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  const details = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (!childExited(child)) {
    if (process.platform === 'win32') child.kill('SIGTERM'); else process.kill(-child.pid, 'SIGTERM');
    if (!await waitForChildExit(child, 10000)) {
      if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL');
      assert(await waitForChildExit(child, 5000), 'Owned Nuxt process did not stop after SIGKILL', details);
    }
  }
  return { status: 'terminated', ...details, finalExitCode: child.exitCode, finalSignalCode: child.signalCode };
};
const waitFor = async (label, predicate, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(50);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};

const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  fixturePath,
  scenarios: {},
  terminationRequests: [],
  otherGraphqlOperations: [],
  browserEvents: [],
  cleanup: {},
  failures: [],
};
const scenario = async (id, description, run) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await run();
    evidence.scenarios[id] = { result: 'Pass', description, startedAt, details };
    return details;
  } catch (error) {
    const failure = {
      id,
      description,
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { result: 'Fail', description, startedAt, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

let terminationMode = 'success';
let terminationDelayMs = 0;
const graphQlData = (operationName, query) => {
  if (operationName === 'GetAgentDefinitions' || query.includes('agentDefinitions')) return { agentDefinitions: [] };
  if (operationName === 'GetAgentTeamDefinitions' || query.includes('agentTeamDefinitions')) return { agentTeamDefinitions: [] };
  if (operationName === 'GetApplicationsCapability' || query.includes('applicationsCapability')) {
    return { applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' } };
  }
  if (operationName === 'GetSkillImprovementCapability' || query.includes('skillImprovementCapability')) {
    return { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } };
  }
  if (operationName === 'GetAllWorkspaces' || query.includes('workspaces')) return { workspaces: [] };
  if (operationName === 'GetServerSettings' || query.includes('serverSettings')) return { serverSettings: [] };
  return {};
};
const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};
const sendJson = (response, status, body) => {
  response.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(body));
};
const apiServer = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      });
      response.end();
      return;
    }
    if (request.url === '/rest/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (request.url !== '/graphql' || request.method !== 'POST') {
      sendJson(response, 404, { error: 'not found' });
      return;
    }
    let payload = {};
    try { payload = JSON.parse(await readBody(request)); } catch { payload = {}; }
    const operationName = typeof payload.operationName === 'string' ? payload.operationName : '';
    const query = typeof payload.query === 'string' ? payload.query : '';
    const variables = payload.variables && typeof payload.variables === 'object' ? payload.variables : {};
    if (operationName === 'TerminateAgentRun' || query.includes('terminateAgentRun')) {
      const requestRecord = {
        sequence: evidence.terminationRequests.length + 1,
        mode: terminationMode,
        operationName: operationName || 'TerminateAgentRun',
        variables,
        receivedAt: new Date().toISOString(),
      };
      evidence.terminationRequests.push(requestRecord);
      if (terminationDelayMs > 0) await wait(terminationDelayMs);
      if (terminationMode === 'http-error') {
        sendJson(response, 503, { error: 'termination fixture unavailable' });
        return;
      }
      if (terminationMode === 'graphql-error') {
        sendJson(response, 200, { errors: [{ message: 'fixture GraphQL termination error' }] });
        return;
      }
      if (terminationMode === 'false') {
        sendJson(response, 200, { data: { terminateAgentRun: { success: false, message: 'fixture rejected' } } });
        return;
      }
      sendJson(response, 200, { data: { terminateAgentRun: { success: true, message: 'terminated' } } });
      return;
    }
    evidence.otherGraphqlOperations.push({ operationName, receivedAt: new Date().toISOString() });
    sendJson(response, 200, { data: graphQlData(operationName, query) });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const initialScreenshotPath = path.join(outputDir, 'initial-error-matrix.png');
const pendingScreenshotPath = path.join(outputDir, 'pending-exact-run.png');
const successScreenshotPath = path.join(outputDir, 'confirmed-success.png');
const failureScreenshotPath = path.join(outputDir, 'failure-retry-narrow.png');
let fixtureInstalled = false;
let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
let result = 'Pass';

const row = (runId) => page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`);
const stop = (runId) => row(runId).locator(`button[data-test="terminate-agent-run"][data-run-id="${runId}"]`);
const state = () => page.evaluate(() => window.__standaloneAgentErrorStopProbe.snapshot());
const reset = async () => {
  await page.evaluate(() => window.__standaloneAgentErrorStopProbe.reset());
  await waitFor('fixture reset', async () => (await state()).rows.find((entry) => entry.runId === ACTIVE_ERROR_RUN)?.isActive === true);
};
const inactiveActions = async (runId) => ({
  archive: await row(runId).locator('button[title="Archive run"]').count(),
  remove: await row(runId).locator('button[title="Delete run permanently"]').count(),
});

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const apiPort = await listenOnFreePort(apiServer);
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.apiBaseUrl = apiBaseUrl;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn(path.join(webDir, 'node_modules/.bin/nuxi'), [
    'dev', '--host', '127.0.0.1', '--port', String(port),
  ], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      NUXT_TELEMETRY_DISABLED: '1',
      BACKEND_NODE_BASE_URL: apiBaseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);
  await waitFor('Nuxt fixture route', async () => {
    if (childExited(nuxtProcess)) throw new Error(`Nuxt exited before readiness: ${nuxtProcess.exitCode}/${nuxtProcess.signalCode}`);
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US', colorScheme: 'light' });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('console', (message) => evidence.browserEvents.push({
    type: `console:${message.type()}`,
    text: message.text(),
    terminationMode,
  }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message, terminationMode }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`, terminationMode,
  }));
  await page.goto(`${baseUrl}${routePath}?backendUrl=${encodeURIComponent(apiBaseUrl)}`, {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });
  await page.locator('[data-test="standalone-agent-error-stop-probe"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__standaloneAgentErrorStopProbe));
  evidence.browserEvents = [];

  await scenario('API-E2E-004-A', 'Active and inactive Error rows preserve truthful browser presentation and accessibility', async () => {
    assert(await stop(ACTIVE_ERROR_RUN).count() === 1, 'Active Error row did not render exactly one Stop');
    assert(await stop(HEALTHY_RUN).count() === 1, 'Healthy active sibling lost Stop');
    assert(await stop(INACTIVE_ERROR_RUN).count() === 0, 'Inactive Error history incorrectly rendered Stop');
    assert(await row(ACTIVE_ERROR_RUN).locator('.bg-red-500').count() === 1, 'Active Error red status was not retained');
    assert(await row(INACTIVE_ERROR_RUN).locator('.bg-red-500').count() === 1, 'Inactive Error evidence was not retained');
    assert(JSON.stringify(await inactiveActions(ACTIVE_ERROR_RUN)) === JSON.stringify({ archive: 0, remove: 0 }),
      'Active Error row exposed inactive-only actions', await inactiveActions(ACTIVE_ERROR_RUN));
    assert(JSON.stringify(await inactiveActions(INACTIVE_ERROR_RUN)) === JSON.stringify({ archive: 1, remove: 1 }),
      'Inactive Error row did not retain inactive actions', await inactiveActions(INACTIVE_ERROR_RUN));
    assert(await stop(ACTIVE_ERROR_RUN).getAttribute('title') === 'Terminate run', 'Stop tooltip was not localized');
    assert(await stop(ACTIVE_ERROR_RUN).getAttribute('aria-label') === 'Terminate run', 'Stop accessible name was not localized');
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });
    return { state: await state(), activeStopCount: 1, inactiveActions: await inactiveActions(INACTIVE_ERROR_RUN) };
  });

  await scenario('API-E2E-004-B', 'Enter dispatches one exact delayed success, disables only that run, and retains inactive history', async () => {
    terminationMode = 'success';
    terminationDelayMs = 700;
    const requestStart = evidence.terminationRequests.length;
    await stop(ACTIVE_ERROR_RUN).focus();
    await page.keyboard.press('Enter');
    await waitFor('exact termination request', () => evidence.terminationRequests.length === requestStart + 1);
    assert(await stop(ACTIVE_ERROR_RUN).isDisabled(), 'Exact active Error Stop was not disabled while pending');
    assert(!await stop(HEALTHY_RUN).isDisabled(), 'Healthy sibling Stop was incorrectly disabled');
    assert((await state()).selectedRunId === null, 'Stop activation selected the run row', await state());
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await wait(150);
    assert(evidence.terminationRequests.length === requestStart + 1, 'Pending keyboard activation dispatched a duplicate request', evidence.terminationRequests);
    await page.screenshot({ path: pendingScreenshotPath, fullPage: true });
    await waitFor('confirmed success transition', async () => await stop(ACTIVE_ERROR_RUN).count() === 0);
    assert(await row(ACTIVE_ERROR_RUN).count() === 1, 'Confirmed success removed the history row');
    assert(await row(ACTIVE_ERROR_RUN).locator('.bg-red-500').count() === 0, 'Confirmed success retained active Error presentation');
    assert(JSON.stringify(await inactiveActions(ACTIVE_ERROR_RUN)) === JSON.stringify({ archive: 1, remove: 1 }),
      'Confirmed success did not expose only inactive actions', await inactiveActions(ACTIVE_ERROR_RUN));
    const request = evidence.terminationRequests.at(-1);
    assert(request.variables.agentRunId === ACTIVE_ERROR_RUN, 'Termination request used the wrong run ID', request);
    await page.screenshot({ path: successScreenshotPath, fullPage: true });
    terminationDelayMs = 0;
    return { request, state: await state(), inactiveActions: await inactiveActions(ACTIVE_ERROR_RUN) };
  });

  await scenario('API-E2E-004-C', 'success:false preserves Error, clears pending, toasts, and remains retryable', async () => {
    await reset();
    terminationMode = 'false';
    terminationDelayMs = 0;
    const requestStart = evidence.terminationRequests.length;
    await stop(ACTIVE_ERROR_RUN).focus();
    await page.keyboard.press('Space');
    await waitFor('false-result toast', async () => await page.locator('[data-test="probe-toasts"] [data-toast-type="error"]').count() === 1);
    assert(evidence.terminationRequests.length === requestStart + 1, 'False result did not make exactly one request', evidence.terminationRequests);
    assert(!await stop(ACTIVE_ERROR_RUN).isDisabled(), 'Stop stayed disabled after false result');
    assert(await row(ACTIVE_ERROR_RUN).locator('.bg-red-500').count() === 1, 'False result removed Error presentation');
    assert(JSON.stringify(await inactiveActions(ACTIVE_ERROR_RUN)) === JSON.stringify({ archive: 0, remove: 0 }),
      'False result exposed inactive-only actions', await inactiveActions(ACTIVE_ERROR_RUN));
    assert(await page.getByText('Failed to terminate run. Please try again.', { exact: true }).count() === 1,
      'Existing failure toast was not visible');
    return { request: evidence.terminationRequests.at(-1), state: await state() };
  });

  await scenario('API-E2E-004-D', 'GraphQL and HTTP failures preserve truthful retry state without selection', async () => {
    await reset();
    let requestStart = evidence.terminationRequests.length;
    terminationMode = 'graphql-error';
    await stop(ACTIVE_ERROR_RUN).click();
    await waitFor('GraphQL-error toast', async () => (await state()).toasts.length === 1);
    assert(evidence.terminationRequests.length === requestStart + 1, 'GraphQL error did not make exactly one request');
    assert(await stop(ACTIVE_ERROR_RUN).count() === 1 && !await stop(ACTIVE_ERROR_RUN).isDisabled(),
      'GraphQL error did not restore retryable Stop');
    assert((await state()).selectedRunId === null, 'GraphQL failure selected the row');

    await reset();
    requestStart = evidence.terminationRequests.length;
    terminationMode = 'http-error';
    await stop(ACTIVE_ERROR_RUN).click();
    await waitFor('HTTP-error toast', async () => (await state()).toasts.length === 1);
    assert(evidence.terminationRequests.length === requestStart + 1, 'HTTP error did not make exactly one request');
    assert(await stop(ACTIVE_ERROR_RUN).count() === 1 && !await stop(ACTIVE_ERROR_RUN).isDisabled(),
      'HTTP error did not restore retryable Stop');
    assert(await row(ACTIVE_ERROR_RUN).locator('.bg-red-500').count() === 1, 'HTTP error removed Error presentation');
    assert(JSON.stringify(await inactiveActions(ACTIVE_ERROR_RUN)) === JSON.stringify({ archive: 0, remove: 0 }),
      'HTTP error exposed inactive-only actions');
    return { graphqlRequest: evidence.terminationRequests.at(-2), httpRequest: evidence.terminationRequests.at(-1), state: await state() };
  });

  await scenario('API-E2E-004-E', 'Retry succeeds and the narrow layout keeps exact actions within the viewport', async () => {
    terminationMode = 'success';
    const requestStart = evidence.terminationRequests.length;
    await page.setViewportSize({ width: 420, height: 760 });
    const activeBox = await row(ACTIVE_ERROR_RUN).boundingBox();
    const stopBox = await stop(ACTIVE_ERROR_RUN).boundingBox();
    assert(activeBox && stopBox, 'Narrow layout boxes were unavailable');
    assert(activeBox.x >= 0 && activeBox.x + activeBox.width <= 420, 'Active Error row overflowed narrow viewport', activeBox);
    assert(stopBox.x >= 0 && stopBox.x + stopBox.width <= 420, 'Stop overflowed narrow viewport', stopBox);
    await page.screenshot({ path: failureScreenshotPath, fullPage: true });
    await stop(ACTIVE_ERROR_RUN).focus();
    await page.keyboard.press('Enter');
    await waitFor('successful retry transition', async () => await stop(ACTIVE_ERROR_RUN).count() === 0);
    assert(evidence.terminationRequests.length === requestStart + 1, 'Retry did not dispatch exactly once');
    assert(await row(ACTIVE_ERROR_RUN).count() === 1, 'Successful retry removed history');
    return { request: evidence.terminationRequests.at(-1), state: await state(), activeBox, stopBox };
  });

  const unexpectedBrowserErrors = evidence.browserEvents.filter((event) => {
    if (event.type === 'pageerror' || event.type === 'requestfailed') return true;
    if (event.type !== 'console:error') return false;
    if (event.terminationMode === 'false' || event.terminationMode === 'graphql-error' || event.terminationMode === 'http-error') {
      return false;
    }
    return true;
  });
  assert(unexpectedBrowserErrors.length === 0, 'Unexpected browser page/console/request errors were observed', unexpectedBrowserErrors);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({
      id: 'HARNESS',
      description: 'Run standalone Error Stop browser probe',
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} finally {
  try { await context?.close(); evidence.cleanup.browserContext = context ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browserContext = `failed: ${error.message}`; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess); }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { await closeServer(apiServer); evidence.cleanup.apiServer = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.apiServer = `failed: ${error.message}`; }
  try { if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve)); evidence.cleanup.nuxtLog = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxtLog = `failed: ${error.message}`; }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) { result = 'Fail'; evidence.cleanup.installedFixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = {
    evidencePath,
    nuxtLogPath,
    initialScreenshotPath,
    pendingScreenshotPath,
    successScreenshotPath,
    failureScreenshotPath,
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result === 'Pass') {
  process.stdout.write(`Standalone Error Stop browser probe passed. Evidence: ${evidencePath}\n`);
} else {
  process.stderr.write(`Standalone Error Stop browser probe failed. See ${evidencePath}\n`);
  process.exitCode = 1;
}
