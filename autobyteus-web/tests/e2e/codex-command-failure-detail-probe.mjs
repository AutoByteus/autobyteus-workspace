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
const modes = ['standalone-live', 'standalone-replay', 'team-live', 'team-replay'];
const invocationId = 'exec-command-failure-browser';
const command = "/bin/bash -lc 'rg evidence | head -1400; printf CODEX_FAILURE_STDERR_MARKER >&2; exit 23'";
const buildLargeDiagnostic = () => {
  const lines = Array.from({ length: 1915 }, (_, index) => `line-${index}: ${'x'.repeat(170)}`);
  const prefix = lines.join('\n');
  return `${prefix}${'x'.repeat(348_978 - prefix.length)}`;
};
const diagnostic = buildLargeDiagnostic();
assert.equal(diagnostic.length, 348_978);
assert.equal(diagnostic.split('\n').length, 1915);

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const timeoutMs = Number(getArg('timeout-ms', '120000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/codex-command-failure-detail'));
const explicitPort = getArg('port');
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));

const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  fixturePath,
  installedPagePath,
  routePath,
  diagnostic: { length: diagnostic.length, lines: diagnostic.split('\n').length },
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
  if (!accepted && !childExited(child)) throw new Error(`Owned Nuxt process ${child.pid} rejected ${signal}.`);
  return 'child';
};

const stopOwnedProcess = async (child) => {
  if (!child || childExited(child)) return { status: child ? 'already-exited' : 'not-started' };
  const details = { pid: child.pid };
  details.sigtermTarget = signalOwnedProcess(child, 'SIGTERM');
  details.exitedAfterSigterm = await waitForChildExit(child, 10_000);
  if (!details.exitedAfterSigterm) {
    details.sigkillTarget = signalOwnedProcess(child, 'SIGKILL');
    details.exitedAfterSigkill = await waitForChildExit(child, 5_000);
    assert.equal(details.exitedAfterSigkill, true, 'Owned Nuxt process did not stop.');
  }
  return { status: 'terminated', ...details, exitCode: child.exitCode, signalCode: child.signalCode };
};

const recordScenario = async (id, description, execute) => {
  try {
    evidence.scenarios[id] = { result: 'Pass', description, details: await execute() };
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
        applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' },
        providerModelCatalogSnapshots: [], agentDefinitions: [], agentTeamDefinitions: [],
        workspaces: [], workspaceInfos: [], workspacesWithMetadata: [],
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
  if (browserExecutableArg) assert.equal(existsSync(browserExecutableArg), true, `Missing browser ${browserExecutableArg}`);

  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const port = explicitPort ? Number(explicitPort) : await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;

  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxt = spawn('corepack', ['pnpm', 'exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  await waitFor('Nuxt compact-command-failure fixture route', async () => {
    if (childExited(nuxt)) throw new Error(`Nuxt exited early (${nuxt.exitCode}/${nuxt.signalCode}).`);
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  evidence.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  await context.route('http://127.0.0.1:65534/**', stubBackend);
  const page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="codex-command-failure-detail-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => window.__commandFailureProbe?.ready === true);

  const setMode = async (mode) => {
    await page.evaluate((nextMode) => window.__commandFailureProbe.setMode(nextMode), mode);
    await page.locator('[data-test="current-mode"]').filter({ hasText: mode }).waitFor({ state: 'visible' });
    await page.locator('[data-test="tool-activity-error-toggle"]').waitFor({ state: 'visible' });
  };
  const center = () => page.locator('[data-test="center-surface"]');
  const centerRow = () => center().locator('[role="button"]');
  const activity = () => page.locator('[data-test="activity-surface"]');
  const errorToggle = () => activity().locator('[data-test="tool-activity-error-toggle"]');
  const errorBody = () => activity().locator('[data-test="tool-activity-error-body"]');
  const errorText = () => errorBody().locator('.whitespace-pre-wrap');
  const probeSnapshot = () => page.evaluate(() => window.__commandFailureProbe.snapshot());

  await recordScenario(
    'AE2E-SCN-001',
    'Large failed center status is compact, red, contextual, diagnostic-free in DOM/accessibility text, and overflow-safe at desktop and narrow widths.',
    async () => {
      await setMode('standalone-live');
      const row = centerRow();
      assert.equal(await row.getAttribute('tabindex'), '0');
      assert.match(await row.getAttribute('class'), /border-red-200/);
      assert.equal(await center().locator('[data-test="tool-error-message"]').count(), 0);
      const centerText = await center().innerText();
      const centerDomText = await center().textContent();
      const centerAccessibility = await center().ariaSnapshot();
      for (const observed of [centerText, centerDomText, centerAccessibility]) {
        assert.doesNotMatch(observed, /line-0:|line-1914:/);
      }
      assert.match(centerText, /run_bash/);
      assert.match(centerText, /rg evidence/);
      assert.match(centerText, /Event before failure/);
      assert.match(centerText, /Event after failure remains reachable/);
      assert.equal(await row.locator('svg.text-red-500').count(), 1);
      assert.equal(await row.locator('svg.text-gray-400').count(), 1);
      assert.equal(await row.locator('[data-test="tool-context-summary"]').getAttribute('title'), command);
      const desktopRowBox = await row.boundingBox();
      assert.ok(desktopRowBox && desktopRowBox.height <= 48, `Desktop center row is not compact: ${JSON.stringify(desktopRowBox)}`);
      let viewport = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(viewport.scrollWidth <= viewport.clientWidth, `Desktop overflow: ${JSON.stringify(viewport)}`);
      const desktopScreenshot = path.join(outputDir, 'desktop-collapsed-progressive-disclosure.png');
      await page.screenshot({ path: desktopScreenshot, fullPage: true });

      await page.setViewportSize({ width: 390, height: 844 });
      const narrowRowBox = await row.boundingBox();
      assert.ok(narrowRowBox && narrowRowBox.height <= 48, `Narrow center row is not compact: ${JSON.stringify(narrowRowBox)}`);
      viewport = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(viewport.scrollWidth <= viewport.clientWidth, `Narrow overflow: ${JSON.stringify(viewport)}`);
      const narrowScreenshot = path.join(outputDir, 'narrow-collapsed-progressive-disclosure.png');
      await page.screenshot({ path: narrowScreenshot, fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      return { centerText, centerAccessibility, desktopRowBox, narrowRowBox, viewport, desktopScreenshot, narrowScreenshot };
    },
  );

  await recordScenario(
    'AE2E-SCN-002',
    'Click, Enter, and Space navigate each standalone/team live/replay center row to the exact Activity item without auto-opening Error.',
    async () => {
      const interactions = [
        ['standalone-live', 'click'],
        ['standalone-replay', 'Enter'],
        ['team-live', 'Space'],
        ['team-replay', 'click'],
      ];
      const observations = [];
      for (const [mode, interaction] of interactions) {
        await setMode(mode);
        assert.equal(await errorBody().isVisible(), false, `${mode} Error should start collapsed.`);
        const row = centerRow();
        if (interaction === 'click') await row.click();
        else { await row.focus(); await row.press(interaction); }
        await page.locator('[data-test="active-tab"]').filter({ hasText: 'progress' }).waitFor({ state: 'visible' });
        await page.locator('[data-test="highlighted-id"]').filter({ hasText: invocationId }).waitFor({ state: 'visible' });
        const snapshot = await probeSnapshot();
        assert.equal(snapshot.highlightedId, invocationId);
        assert.equal(snapshot.activeTab, 'progress');
        assert.equal(snapshot.activityInvocationId, invocationId);
        assert.equal(await errorBody().isVisible(), false, `${mode} navigation auto-opened Error.`);
        assert.match(await activity().locator('.ring-red-500').getAttribute('class'), /ring-red-500/);
        observations.push({ mode, interaction, snapshot });
      }
      return observations;
    },
  );

  await recordScenario(
    'AE2E-SCN-003',
    'Direct view and explicit highlight keep Activity outer details available while Error stays collapsed across standalone/team and live/replay store paths.',
    async () => {
      const observations = [];
      for (const mode of modes) {
        await setMode(mode);
        assert.equal(await activity().getByText('Error', { exact: true }).isVisible(), true);
        assert.equal(await activity().getByText('Arguments', { exact: true }).isVisible(), true);
        assert.equal(await errorBody().isVisible(), false);
        let accessibility = await activity().ariaSnapshot();
        assert.doesNotMatch(accessibility, /line-0:|line-1914:/);
        await page.evaluate(() => window.__commandFailureProbe.setHighlighted(true));
        await page.locator('[data-test="highlighted-id"]').filter({ hasText: invocationId }).waitFor({ state: 'visible' });
        assert.equal(await errorBody().isVisible(), false, `${mode} highlight auto-opened Error.`);
        accessibility = await activity().ariaSnapshot();
        assert.doesNotMatch(accessibility, /line-0:|line-1914:/);
        assert.equal(await activity().locator('[data-test="activity-after"]').isVisible(), true);
        observations.push({ mode, accessibility, snapshot: await probeSnapshot() });
      }
      return observations;
    },
  );

  await recordScenario(
    'AE2E-SCN-004',
    'Explicit Activity disclosure preserves the exact large multiline diagnostic through expand, collapse, and reopen in every context.',
    async () => {
      const observations = [];
      for (const mode of modes) {
        await setMode(mode);
        const snapshotBefore = await probeSnapshot();
        assert.equal(snapshotBefore.diagnosticLength, diagnostic.length);
        assert.equal(snapshotBefore.diagnosticLines, 1915);
        assert.equal(snapshotBefore.activityErrorLength, diagnostic.length);
        assert.equal(snapshotBefore.activityErrorLines, 1915);
        assert.equal(snapshotBefore.activityErrorMatches, true);
        assert.equal(await errorBody().isVisible(), false);
        await errorToggle().click();
        assert.equal(await errorBody().isVisible(), true);
        let observed = await errorText().innerText();
        assert.equal(observed, diagnostic);
        assert.equal(observed.length, 348_978);
        assert.equal(observed.split('\n').length, 1915);
        assert.equal(await errorText().evaluate((element) => getComputedStyle(element).whiteSpace), 'pre-wrap');
        await errorToggle().click();
        assert.equal(await errorBody().isVisible(), false);
        await errorToggle().click();
        assert.equal(await errorBody().isVisible(), true);
        observed = await errorText().innerText();
        assert.equal(observed, diagnostic);
        observations.push({ mode, length: observed.length, lines: observed.split('\n').length });
      }
      const expandedScreenshot = path.join(outputDir, 'desktop-expanded-activity-detail.png');
      await page.screenshot({ path: expandedScreenshot, fullPage: false });
      return { observations, expandedScreenshot };
    },
  );

  const browserErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror' || event.type === 'console:error');
  assert.deepEqual(browserErrors, [], `Browser errors: ${JSON.stringify(browserErrors)}`);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error?.message)) {
    evidence.failures.push({ id: 'HARNESS', message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
  }
} finally {
  try { await context?.close(); evidence.cleanup.context = context ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.context = `failed: ${error.message}`; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxt); }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try {
    if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve));
    evidence.cleanup.nuxtLog = nuxtLog ? 'closed' : 'not-started';
  } catch (error) { result = 'Fail'; evidence.cleanup.nuxtLog = `failed: ${error.message}`; }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.fixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) { result = 'Fail'; evidence.cleanup.fixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = { evidencePath, nuxtLogPath };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result !== 'Pass') {
  console.error(`Compact command failure browser probe failed. Evidence: ${evidencePath}`);
  process.exitCode = 1;
} else {
  console.log(`Compact command failure browser probe passed. Evidence: ${evidencePath}`);
}
