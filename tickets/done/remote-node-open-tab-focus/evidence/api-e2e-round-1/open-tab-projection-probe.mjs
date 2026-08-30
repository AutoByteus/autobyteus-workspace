#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const webDir = process.argv[2];
const fixturePath = process.argv[3];
const outputDir = process.argv[4];
const remoteResultEvidencePath = process.argv[5];
assert(webDir && fixturePath && outputDir, 'Usage: node probe.mjs <web-dir> <fixture-path> <output-dir>');
const requireFromWeb = createRequire(path.join(webDir, 'package.json'));
const { chromium } = requireFromWeb('playwright-core');

const installedPagePath = path.join(webDir, 'pages/__api_e2e_open_tab_projection.vue');
const routePath = '/__api_e2e_open_tab_projection';
const browserExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const evidencePath = path.join(outputDir, '12-browser-probe.json');
const logPath = path.join(outputDir, '12-browser-probe.log');
const screenshotPath = path.join(outputDir, '12-browser-probe.png');
const nuxtLogPath = path.join(outputDir, '12-browser-probe-nuxt.log');
const evidence = {
  generatedAt: new Date().toISOString(),
  executionMode: 'Temporary Nuxt route with real projector, Pinia stores, activity state, and right-panel composables; only Electron preload Browser API emulated',
  browserExecutable,
  platform: process.platform,
  scenarios: {},
  dom: {},
  browserEvents: [],
  cleanup: {},
  result: 'Fail',
};
let remoteOpenTabResult = null;
if (remoteResultEvidencePath) {
  const retainedEvidence = JSON.parse(await fs.readFile(remoteResultEvidencePath, 'utf8'));
  remoteOpenTabResult = retainedEvidence?.docker?.openTabResult ?? null;
  assert(remoteOpenTabResult?.tab_id, 'Retained Docker evidence does not contain docker.openTabResult.tab_id');
  evidence.remoteResultSource = remoteResultEvidencePath;
}

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

const waitFor = async (label, predicate, timeoutMs = 60_000) => {
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

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = (child, timeoutMs) => new Promise((resolve) => {
  if (childExited(child)) return resolve(true);
  let timer;
  const finish = (value) => {
    clearTimeout(timer);
    child.off('exit', onExit);
    resolve(value);
  };
  const onExit = () => finish(true);
  child.once('exit', onExit);
  timer = setTimeout(() => finish(childExited(child)), timeoutMs);
});

const stopOwnedProcess = async (child) => {
  if (!child || childExited(child)) return { status: child ? 'already-exited' : 'not-started' };
  if (process.platform === 'win32') child.kill('SIGTERM');
  else process.kill(-child.pid, 'SIGTERM');
  if (!(await waitForChildExit(child, 10_000))) {
    if (process.platform === 'win32') child.kill('SIGKILL');
    else process.kill(-child.pid, 'SIGKILL');
    assert(await waitForChildExit(child, 5_000), 'Owned Nuxt process did not stop');
  }
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};

await fs.mkdir(outputDir, { recursive: true });
let nuxt;
let nuxtLog;
let browser;
let context;
let page;
let installed = false;
let executionError;

try {
  assert(existsSync(webDir), `Missing web directory: ${webDir}`);
  assert(existsSync(fixturePath), `Missing fixture: ${fixturePath}`);
  assert(existsSync(browserExecutable), `Missing browser executable: ${browserExecutable}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing route: ${installedPagePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
  installed = true;

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.nuxt = { port, route: `${baseUrl}${routePath}` };
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  await waitFor('temporary Nuxt route', async () => {
    if (childExited(nuxt)) throw new Error(`Nuxt exited ${nuxt.exitCode}/${nuxt.signalCode}`);
    const response = await fetch(`${baseUrl}${routePath}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
  context = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
  });
  await context.route('**/rest/health', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ok' }),
  }));
  await context.route('**/graphql', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        providerModelCatalogSnapshots: [],
        applicationsCapability: {
          enabled: false,
          scope: 'BOUND_NODE',
          settingKey: 'ENABLE_APPLICATIONS',
          source: 'INITIALIZED_EMPTY_CATALOG',
        },
        agentDefinitions: [],
        agentTeamDefinitions: [],
        workspaces: [],
        workspaceInfos: [],
        workspacesWithMetadata: [],
      },
    }),
  }));
  page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({
    type: `console:${message.type()}`,
    text: message.text(),
  }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="open-tab-projection-probe"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__openTabProjectionProbe?.ready === true);
  evidence.dom.before = {
    readiness: await page.locator('[data-test="readiness"]').innerText(),
    activeTab: await page.locator('[data-test="active-tab"]').innerText(),
    panelVisible: await page.locator('[data-test="panel-visible"]').innerText(),
    nodeId: await page.locator('[data-test="node-id"]').innerText(),
    browserAvailable: await page.locator('[data-test="browser-available"]').innerText(),
  };

  const result = await page.evaluate(
    (retainedRemoteResult) => window.__openTabProjectionProbe.run(retainedRemoteResult),
    remoteOpenTabResult,
  );
  assert.equal(result.result, 'Pass');
  assert.deepEqual(Object.keys(result.scenarios).sort(), [
    'API-E2E-005A',
    'API-E2E-005B',
    'API-E2E-006',
    'API-E2E-007',
  ]);
  for (const scenario of Object.values(result.scenarios)) assert.equal(scenario.result, 'Pass');
  evidence.scenarios = result.scenarios;
  evidence.dom.after = {
    readiness: await page.locator('[data-test="readiness"]').innerText(),
    activeTab: await page.locator('[data-test="active-tab"]').innerText(),
    panelVisible: await page.locator('[data-test="panel-visible"]').innerText(),
    nodeId: await page.locator('[data-test="node-id"]').innerText(),
    browserAvailable: await page.locator('[data-test="browser-available"]').innerText(),
    renderedResult: await page.locator('[data-test="probe-result"]').innerText(),
  };
  evidence.finalSnapshot = await page.evaluate(() => window.__openTabProjectionProbe.snapshot());
  await page.screenshot({ path: screenshotPath, fullPage: true });
  evidence.screenshot = screenshotPath;
  evidence.result = 'Pass';
} catch (error) {
  executionError = error;
  evidence.failure = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  if (page) {
    evidence.failure.pageUrl = page.url();
    evidence.failure.body = (await page.locator('body').innerText().catch(() => '')).slice(0, 5000);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  }
} finally {
  if (context) {
    await context.close();
    evidence.cleanup.browserContext = 'closed';
  }
  if (browser) {
    await browser.close();
    evidence.cleanup.browser = 'closed';
  }
  evidence.cleanup.nuxt = await stopOwnedProcess(nuxt).catch((error) => ({
    status: 'failed',
    message: error instanceof Error ? error.message : String(error),
  }));
  if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve));
  if (installed || existsSync(installedPagePath)) {
    await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.temporaryRoute = 'removed';
  } else {
    evidence.cleanup.temporaryRoute = 'not-installed';
  }
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  const lines = [
    `result=${evidence.result}`,
    `route=${evidence.nuxt?.route ?? 'not-started'}`,
    `scenarios=${Object.entries(evidence.scenarios).map(([id, value]) => `${id}:${value.result}`).join(',')}`,
    `browserEvents=${evidence.browserEvents.length}`,
    `cleanup=${JSON.stringify(evidence.cleanup)}`,
    `evidence=${evidencePath}`,
    `screenshot=${existsSync(screenshotPath) ? screenshotPath : 'not-captured'}`,
  ];
  if (evidence.failure) lines.push(`failure=${JSON.stringify(evidence.failure)}`);
  await fs.writeFile(logPath, `${lines.join('\n')}\n`);
}

if (executionError) throw executionError;
console.log(JSON.stringify({ result: evidence.result, scenarios: evidence.scenarios, cleanup: evidence.cleanup }, null, 2));
