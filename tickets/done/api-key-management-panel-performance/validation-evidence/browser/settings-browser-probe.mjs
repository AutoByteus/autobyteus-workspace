#!/usr/bin/env node
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../../../../..');
const webRoot = path.join(workspaceRoot, 'autobyteus-web');
const productionPublicRoot = path.join(webRoot, 'dist', 'public');
const require = createRequire(path.join(webRoot, 'package.json'));
const { chromium } = require('playwright-core');
const outputDir = scriptDir;
const summaryPath = path.join(outputDir, 'settings-browser-summary.json');
const frontendLogPath = path.join(outputDir, 'settings-browser-frontend.log');
const backendLogPath = path.join(outputDir, 'settings-browser-backend.log');
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || browserCandidates.find((candidate) => fs.existsSync(candidate));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const waitFor = async (predicate, code, timeoutMs = 20_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await sleep(50);
  }
  throw new Error(code);
};

const contentType = (filePath) => ({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}[path.extname(filePath)] || 'application/octet-stream');

const startProductionFrontend = async (port, backendUrl) => {
  assert(fs.existsSync(path.join(productionPublicRoot, 'index.html')), 'PRODUCTION_WEB_BUILD_REQUIRED');
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      if (requestUrl.pathname === '/graphql' || requestUrl.pathname.startsWith('/rest/')) {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const upstream = await fetch(`${backendUrl}${requestUrl.pathname}${requestUrl.search}`, {
          method: request.method,
          headers: {
            ...(request.headers['content-type'] ? { 'content-type': request.headers['content-type'] } : {}),
          },
          body: ['GET', 'HEAD'].includes(request.method || 'GET') ? undefined : Buffer.concat(chunks),
        });
        response.writeHead(upstream.status, {
          'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
        });
        response.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      const requested = path.resolve(productionPublicRoot, relativePath || 'index.html');
      const safeRequested = requested.startsWith(`${productionPublicRoot}${path.sep}`)
        ? requested
        : path.join(productionPublicRoot, 'index.html');
      const filePath = fs.existsSync(safeRequested) && fs.statSync(safeRequested).isFile()
        ? safeRequested
        : path.join(productionPublicRoot, 'index.html');
      response.writeHead(200, { 'content-type': contentType(filePath) });
      if (path.extname(filePath) === '.html') {
        const configuredHtml = fs.readFileSync(filePath, 'utf8')
          .replaceAll('http://localhost:8000', backendUrl)
          .replaceAll('ws://localhost:8000', backendUrl.replace(/^http/, 'ws'));
        response.end(configuredHtml);
      } else {
        fs.createReadStream(filePath).pipe(response);
      }
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return {
    server,
    async close() {
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
};

const startOllamaFixture = async () => {
  const requests = [];
  const gates = { 'path-a': deferred(), 'path-b': deferred() };
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const pathName = requestUrl.pathname;
    const source = pathName.includes('/path-a/')
      ? 'path-a'
      : pathName.includes('/path-b/')
        ? 'path-b'
        : pathName.includes('/path-c/')
          ? 'path-c'
          : 'unknown';
    requests.push({ method: request.method, path: request.url, source, at: Date.now() });

    if (source === 'path-c') {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'synthetic unavailable' }));
      return;
    }
    if (pathName.endsWith('/api/tags')) {
      if (gates[source]) await gates[source].promise;
      const model = source === 'path-b' ? 'browser-model-b' : 'browser-model-a';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ models: [{ model }] }));
      return;
    }
    if (pathName.endsWith('/api/ps')) {
      const model = source === 'path-b' ? 'browser-model-b' : 'browser-model-a';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ models: [{ model, context_length: 4096 }] }));
      return;
    }
    if (pathName.endsWith('/api/show')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ parameters: 'num_ctx 4096', model_info: { 'synthetic.context_length': 8192 } }));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found', path: request.url }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  assert(address && typeof address !== 'string', 'OLLAMA_FIXTURE_ADDRESS_UNAVAILABLE');
  return {
    server,
    requests,
    gates,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      gates['path-a'].resolve();
      gates['path-b'].resolve();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
};

const operationNameFromRequest = (request) => {
  if (!request.url().includes('/graphql') || request.method() !== 'POST') return null;
  try {
    const body = request.postDataJSON();
    if (typeof body?.operationName === 'string') return body.operationName;
    return /\b(?:query|mutation)\s+([A-Za-z0-9_]+)/.exec(body?.query || '')?.[1] || null;
  } catch {
    return null;
  }
};

await fsPromises.mkdir(outputDir, { recursive: true });
let backend;
let frontend;
let frontendOutput = '';
let browser;
let fixture;
let runtimeRoot;
let database;
const result = {
  result: 'Fail',
  timings: {},
  assertions: [],
  graphqlOperations: [],
  fixtureRequests: [],
  consoleErrors: [],
  pageErrors: [],
  cleanup: {},
};

try {
  assert(executablePath, 'CHROMIUM_EXECUTABLE_NOT_FOUND');
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  runtimeRoot = path.join(testRuntimeRoot, `api-key-settings-browser-${suffix}`);
  database = resolveTestDatabaseLocation(`file:./db/api-key-settings-browser-${suffix}.db`);
  fixture = await startOllamaFixture();
  backend = await startBuiltTestServer({
    runtimeRoot,
    databaseUrlOverride: database.databaseUrl,
    environment: { OLLAMA_HOSTS: `${fixture.baseUrl}/path-a` },
  });
  const frontendPort = await reserveLoopbackPort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  frontend = await startProductionFrontend(frontendPort, backend.serverUrl);
  frontendOutput = `Production static build served from ${productionPublicRoot}; /graphql and /rest proxied to ${backend.serverUrl}.\n`;
  await waitFor(async () => {
    try { return (await fetch(`${frontendUrl}/settings`)).ok; } catch { return false; }
  }, 'FRONTEND_READY_TIMEOUT', 120_000);

  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('request', (request) => {
    const operationName = operationNameFromRequest(request);
    if (operationName) result.graphqlOperations.push({ operationName, at: Date.now() });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => result.pageErrors.push(error.message));

  const navigationStartedAt = Date.now();
  await page.goto(`${frontendUrl}/settings`, { waitUntil: 'domcontentloaded' });
  const domContentLoadedAt = Date.now();
  await page.getByRole('heading', { name: 'API Key Management' }).waitFor({ state: 'visible' });
  const providers = page.getByRole('navigation', { name: 'Providers' });
  await providers.getByRole('button').filter({ hasText: 'OpenAI' }).first().waitFor({ state: 'visible' });
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible' });
  const credentialSurfaceAt = Date.now();
  result.timings.fullDocumentCredentialSurfaceMs = credentialSurfaceAt - navigationStartedAt;
  result.timings.domContentLoadedMs = domContentLoadedAt - navigationStartedAt;
  result.timings.credentialSurfaceAfterDomContentLoadedMs = credentialSurfaceAt - domContentLoadedAt;
  assert(
    result.timings.fullDocumentCredentialSurfaceMs <= 1500,
    `CREDENTIAL_SURFACE_TOO_SLOW_FROM_ENTRY:${result.timings.fullDocumentCredentialSurfaceMs}`,
  );
  result.assertions.push('production-build credential surface visible within 1500ms of full browser entry with a nonresponding Ollama endpoint configured and no discovery dependency');

  await providers.getByRole('button').filter({ hasText: 'OpenAI' }).first().click();
  await page.getByRole('heading', { name: 'Models', exact: true }).waitFor({ state: 'visible' });
  assert(await page.getByRole('button', { name: /Reload Models/i }).count() === 0, 'STATIC_PROVIDER_RELOAD_VISIBLE');
  assert(await page.getByText('Loading credentials…', { exact: true }).count() === 0, 'CREDENTIAL_SPINNER_STILL_VISIBLE');
  result.assertions.push('static OpenAI rows/form are independent and expose no Reload');

  await providers.getByRole('button').filter({ hasText: 'Ollama' }).first().click();
  await page.getByText('Loading models…', { exact: true }).waitFor({ state: 'visible' });
  assert(await page.locator('input[type="password"]').first().isEnabled(), 'OLLAMA_CREDENTIAL_INPUT_DISABLED_WHILE_LOADING');
  result.assertions.push('dynamic model loading remains local and leaves the credential editor enabled');
  await page.screenshot({ path: path.join(outputDir, '01-ollama-pending-desktop.png'), fullPage: true });

  fixture.gates['path-a'].resolve();
  await page.getByText('browser-model-a', { exact: false }).first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Reload Models/i }).waitFor({ state: 'visible' });
  result.assertions.push('first targeted discovery publishes only Ollama and exposes provider-local Reload');

  await page.getByTestId('settings-nav-server-settings').click();
  await page.getByTestId('settings-nav-server-settings-advanced').click();
  const settingInput = page.getByTestId('server-setting-value-OLLAMA_HOSTS');
  await settingInput.waitFor({ state: 'visible' });
  const operationStart = result.graphqlOperations.length;
  await settingInput.fill(`${fixture.baseUrl}/path-b`);
  await page.getByTestId('server-setting-save-OLLAMA_HOSTS').click();
  await waitFor(
    () => fixture.requests.some(({ source, path: requestPath }) =>
      source === 'path-b' && requestPath.includes('/api/tags')),
    'PATH_B_DISCOVERY_DID_NOT_START',
  );
  await page.getByRole('button', { name: 'API Keys', exact: true }).click();
  const providersAfterSave = page.getByRole('navigation', { name: 'Providers' });
  await providersAfterSave.getByRole('button').filter({ hasText: 'Ollama' }).first().click();
  await page.getByText('Loading models…', { exact: true }).waitFor({ state: 'visible' });
  assert(await page.getByText('browser-model-a', { exact: false }).count() === 0, 'OLD_OLLAMA_ROW_VISIBLE_AFTER_HOST_CHANGE');
  assert(await page.locator('input[type="password"]').first().isEnabled(), 'CREDENTIAL_INPUT_DISABLED_DURING_HOST_REFRESH');
  result.assertions.push('same-authority path change clears only Ollama rows before replacement and remains usable after navigation');

  fixture.gates['path-b'].resolve();
  await page.getByText('browser-model-b', { exact: false }).first().waitFor({ state: 'visible' });
  assert(await page.getByText('browser-model-a', { exact: false }).count() === 0, 'OLD_OLLAMA_ROW_RESTORED');
  const saveOperations = result.graphqlOperations.slice(operationStart).map(({ operationName }) => operationName);
  const updateIndex = saveOperations.indexOf('UpdateServerSetting');
  const ensureIndex = saveOperations.indexOf('EnsureProviderModelCatalog');
  const settingsIndex = saveOperations.indexOf('GetServerSettings');
  assert(updateIndex >= 0 && ensureIndex > updateIndex && settingsIndex > ensureIndex,
    `HOST_SAVE_OPERATION_ORDER_INVALID:${saveOperations.join(',')}`);
  result.assertions.push('host save request order is UpdateServerSetting -> targeted EnsureProviderModelCatalog -> GetServerSettings');
  await page.screenshot({ path: path.join(outputDir, '02-ollama-replaced-desktop.png'), fullPage: true });

  await page.getByTestId('settings-nav-server-settings').click();
  await page.getByTestId('settings-nav-server-settings-advanced').click();
  await settingInput.fill(`${fixture.baseUrl}/path-c`);
  await page.getByTestId('server-setting-save-OLLAMA_HOSTS').click();
  await waitFor(
    () => fixture.requests.some(({ source, path: requestPath }) =>
      source === 'path-c' && requestPath.includes('/api/tags')),
    'PATH_C_DISCOVERY_DID_NOT_START',
  );
  await page.getByRole('button', { name: 'API Keys', exact: true }).click();
  const providersAfterFailure = page.getByRole('navigation', { name: 'Providers' });
  await providersAfterFailure.getByRole('button').filter({ hasText: 'Ollama' }).first().click();
  await page.getByRole('heading', { name: 'Models unavailable' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Retry/i }).waitFor({ state: 'visible' });
  assert(await page.locator('input[type="password"]').first().isEnabled(), 'CREDENTIAL_INPUT_DISABLED_AFTER_MODEL_FAILURE');
  assert(await page.getByText('browser-model-b', { exact: false }).count() === 0, 'OLD_ROW_VISIBLE_AFTER_FAILED_HOST_CHANGE');
  result.assertions.push('failed replacement shows localized unavailable/Retry state without restoring old rows or blocking credentials');

  await page.setViewportSize({ width: 768, height: 900 });
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert(overflow.scrollWidth === overflow.clientWidth, `HORIZONTAL_OVERFLOW:${JSON.stringify(overflow)}`);
  await page.screenshot({ path: path.join(outputDir, '03-ollama-unavailable-tablet.png'), fullPage: true });
  result.assertions.push('768px tablet rendering has no document-level horizontal overflow');
  assert(result.pageErrors.length === 0, `PAGE_ERRORS:${result.pageErrors.join('|')}`);

  result.fixtureRequests = fixture.requests;
  result.result = 'Pass';
  result.frontendUrl = frontendUrl;
  result.backendUrl = backend.serverUrl;
  result.browserExecutable = executablePath;
  result.frontendMode = 'production static build served by an owned loopback harness';
} catch (error) {
  result.error = error?.stack || String(error);
  if (fixture) result.fixtureRequests = fixture.requests;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (fixture) await fixture.close().catch(() => undefined);
  if (frontend) await frontend.close().catch(() => undefined);
  if (backend) {
    await fsPromises.writeFile(backendLogPath, backend.output(), 'utf8').catch(() => undefined);
    await backend.stop().catch(() => backend.child.kill('SIGKILL'));
    result.cleanup.backendStopped = backend.child.exitCode !== null;
  }
  await fsPromises.writeFile(frontendLogPath, frontendOutput, 'utf8').catch(() => undefined);
  if (runtimeRoot && database) {
    await removeOwnedTestRuntime(runtimeRoot, database).catch(() => undefined);
    result.cleanup.runtimeRemoved = !fs.existsSync(runtimeRoot) && !fs.existsSync(database.databasePath);
  }
  result.cleanup.frontendStopped = !frontend || !frontend.server.listening;
  result.cleanup.fixtureStopped = !fixture || !fixture.server.listening;
  await fsPromises.writeFile(summaryPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
