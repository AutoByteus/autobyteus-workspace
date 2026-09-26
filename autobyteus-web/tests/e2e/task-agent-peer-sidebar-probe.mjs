#!/usr/bin/env node
// Run from autobyteus-web: node tests/e2e/task-agent-peer-sidebar-probe.mjs
// Optional: --output-dir <path> --browser-executable <path> --ledger <absolute path>.
// Production history projection/selection/hydration, emulated GraphQL transport;
// temporary Nuxt route and owned browser/process are always removed in finally.

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
const fixturePath = path.join(scriptDir, 'fixtures/task-agent-peer-sidebar.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-task-agent-peer-sidebar.vue');
const routePath = '/api-e2e-task-agent-peer-sidebar';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/task-agent-peer-sidebar'));
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
  browserExecutable: executablePath || 'playwright-default',
  fixturePath,
  scenarios: {},
  projectionRequests: [],
  browserEvents: [],
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
const ledgerPath = getArg('ledger');
const checkpoint = async () => {
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
};
const scenario = async (id, description, run) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await run();
    evidence.scenarios[id] = { result: 'Pass', description, startedAt, details };
    await checkpoint();
    if (ledgerPath) await fs.appendFile(ledgerPath, `\n## Browser checkpoint ${id}\nPass — ${description}. Evidence: ${evidencePath} (${id}).\n`);
    return details;
  } catch (error) {
    const failure = {
      id, description, message: error instanceof Error ? error.message : String(error),
      details: error?.details, stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { result: 'Fail', description, startedAt, failure };
    evidence.failures.push(failure);
    await checkpoint();
    if (ledgerPath) await fs.appendFile(ledgerPath, `\n## Browser checkpoint ${id}\nFail — ${failure.message}. Evidence: ${evidencePath}.\n`);
    throw error;
  }
};
const choosePort = async () => explicitPort ? Number(explicitPort) : await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close((error) => error ? reject(error) : resolve(port));
  });
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
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};
const state = (page) => page.evaluate(() => window.__peerSidebarProbe.state());
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

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const screenshot = async (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
let failTaskB = true;
let fixtureInstalled = false;
let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
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
  nuxtProcess = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);
  await waitFor('Nuxt fixture route', async () => {
    if (childExited(nuxtProcess)) throw new Error(`Nuxt exited before readiness: ${nuxtProcess.exitCode}/${nuxtProcess.signalCode}`);
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US', colorScheme: 'light' });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));
  await page.route('**/rest/health', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: '{"status":"ok"}',
  }));
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    let payload = {};
    try { payload = request.postDataJSON?.() ?? {}; } catch { payload = {}; }
    const operationName = typeof payload.operationName === 'string' ? payload.operationName : '';
    const query = typeof payload.query === 'string' ? payload.query : '';
    const variables = payload.variables ?? {};
    if (operationName === 'GetTeamMemberRunProjection' || query.includes('getTeamMemberRunProjection')) {
      const requestedAgentRunId = variables.agentRunId;
      evidence.projectionRequests.push({
        operationName: operationName || 'GetTeamMemberRunProjection',
        teamRunId: variables.teamRunId,
        agentRunId: requestedAgentRunId,
        requestedAt: new Date().toISOString(),
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (requestedAgentRunId === 'peer-task-b' && failTaskB) {
        failTaskB = false;
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'PEER_EXPECTED_PROJECTION_FAILURE' }] }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          data: { getTeamMemberRunProjection: {
            agentRunId: requestedAgentRunId, summary: `Exact ${requestedAgentRunId}`,
            lastActivityAt: '2026-09-26T08:00:00.000Z',
            conversation: [{ kind: 'message', role: 'user', content: `Request ${requestedAgentRunId}`, ts: 1788177600 },
              { kind: 'message', role: 'assistant', content: `CONVERSATION_${requestedAgentRunId}`, ts: 1788177630 }],
            activities: [], hasEarlierActiveTraceEvents: false,
          } },
        }) });
      }
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: graphQlData(operationName, query) }),
    });
  });

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="peer-sidebar-probe"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__peerSidebarProbe));
  // Vite may perform a one-time dependency optimization reload when a newly
  // installed fixture imports production components not yet warmed in this
  // process. The visible control above proves the reloaded fixture is ready;
  // record only events from the actual validation window.
  evidence.browserEvents = [];

  const worker = page.locator('[role="treeitem"][data-row-kind="stable_member"][data-member-address="/Worker"]');
  const taskA = page.getByRole('treeitem', { name: /Review launch notes/ });
  const taskB = page.getByRole('treeitem', { name: /Check documentation and release readiness/ });
  const outer = page.locator('[data-test="workspace-team-row-peer-root"]');
  const selectedConversation = async (id) => {
    await waitFor(`exact ${id} focus`, async () => (await state(page)).focus === id);
    await page.getByText(`CONVERSATION_${id}`, { exact: true }).waitFor();
    assert(await page.locator('[role="treeitem"][aria-selected="true"]').count() === 1, 'Selection highlight is not unique');
  };
  await scenario('PEER-001', 'Initially visible peers; mouse/keyboard exact conversations; delayed loading, failure and retry', async () => {
    await taskA.waitFor({ state: 'visible' });
    await taskB.waitFor({ state: 'visible' });
    assert(await worker.getAttribute('aria-level') === '1', 'Worker depth wrong');
    assert(await taskA.getAttribute('aria-level') === '1' && await taskB.getAttribute('aria-level') === '1', 'Tasks are not peers');
    assert(await worker.getAttribute('aria-expanded') === null, 'Worker has phantom disclosure');
    assert((await taskA.getAttribute('aria-label')).includes('In progress · Offline'), 'Live task lifecycle/runtime status changed');
    const layout = await Promise.all([worker, taskA, taskB].map(row => row.evaluate(el => ({
      x: el.getBoundingClientRect().x, padding: getComputedStyle(el).paddingLeft, label: el.getAttribute('aria-label'),
    }))));
    assert(layout.every(row => row.x === layout[0].x && row.padding === layout[0].padding), 'Peers do not share visual indentation', layout);
    const initial = await state(page);
    assert(initial.rows.map(row => row.agent).slice(0, 4).join('|') === 'peer-worker|peer-task-a|peer-task-b|peer-reviewer', 'Peer order changed', initial);
    assert(initial.taskAncestors.length === 0, 'Task retains regular Agent ancestor', initial);
    await screenshot('initial-peers');
    await taskA.focus();
    await page.keyboard.press('Enter');
    await waitFor('task A loading', async () => await taskA.getAttribute('aria-busy') === 'true');
    assert((await state(page)).focus === 'peer-reviewer', 'Focus committed before hydration');
    await selectedConversation('peer-task-a');
    assert(await taskA.getAttribute('aria-selected') === 'true', 'Task A not selected');
    await taskB.click();
    await waitFor('task B error', async () => (await state(page)).attempts['peer-task-b']?.state === 'error');
    assert((await state(page)).focus === 'peer-task-a', 'Failed selection stole focus');
    await taskB.getByRole('alert').waitFor();
    await screenshot('retry-error');
    await taskB.getByRole('button', { name: /retry/i }).click();
    await selectedConversation('peer-task-b');
    assert(await taskB.getAttribute('aria-selected') === 'true', 'Task B not selected');
    await worker.focus();
    await page.keyboard.press('Space');
    await selectedConversation('peer-worker');
    assert(await worker.getAttribute('aria-selected') === 'true', 'Configured Agent not selected');
    assert(await page.getByText('CONVERSATION_peer-task-b', { exact: true }).count() === 0, 'Task conversation leaked into regular Agent');
    assert(evidence.projectionRequests.map(r => r.agentRunId).join('|') === 'peer-task-a|peer-task-b|peer-task-b|peer-worker', 'Incorrect exact-ID request sequence', evidence.projectionRequests);
    assert(evidence.projectionRequests.every(r => r.teamRunId === 'peer-root'), 'Incorrect root identity');
    await page.evaluate(() => window.__peerSidebarProbe.narrow());
    assert(await page.locator('[data-test="sidebar"]').evaluate(el => el.getBoundingClientRect().width) === 260, 'Narrow sidebar not applied');
    await screenshot('narrow-selected');
    return { initial, layout, final: await state(page), requests: [...evidence.projectionRequests] };
  });

  await scenario('PEER-002', 'Task-Team containment and actual ancestor auto-reveal; outer collapse preserves peers', async () => {
    const nested = page.getByRole('treeitem', { name: /Nested task Agent proof/ });
    assert(await nested.count() === 0, 'Task-Team descendant escaped collapsed actual containers');
    await page.evaluate(() => window.__peerSidebarProbe.revealNested());
    await nested.waitFor({ state: 'visible' });
    const current = await state(page);
    assert(current.ancestors.join('|') === 'team:peer-configured-research|team:peer-task-team', 'Wrong actual Team ancestry', current);
    assert(await nested.getAttribute('aria-level') === '3', 'Nested task Agent escaped task-Team depth');
    const member = page.locator('[data-transient-kind="task_team_child"][data-member-address="/Research/Analyst"]');
    assert(await member.getAttribute('aria-level') === '3' && await member.getAttribute('aria-expanded') === null, 'Task-Team member has phantom task child');
    const teamRow = page.locator('[data-transient-kind="task_team"]');
    await teamRow.getByRole('button').click();
    assert(await nested.count() === 0, 'Task-Team collapse does not hide descendants');
    await teamRow.getByRole('button').click();
    await nested.waitFor({ state: 'visible' });
    await nested.click();
    await selectedConversation('peer-nested-task');
    await screenshot('task-team-containment');
    await outer.click();
    assert(await page.locator('[role="treeitem"]').count() === 0, 'Outer Team collapse left rows visible');
    await outer.click();
    await taskA.waitFor({ state: 'visible' });
    await taskB.waitFor({ state: 'visible' });
    await nested.waitFor({ state: 'visible' });
    return { final: await state(page) };
  });

  await scenario('PEER-003', 'Retained settled task reload uses exact conversation; no-task list unchanged', async () => {
    await page.goto(`${baseUrl}${routePath}?mode=retained`, { waitUntil: 'domcontentloaded' });
    await taskA.waitFor({ state: 'visible' });
    await taskB.waitFor({ state: 'visible' });
    assert((await state(page)).mode === 'retained', 'Retained mode not loaded');
    assert(await taskA.getAttribute('aria-level') === '1', 'Retained peer depth changed');
    assert((await taskA.getAttribute('aria-label')).includes('Accepted · Offline'), 'Retained task lifecycle/runtime status changed');
    await taskA.click();
    await selectedConversation('peer-task-a');
    await screenshot('retained-selected');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await taskB.waitFor({ state: 'visible' });
    await taskB.focus();
    await page.keyboard.press('Enter');
    await selectedConversation('peer-task-b');
    const retained = await state(page);
    await page.goto(`${baseUrl}${routePath}?mode=empty`, { waitUntil: 'domcontentloaded' });
    await worker.waitFor({ state: 'visible' });
    assert(await page.locator('[role="treeitem"]').count() === 2, 'No-task regular list changed');
    assert(await page.locator('[data-transient-kind]').count() === 0, 'No-task list synthesized transient rows');
    await worker.click();
    await selectedConversation('peer-worker');
    return { retained, empty: await state(page) };
  });
  const browserErrors = evidence.browserEvents.filter(event => event.type === 'pageerror'
    || (event.type === 'console:error' && !event.text.includes('PEER_EXPECTED_PROJECTION_FAILURE')));
  assert(browserErrors.length === 0, 'Unexpected browser error', browserErrors);
} catch (error) {
  result = 'Fail';
  if (page) {
    evidence.failureDom = await page.locator('body').innerText().catch(() => 'unavailable');
    await screenshot('failure').catch(() => {});
  }
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({
      id: 'HARNESS', description: 'Run task Agent peer sidebar browser probe',
      message: error instanceof Error ? error.message : String(error), details: error?.details,
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
  try { if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve)); evidence.cleanup.nuxtLog = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxtLog = `failed: ${error.message}`; }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) { result = 'Fail'; evidence.cleanup.installedFixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = {
    evidencePath, nuxtLogPath, outputDir,
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result === 'Pass') process.stdout.write(`Task Agent peer sidebar browser probe passed. Evidence: ${evidencePath}\n`);
else {
  process.stderr.write(`Task Agent peer sidebar browser probe failed. See ${evidencePath}\n`);
  process.exitCode = 1;
}
