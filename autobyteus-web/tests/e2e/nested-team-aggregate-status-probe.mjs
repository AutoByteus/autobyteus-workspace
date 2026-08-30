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
const fixturePath = path.join(scriptDir, 'fixtures/nested-team-aggregate-status.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-nested-team-aggregate-status.vue');
const routePath = '/api-e2e-nested-team-aggregate-status';
const nuxiExecutable = path.join(
  webDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'nuxi.cmd' : 'nuxi',
);

const PRODUCT_TEAM_KEY = 'team:aggregate-product-team-run';
const DEEP_TEAM_KEY = 'team:aggregate-deep-team-run';
const TEAM_RUN_ID = 'aggregate-browser-team-run';
const PRODUCT_ROW_SELECTOR = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/product_team"]`;
const DEEP_ROW_SELECTOR = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/product_team/deep_team"]`;
const SIBLING_ROW_SELECTOR = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/sibling_team"]`;
const EMPTY_ROW_SELECTOR = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/empty_team"]`;
const ROOT_AGENT_ROW_SELECTOR = `[data-test="workspace-team-member-${TEAM_RUN_ID}-/root_agent"]`;

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
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/nested-team-aggregate-status'));
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
  requests: [],
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

const errorDetails = (error) => ({
  message: error instanceof Error ? error.message : String(error),
  ...(error?.details !== undefined ? { details: error.details } : {}),
  ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
});

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
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
    if (!(await waitForChildExit(child, 10000))) {
      if (process.platform === 'win32') child.kill('SIGKILL');
      else process.kill(-child.pid, 'SIGKILL');
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

const runScenario = async (id, description, fn) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    evidence.scenarios[id] = { description, result: 'Pass', startedAt, details };
    return details;
  } catch (error) {
    const failure = { id, description, ...errorDetails(error) };
    evidence.scenarios[id] = { description, result: 'Fail', startedAt, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

const statusPresentation = {
  running: { color: 'rgb(59, 130, 246)', pulse: true },
  initializing: { color: 'rgb(245, 158, 11)', pulse: true },
  error: { color: 'rgb(239, 68, 68)', pulse: false },
  idle: { color: 'rgb(34, 197, 94)', pulse: false },
  offline: { color: 'rgb(153, 153, 153)', pulse: false },
};

const dotDetails = async (locator) => {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  return await locator.evaluate((element) => {
    const inner = element.querySelector('[aria-hidden="true"]');
    const statusContainer = element.closest('.member-status');
    const next = statusContainer?.nextElementSibling;
    const stableRow = element.closest('[data-row-kind="stable_member"]');
    const leading = stableRow?.querySelector(
      ':scope > [data-test="workspace-team-member-disclosure"], :scope > span.ml-2[aria-hidden="true"]',
    );
    if (!(inner instanceof HTMLElement) || !(next instanceof HTMLElement)) {
      throw new Error('Aggregate wrapper is missing its solid dot or following configured-Team identity');
    }
    const outerRect = element.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    const leadingRect = leading?.getBoundingClientRect();
    const innerStyle = getComputedStyle(inner);
    const outerStyle = getComputedStyle(element);
    return {
      status: element.getAttribute('data-status'),
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      title: element.getAttribute('title'),
      tabindex: element.getAttribute('tabindex'),
      tagName: element.tagName.toLowerCase(),
      interactiveDescendants: element.querySelectorAll('button, a, input, select, textarea, [tabindex]').length,
      outerClass: element.getAttribute('class') || '',
      innerClass: inner.getAttribute('class') || '',
      backgroundColor: innerStyle.backgroundColor,
      animationName: innerStyle.animationName,
      outerDisplay: outerStyle.display,
      outerWidth: Math.round(outerRect.width),
      outerHeight: Math.round(outerRect.height),
      innerWidth: Math.round(innerRect.width),
      innerHeight: Math.round(innerRect.height),
      identityKind: next.getAttribute('data-team-icon'),
      identityWidth: Math.round(nextRect.width),
      identityHeight: Math.round(nextRect.height),
      gapToIdentity: Math.round(nextRect.left - outerRect.right),
      leadingDataTest: leading?.getAttribute('data-test') || null,
      leadingAriaHidden: leading?.getAttribute('aria-hidden') || null,
      afterLeading: leadingRect ? outerRect.left >= leadingRect.right : false,
      beforeIdentity: outerRect.right <= nextRect.left,
    };
  });
};

const assertDot = async (locator, { status, label, placement = false }) => {
  assert(await locator.count() === 1, 'Expected exactly one aggregate indicator', {
    status,
    count: await locator.count(),
  });
  const details = await dotDetails(locator);
  const expected = statusPresentation[status];
  assert(expected, `No expected presentation registered for status '${status}'`);
  assert(details.status === status, 'Aggregate data-status mismatch', { expected: status, details });
  assert(details.role === 'img', 'Aggregate must expose role=img', details);
  assert(details.ariaLabel === label, 'Aggregate aria-label mismatch', { expected: label, details });
  assert(details.title === label, 'Aggregate title mismatch', { expected: label, details });
  assert(details.tabindex === null, 'Aggregate must not add a tab stop', details);
  assert(details.tagName === 'span' && details.interactiveDescendants === 0, 'Aggregate must remain non-interactive', details);
  assert(details.backgroundColor === expected.color, 'Aggregate computed color mismatch', { expected, details });
  assert(details.innerClass.split(/\s+/).includes('animate-pulse') === expected.pulse, 'Aggregate pulse class mismatch', {
    expected,
    details,
  });
  assert((details.animationName !== 'none') === expected.pulse, 'Aggregate computed animation mismatch', {
    expected,
    details,
  });
  assert(details.outerWidth === 8 && details.outerHeight === 8, 'Aggregate wrapper must remain 8x8px', details);
  assert(details.innerWidth === 8 && details.innerHeight === 8, 'Aggregate solid dot must remain 8x8px', details);
  if (placement) {
    assert(details.leadingDataTest === 'workspace-team-member-disclosure' || details.leadingAriaHidden === 'true',
      'Aggregate must follow a disclosure control or alignment spacer', details);
    assert(details.afterLeading && details.beforeIdentity,
      'Aggregate must remain between disclosure/spacer and configured-Team identity', details);
    assert(details.identityKind === 'user-group-solid'
      && details.identityWidth === 16 && details.identityHeight === 16,
    'Configured Team must use the approved 16px filled User group identity', details);
    assert(details.gapToIdentity >= 5 && details.gapToIdentity <= 7,
      'Aggregate-to-Team-identity gap must preserve the 6px token', details);
  }
  return details;
};

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const expandedScreenshotPath = path.join(outputDir, 'expanded-running.png');
const collapsedScreenshotPath = path.join(outputDir, 'collapsed-live-idle.png');
const localizedScreenshotPath = path.join(outputDir, 'localized-zh-cn.png');

let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
let fixtureInstalled = false;
let executionError;
let nuxtSpawnError;

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  assert(existsSync(nuxiExecutable), `Nuxt CLI does not exist: ${nuxiExecutable}`);

  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;

  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn(
    nuxiExecutable,
    ['dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: webDir,
      detached: process.platform !== 'win32',
      env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  nuxtProcess.on('error', (error) => { nuxtSpawnError = error; });
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);

  await waitFor('Nuxt fixture route', async () => {
    if (nuxtSpawnError) throw nuxtSpawnError;
    if (childHasExited(nuxtProcess)) {
      throw new Error(`Nuxt exited before readiness: code=${nuxtProcess.exitCode} signal=${nuxtProcess.signalCode}`);
    }
    const response = await fetch(`${baseUrl}${routePath}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext({
    viewport: { width: 960, height: 900 },
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
  page.on('request', (request) => {
    evidence.requests.push({
      at: new Date().toISOString(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });
  page.on('requestfailed', (request) => {
    evidence.browserEvents.push({
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    });
  });

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="nested-team-aggregate-status-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => Boolean(window.__nestedTeamAggregateStatusProbe), null, { timeout: timeoutMs });
  await page.evaluate(async () => window.__nestedTeamAggregateStatusProbe.setLocale('en'));
  await page.locator('[data-test="resolved-locale"]').filter({ hasText: 'en' }).waitFor({ timeout: timeoutMs });
  await page.waitForTimeout(500);
  evidence.browserEvents = [];
  evidence.requests = [];

  const productRow = page.locator(PRODUCT_ROW_SELECTOR);
  const productDot = productRow.locator('[data-test="nested-team-aggregate-status-dot"]');
  const siblingRow = page.locator(SIBLING_ROW_SELECTOR);
  const siblingDot = siblingRow.locator('[data-test="nested-team-aggregate-status-dot"]');
  const emptyRow = page.locator(EMPTY_ROW_SELECTOR);
  const emptyDot = emptyRow.locator('[data-test="nested-team-aggregate-status-dot"]');

  await runScenario(
    'NTAS-BR-001',
    'All five aggregate states render with the approved visual, accessibility, placement, one-dot, and route-exclusion behavior',
    async () => {
      const cases = [
        {
          expected: 'running',
          label: 'Team status: Running',
          input: { direct: 'idle', deep: 'error', task: 'running', sibling: 'offline' },
        },
        {
          expected: 'initializing',
          label: 'Team status: Initializing',
          input: { direct: 'error', deep: 'idle', task: 'initializing', sibling: 'offline' },
        },
        {
          expected: 'error',
          label: 'Team status: Error',
          input: { direct: 'error', deep: 'idle', task: 'offline', sibling: 'offline' },
        },
        {
          expected: 'idle',
          label: 'Team status: Idle',
          input: { direct: 'idle', deep: 'offline', task: 'unexpected', sibling: 'offline' },
        },
        {
          expected: 'offline',
          label: 'Team status: Offline',
          input: { direct: 'offline', deep: 'offline', task: null, sibling: 'offline' },
        },
      ];
      const presentations = {};
      for (const testCase of cases) {
        await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), testCase.input);
        await waitFor(`product aggregate ${testCase.expected}`, async () =>
          await productDot.getAttribute('data-status') === testCase.expected);
        presentations[testCase.expected] = await assertDot(productDot, {
          status: testCase.expected,
          label: testCase.label,
          placement: true,
        });
      }

      await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), cases[0].input);
      await waitFor('product aggregate running for layout screenshot', async () =>
        await productDot.getAttribute('data-status') === 'running');
      assert(await productRow.locator('[data-test="nested-team-aggregate-status-dot"]').count() === 1,
        'Stable nested Team row must render exactly one aggregate dot');
      assert(await page.locator(DEEP_ROW_SELECTOR).count() === 0, 'Collapsed Product Team must hide its descendants');
      await assertDot(emptyDot, { status: 'offline', label: 'Team status: Offline', placement: true });

      const definitionRow = page.locator('[data-test="workspace-team-definition-row-aggregate-browser-team-definition"]');
      const teamRunRow = page.locator(`[data-test="workspace-team-row-${TEAM_RUN_ID}"]`);
      const rootAgentRow = page.locator(ROOT_AGENT_ROW_SELECTOR);
      const transientTaskTeam = page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]');
      assert(await definitionRow.locator('[data-test="team-activity-dot"]').count() === 1,
        'Team-definition row must retain its binary activity dot');
      assert(await definitionRow.locator('[data-test="nested-team-aggregate-status-dot"]').count() === 0,
        'Team-definition row must not receive an aggregate dot');
      assert(await teamRunRow.locator('[data-test="team-activity-dot"]').count() === 1,
        'Root TeamRun row must retain its binary activity dot');
      assert(await teamRunRow.locator('[data-test="nested-team-aggregate-status-dot"]').count() === 0,
        'Root TeamRun row must not receive an aggregate dot');
      assert(await rootAgentRow.locator('[data-test="nested-team-aggregate-status-dot"]').count() === 0,
        'Stable Agent row must not receive an aggregate dot');
      assert(await rootAgentRow.locator('[aria-hidden="true"].h-2.w-2').count() === 1,
        'Stable Agent row must retain its exact solid Agent dot');
      assert(await transientTaskTeam.count() === 1, 'Transient task-Team row must remain present');
      assert(await transientTaskTeam.locator('[data-test="nested-team-aggregate-status-dot"]').count() === 0,
        'Transient task-Team row must not receive an aggregate dot');

      await page.evaluate((key) => window.__nestedTeamAggregateStatusProbe.setExpanded(key, true), PRODUCT_TEAM_KEY);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'visible', timeout: timeoutMs });
      await assertDot(productDot, {
        status: 'running',
        label: 'Team status: Running',
        placement: true,
      });
      await page.screenshot({ path: expandedScreenshotPath, fullPage: true });
      return {
        presentations,
        visibleAggregateCount: await page.locator('[data-test="nested-team-aggregate-status-dot"]').count(),
        binaryActivityCount: await page.locator('[data-test="team-activity-dot"]').count(),
        screenshot: expandedScreenshotPath,
      };
    },
  );

  await runScenario(
    'NTAS-BR-002',
    'Recursive/task scope, sibling isolation, and collapsed live patching use the current projection without navigation, reload, duplicate dots, or an aggregate request',
    async () => {
      await page.evaluate(({ productKey, deepKey }) => {
        window.__nestedTeamAggregateStatusProbe.setExpanded(productKey, false);
        window.__nestedTeamAggregateStatusProbe.setExpanded(deepKey, false);
      }, { productKey: PRODUCT_TEAM_KEY, deepKey: DEEP_TEAM_KEY });
      await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), {
        direct: 'offline', deep: 'offline', task: 'initializing', sibling: 'running',
      });
      await waitFor('collapsed Product Team initializing from task child', async () =>
        await productDot.getAttribute('data-status') === 'initializing');
      await assertDot(productDot, { status: 'initializing', label: 'Team status: Initializing' });
      await assertDot(siblingDot, { status: 'running', label: 'Team status: Running' });
      assert(await page.locator(DEEP_ROW_SELECTOR).count() === 0,
        'Collapsed Product Team must hide the deep configured Team row');

      await page.evaluate((key) => window.__nestedTeamAggregateStatusProbe.setExpanded(key, true), PRODUCT_TEAM_KEY);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'visible', timeout: timeoutMs });
      const deepDot = page.locator(DEEP_ROW_SELECTOR).locator('[data-test="nested-team-aggregate-status-dot"]');
      await assertDot(deepDot, { status: 'initializing', label: 'Team status: Initializing', placement: true });
      assert(await page.locator('[data-member-address="/product_team/deep_team/task_worker"]').count() === 0,
        'Collapsed deep Team must hide its task-scoped Agent while its aggregate remains current');
      await assertDot(productDot, { status: 'initializing', label: 'Team status: Initializing' });

      await page.evaluate((key) => window.__nestedTeamAggregateStatusProbe.setExpanded(key, false), PRODUCT_TEAM_KEY);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'detached', timeout: timeoutMs });
      await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), {
        direct: 'idle', deep: 'error', task: 'running', sibling: 'offline',
      });
      await waitFor('collapsed Product Team running before live patch', async () =>
        await productDot.getAttribute('data-status') === 'running');
      await page.waitForTimeout(300);

      const requestStart = evidence.requests.length;
      const urlBefore = page.url();
      const livePatch = { direct: 'idle', deep: 'offline', task: 'offline', sibling: 'running' };
      await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), livePatch);
      await waitFor('collapsed Product Team idle after live patch', async () =>
        await productDot.getAttribute('data-status') === 'idle');
      await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), livePatch);
      await page.waitForTimeout(500);
      const patchRequests = evidence.requests.slice(requestStart);
      const relevantPatchRequests = patchRequests.filter((request) =>
        ['fetch', 'xhr', 'document'].includes(request.resourceType)
        && !request.url.endsWith('/rest/health'));
      assert(relevantPatchRequests.length === 0,
        'Aggregate status patch must not trigger an API request, poll, or navigation', {
          patchRequests,
          relevantPatchRequests,
        });
      assert(page.url() === urlBefore, 'Aggregate live patch must not navigate or reload', {
        urlBefore,
        urlAfter: page.url(),
      });
      assert(await productRow.locator('[data-test="nested-team-aggregate-status-dot"]').count() === 1,
        'Repeated no-op projection must not duplicate the aggregate dot');
      assert(await page.locator(DEEP_ROW_SELECTOR).count() === 0,
        'Live patch must not expand the collapsed Product Team');
      const idleDetails = await assertDot(productDot, { status: 'idle', label: 'Team status: Idle' });
      await page.screenshot({ path: collapsedScreenshotPath, fullPage: true });
      return {
        recursiveProductStatus: 'initializing',
        recursiveDeepStatus: 'initializing',
        isolatedSiblingStatus: 'running',
        collapsedLiveStatus: idleDetails,
        patchRequests,
        relevantPatchRequests,
        screenshot: collapsedScreenshotPath,
      };
    },
  );

  await runScenario(
    'NTAS-BR-003',
    'Aggregate click and Team-row keyboard/disclosure input execute the existing toggle exactly once while localized Simplified Chinese copy remains accessible',
    async () => {
      await page.evaluate(async ({ productKey }) => {
        await window.__nestedTeamAggregateStatusProbe.setLocale('en');
        window.__nestedTeamAggregateStatusProbe.setExpanded(productKey, false);
        window.__nestedTeamAggregateStatusProbe.resetCounters();
        window.__nestedTeamAggregateStatusProbe.setStatuses({
          direct: 'idle', deep: 'offline', task: 'running', sibling: 'offline',
        });
      }, { productKey: PRODUCT_TEAM_KEY });
      await page.locator('[data-test="resolved-locale"]').filter({ hasText: 'en' }).waitFor({ timeout: timeoutMs });
      await waitFor('English running aggregate before interaction', async () =>
        await productDot.getAttribute('aria-label') === 'Team status: Running');
      const nonInteractive = await assertDot(productDot, { status: 'running', label: 'Team status: Running' });

      await productDot.click();
      let counters = await page.evaluate(() => window.__nestedTeamAggregateStatusProbe.getCounters());
      assert(counters.toggles === 1 && counters.memberSelections === 0,
        'Clicking the informational dot must bubble to the existing Team row exactly once', counters);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'visible', timeout: timeoutMs });

      await productRow.locator('[data-test="workspace-team-member-disclosure"]').click();
      counters = await page.evaluate(() => window.__nestedTeamAggregateStatusProbe.getCounters());
      assert(counters.toggles === 2 && counters.memberSelections === 0,
        'Disclosure click must toggle exactly once without selecting a Team container', counters);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'detached', timeout: timeoutMs });

      await productRow.focus();
      await productRow.press('Enter');
      counters = await page.evaluate(() => window.__nestedTeamAggregateStatusProbe.getCounters());
      assert(counters.toggles === 3 && counters.memberSelections === 0,
        'Enter on the Team row must toggle exactly once', counters);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'visible', timeout: timeoutMs });

      await productRow.press('Space');
      counters = await page.evaluate(() => window.__nestedTeamAggregateStatusProbe.getCounters());
      assert(counters.toggles === 4 && counters.memberSelections === 0,
        'Space on the Team row must toggle exactly once', counters);
      await page.locator(DEEP_ROW_SELECTOR).waitFor({ state: 'detached', timeout: timeoutMs });

      const teamRunRow = page.locator(`[data-test="workspace-team-row-${TEAM_RUN_ID}"]`);
      await teamRunRow.click();
      counters = await page.evaluate(() => window.__nestedTeamAggregateStatusProbe.getCounters());
      assert(counters.teamSelections === 1, 'Root TeamRun selection must remain exactly-once and independent', counters);
      const rootActivity = teamRunRow.locator('[data-test="team-activity-dot"]');
      assert(await rootActivity.getAttribute('data-active') === 'true',
        'Root TeamRun binary activity must remain authoritative and unchanged');

      await page.evaluate(async () => window.__nestedTeamAggregateStatusProbe.setLocale('zh-CN'));
      await page.locator('[data-test="resolved-locale"]').filter({ hasText: 'zh-CN' }).waitFor({ timeout: timeoutMs });
      const localizedCases = [
        { status: 'running', label: '团队状态：运行中', input: { direct: 'offline', deep: 'offline', task: 'running', sibling: 'offline' } },
        { status: 'initializing', label: '团队状态：正在初始化', input: { direct: 'offline', deep: 'offline', task: 'initializing', sibling: 'offline' } },
        { status: 'error', label: '团队状态：错误', input: { direct: 'error', deep: 'offline', task: 'offline', sibling: 'offline' } },
        { status: 'idle', label: '团队状态：空闲', input: { direct: 'idle', deep: 'offline', task: 'offline', sibling: 'offline' } },
        { status: 'offline', label: '团队状态：离线', input: { direct: 'offline', deep: 'offline', task: 'unexpected', sibling: 'offline' } },
      ];
      const localized = {};
      for (const testCase of localizedCases) {
        await page.evaluate((input) => window.__nestedTeamAggregateStatusProbe.setStatuses(input), testCase.input);
        await waitFor(`Simplified Chinese ${testCase.status} label`, async () =>
          await productDot.getAttribute('aria-label') === testCase.label);
        localized[testCase.status] = await assertDot(productDot, {
          status: testCase.status,
          label: testCase.label,
        });
      }
      await page.screenshot({ path: localizedScreenshotPath, fullPage: true });
      return {
        nonInteractive,
        counters,
        localized,
        screenshot: localizedScreenshotPath,
      };
    },
  );

  await runScenario(
    'NTAS-BR-004',
    'Browser execution completes without console errors, page errors, or failed requests',
    async () => {
      const unexpectedEvents = evidence.browserEvents.filter((event) =>
        event.type === 'console:error' || event.type === 'pageerror' || event.type === 'requestfailed');
      assert(unexpectedEvents.length === 0, 'Unexpected browser runtime errors occurred', unexpectedEvents);
      return {
        browserEventCount: evidence.browserEvents.length,
        unexpectedEvents,
        observedRequestCount: evidence.requests.length,
      };
    },
  );
} catch (error) {
  executionError = error;
  if (!evidence.failures.some((failure) => failure.message === errorDetails(error).message)) {
    evidence.failures.push({ id: 'PROBE', ...errorDetails(error) });
  }
} finally {
  if (page) await page.close().catch((error) => { evidence.cleanup.page = errorDetails(error); });
  if (context) await context.close().catch((error) => { evidence.cleanup.context = errorDetails(error); });
  if (browser) await browser.close().catch((error) => { evidence.cleanup.browser = errorDetails(error); });
  try {
    evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess);
  } catch (error) {
    evidence.cleanup.nuxt = { status: 'failed', ...errorDetails(error) };
    executionError ||= error;
  }
  await finishStream(nuxtLog).catch((error) => { evidence.cleanup.nuxtLog = errorDetails(error); });
  if (fixtureInstalled) {
    try {
      await fs.rm(installedPagePath, { force: true });
      evidence.cleanup.fixture = { status: 'removed', path: installedPagePath };
    } catch (error) {
      evidence.cleanup.fixture = { status: 'failed', path: installedPagePath, ...errorDetails(error) };
      executionError ||= error;
    }
  } else {
    evidence.cleanup.fixture = { status: 'not-installed', path: installedPagePath };
  }
  evidence.finishedAt = new Date().toISOString();
  evidence.result = executionError ? 'Fail' : 'Pass';
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (executionError) {
  process.stderr.write(`${executionError.stack || executionError.message || String(executionError)}\n`);
  process.stderr.write(`Evidence: ${evidencePath}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Nested Team aggregate status browser probe passed. Evidence: ${evidencePath}\n`);
}
