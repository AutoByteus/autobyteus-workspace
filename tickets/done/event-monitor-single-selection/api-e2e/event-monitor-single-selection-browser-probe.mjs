#!/usr/bin/env node
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const probeDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(probeDir, '../../../../autobyteus-web');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const fixturePath = path.join(probeDir, 'event-monitor-single-selection.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-event-monitor-single-selection.vue');
const routePath = '/api-e2e-event-monitor-single-selection';
const outputDir = path.join(probeDir, 'browser-output');
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const timeoutMs = 90000;

const evidence = {
  result: 'Fail',
  routePath,
  webDir,
  fixturePath,
  installedPagePath,
  outputDir,
  browserExecutable: executablePath,
  scenarios: {},
  browserEvents: [],
  cleanup: {},
  failures: [],
};

const assert = (condition, message, details) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const choosePort = async () => await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close(() => resolve(port));
  });
});

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForExit = async (child, timeoutMsToWait) => {
  if (!child || childExited(child)) return true;
  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolve(childExited(child));
    }, timeoutMsToWait);
    const onExit = () => {
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(true);
    };
    child.once('exit', onExit);
  });
};

const stopOwnedNuxt = async (child) => {
  if (!child || childExited(child)) return { status: 'not-started-or-already-exited' };
  const details = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (process.platform === 'win32') child.kill('SIGTERM');
  else process.kill(-child.pid, 'SIGTERM');
  if (!(await waitForExit(child, 10000))) {
    if (process.platform === 'win32') child.kill('SIGKILL');
    else process.kill(-child.pid, 'SIGKILL');
    assert(await waitForExit(child, 5000), 'Owned Nuxt process did not stop', details);
  }
  return { status: 'terminated', ...details, finalExitCode: child.exitCode, finalSignalCode: child.signalCode };
};

const waitFor = async (description, fn) => {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};

const runScenario = async (id, description, fn) => {
  try {
    const details = await fn();
    evidence.scenarios[id] = { description, result: 'Pass', details };
    return details;
  } catch (error) {
    const failure = {
      message: error.message,
      details: error.details,
      stack: error.stack,
    };
    evidence.scenarios[id] = { description, result: 'Fail', failure };
    evidence.failures.push({ id, description, ...failure });
    throw error;
  }
};

await fs.mkdir(outputDir, { recursive: true });
assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
assert(existsSync(executablePath), `Chrome executable does not exist: ${executablePath}`);

let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
let fixtureInstalled = false;
try {
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.baseUrl = baseUrl;
  evidence.port = port;
  const nuxtLogPath = path.join(outputDir, 'nuxt.log');
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn(
    'pnpm',
    ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: webDir,
      detached: process.platform !== 'win32',
      env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);
  await waitFor('temporary Nuxt route readiness', async () => {
    if (childExited(nuxtProcess)) throw new Error(`Nuxt exited: ${nuxtProcess.exitCode}`);
    const response = await fetch(`${baseUrl}${routePath}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  await context.route('**/rest/health', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
  });
  await context.route('**/graphql', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
  });
  page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed',
    text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="selection-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  const stableA = page.locator('[data-test="workspace-team-member-team-run-a-reviewer"]');
  const stableB = page.locator('[data-test="workspace-team-member-team-run-b-reviewer"]');
  const transientA = page.locator('[data-test="workspace-team-transient-execution-row"][data-team-run-id="team-run-a"]');
  const transientB = page.locator('[data-test="workspace-team-transient-execution-row"][data-team-run-id="team-run-b"]');
  const currentRows = page.locator('[aria-current="true"]');

  await runScenario('BR-001', 'Duplicate focused route keys produce one current stable row', async () => {
    await stableA.waitFor({ state: 'visible' });
    await stableB.waitFor({ state: 'visible' });
    assert(await currentRows.count() === 1, 'Expected exactly one current row initially');
    assert(await stableA.getAttribute('aria-current') === 'true', 'Selected team A reviewer must be current');
    assert(await stableB.getAttribute('aria-current') === null, 'Team B reviewer must not be current');
    assert((await stableA.getAttribute('class')).includes('bg-indigo-50'), 'Current stable row lacks selected background');
    assert(!(await stableB.getAttribute('class')).includes('bg-indigo-50'), 'Non-current duplicate route has selected background');
    await page.screenshot({ path: path.join(outputDir, 'stable-current.png'), fullPage: true });
    return { currentCount: await currentRows.count(), current: await stableA.getAttribute('data-test') };
  });

  await runScenario('BR-002', 'Committed selection transfer and clear remove stale current state', async () => {
    await page.locator('[data-test="select-team-b-transient"]').click();
    await waitFor('team B transient current state', async () => (await transientB.getAttribute('aria-current')) === 'true');
    assert(await currentRows.count() === 1, 'Transfer must leave exactly one current row');
    assert(await stableA.getAttribute('aria-current') === null, 'Team A stable row retained current state after transfer');
    assert(await transientB.getAttribute('aria-current') === 'true', 'Team B transient row is not current after transfer');
    await page.locator('[data-test="clear-selection"]').click();
    await waitFor('cleared selection', async () => (await currentRows.count()) === 0);
    assert(await currentRows.count() === 0, 'Cleared selection must have no current rows');
    await page.screenshot({ path: path.join(outputDir, 'selection-cleared.png'), fullPage: true });
    await page.locator('[data-test="select-team-a-stable"]').click();
    await waitFor('team A stable current state after reselect', async () => (await stableA.getAttribute('aria-current')) === 'true');
    assert(await currentRows.count() === 1, 'Reselect must restore exactly one current row');
    return { afterTransfer: await transientB.getAttribute('data-member-route-key'), afterClearCount: 0, afterReselect: await stableA.getAttribute('data-test') };
  });

  await runScenario('BR-003', 'Current and non-current transient rows retain distinguishable ghost semantics', async () => {
    await page.locator('[data-test="select-team-b-transient"]').click();
    await waitFor('team B transient current state', async () => (await transientB.getAttribute('aria-current')) === 'true');
    assert((await transientA.getAttribute('class')).includes('bg-indigo-50/40'), 'Non-current transient lost ghost background');
    assert(!(await transientA.getAttribute('class')).includes('text-indigo-900'), 'Non-current transient gained current text color');
    assert(!(await transientA.getAttribute('class')).includes('ring-indigo-200'), 'Non-current transient gained current ring');
    assert((await transientB.getAttribute('class')).includes('bg-indigo-50/40'), 'Current transient lost ghost background');
    assert((await transientB.getAttribute('class')).includes('text-indigo-900'), 'Current transient lacks selected text color');
    assert((await transientB.getAttribute('class')).includes('ring-indigo-200'), 'Current transient lacks selected ring');
    await page.screenshot({ path: path.join(outputDir, 'transient-current-vs-ghost.png'), fullPage: true });
    return {
      nonCurrent: await transientA.getAttribute('class'),
      current: await transientB.getAttribute('class'),
    };
  });

  await runScenario('BR-004', 'Focus and hover on a non-current stable row do not create a second current row', async () => {
    await page.locator('[data-test="select-team-a-stable"]').click();
    await waitFor('team A stable current state', async () => (await stableA.getAttribute('aria-current')) === 'true');
    await stableB.focus();
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-test')) === 'workspace-team-member-team-run-b-reviewer', 'Non-current row did not receive keyboard focus');
    assert(await currentRows.count() === 1, 'Keyboard focus created a second current row');
    await stableB.hover();
    assert(await currentRows.count() === 1, 'Hover created a second current row');
    assert(await stableB.getAttribute('aria-current') === null, 'Focused/hovered non-current row became current');
    return { activeElement: await page.evaluate(() => document.activeElement?.getAttribute('data-test')), currentCount: await currentRows.count() };
  });

  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  const consoleErrors = evidence.browserEvents.filter((event) => event.type === 'console:error');
  assert(pageErrors.length === 0, 'Browser page errors were observed', pageErrors);
  const expectedBackendFixtureWarnings = consoleErrors.filter((event) =>
    event.text.startsWith('An error occurred! For more details, see the full error text at https://go.apollo.dev/c/err'));
  const unexpectedConsoleErrors = consoleErrors.filter((event) => !expectedBackendFixtureWarnings.includes(event));
  evidence.environmentWarnings = {
    backendFixtureWarnings: expectedBackendFixtureWarnings,
    unexpectedConsoleErrors,
    note: 'Apollo invariant warnings are expected because the probe intentionally returns an empty GraphQL fixture response; they are unrelated to the rendered history assertions.',
  };
  assert(unexpectedConsoleErrors.length === 0, 'Unexpected browser console errors were observed', unexpectedConsoleErrors);
  evidence.result = 'Pass';
} catch (error) {
  evidence.failures.push({ id: 'HARNESS', message: error.message, details: error.details, stack: error.stack });
} finally {
  try { await context?.close(); evidence.cleanup.browserContext = context ? 'closed' : 'not-started'; } catch (error) { evidence.cleanup.browserContext = `failed: ${error.message}`; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (error) { evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwnedNuxt(nuxtProcess); } catch (error) { evidence.cleanup.nuxt = `failed: ${error.message}`; evidence.result = 'Fail'; }
  try { nuxtLog?.end(); evidence.cleanup.nuxtLog = 'closed'; } catch (error) { evidence.cleanup.nuxtLog = `failed: ${error.message}`; evidence.result = 'Fail'; }
  try { if (fixtureInstalled) await fs.rm(installedPagePath, { force: true }); evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed'; } catch (error) { evidence.cleanup.installedFixture = `failed: ${error.message}`; evidence.result = 'Fail'; }
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = {
    evidencePath: path.join(outputDir, 'evidence.json'),
    nuxtLogPath: path.join(outputDir, 'nuxt.log'),
    stableScreenshotPath: path.join(outputDir, 'stable-current.png'),
    clearedScreenshotPath: path.join(outputDir, 'selection-cleared.png'),
    transientScreenshotPath: path.join(outputDir, 'transient-current-vs-ghost.png'),
  };
  await fs.writeFile(evidence.artifacts.evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (evidence.result !== 'Pass') {
  process.stderr.write(`Event-monitor single-selection browser probe failed. Evidence: ${evidence.artifacts.evidencePath}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Event-monitor single-selection browser probe passed. Evidence: ${evidence.artifacts.evidencePath}\n`);
}
