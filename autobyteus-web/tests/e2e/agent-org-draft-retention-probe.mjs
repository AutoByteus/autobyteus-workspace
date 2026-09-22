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
const fixturePath = path.join(scriptDir, 'fixtures/agent-org-draft-retention.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-agent-org-draft-retention.vue');
const routePath = '/api-e2e-agent-org-draft-retention';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/agent-org-draft-retention'));
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
      reject(new Error('Fixture REST server did not expose a TCP address.'));
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
  uploadRequests: [],
  otherRequests: [],
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
const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
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
const graphQlData = (operationName, query) => {
  if (operationName === 'GetAgentDefinitions' || query.includes('agentDefinitions')) return { agentDefinitions: [] };
  if (operationName === 'GetAgentTeamDefinitions' || query.includes('agentTeamDefinitions')) return { agentTeamDefinitions: [] };
  if (operationName === 'GetAgentOrgDefinitions' || query.includes('agentOrgDefinitions')) return { agentOrgDefinitions: [] };
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

const pendingUploads = [];
const releasePendingUploads = () => {
  while (pendingUploads.length > 0) pendingUploads.shift()?.();
};
const restServer = http.createServer(async (request, response) => {
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
    if (request.url === '/rest/context-files/upload' && request.method === 'POST') {
      const body = await readBody(request);
      const text = body.toString('utf8');
      const record = {
        sequence: evidence.uploadRequests.length + 1,
        method: request.method,
        url: request.url,
        contentType: request.headers['content-type'] || null,
        bodyByteLength: body.byteLength,
        ownerIsOrgA: text.includes('"kind":"org_member_draft"')
          && text.includes('"orgRunId":"org-a"')
          && text.includes('"agentRunId":"org-a-director"'),
        filenamePresent: text.includes('filename="org-a-notes.txt"'),
        receivedAt: new Date().toISOString(),
      };
      evidence.uploadRequests.push(record);
      await new Promise((resolve) => pendingUploads.push(resolve));
      sendJson(response, 200, {
        storedFilename: 'ctx_probe__org-a-notes.txt',
        displayName: 'org-a-notes.txt',
        locator: '/rest/drafts/agent-org-runs/org-a/agent-runs/org-a-director/context-files/ctx_probe__org-a-notes.txt',
        phase: 'draft',
      });
      return;
    }
    if (request.url === '/graphql' && request.method === 'POST') {
      let payload = {};
      try { payload = JSON.parse((await readBody(request)).toString('utf8')); } catch { payload = {}; }
      const operationName = typeof payload.operationName === 'string' ? payload.operationName : '';
      const query = typeof payload.query === 'string' ? payload.query : '';
      evidence.otherRequests.push({ method: request.method, url: request.url, operationName, receivedAt: new Date().toISOString() });
      sendJson(response, 200, { data: graphQlData(operationName, query) });
      return;
    }
    evidence.otherRequests.push({ method: request.method, url: request.url, receivedAt: new Date().toISOString() });
    sendJson(response, 404, { error: 'not found' });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const orgScreenshotPath = path.join(outputDir, 'org-cross-root-retention.png');
const parityScreenshotPath = path.join(outputDir, 'agent-team-parity.png');
const narrowScreenshotPath = path.join(outputDir, 'org-return-narrow.png');
let fixtureInstalled = false;
let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
let result = 'Pass';

const textarea = () => page.locator('textarea:visible').first();
const state = () => page.evaluate(() => window.__agentOrgDraftRetentionProbe.snapshot());
const clickSurface = async (testId, expectedSurface) => {
  await page.locator(`[data-test="${testId}"]`).click();
  await waitFor(expectedSurface, async () => (await page.locator('[data-test="probe-current-surface"]').textContent())?.trim() === expectedSurface);
  await textarea().waitFor({ state: 'visible' });
};
const assertTextarea = async (expected, label) => {
  await waitFor(label, async () => await textarea().inputValue() === expected);
  assert(await textarea().inputValue() === expected, `${label} did not render exact text`, await state());
};

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const restPort = await listenOnFreePort(restServer);
  const restBaseUrl = `http://127.0.0.1:${restPort}`;
  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.restBaseUrl = restBaseUrl;
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
      BACKEND_NODE_BASE_URL: restBaseUrl,
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
  context = await browser.newContext({ viewport: { width: 1280, height: 850 }, locale: 'en-US', colorScheme: 'light' });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));
  const initialQuery = new URLSearchParams({
    probeSurface: 'org', rootSubjectKind: 'agent_org', mode: 'history',
    orgRunId: 'org-a', memberAddress: '/director', agentRunId: 'org-a-director',
  });
  await page.goto(`${baseUrl}${routePath}?${initialQuery}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="agent-org-draft-retention-probe"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__agentOrgDraftRetentionProbe));
  await textarea().waitFor({ state: 'visible' });
  evidence.browserEvents = [];

  await scenario('API-E2E-003-A', 'Delayed Org upload stays with the captured owner while another root is visible', async () => {
    await textarea().fill('Org A director exact draft');
    await waitFor('Org A draft commit', async () => (await state()).orgA.director.requirement === 'Org A director exact draft');
    const uploadAction = page.locator('input[type="file"]').setInputFiles({
      name: 'org-a-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('captured Org A file bytes'),
    });
    await waitFor('captured multipart upload', () => evidence.uploadRequests.length === 1);
    assert(evidence.uploadRequests[0].ownerIsOrgA, 'Multipart upload did not carry the exact Org A/member owner', evidence.uploadRequests[0]);
    assert(evidence.uploadRequests[0].filenamePresent, 'Multipart upload omitted the selected filename', evidence.uploadRequests[0]);

    await clickSurface('go-org-b-reviewer', 'org-b:org-b-reviewer');
    await assertTextarea('', 'Org B initially isolated');
    await textarea().fill('Org B reviewer independent draft');
    releasePendingUploads();
    await uploadAction;
    await waitFor('Org A upload commit after focus change', async () => (await state()).orgA.director.files.length === 1);
    assert((await state()).orgB.reviewer.files.length === 0, 'Delayed Org A upload leaked into visible Org B', await state());
    assert((await page.getByText('org-a-notes.txt', { exact: true }).count()) === 0, 'Org A file rendered in Org B');
    return { upload: evidence.uploadRequests[0], snapshot: await state() };
  });

  await scenario('API-E2E-003-B', 'Cross-root and same-root member navigation restore exact independent Org drafts', async () => {
    await clickSurface('go-org-a-writer', 'org-a:org-a-writer');
    await assertTextarea('', 'Org A writer initially isolated');
    await textarea().fill('Org A writer independent draft');

    await clickSurface('go-org-a-director', 'org-a:org-a-director');
    await assertTextarea('Org A director exact draft', 'Org A director return');
    assert(await page.getByText('Context Files (1)', { exact: true }).count() === 1, 'Org A file count was not restored');
    assert(await page.getByText('org-a-notes.txt', { exact: true }).count() === 1, 'Org A file label was not restored');

    await clickSurface('go-org-b-reviewer', 'org-b:org-b-reviewer');
    await assertTextarea('Org B reviewer independent draft', 'Org B reviewer return');
    await clickSurface('go-org-a-writer', 'org-a:org-a-writer');
    await assertTextarea('Org A writer independent draft', 'Org A writer return');
    await clickSurface('go-org-a-director', 'org-a:org-a-director');
    await assertTextarea('Org A director exact draft', 'Org A director second return');

    const snapshot = await state();
    assert(snapshot.orgA.retainedRoot && snapshot.orgB.retainedRoot, 'Ordinary root navigation released a retained root', snapshot);
    assert(snapshot.orgA.director.retainedContext && snapshot.orgA.writer.retainedContext && snapshot.orgB.reviewer.retainedContext,
      'Ordinary navigation replaced an exact member context', snapshot);
    await page.screenshot({ path: orgScreenshotPath, fullPage: true });
    return { snapshot };
  });

  await scenario('API-E2E-003-C', 'Unmounting the Org view for standalone Agent navigation retains both new/existing Agent drafts', async () => {
    await clickSurface('go-agent-new', 'agent:temp-agent-new');
    await assertTextarea('', 'New Agent initially empty');
    await textarea().fill('New Agent retained draft');
    await clickSurface('go-agent-existing', 'agent:agent-existing');
    await assertTextarea('', 'Existing Agent initially isolated');
    await textarea().fill('Existing Agent retained draft');
    await clickSurface('go-agent-new', 'agent:temp-agent-new');
    await assertTextarea('New Agent retained draft', 'New Agent return');

    await clickSurface('go-org-a-director', 'org-a:org-a-director');
    await assertTextarea('Org A director exact draft', 'Org A return after view unmount');
    assert(await page.getByText('org-a-notes.txt', { exact: true }).count() === 1, 'Org attachment was lost across view unmount');
    return { snapshot: await state() };
  });

  await scenario('API-E2E-003-D', 'New/existing Team root navigation retains independent member drafts', async () => {
    await clickSurface('go-team-new', 'team:temp-team-new');
    await assertTextarea('', 'New Team initially empty');
    await textarea().fill('New Team retained draft');
    await clickSurface('go-team-existing', 'team:team-existing');
    await assertTextarea('', 'Existing Team initially isolated');
    await textarea().fill('Existing Team retained draft');
    await clickSurface('go-team-new', 'team:temp-team-new');
    await assertTextarea('New Team retained draft', 'New Team return');
    await clickSurface('go-team-existing', 'team:team-existing');
    await assertTextarea('Existing Team retained draft', 'Existing Team return');
    await page.screenshot({ path: parityScreenshotPath, fullPage: true });
    return { snapshot: await state() };
  });

  await scenario('API-E2E-003-E', 'Final narrow Org return remains exact with no cross-surface leakage', async () => {
    await page.setViewportSize({ width: 430, height: 820 });
    await clickSurface('go-org-a-director', 'org-a:org-a-director');
    await assertTextarea('Org A director exact draft', 'Final narrow Org A return');
    assert(await page.getByText('org-a-notes.txt', { exact: true }).count() === 1, 'Final Org A file was absent');
    const snapshot = await state();
    assert(snapshot.orgA.writer.requirement === 'Org A writer independent draft', 'Same-root writer draft changed', snapshot);
    assert(snapshot.orgB.reviewer.requirement === 'Org B reviewer independent draft', 'Cross-root reviewer draft changed', snapshot);
    assert(snapshot.agents.new.requirement === 'New Agent retained draft'
      && snapshot.agents.existing.requirement === 'Existing Agent retained draft', 'Standalone Agent parity changed', snapshot);
    assert(snapshot.teams.new.requirement === 'New Team retained draft'
      && snapshot.teams.existing.requirement === 'Existing Team retained draft', 'Team parity changed', snapshot);
    await page.screenshot({ path: narrowScreenshotPath, fullPage: true });
    return { snapshot };
  });

  const unexpectedBrowserErrors = evidence.browserEvents.filter((event) =>
    event.type === 'pageerror' || event.type === 'requestfailed' || event.type === 'console:error');
  assert(unexpectedBrowserErrors.length === 0, 'Unexpected browser page/console/request errors were observed', unexpectedBrowserErrors);
  assert(evidence.uploadRequests.length === 1, 'Browser journey made an unexpected number of uploads', evidence.uploadRequests);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({
      id: 'HARNESS',
      description: 'Run Agent Org draft-retention browser probe',
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} finally {
  releasePendingUploads();
  try { await context?.close(); evidence.cleanup.browserContext = context ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browserContext = `failed: ${error.message}`; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess); }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { await closeServer(restServer); evidence.cleanup.restServer = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.restServer = `failed: ${error.message}`; }
  try { if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve)); evidence.cleanup.nuxtLog = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxtLog = `failed: ${error.message}`; }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) { result = 'Fail'; evidence.cleanup.installedFixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = { evidencePath, nuxtLogPath, orgScreenshotPath, parityScreenshotPath, narrowScreenshotPath };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result === 'Pass') {
  process.stdout.write(`Agent Org draft-retention browser probe passed. Evidence: ${evidencePath}\n`);
} else {
  process.stderr.write(`Agent Org draft-retention browser probe failed. See ${evidencePath}\n`);
  process.exitCode = 1;
}
