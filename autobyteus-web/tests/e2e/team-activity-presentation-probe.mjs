#!/usr/bin/env node
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
const fixturePath = path.join(scriptDir, 'fixtures/team-activity-presentation.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-team-activity-presentation.vue');
const routePath = '/api-e2e-team-activity-presentation';

const getArg = (name, fallback = undefined) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/team-activity-presentation'));
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

const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || null,
  webDir,
  fixturePath,
  installedPagePath,
  routePath,
  scenarios: {},
  browserEvents: [],
  failures: [],
  cleanup: {},
};

const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const waitFor = async (description, fn, timeout = timeoutMs, interval = 100) => {
  const startedAt = Date.now();
  let lastValue;
  let lastError;
  while (Date.now() - startedAt < timeout) {
    try {
      lastValue = await fn();
      if (lastValue) return lastValue;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(
    `Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}`
      + (lastError ? `; error=${lastError.message}` : ''),
  );
};

const choosePort = async () => {
  if (explicitPort) return Number(explicitPort);
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
};

const childHasExited = (child) => child.exitCode !== null || child.signalCode !== null;

const waitForChildExit = async (child, timeout) => {
  if (childHasExited(child)) return true;
  return await new Promise((resolve) => {
    const onExit = () => finish(true);
    let timer;
    const finish = (exited) => {
      clearTimeout(timer);
      child.off('exit', onExit);
      resolve(exited);
    };
    child.once('exit', onExit);
    timer = setTimeout(() => finish(childHasExited(child)), timeout);
  });
};

const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  if (!child.pid) throw new Error('Owned Nuxt process has no PID');
  const details = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (!childHasExited(child)) {
    if (process.platform === 'win32') {
      child.kill('SIGTERM');
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
    if (!(await waitForChildExit(child, 10000))) {
      if (process.platform === 'win32') {
        child.kill('SIGKILL');
      } else {
        process.kill(-child.pid, 'SIGKILL');
      }
      assert(await waitForChildExit(child, 5000), 'Owned Nuxt process did not stop after SIGKILL', details);
    }
  }
  return {
    status: 'terminated',
    ...details,
    finalExitCode: child.exitCode,
    finalSignalCode: child.signalCode,
  };
};

const finishStream = async (stream) => {
  if (!stream) return;
  await new Promise((resolve) => stream.end(resolve));
};

const dotDetails = async (locator) => {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  return await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      dataActive: element.getAttribute('data-active'),
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      title: element.getAttribute('title'),
      className: element.getAttribute('class') || '',
      backgroundColor: style.backgroundColor,
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });
};

const expectedColor = (isActive) => isActive ? 'rgb(59, 130, 246)' : 'rgb(153, 153, 153)';

const assertDot = async (locator, { isActive, label }) => {
  const details = await dotDetails(locator);
  assert(details.dataActive === String(isActive), 'Dot data-active does not match exact boolean', details);
  assert(details.role === 'img', 'Dot must expose role=img', details);
  assert(details.ariaLabel === label, 'Dot aria-label mismatch', { expected: label, details });
  assert(details.title === label, 'Dot title mismatch', { expected: label, details });
  assert(details.backgroundColor === expectedColor(isActive), 'Dot computed color mismatch', {
    expected: expectedColor(isActive),
    details,
  });
  assert(!details.className.split(/\s+/).includes('animate-pulse'), 'Binary team dot must not use animate-pulse', details);
  assert(details.animationName === 'none', 'Binary team dot must have no computed animation', details);
  assert(details.width === 8 && details.height === 8, 'Binary team dot must remain compact 8x8px', details);
  assert(details.visibility === 'visible' && details.opacity === '1', 'Binary team dot must be visible', details);
  return details;
};

const runScenario = async (id, description, fn) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    evidence.scenarios[id] = { description, result: 'Pass', startedAt, details };
    return details;
  } catch (error) {
    const failure = {
      id,
      description,
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { description, result: 'Fail', startedAt, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

await fs.mkdir(outputDir, { recursive: true });
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const evidencePath = path.join(outputDir, 'evidence.json');
const initialScreenshotPath = path.join(outputDir, 'mixed-active-inactive.png');
const finalScreenshotPath = path.join(outputDir, 'settled-zh-cn.png');

let nuxtProcess;
let nuxtLog;
let browser;
let page;
let fixtureInstalled = false;
let result = 'Pass';

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');

  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;

  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn(
    'pnpm',
    ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: webDir,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);

  await waitFor('Nuxt fixture route', async () => {
    if (childHasExited(nuxtProcess)) {
      throw new Error(`Nuxt exited before readiness: code=${nuxtProcess.exitCode} signal=${nuxtProcess.signalCode}`);
    }
    const response = await fetch(`${baseUrl}${routePath}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    colorScheme: 'light',
  });
  await context.route('**/rest/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });
  page = await context.newPage();
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

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="team-activity-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => Boolean(window.__teamActivityProbe), null, { timeout: timeoutMs });
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="team-activity-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => Boolean(window.__teamActivityProbe), null, { timeout: timeoutMs });
  evidence.browserEvents = [];
  await page.evaluate(async () => window.__teamActivityProbe.setLocale('en'));
  await page.locator('[data-test="resolved-locale"]').filter({ hasText: 'en' }).waitFor({ timeout: timeoutMs });

  const historyGroup = page.locator('[data-test="history-surface"] [data-test="workspace-team-definition-row-team-def-browser"] [data-test="team-activity-dot"]');
  const historyActiveRun = page.locator('[data-test="history-surface"] [data-test="workspace-team-row-team-run-active-browser"] [data-test="team-activity-dot"]');
  const historyInactiveRun = page.locator('[data-test="history-surface"] [data-test="workspace-team-row-team-run-inactive-browser"] [data-test="team-activity-dot"]');
  const runningDots = page.locator('[data-test="running-surface"] [data-test="team-activity-dot"]');
  const runningGroup = runningDots.nth(0);
  const runningActiveRun = runningDots.nth(1);
  const runningInactiveRun = runningDots.nth(2);

  await runScenario('SR006-BR-001', 'Mixed siblings render exact and any-child binary activity on both production surfaces', async () => {
    assert(await runningDots.count() === 3, 'Running surface must render group plus two exact run dots');
    const details = {
      historyGroup: await assertDot(historyGroup, { isActive: true, label: 'Active team runs' }),
      historyActiveRun: await assertDot(historyActiveRun, { isActive: true, label: 'Active team run' }),
      historyInactiveRun: await assertDot(historyInactiveRun, { isActive: false, label: 'Inactive team run' }),
      runningGroup: await assertDot(runningGroup, { isActive: true, label: 'Active team runs' }),
      runningActiveRun: await assertDot(runningActiveRun, { isActive: true, label: 'Active team run' }),
      runningInactiveRun: await assertDot(runningInactiveRun, { isActive: false, label: 'Inactive team run' }),
    };
    assert(await page.getByRole('img', { name: 'Active team runs' }).count() === 2, 'Both group dots must expose active semantics');
    assert(await page.getByRole('img', { name: 'Active team run', exact: true }).count() === 2, 'Both exact active run dots must expose active semantics');
    assert(await page.getByRole('img', { name: 'Inactive team run', exact: true }).count() === 2, 'Both exact inactive run dots must expose inactive semantics');
    await page.screenshot({ path: initialScreenshotPath, fullPage: true });
    return details;
  });

  await runScenario('SR006-BR-002', 'Collapsed parent activity and exact dots remain independent of member, representative, subscription, and Stop state', async () => {
    await page.locator('[data-test="workspace-team-definition-row-team-def-browser"]').click();
    await page.locator('[data-test="running-surface"] .group-header').click();
    assert(await page.locator('[data-test="workspace-team-row-team-run-active-browser"]').count() === 0, 'History child rows must be collapsed');
    assert(await runningDots.count() === 1, 'Running child rows must be collapsed while the parent dot remains');
    const collapsedBefore = {
      history: await assertDot(historyGroup, { isActive: true, label: 'Active team runs' }),
      running: await assertDot(runningGroup, { isActive: true, label: 'Active team runs' }),
    };

    await page.evaluate(() => window.__teamActivityProbe.varyIndependentFacts());
    await page.evaluate(() => window.__teamActivityProbe.beginStop());
    await page.locator('[data-test="independent-facts"]').filter({ hasText: 'stopPending=true' }).waitFor();
    const pending = {
      history: await assertDot(historyGroup, { isActive: true, label: 'Active team runs' }),
      running: await assertDot(runningGroup, { isActive: true, label: 'Active team runs' }),
    };

    await page.evaluate(() => window.__teamActivityProbe.failStop());
    await page.locator('[data-test="independent-facts"]').filter({ hasText: 'failures=1' }).waitFor();
    const failed = {
      history: await assertDot(historyGroup, { isActive: true, label: 'Active team runs' }),
      running: await assertDot(runningGroup, { isActive: true, label: 'Active team runs' }),
    };

    await page.locator('[data-test="workspace-team-definition-row-team-def-browser"]').click();
    await page.locator('[data-test="running-surface"] .group-header').click();
    assert(await runningDots.count() === 3, 'Running exact rows must return after expansion');
    await assertDot(historyActiveRun, { isActive: true, label: 'Active team run' });
    await assertDot(historyInactiveRun, { isActive: false, label: 'Inactive team run' });
    await assertDot(runningActiveRun, { isActive: true, label: 'Active team run' });
    await assertDot(runningInactiveRun, { isActive: false, label: 'Inactive team run' });

    return {
      collapsedBefore,
      pending,
      failed,
      independentFacts: await page.locator('[data-test="independent-facts"]').textContent(),
    };
  });

  await runScenario('SR006-BR-003', 'Final active-to-inactive transition updates collapsed parents and exact run rows', async () => {
    await page.locator('[data-test="workspace-team-definition-row-team-def-browser"]').click();
    await page.locator('[data-test="running-surface"] .group-header').click();
    await page.evaluate(() => window.__teamActivityProbe.settleActiveRun());
    const collapsedSettled = {
      history: await assertDot(historyGroup, { isActive: false, label: 'No active team runs' }),
      running: await assertDot(runningGroup, { isActive: false, label: 'No active team runs' }),
    };

    await page.locator('[data-test="workspace-team-definition-row-team-def-browser"]').click();
    await page.locator('[data-test="running-surface"] .group-header').click();
    assert(await runningDots.count() === 3, 'Running exact rows must return after settled expansion');
    const expandedSettled = {
      historyFormerActive: await assertDot(historyActiveRun, { isActive: false, label: 'Inactive team run' }),
      historyInactive: await assertDot(historyInactiveRun, { isActive: false, label: 'Inactive team run' }),
      runningFormerActive: await assertDot(runningActiveRun, { isActive: false, label: 'Inactive team run' }),
      runningInactive: await assertDot(runningInactiveRun, { isActive: false, label: 'Inactive team run' }),
    };
    return { collapsedSettled, expandedSettled };
  });

  await runScenario('SR006-BR-004', 'English and Simplified Chinese catalogs provide the accessible binary meaning', async () => {
    await page.evaluate(async () => window.__teamActivityProbe.setLocale('zh-CN'));
    await page.locator('[data-test="resolved-locale"]').filter({ hasText: 'zh-CN' }).waitFor({ timeout: timeoutMs });
    assert(await page.getByRole('img', { name: '无活跃团队运行' }).count() === 2, 'Both group dots must use Simplified Chinese inactive meaning');
    assert(await page.getByRole('img', { name: '非活跃团队运行' }).count() === 4, 'All exact run dots must use Simplified Chinese inactive meaning');
    const details = {
      historyGroup: await assertDot(historyGroup, { isActive: false, label: '无活跃团队运行' }),
      historyFormerActive: await assertDot(historyActiveRun, { isActive: false, label: '非活跃团队运行' }),
      runningGroup: await assertDot(runningGroup, { isActive: false, label: '无活跃团队运行' }),
      runningFormerActive: await assertDot(runningActiveRun, { isActive: false, label: '非活跃团队运行' }),
    };
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });
    return details;
  });

  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  const consoleErrors = evidence.browserEvents.filter((event) => event.type === 'console:error');
  assert(pageErrors.length === 0, 'Browser page errors were observed', pageErrors);
  assert(consoleErrors.length === 0, 'Browser console errors were observed', consoleErrors);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({
      id: 'HARNESS',
      description: 'Run team activity browser probe',
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} finally {
  try {
    await page?.context().close();
    evidence.cleanup.browserContext = page ? 'closed' : 'not-started';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.browserContext = `failed: ${error.message}`;
  }
  try {
    await browser?.close();
    evidence.cleanup.browser = browser ? 'closed' : 'not-started';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.browser = `failed: ${error.message}`;
  }
  try {
    evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess);
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.nuxt = `failed: ${error.message}`;
  }
  try {
    await finishStream(nuxtLog);
    evidence.cleanup.nuxtLog = 'closed';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.nuxtLog = `failed: ${error.message}`;
  }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) {
    result = 'Fail';
    evidence.cleanup.installedFixture = `failed: ${error.message}`;
  }

  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = {
    evidencePath,
    nuxtLogPath,
    initialScreenshotPath,
    finalScreenshotPath,
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result !== 'Pass') {
  process.stderr.write(`Team activity presentation browser probe failed. See ${evidencePath}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Team activity presentation browser probe passed. Evidence: ${evidencePath}\n`);
}
