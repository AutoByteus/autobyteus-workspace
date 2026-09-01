#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
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
const fixturePath = path.join(scriptDir, 'fixtures/codex-command-failure-detail.page.vue');
const installedPagePath = path.join(webDir, 'pages/__codex-command-failure-detail-probe.vue');
const routePath = '/__codex-command-failure-detail-probe';
const diagnostic = 'first diagnostic line\nCODEX_FAILURE_STDERR_MARKER\nExit code: 23';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(
  webDir,
  getArg('output-dir', 'test-results/codex-command-failure-detail'),
);
const explicitPort = getArg('port');
const browserExecutableArg = getArg(
  'browser-executable',
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg
  || browserCandidates.find((candidate) => existsSync(candidate));

const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  fixturePath,
  installedPagePath,
  routePath,
  diagnostic,
  scenarios: {},
  browserEvents: [],
  failures: [],
  cleanup: {},
};

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const waitFor = async (label, predicate) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};

const childExited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = (child, milliseconds) => new Promise((resolve) => {
  if (childExited(child)) return resolve(true);
  let timer;
  const finish = (value) => {
    clearTimeout(timer);
    child.off('exit', onExit);
    resolve(value);
  };
  const onExit = () => finish(true);
  child.once('exit', onExit);
  timer = setTimeout(() => finish(childExited(child)), milliseconds);
});

const signalOwnedProcess = (child, signal) => {
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal);
      return 'process-group';
    } catch (error) {
      if (childExited(child)) return 'already-exited';
    }
  }
  const accepted = child.kill(signal);
  if (!accepted && !childExited(child)) {
    throw new Error(`Owned Nuxt process ${child.pid} rejected ${signal}.`);
  }
  return 'child';
};

const stopOwnedProcess = async (child) => {
  if (!child || childExited(child)) {
    return { status: child ? 'already-exited' : 'not-started' };
  }
  const details = { pid: child.pid };
  details.sigtermTarget = signalOwnedProcess(child, 'SIGTERM');
  details.exitedAfterSigterm = await waitForChildExit(child, 10_000);
  if (!details.exitedAfterSigterm) {
    details.sigkillTarget = signalOwnedProcess(child, 'SIGKILL');
    details.exitedAfterSigkill = await waitForChildExit(child, 5_000);
    assert.equal(details.exitedAfterSigkill, true, 'Owned Nuxt process did not stop.');
  }
  return {
    status: 'terminated',
    ...details,
    exitCode: child.exitCode,
    signalCode: child.signalCode,
  };
};

const recordScenario = async (id, description, execute) => {
  try {
    const details = await execute();
    evidence.scenarios[id] = { result: 'Pass', description, details };
  } catch (error) {
    const failure = {
      id,
      description,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { result: 'Fail', description, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

const stubBackend = async (route) => {
  const url = new URL(route.request().url());
  const health = url.pathname.includes('/rest/health');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(health ? { status: 'ok' } : {
      data: {
        applicationsCapability: {
          enabled: false,
          scope: 'BOUND_NODE',
          settingKey: 'ENABLE_APPLICATIONS',
          source: 'INITIALIZED_EMPTY_CATALOG',
        },
        providerModelCatalogSnapshots: [],
        agentDefinitions: [],
        agentTeamDefinitions: [],
        workspaces: [],
        workspaceInfos: [],
        workspacesWithMetadata: [],
      },
    }),
  });
};

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
let nuxt;
let nuxtLog;
let browser;
let context;
let fixtureInstalled = false;
let result = 'Pass';

try {
  assert.equal(existsSync(fixturePath), true, `Missing fixture ${fixturePath}`);
  assert.equal(existsSync(installedPagePath), false, `Refusing to overwrite ${installedPagePath}`);
  if (browserExecutableArg) {
    assert.equal(existsSync(browserExecutableArg), true, `Missing browser ${browserExecutableArg}`);
  }

  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const port = explicitPort ? Number(explicitPort) : await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;

  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  await waitFor('Nuxt command-failure fixture route', async () => {
    if (childExited(nuxt)) {
      throw new Error(`Nuxt exited early (${nuxt.exitCode}/${nuxt.signalCode}).`);
    }
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  evidence.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  await context.route('http://127.0.0.1:65534/**', stubBackend);
  const page = await context.newPage();
  page.on('console', (message) => {
    evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() });
  });
  page.on('pageerror', (error) => {
    evidence.browserEvents.push({ type: 'pageerror', text: error.message });
  });
  page.on('requestfailed', (request) => {
    evidence.browserEvents.push({
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    });
  });

  await page.goto(`${baseUrl}${routePath}`, {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });
  await page.locator('[data-test="codex-command-failure-detail-probe"]').waitFor({
    state: 'visible',
    timeout: timeoutMs,
  });

  await recordScenario(
    'BE2E-CODEX-FAIL-001',
    'Desktop center and Activity surfaces preserve the same readable multiline diagnostic.',
    async () => {
      const center = page.locator('[data-test="center-surface"]');
      const activity = page.locator('[data-test="activity-surface"]');
      const centerError = center.locator('[data-test="tool-error-message"]');
      const activityError = activity.locator('.bg-red-50.border-red-200.whitespace-pre-wrap');
      await centerError.waitFor({ state: 'visible' });
      await activityError.waitFor({ state: 'visible' });

      const centerText = await centerError.textContent();
      const activityText = await activityError.textContent();
      assert.equal(centerText?.trim(), diagnostic);
      assert.equal(activityText?.trim(), diagnostic);
      assert.deepEqual((await centerError.innerText()).trim().split('\n'), diagnostic.split('\n'));
      assert.deepEqual((await activityError.innerText()).trim().split('\n'), diagnostic.split('\n'));
      assert.equal(await centerError.evaluate((element) => getComputedStyle(element).whiteSpace), 'pre-wrap');
      assert.equal(await activityError.evaluate((element) => getComputedStyle(element).whiteSpace), 'pre-wrap');
      assert.match(await center.innerText(), /run_bash/);
      assert.match(await activity.innerText(), /Failed/i);
      await activity.getByText('Arguments', { exact: true }).click();
      assert.match(await activity.innerText(), /\/workspace\/command-failure/);
      const body = await page.locator('body').innerText();
      assert.equal(body.includes('aggregatedOutput'), false);
      assert.equal(body.includes('"exitCode":23'), false);
      const viewport = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.ok(viewport.scrollWidth <= viewport.clientWidth, `Desktop overflow: ${JSON.stringify(viewport)}`);
      const screenshot = path.join(outputDir, 'desktop-failure-surfaces.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      return { centerText, activityText, viewport, screenshot };
    },
  );

  await recordScenario(
    'BE2E-CODEX-FAIL-002',
    'Narrow renderer keeps both complete diagnostics readable without document overflow.',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const centerError = page.locator('[data-test="center-surface"] [data-test="tool-error-message"]');
      const activityError = page.locator('[data-test="activity-surface"] .bg-red-50.border-red-200.whitespace-pre-wrap');
      assert.equal((await centerError.innerText()).trim(), diagnostic);
      assert.equal((await activityError.innerText()).trim(), diagnostic);
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.ok(metrics.scrollWidth <= metrics.clientWidth, `Narrow overflow: ${JSON.stringify(metrics)}`);
      const screenshot = path.join(outputDir, 'narrow-failure-surfaces.png');
      await page.screenshot({ path: screenshot, fullPage: true });
      return { metrics, screenshot };
    },
  );

  const browserErrors = evidence.browserEvents.filter(
    (event) => event.type === 'pageerror' || event.type === 'console:error',
  );
  assert.deepEqual(browserErrors, [], `Browser errors: ${JSON.stringify(browserErrors)}`);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error?.message)) {
    evidence.failures.push({
      id: 'HARNESS',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} finally {
  try {
    await context?.close();
    evidence.cleanup.context = context ? 'closed' : 'not-started';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.context = `failed: ${error.message}`;
  }
  try {
    await browser?.close();
    evidence.cleanup.browser = browser ? 'closed' : 'not-started';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.browser = `failed: ${error.message}`;
  }
  try {
    evidence.cleanup.nuxt = await stopOwnedProcess(nuxt);
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.nuxt = `failed: ${error.message}`;
  }
  try {
    if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve));
    evidence.cleanup.nuxtLog = nuxtLog ? 'closed' : 'not-started';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.nuxtLog = `failed: ${error.message}`;
  }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.fixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.fixture = `failed: ${error.message}`;
  }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = { evidencePath, nuxtLogPath };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result !== 'Pass') {
  console.error(`Codex command failure detail browser probe failed. Evidence: ${evidencePath}`);
  process.exitCode = 1;
} else {
  console.log(`Codex command failure detail browser probe passed. Evidence: ${evidencePath}`);
}
