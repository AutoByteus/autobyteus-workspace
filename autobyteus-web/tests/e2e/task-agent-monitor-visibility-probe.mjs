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
const fixturePath = path.join(scriptDir, 'fixtures/task-agent-monitor-visibility.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-task-agent-monitor-visibility.vue');
const routePath = '/api-e2e-task-agent-monitor-visibility';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/task-agent-monitor-visibility'));
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
const ROOT = 'task-monitor-root-run';
const TEACHER = 'task-monitor-teacher-run';
const CONFIGURED_STUDENT = 'task-monitor-configured-student-run';
const TASK = 'task-monitor-task-agent-run';
const TASK_DESCRIPTION = 'Retained task monitor exact identity proof';

const taskProjection = {
  agentRunId: TASK,
  summary: 'Retained exact task projection',
  lastActivityAt: '2026-08-31T12:03:00.000Z',
  conversation: [
    { kind: 'message', role: 'user', content: 'Task delegator address: /Teacher\n\nRetain this exact task context.', ts: 1788177600 },
    { kind: 'reasoning', role: 'assistant', content: 'TASK_RETAINED_REASONING', ts: 1788177610 },
    {
      kind: 'tool_call', role: 'assistant', invocationId: 'task-tool-001', toolName: 'task_probe_tool',
      toolArgs: { command: 'printf TASK_TOOL_OUTPUT' }, toolResult: 'TASK_TOOL_OUTPUT',
      content: 'TASK_RETAINED_TOOL_STEP', ts: 1788177620,
    },
    {
      kind: 'message', role: 'assistant',
      content: 'TASK_RETAINED_COMPLETION finished ordinary handoff without lifecycle inference.',
      ts: 1788177630,
    },
  ],
  activities: [{
    kind: 'tool', invocationId: 'task-tool-001', toolName: 'task_probe_tool', type: 'terminal_command',
    status: 'success', contextText: 'printf TASK_TOOL_OUTPUT', arguments: { command: 'printf TASK_TOOL_OUTPUT' },
    logs: ['TASK_TOOL_LOG'], result: 'TASK_TOOL_OUTPUT', error: null, ts: 1788177620,
  }],
  hasEarlierActiveTraceEvents: false,
};
const teacherProjection = {
  agentRunId: TEACHER,
  summary: 'Retained fallback coordinator projection',
  lastActivityAt: '2026-08-31T12:04:00.000Z',
  conversation: [
    { kind: 'message', role: 'user', content: 'Coordinator request', ts: 1788177640 },
    { kind: 'message', role: 'assistant', content: 'FALLBACK_RETAINED_COORDINATOR_CONTENT', ts: 1788177650 },
  ],
  activities: [{
    kind: 'tool', invocationId: 'teacher-tool-001', toolName: 'teacher_probe_tool', type: 'tool_call',
    status: 'success', contextText: 'fallback proof', arguments: { path: 'fallback-proof.md' },
    logs: [], result: 'FALLBACK_TOOL_RESULT', error: null, ts: 1788177650,
  }],
  hasEarlierActiveTraceEvents: false,
};

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
const scenario = async (id, description, run) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await run();
    evidence.scenarios[id] = { result: 'Pass', description, startedAt, details };
    return details;
  } catch (error) {
    const failure = {
      id, description, message: error instanceof Error ? error.message : String(error),
      details: error?.details, stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { result: 'Fail', description, startedAt, failure };
    evidence.failures.push(failure);
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
const state = (page) => page.evaluate(() => window.__taskAgentMonitorVisibilityProbe.state());
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
const taskScreenshotPath = path.join(outputDir, 'task-selected.png');
const settlementLoadingScreenshotPath = path.join(outputDir, 'settlement-fallback-loading.png');
const settlementCompleteScreenshotPath = path.join(outputDir, 'settlement-fallback-complete.png');
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
      const projection = requestedAgentRunId === TASK
        ? taskProjection
        : requestedAgentRunId === TEACHER
          ? teacherProjection
          : null;
      await new Promise((resolve) => setTimeout(resolve, requestedAgentRunId === TEACHER ? 700 : 450));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { getTeamMemberRunProjection: projection } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: graphQlData(operationName, query) }),
    });
  });

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="task-agent-monitor-visibility-probe"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__taskAgentMonitorVisibilityProbe));
  // Vite may perform a one-time dependency optimization reload when a newly
  // installed fixture imports production components not yet warmed in this
  // process. The visible control above proves the reloaded fixture is ready;
  // record only events from the actual validation window.
  evidence.browserEvents = [];

  const teacherRow = page.getByRole('treeitem', { name: /Teacher.*\/Teacher/i });
  const configuredStudentRow = page.getByRole('treeitem', { name: /^Student.*\/Student/i });
  const taskRow = page.getByRole('treeitem', { name: new RegExp(TASK_DESCRIPTION, 'i') });

  await scenario('API-E2E-TMV-001', 'Mounted exact task selection hydrates retained conversation and Activity before focus commit', async () => {
    await teacherRow.waitFor({ state: 'visible' });
    await configuredStudentRow.waitFor({ state: 'visible' });
    await taskRow.waitFor({ state: 'visible' });
    assert(await teacherRow.getAttribute('aria-selected') === 'true', 'Teacher was not the coherent initial focus');
    assert(await configuredStudentRow.getAttribute('aria-selected') === 'false', 'Configured same-address Student was unexpectedly selected');

    await taskRow.focus();
    await page.keyboard.press('Enter');
    await waitFor('task loading attempt', async () => (await state(page)).taskAttempt?.state === 'loading');
    const loadingState = await state(page);
    assert(await taskRow.getAttribute('aria-busy') === 'true', 'Task row did not expose busy state while exact projection loaded', loadingState);
    assert(await teacherRow.getAttribute('aria-selected') === 'true', 'Target became selected before exact projection authority', loadingState);
    assert(await taskRow.getAttribute('aria-selected') === 'false', 'Task row became selected before exact projection authority', loadingState);

    await waitFor('authoritative task selection', async () => {
      const current = await state(page);
      return current.focusedAgentRunId === TASK && current.taskAuthoritative === true
        && current.taskConversationCount === 2 && current.taskActivityCount === 1;
    });
    assert(await taskRow.getAttribute('aria-selected') === 'true', 'Exact task row did not become selected after hydration');
    assert(await configuredStudentRow.getAttribute('aria-selected') === 'false', 'Configured Student inherited task selection');
    await page.getByText('TASK_RETAINED_COMPLETION finished ordinary handoff without lifecycle inference.').waitFor();
    await page.locator('[data-test="activity-feed-scroll-container"]').getByText('task_probe_tool').waitFor();
    await page.getByText('Task', { exact: true }).first().waitFor();
    await page.locator('[data-test="team-workspace-task-status"]').filter({ hasText: 'In progress · Idle' }).waitFor();
    const requestsAfterSelection = [...evidence.projectionRequests];
    const taskRequests = requestsAfterSelection.filter((entry) => entry.agentRunId === TASK);
    assert(requestsAfterSelection.length === 1, 'Task selection issued an unexpected projection request', requestsAfterSelection);
    assert(taskRequests.length === 1, 'Task selection did not issue exactly one exact projection request', taskRequests);
    assert(taskRequests[0].teamRunId === ROOT, 'Task projection request used the wrong root identity', taskRequests[0]);
    assert(!requestsAfterSelection.some((entry) => entry.agentRunId === CONFIGURED_STUDENT),
      'Configured Student projection was substituted for task identity', requestsAfterSelection);
    await page.screenshot({ path: taskScreenshotPath, fullPage: true });
    return {
      loadingState,
      finalState: await state(page),
      taskRequest: taskRequests[0],
      taskAriaLabel: await taskRow.getAttribute('aria-label'),
    };
  });

  await scenario('API-E2E-TMV-002', 'Snapshot invalidation and focused task settlement reconcile the repaired fallback projection', async () => {
    await page.evaluate(() => window.__taskAgentMonitorVisibilityProbe.admitSnapshot());
    await waitFor('snapshot task reconciliation loading', async () => (await state(page)).taskAttempt?.state === 'loading');
    const snapshotLoading = await state(page);
    assert(snapshotLoading.phase === 'ready', 'Team stream was not ready after authoritative snapshot', snapshotLoading);
    assert(snapshotLoading.focusedAgentRunId === TASK, 'Snapshot stole exact task focus', snapshotLoading);
    assert(snapshotLoading.taskAuthoritative === false, 'Snapshot did not invalidate task projection authority', snapshotLoading);
    await waitFor('snapshot focused-task projection reconciliation', async () => {
      const current = await state(page);
      return current.taskAuthoritative === true && current.taskAttempt === null;
    });
    const taskRequestsBeforeSettlement = evidence.projectionRequests.filter((entry) => entry.agentRunId === TASK);
    assert(taskRequestsBeforeSettlement.length === 2, 'Snapshot did not reconcile the exact focused task once', taskRequestsBeforeSettlement);

    await page.evaluate(() => window.__taskAgentMonitorVisibilityProbe.settleFocusedTask());
    await waitFor('fallback loading after settlement focus repair', async () => {
      const current = await state(page);
      return current.focusedAgentRunId === TEACHER && current.teacherAttempt?.state === 'loading';
    });
    const settlementLoading = await state(page);
    assert(settlementLoading.taskVisible === false, 'Settled task remained in the live execution rows', settlementLoading);
    assert(settlementLoading.teacherAuthoritative === false, 'Fallback was incorrectly treated as authoritative before its fetch', settlementLoading);
    assert(await teacherRow.getAttribute('aria-selected') === 'true', 'Focus repair did not select the visible Teacher fallback', settlementLoading);
    assert(await teacherRow.getAttribute('aria-busy') === 'true', 'Fallback row did not expose its projection loading state', settlementLoading);
    assert(await taskRow.count() === 0, 'Settled task row remained rendered as live');
    await page.screenshot({ path: settlementLoadingScreenshotPath, fullPage: true });

    await waitFor('authoritative fallback projection', async () => {
      const current = await state(page);
      return current.teacherAuthoritative === true && current.teacherAttempt === null
        && current.teacherConversationCount === 2 && current.teacherActivityCount === 1;
    });
    await page.getByText('FALLBACK_RETAINED_COORDINATOR_CONTENT').waitFor();
    await page.locator('[data-test="activity-feed-scroll-container"]').getByText('teacher_probe_tool').waitFor();
    assert(await page.getByText('TASK_RETAINED_COMPLETION finished ordinary handoff without lifecycle inference.').count() === 0,
      'Task conversation leaked into the repaired fallback monitor');
    const teacherRequests = evidence.projectionRequests.filter((entry) => entry.agentRunId === TEACHER);
    assert(teacherRequests.length === 1, 'Settlement did not issue exactly one exact fallback projection request', teacherRequests);
    assert(teacherRequests[0].teamRunId === ROOT, 'Fallback projection request used the wrong root identity', teacherRequests[0]);
    const exactRequestSequence = evidence.projectionRequests.map((entry) => `${entry.teamRunId}:${entry.agentRunId}`);
    assert(exactRequestSequence.join('|') === [
      `${ROOT}:${TASK}`,
      `${ROOT}:${TASK}`,
      `${ROOT}:${TEACHER}`,
    ].join('|'), 'Projection reconciliation emitted an unexpected root/run request sequence', exactRequestSequence);
    assert(await page.locator('[role="treeitem"][aria-selected="true"]').count() === 1, 'More than one Team member row was selected after focus repair');
    await page.screenshot({ path: settlementCompleteScreenshotPath, fullPage: true });
    return {
      snapshotLoading,
      settlementLoading,
      finalState: await state(page),
      taskProjectionRequests: taskRequestsBeforeSettlement,
      fallbackProjectionRequest: teacherRequests[0],
    };
  });

  const browserErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror' || event.type === 'console:error');
  assert(browserErrors.length === 0, 'Browser page/console errors were observed', browserErrors);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({
      id: 'HARNESS', description: 'Run task Agent monitor visibility browser probe',
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
    evidencePath, nuxtLogPath, taskScreenshotPath,
    settlementLoadingScreenshotPath, settlementCompleteScreenshotPath,
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result === 'Pass') process.stdout.write(`Task Agent monitor visibility browser probe passed. Evidence: ${evidencePath}\n`);
else {
  process.stderr.write(`Task Agent monitor visibility browser probe failed. See ${evidencePath}\n`);
  process.exitCode = 1;
}
