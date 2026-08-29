#!/usr/bin/env node
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seedTokenStatisticsFixture } from './token-statistics-seed.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const workspaceDir = path.resolve(webDir, '..');
const serverDir = path.join(workspaceDir, 'autobyteus-server-ts');

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1];
  return fallback;
};
const hasFlag = (name) => process.argv.includes(`--${name}`);
const timeoutMs = Number(getArg('timeout-ms', '120000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/token-statistics-ui'));
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));
const skipServerBuild = hasFlag('skip-server-build');

const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  workspaceDir,
  webDir,
  serverDir,
  scenarios: {},
  graphql: { requests: [], responses: [] },
  browserEvents: [],
  sourceBoundary: {},
  fixture: null,
  cleanup: {},
  failures: [],
};

const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const waitFor = async (description, fn, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
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
const runCommand = (command, args, { cwd, env, logPath }) => new Promise((resolve, reject) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('error', reject);
  child.once('close', (code, signal) => {
    log.end();
    if (code === 0) resolve({ code, signal });
    else reject(new Error(`${command} ${args.join(' ')} exited code=${code} signal=${signal}`));
  });
});
const startService = (command, args, { cwd, env, logPath }) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(command, args, {
    cwd,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('close', () => log.end());
  return child;
};
const stopOwned = async (child) => {
  if (!child) return { status: 'not-started' };
  if (!childExited(child)) {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('close', resolve)), sleep(8_000)]);
  }
  if (!childExited(child)) {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
    await Promise.race([new Promise((resolve) => child.once('close', resolve)), sleep(5_000)]);
  }
  assert(childExited(child), 'Owned process did not terminate', { pid: child.pid });
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};

const fetchOk = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return response.ok;
  } catch {
    return false;
  }
};
const operationPayloads = (request) => {
  try {
    const body = request.postDataJSON();
    return (Array.isArray(body) ? body : [body]).filter((entry) => entry?.operationName);
  } catch {
    return [];
  }
};
const attachPageEvidence = (page, label) => {
  page.on('request', (request) => {
    if (!request.url().includes('/graphql')) return;
    for (const payload of operationPayloads(request)) {
      evidence.graphql.requests.push({ label, operationName: payload.operationName, variables: payload.variables, url: request.url(), at: new Date().toISOString() });
    }
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/graphql')) return;
    const payloads = operationPayloads(response.request());
    let body = null;
    try { body = await response.json(); } catch { /* non-JSON failure evidence */ }
    for (const payload of payloads) {
      const responseBody = Array.isArray(body) ? body.shift() : body;
      evidence.graphql.responses.push({
        label,
        operationName: payload.operationName,
        status: response.status(),
        errors: responseBody?.errors?.map((error) => error.message) ?? [],
        data: responseBody?.data ?? null,
      });
    }
  });
  page.on('console', (message) => evidence.browserEvents.push({ label, type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ label, type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || '';
    if (request.url().includes('/graphql') || !errorText.includes('ERR_ABORTED')) {
      evidence.browserEvents.push({ label, type: 'requestfailed', text: `${request.method()} ${request.url()} ${errorText}` });
    }
  });
  page.on('download', (download) => evidence.browserEvents.push({ label, type: 'download', text: download.suggestedFilename() }));
};
const operationCount = (name) => evidence.graphql.requests.filter((entry) => entry.operationName === name).length;
const operationResponseCount = (name) => evidence.graphql.responses.filter((entry) => entry.operationName === name).length;
const latestAnalyticsResponse = () => evidence.graphql.responses.findLast((entry) => entry.operationName === 'GetTokenUsageAnalytics' && entry.data?.tokenUsageAnalytics)?.data.tokenUsageAnalytics;
const waitOperationCount = (name, count) => waitFor(`${name} request count ${count}`, () => operationCount(name) === count);
const waitOperationResponseCount = (name, count) => waitFor(`${name} response count ${count}`, () => operationResponseCount(name) === count);
const bodyText = (page) => page.locator('body').innerText();
const integerFromText = (text) => Number(text.replace(/[^0-9-]/g, ''));

const initTracking = async (context, locale) => {
  await context.addInitScript((selectedLocale) => {
    localStorage.setItem('autobyteus.localization.preference-mode', selectedLocale);
    const state = window.__tokenStatisticsE2E = { blobCount: 0, objectUrlCount: 0, downloadClickCount: 0 };
    const NativeBlob = window.Blob;
    window.Blob = class TrackingBlob extends NativeBlob {
      constructor(...args) {
        super(...args);
        state.blobCount += 1;
      }
    };
    const nativeCreateObjectURL = URL.createObjectURL?.bind(URL);
    if (nativeCreateObjectURL) URL.createObjectURL = (...args) => {
      state.objectUrlCount += 1;
      return nativeCreateObjectURL(...args);
    };
    const nativeAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function trackedAnchorClick(...args) {
      if (this.download) state.downloadClickCount += 1;
      return nativeAnchorClick.apply(this, args);
    };
  }, locale);
};
const gotoAnalytics = async (page, baseUrl) => {
  const before = operationCount('GetTokenUsageAnalytics');
  await page.goto(`${baseUrl}/settings?section=token-usage`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitOperationCount('GetTokenUsageAnalytics', before + 1);
  await page.locator('[data-summary-id="total"]').waitFor({ state: 'visible', timeout: timeoutMs });
};
const filterPanel = (page) => page.locator('#token-usage-filter-panel');
const filterButton = (page) => page.locator('button[aria-controls="token-usage-filter-panel"]');
const openFilters = async (page) => {
  if (!(await filterPanel(page).isVisible().catch(() => false))) await filterButton(page).click();
  await filterPanel(page).waitFor({ state: 'visible' });
};
const applyProvider = async (page, label, { allowErrors = false } = {}) => {
  const before = operationCount('GetTokenUsageAnalytics');
  const responsesBefore = operationResponseCount('GetTokenUsageAnalytics');
  await openFilters(page);
  await filterPanel(page).locator('select').nth(1).selectOption({ label });
  await page.getByRole('button', { name: 'Apply Filters' }).click();
  await waitOperationCount('GetTokenUsageAnalytics', before + 1);
  await waitOperationResponseCount('GetTokenUsageAnalytics', responsesBefore + 1);
  const response = evidence.graphql.responses.filter((entry) => entry.operationName === 'GetTokenUsageAnalytics').at(-1);
  if (response?.errors.length && !allowErrors) {
    assert(false, `Provider filter '${label}' returned GraphQL errors`, response.errors);
  }
  if (!response?.errors.length) await page.locator('[data-summary-id="total"]').waitFor({ state: 'visible' });
  return response;
};
const clearAppliedFilters = async (page) => {
  const before = operationCount('GetTokenUsageAnalytics');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await waitOperationCount('GetTokenUsageAnalytics', before + 1);
  await page.locator('[data-summary-id="total"]').waitFor({ state: 'visible' });
};
const cardValue = async (page, id) => (await page.locator(`[data-summary-id="${id}"] p`).nth(1).innerText()).trim();
const selectRange = async (page, name, expectRequest = true) => {
  const before = operationCount('GetTokenUsageAnalytics');
  await page.getByRole('button', { name: /UTC range/i }).click();
  await page.getByRole('menuitem', { name }).click();
  if (expectRequest) await waitOperationCount('GetTokenUsageAnalytics', before + 1);
};

const scanSourceBoundary = async () => {
  const removed = [
    path.join(webDir, 'utils/tokenUsageAnalyticsCsv.ts'),
    path.join(webDir, 'utils/__tests__/tokenUsageAnalyticsCsv.spec.ts'),
    path.join(webDir, 'components/settings/token-usage/analytics/TokenUsagePaceChart.vue'),
    path.join(webDir, 'components/settings/token-usage/analytics/TokenUsageExactBreakdownTable.vue'),
  ];
  for (const candidate of removed) assert(!existsSync(candidate), `Obsolete path remains: ${candidate}`);
  const files = [
    path.join(webDir, 'components/settings/token-usage/analytics/TokenUsageAnalyticsControls.vue'),
    path.join(webDir, 'components/settings/token-usage/analytics/TokenUsageAnalyticsView.vue'),
    path.join(webDir, 'components/settings/token-usage/analytics/TokenUsageTrendChart.vue'),
  ];
  const combined = (await Promise.all(files.map((file) => fs.readFile(file, 'utf8')))).join('\n');
  const forbidden = ['downloadTokenUsageAnalyticsCsv', 'serializeTokenUsageAnalyticsCsv', 'URL.createObjectURL', 'new Blob(', 'TokenUsagePaceChart', 'TokenUsageExactBreakdownTable'];
  const found = forbidden.filter((pattern) => combined.includes(pattern));
  assert(found.length === 0, 'Removed production boundary is still referenced', found);
  evidence.sourceBoundary = { removedPathsAbsent: removed, scannedFiles: files, forbiddenPatternsAbsent: forbidden };
};

let backend;
let frontend;
let browser;
let ownedRoot;
let result = 'Fail';

await fs.mkdir(outputDir, { recursive: true });
try {
  await scanSourceBoundary();
  const buildLog = path.join(outputDir, 'server-build.log');
  if (!skipServerBuild) await runCommand('corepack', ['pnpm', '-C', serverDir, 'build'], { cwd: workspaceDir, env: process.env, logPath: buildLog });
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Built server entry is missing; run without --skip-server-build');

  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-token-statistics-e2e-'));
  const dataRoot = path.join(ownedRoot, 'server-data');
  const databasePath = path.join(dataRoot, 'db', 'token-statistics-e2e.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const databaseUrl = pathToFileURL(databasePath).href;
  const [backendPort, frontendPort] = await Promise.all([choosePort(), choosePort()]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const serverEnvironment = {
    ...process.env,
    APP_ENV: 'development',
    DB_TYPE: 'sqlite',
    DATABASE_URL: databaseUrl,
    AUTOBYTEUS_SERVER_HOST: backendUrl,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    DISABLE_HTTP_REQUEST_LOGS: 'false',
  };
  await fs.mkdir(path.join(dataRoot, 'logs'), { recursive: true });
  await fs.mkdir(path.join(dataRoot, 'memory'), { recursive: true });
  await fs.mkdir(path.join(dataRoot, 'temp_workspace'), { recursive: true });
  await fs.writeFile(path.join(dataRoot, '.env'), [
    'APP_ENV=development',
    'DB_TYPE=sqlite',
    `DATABASE_URL=${databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${backendUrl}`,
    'DISABLE_HTTP_REQUEST_LOGS=false',
  ].join('\n') + '\n');
  await runCommand('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], {
    cwd: workspaceDir,
    env: serverEnvironment,
    logPath: path.join(outputDir, 'database-migrate.log'),
  });
  evidence.fixture = await seedTokenStatisticsFixture({ serverDir, databaseUrl, now: new Date() });

  backend = startService(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], {
    cwd: serverDir,
    env: serverEnvironment,
    logPath: path.join(outputDir, 'backend.log'),
  });
  await waitFor('backend health', () => {
    if (childExited(backend)) throw new Error(`backend exited ${backend.exitCode}/${backend.signalCode}`);
    return fetchOk(`${backendUrl}/rest/health`);
  });
  frontend = startService('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webDir,
    env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl },
    logPath: path.join(outputDir, 'frontend.log'),
  });
  await waitFor('frontend readiness', () => {
    if (childExited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}/${frontend.signalCode}`);
    return fetchOk(`${frontendUrl}/settings?section=token-usage`);
  });

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  await initTracking(context, 'en');
  const page = await context.newPage();
  attachPageEvidence(page, 'desktop-en');
  await gotoAnalytics(page, frontendUrl);

  evidence.scenarios['TS-E2E-001-default-and-chart'] = await (async () => {
    const labels = await page.locator('[data-summary-id]').evaluateAll((nodes) => nodes.map((node) => node.querySelector('p')?.textContent?.trim()));
    assert(JSON.stringify(labels) === JSON.stringify(['Total tokens', 'Uncached input', 'Cached input', 'Output', 'Estimated API cost', 'Cache hit rate']), 'Summary labels/order mismatch', labels);
    const widths = await page.locator('[data-summary-id]').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
    assert(Math.max(...widths) - Math.min(...widths) < 0.5, 'Desktop summary peers are not equal width', widths);
    const points = await page.locator('[data-point-marker]').count();
    const paths = await page.locator('path[data-series="daily"]').count();
    const guides = await page.locator('[data-guide="midpoint"]').count();
    const bucketRows = await page.locator('details table tbody tr').count();
    const chartLabel = await page.locator('[data-testid="daily-line-chart"]').getAttribute('aria-label');
    const plot = await page.locator('.line-plot').evaluate((element) => {
      const style = getComputedStyle(element);
      return { x: element.dataset.axisX, y: element.dataset.axisY, borderTopWidth: style.borderTopWidth, borderLeftWidth: style.borderLeftWidth, borderBottomWidth: style.borderBottomWidth };
    });
    assert(points === evidence.fixture.dayOfMonth, 'Current-month marker count must match every chronological bucket', { points, expected: evidence.fixture.dayOfMonth });
    assert(paths === 1 && guides === 1, 'Token chart must have one line and one midpoint guide', { paths, guides });
    assert(bucketRows === evidence.fixture.dayOfMonth, 'Exact bucket rows must cover the complete series', { bucketRows });
    assert((chartLabel.match(/;/g) ?? []).length + 1 === evidence.fixture.dayOfMonth, 'Accessible chart name must contain every bucket', chartLabel);
    assert(plot.x === 'true' && plot.y === 'true' && plot.borderTopWidth === '0px' && Number.parseFloat(plot.borderLeftWidth) > 0 && Number.parseFloat(plot.borderBottomWidth) > 0, 'Chart axes/open top mismatch', plot);
    const forbiddenText = ['Export CSV', 'Dominant driver', 'Usage drivers', 'Input/Output ratio', 'No comparable data', 'Prior period'];
    const text = await bodyText(page);
    assert(forbiddenText.every((value) => !text.includes(value)), 'Forbidden presentation remains visible', forbiddenText.filter((value) => text.includes(value)));
    await page.screenshot({ path: path.join(outputDir, 'analytics-desktop.png'), fullPage: true });
    return { labels, widths, points, paths, guides, bucketRows, chartLabelLength: chartLabel.length, plot };
  })();

  evidence.scenarios['TS-E2E-001-request-coherence'] = await (async () => {
    const initial = operationCount('GetTokenUsageAnalytics');
    await page.getByRole('radio', { name: 'Cost' }).click();
    await page.locator('[data-testid="detailed-usage-section"] select').selectOption('PROVIDER');
    await page.locator('[data-testid="detailed-usage-section"] button').first().click();
    assert(operationCount('GetTokenUsageAnalytics') === initial, 'Metric/grouping/disclosure changed the analytics request count');

    await openFilters(page);
    const draftRuntime = filterPanel(page).locator('select').first();
    await draftRuntime.selectOption('autobyteus');
    await draftRuntime.focus();
    await page.keyboard.press('Escape');
    await filterPanel(page).waitFor({ state: 'hidden' });
    assert(await filterButton(page).evaluate((element) => document.activeElement === element), 'Escape did not restore focus to Filters');
    assert(operationCount('GetTokenUsageAnalytics') === initial, 'Draft/Escape caused a request');
    await openFilters(page);
    const reopenedDraft = await filterPanel(page).locator('select').first().inputValue();
    assert(['', 'null', 'All runtimes'].includes(reopenedDraft), 'Escaped draft leaked into the next filter session', reopenedDraft);
    await page.keyboard.press('Escape');

    await selectRange(page, 'Last month');
    await page.getByText('This range is before analytics tracking began.').waitFor({ state: 'visible' });
    await selectRange(page, 'This month');
    await page.locator('[data-summary-id="total"]').waitFor({ state: 'visible' });
    await selectRange(page, 'Custom', false);
    assert(operationCount('GetTokenUsageAnalytics') === initial + 2, 'Selecting Custom before Apply must not request');
    const custom = page.locator('section').filter({ has: page.getByRole('button', { name: 'Apply', exact: true }) }).last();
    await custom.locator('input[type="date"]').nth(0).fill(evidence.fixture.coverageStart.slice(0, 10));
    await custom.locator('input[type="date"]').nth(1).fill(evidence.fixture.now.slice(0, 10));
    const beforeCustom = operationCount('GetTokenUsageAnalytics');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await waitOperationCount('GetTokenUsageAnalytics', beforeCustom + 1);
    await page.getByText('Full coverage', { exact: true }).waitFor({ state: 'visible' });
    const variables = evidence.graphql.requests.findLast((entry) => entry.operationName === 'GetTokenUsageAnalytics').variables.input;
    assert(variables.rangePreset === 'CUSTOM' && variables.startTime.endsWith('T00:00:00.000Z') && variables.endTimeExclusive.endsWith('T00:00:00.000Z'), 'Custom UTC variables are incoherent', variables);
    await selectRange(page, 'This month');
    await page.getByText('Partial coverage', { exact: true }).waitFor({ state: 'visible' });
    return { initial, final: operationCount('GetTokenUsageAnalytics'), customVariables: variables };
  })();

  evidence.scenarios['TS-E2E-002-truth-matrix-and-gaps'] = await (async () => {
    await applyProvider(page, 'OpenAI E2E');
    const positiveCache = await cardValue(page, 'cache-rate');
    const beforeMetric = operationCount('GetTokenUsageAnalytics');
    await page.getByRole('radio', { name: 'Cost' }).click();
    assert(operationCount('GetTokenUsageAnalytics') === beforeMetric, 'Cost switch requested the server');
    await page.getByText('Cost (USD)', { exact: true }).waitFor({ state: 'visible' });
    const completeCostPoints = await page.locator('[data-point-marker]').count();

    const partialResponse = await applyProvider(page, 'Partial E2E', { allowErrors: true });
    let gapPoints = null;
    let gapPaths = null;
    let partialApiError = null;
    if (partialResponse?.errors.length) {
      partialApiError = partialResponse.errors;
      evidence.failures.push({
        scenarioId: 'TS-E2E-002',
        acceptanceCriteria: ['AC-004', 'AC-009', 'AC-011', 'AC-016'],
        message: 'Real partial-pricing daily data is rejected before the UI can render truthful monetary gaps.',
        expected: 'A coherent PARTIAL result with the unpriced daily bucket represented as a cost-chart gap and exact price_missing evidence.',
        observed: partialResponse.errors,
      });
      await clearAppliedFilters(page);
    } else {
      await page.getByText('Some usage is unpriced; cost totals are partial.', { exact: false }).waitFor({ state: 'visible' });
      gapPoints = await page.locator('[data-point-marker]').count();
      gapPaths = await page.locator('path[data-series="daily"]').count();
      assert(gapPoints === 2 && gapPaths === 2, 'Missing monetary bucket must create truthful separated cost points/paths', { gapPoints, gapPaths });
      const exactText = await page.locator('details').innerText();
      assert(exactText.includes('Unpriced') && exactText.includes('price_missing'), 'Exact bucket evidence does not expose missing price truth', exactText);
    }

    const cacheStates = {};
    for (const [provider, expected] of [
      ['Zero Cache E2E', '0%'],
      ['No Cache Report E2E', 'Not reported'],
      ['Local E2E', 'Not supported'],
      ['Unknown Cache E2E', 'Unknown'],
    ]) {
      await applyProvider(page, provider);
      cacheStates[provider] = await cardValue(page, 'cache-rate');
      assert(cacheStates[provider] === expected, `Cache state mismatch for ${provider}`, cacheStates);
    }
    assert(positiveCache.endsWith('%') && positiveCache !== '0%', 'Positive cache fixture did not show an authoritative positive rate', positiveCache);
    await clearAppliedFilters(page);
    await page.getByRole('radio', { name: 'Cost' }).click();
    await page.getByText('Multiple currencies cannot be combined.', { exact: true }).waitFor({ state: 'visible' });
    assert(await page.locator('[data-testid="daily-line-chart"]').count() === 0, 'Mixed-currency cost must not render a false combined line');
    await page.getByRole('radio', { name: 'Tokens' }).click();
    return { positiveCache, completeCostPoints, gapPoints, gapPaths, partialApiError, cacheStates };
  })();

  evidence.scenarios['TS-E2E-003-detailed-usage'] = await (async () => {
    const before = operationCount('GetTokenUsageAnalytics');
    const section = page.locator('[data-testid="detailed-usage-section"]');
    await section.getByRole('combobox').selectOption('PROVIDER');
    assert(operationCount('GetTokenUsageAnalytics') === before, 'Detailed-usage grouping caused a request');
    const rows = section.locator('tbody > tr:has(button[aria-expanded])');
    const tokenValues = await rows.locator('td:nth-child(2)').allInnerTexts();
    const shares = await rows.locator('td:nth-child(4)').allInnerTexts();
    const latest = latestAnalyticsResponse();
    const tokenSum = tokenValues.reduce((sum, value) => sum + integerFromText(value), 0);
    const shareSum = shares.reduce((sum, value) => sum + Number.parseFloat(value), 0);
    assert(tokenSum === latest.selectedAggregate.totalTokens, 'Detailed-usage grouped token total does not reconcile', { tokenSum, expected: latest.selectedAggregate.totalTokens });
    assert(Math.abs(shareSum - 100) < 0.6, 'Detailed-usage token shares do not reconcile', { shares, shareSum });
    const localRow = rows.filter({ hasText: 'Local E2E' }).first();
    await localRow.getByRole('button', { name: 'Details', exact: true }).click();
    const localDetails = await localRow.locator('xpath=following-sibling::tr[1]').innerText();
    assert(localDetails.includes('local_no_api_bill') && localDetails.includes('Currency: Not available'), 'Local exact evidence is incomplete', localDetails);
    assert(!(await section.innerText()).toLowerCase().includes('driver'), 'Detailed usage reintroduced driver terminology');
    await page.screenshot({ path: path.join(outputDir, 'detailed-usage-desktop.png'), fullPage: true });
    return { rowCount: await rows.count(), tokenValues, tokenSum, shares, shareSum, localDetails };
  })();

  evidence.scenarios['TS-E2E-001-loading-failure-retry'] = await (async () => {
    let inject = true;
    await page.route('**/graphql', async (route) => {
      const operation = operationPayloads(route.request())[0]?.operationName;
      if (inject && operation === 'GetTokenUsageAnalytics') {
        inject = false;
        await sleep(500);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'E2E injected analytics failure' }] }) });
        return;
      }
      await route.continue();
    });
    const before = operationCount('GetTokenUsageAnalytics');
    await selectRange(page, 'Last month');
    await page.locator('[aria-busy="true"]').waitFor({ state: 'visible' });
    assert(await page.locator('[data-summary-id]').count() === 0, 'Stale summary remained visible during a new request');
    await page.getByRole('alert').filter({ hasText: 'E2E injected analytics failure' }).waitFor({ state: 'visible' });
    assert(await page.locator('[data-summary-id]').count() === 0, 'Stale summary remained visible after failure');
    await page.unroute('**/graphql');
    await page.getByRole('button', { name: 'Retry' }).click();
    await waitOperationCount('GetTokenUsageAnalytics', before + 2);
    await page.getByText('This range is before analytics tracking began.').waitFor({ state: 'visible' });
    await selectRange(page, 'This month');
    await page.locator('[data-summary-id="total"]').waitFor({ state: 'visible' });
    return { requestsAdded: operationCount('GetTokenUsageAnalytics') - before, staleDuringLoading: false, staleAfterFailure: false };
  })();

  evidence.scenarios['TS-E2E-004-run-details'] = await (async () => {
    const taskBefore = operationCount('GetTokenUsageTaskStatisticsInPeriod');
    const modelBefore = operationCount('GetUsageStatisticsInPeriod');
    await page.getByRole('tab', { name: 'Run details' }).click();
    await waitOperationCount('GetTokenUsageTaskStatisticsInPeriod', taskBefore + 1);
    await waitOperationCount('GetUsageStatisticsInPeriod', modelBefore + 1);
    await page.getByText('E2E Product Team', { exact: true }).waitFor({ state: 'visible' });
    const helper = await page.getByText(/date range selects runs by creation time/i).innerText();
    const teamRow = page.locator('tbody > tr').filter({ hasText: 'E2E Product Team' }).first();
    assert((await teamRow.innerText()).includes('1,500') && (await teamRow.innerText()).includes('500'), 'Team row does not show lifetime aggregate totals', await teamRow.innerText());
    await teamRow.getByRole('button', { name: 'Expand team members' }).click();
    await page.getByText('/researcher', { exact: false }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /Sort Input/ }).click();
    const ascendingHeader = page.locator('th[aria-sort="ascending"]');
    assert(await ascendingHeader.count() === 1 && (await ascendingHeader.innerText()).includes('Input'), 'Task input sort did not activate ascending state');
    await teamRow.getByRole('button', { name: /Show cost details/ }).click();
    await page.getByText('Cost breakdown', { exact: true }).waitFor({ state: 'visible' });

    const requestsBeforeModel = operationCount('GetTokenUsageTaskStatisticsInPeriod') + operationCount('GetUsageStatisticsInPeriod');
    await page.getByRole('radio', { name: 'Model' }).click();
    await page.getByText('gpt-e2e-complete', { exact: true }).waitFor({ state: 'visible' });
    assert(operationCount('GetTokenUsageTaskStatisticsInPeriod') + operationCount('GetUsageStatisticsInPeriod') === requestsBeforeModel, 'Task/Model presentation switch refetched');
    const modelHeaders = await page.locator('thead').last().innerText();
    assert(!modelHeaders.includes('Runs'), 'Unsupported Runs column is visible');

    const start = page.locator('#token-usage-start-date');
    const end = page.locator('#token-usage-end-date');
    const today = new Date(`${evidence.fixture.now.slice(0, 10)}T00:00:00.000Z`);
    const excludeStart = new Date(today.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
    await start.fill(excludeStart);
    await end.fill(evidence.fixture.runRange.end);
    const beforeEmptyTask = operationCount('GetTokenUsageTaskStatisticsInPeriod');
    const beforeEmptyModel = operationCount('GetUsageStatisticsInPeriod');
    await page.getByRole('button', { name: 'Fetch Statistics' }).click();
    await waitOperationCount('GetTokenUsageTaskStatisticsInPeriod', beforeEmptyTask + 1);
    await waitOperationCount('GetUsageStatisticsInPeriod', beforeEmptyModel + 1);
    await page.getByText('No runtime/model usage found for this date range.').waitFor({ state: 'visible' });
    await page.getByRole('radio', { name: 'Task' }).click();
    await page.getByText('No agent or team usage found for this date range.').waitFor({ state: 'visible' });
    await start.fill(evidence.fixture.runRange.start);
    const restoreTask = operationCount('GetTokenUsageTaskStatisticsInPeriod');
    const restoreModel = operationCount('GetUsageStatisticsInPeriod');
    await page.getByRole('button', { name: 'Fetch Statistics' }).click();
    await waitOperationCount('GetTokenUsageTaskStatisticsInPeriod', restoreTask + 1);
    await waitOperationCount('GetUsageStatisticsInPeriod', restoreModel + 1);
    await page.getByText('E2E Product Team', { exact: true }).waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(outputDir, 'run-details-desktop.png'), fullPage: true });
    return { helper, automaticRequests: { task: 1, model: 1 }, modelSwitchRefetch: false, exclusionStart: excludeStart, teamLifetimeInput: 1500, teamLifetimeOutput: 500 };
  })();

  await page.getByRole('tab', { name: 'Analytics' }).click();
  const fileBoundary = await page.evaluate(() => window.__tokenStatisticsE2E);
  assert(fileBoundary.blobCount === 0 && fileBoundary.objectUrlCount === 0 && fileBoundary.downloadClickCount === 0, 'Removed export/file API boundary was exercised', fileBoundary);
  assert(!/export|download|report|share/i.test((await bodyText(page)).match(/Export CSV|Download CSV|Share report/gi)?.join(' ') ?? ''), 'Replacement export workflow is visible');
  evidence.scenarios['TS-E2E-005-negative-file-boundary'] = fileBoundary;
  await context.close();

  const narrowContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', timezoneId: 'UTC' });
  await initTracking(narrowContext, 'en');
  const narrowPage = await narrowContext.newPage();
  attachPageEvidence(narrowPage, 'narrow-en');
  await gotoAnalytics(narrowPage, frontendUrl);
  evidence.scenarios['TS-E2E-005-narrow-keyboard'] = await (async () => {
    const layout = await narrowPage.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      gridWidths: Array.from(document.querySelectorAll('[data-summary-id]')).slice(0, 2).map((node) => node.getBoundingClientRect().width),
      visibleTicks: Array.from(document.querySelectorAll('.line-x-labels span')).filter((node) => getComputedStyle(node).display !== 'none').length,
    }));
    assert(layout.clientWidth === 390 && layout.scrollWidth === 390, 'Narrow page overflow detected', layout);
    assert(Math.abs(layout.gridWidths[0] - layout.gridWidths[1]) < 0.5 && layout.visibleTicks === 3, 'Narrow summary/tick reflow mismatch', layout);
    await filterButton(narrowPage).focus();
    await narrowPage.keyboard.press('Enter');
    await filterPanel(narrowPage).waitFor({ state: 'visible' });
    await narrowPage.keyboard.press('Escape');
    const focus = await filterButton(narrowPage).evaluate((element) => ({ active: document.activeElement === element, boxShadow: getComputedStyle(element).boxShadow }));
    assert(focus.active, 'Narrow Escape did not restore filter focus', focus);
    const tableOverflow = await narrowPage.locator('[data-testid="detailed-usage-section"] .overflow-x-auto').evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
    assert(tableOverflow.scrollWidth > tableOverflow.clientWidth, 'Dense narrow table is not contained by an internal scroller', tableOverflow);
    await narrowPage.screenshot({ path: path.join(outputDir, 'analytics-narrow.png'), fullPage: true });
    return { layout, focus, tableOverflow };
  })();
  await narrowContext.close();

  const zhContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', timezoneId: 'UTC' });
  await initTracking(zhContext, 'zh-CN');
  const zhPage = await zhContext.newPage();
  attachPageEvidence(zhPage, 'narrow-zh-CN');
  const zhBefore = operationCount('GetTokenUsageAnalytics');
  await zhPage.goto(`${frontendUrl}/settings?section=token-usage`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitOperationCount('GetTokenUsageAnalytics', zhBefore + 1);
  await zhPage.locator('[data-summary-id="total"]').waitFor({ state: 'visible' });
  const zhText = await bodyText(zhPage);
  const expectedZhLabels = ['分析', '运行详情', 'TOKEN 总量', '未缓存输入', '缓存命中率', '详细用量'];
  const missingZhLabels = expectedZhLabels.filter((label) => !zhText.includes(label));
  await zhPage.screenshot({ path: path.join(outputDir, 'analytics-narrow-zh-CN.png'), fullPage: true });
  assert(missingZhLabels.length === 0, 'Simplified Chinese Token Statistics labels are incomplete', {
    missingZhLabels,
    storedPreference: await zhPage.evaluate(() => localStorage.getItem('autobyteus.localization.preference-mode')),
    textSample: zhText.slice(0, 2_000),
  });
  const zhLayout = await zhPage.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert(zhLayout.clientWidth === zhLayout.scrollWidth, 'Simplified Chinese narrow layout overflows', zhLayout);
  evidence.scenarios['TS-E2E-005-zh-CN'] = { labelsPresent: true, layout: zhLayout };
  await zhContext.close();

  const unexpectedErrors = evidence.browserEvents.filter((event) => (
    event.type === 'pageerror' ||
    event.type === 'download' ||
    (event.type === 'console:error' && !event.text.includes('E2E injected analytics failure'))
  ));
  assert(unexpectedErrors.length === 0, 'Unexpected browser errors/downloads occurred', unexpectedErrors);
  result = 'Pass';
} catch (error) {
  evidence.failures.push({
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch((error) => evidence.failures.push({ message: `browser cleanup: ${error.message}` }));
  try { evidence.cleanup.frontend = await stopOwned(frontend); } catch (error) { evidence.failures.push({ message: `frontend cleanup: ${error.message}` }); }
  try { evidence.cleanup.backend = await stopOwned(backend); } catch (error) { evidence.failures.push({ message: `backend cleanup: ${error.message}` }); }
  if (ownedRoot) {
    try {
      await fs.rm(ownedRoot, { recursive: true, force: true });
      evidence.cleanup.ownedRoot = { status: 'removed', path: ownedRoot };
    } catch (error) {
      evidence.failures.push({ message: `owned root cleanup: ${error.message}` });
    }
  }
  evidence.completedAt = new Date().toISOString();
  evidence.result = evidence.failures.length ? 'Fail' : result;
  await fs.writeFile(path.join(outputDir, 'token-statistics-browser-result.json'), JSON.stringify(evidence, null, 2));
  process.stdout.write(`${evidence.result}: ${path.join(outputDir, 'token-statistics-browser-result.json')}\n`);
  if (evidence.failures.length) process.exitCode = 1;
}
