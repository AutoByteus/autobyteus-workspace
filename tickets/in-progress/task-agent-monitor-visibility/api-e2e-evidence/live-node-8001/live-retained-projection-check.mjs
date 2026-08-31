#!/usr/bin/env node

import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.resolve(scriptDir, '../../../../..');
const webDir = path.join(worktree, 'autobyteus-web');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const outputDir = scriptDir;
const outputPath = path.join(outputDir, 'live-retained-projection-check.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const backendUrl = 'http://127.0.0.1:8001';
const rootTeamRunId = 'nested_classroom_test_team_3d07be9f368f459b94cf28ab9f20f434';
const taskAgentRunId = 'student_one_8e5ffe4a8dbb479294f7f0cd785b6bbd';
const configuredAgentRunId = 'student_one_88bc7221b197477388fc88e73874ae07';
const memberAddress = '/StudentStudyGroup/student_one';
const taskMarker = 'STUDENT_TWO_MONITOR_PROBE_ROUND3';
const evidence = {
  startedAt: new Date().toISOString(),
  backendUrl,
  rootTeamRunId,
  taskAgentRunId,
  configuredAgentRunId,
  memberAddress,
  result: 'Fail',
  captures: [],
  graphql: [],
  browserEvents: [],
  cleanup: {},
};

const assert = (condition, message, details) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const choosePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const childExited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = async (child, timeout) => childExited(child) ? true : await new Promise((resolve) => {
  const onExit = () => finish(true);
  const finish = (value) => { clearTimeout(timer); child.off('exit', onExit); resolve(value); };
  const timer = setTimeout(() => finish(childExited(child)), timeout);
  child.once('exit', onExit);
});
const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  const initial = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (!childExited(child)) {
    process.kill(-child.pid, 'SIGTERM');
    if (!await waitForChildExit(child, 10_000)) {
      process.kill(-child.pid, 'SIGKILL');
      await waitForChildExit(child, 5_000);
    }
  }
  return {
    status: childExited(child) ? 'terminated' : 'failed-to-terminate',
    ...initial,
    finalExitCode: child.exitCode,
    finalSignalCode: child.signalCode,
  };
};
const waitFor = async (label, predicate, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};

const componentRow = async (element) => element.evaluate((node) => {
  let component = node.__vueParentComponent;
  while (component) {
    if (component.props?.row?.agentRunId) {
      const row = component.props.row;
      return {
        rowKey: row.rowKey,
        agentRunId: row.agentRunId,
        memberAddress: row.memberAddress,
        currentStatus: row.currentStatus,
        transientKind: row.transientKind,
      };
    }
    component = component.parent;
  }
  return null;
});

const findExactTaskRow = async (page) => {
  const candidates = await page.locator(
    '[data-test="workspace-team-transient-execution-row"][data-node-kind="agent"]',
  ).all();
  for (const candidate of candidates) {
    const row = await componentRow(candidate);
    if (row?.agentRunId === taskAgentRunId) return candidate;
  }
  return null;
};

const capture = async (page, label) => page.evaluate((input) => {
  const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const app = document.querySelector('#__nuxt')?.__vue_app__;
  const pinia = app?.config?.globalProperties?.$pinia;
  const runHistory = pinia?._s?.get('runHistory');
  const teamContexts = pinia?._s?.get('agentTeamContexts');
  const activityStore = pinia?._s?.get('agentActivity');
  const team = teamContexts?.getTeamContextById?.(input.rootTeamRunId) || null;
  const focusedAgentRunId = team?.view?.getFocusedAgentRunId?.() || null;
  const focusedContext = focusedAgentRunId
    ? team?.view?.getAgentContext?.(focusedAgentRunId) || null
    : null;
  const currentRows = [...document.querySelectorAll('[role="treeitem"][aria-selected="true"]')].map((element) => ({
    dataTest: element.getAttribute('data-test'),
    memberAddress: element.getAttribute('data-member-address'),
    ariaLabel: element.getAttribute('aria-label'),
    text: compact(element.innerText),
  }));
  return {
    label: input.label,
    capturedAt: new Date().toISOString(),
    selectedTeamRunId: runHistory?.selectedTeamRunId || null,
    selectedTeamMemberAddress: runHistory?.selectedTeamMemberAddress || null,
    focusedAgentRunId,
    currentRows,
    focusedContext: focusedContext ? {
      runId: focusedContext.state?.runId || null,
      currentStatus: focusedContext.state?.currentStatus || null,
      conversationMessageCount: focusedContext.state?.conversation?.messages?.length || 0,
      activityCount: activityStore?.getActivities?.(focusedAgentRunId)?.length || 0,
      conversationText: compact(
        focusedContext.state?.conversation?.messages?.map?.((message) => message.text || message.content).join(' '),
      ).slice(0, 8000),
    } : null,
    mainText: compact(document.querySelector('main')?.innerText).slice(0, 12000),
  };
}, { label, rootTeamRunId });

let nuxt;
let nuxtLog;
let browser;
let context;
try {
  assert(existsSync(executablePath), 'Google Chrome executable is unavailable', executablePath);
  const backendHealth = await fetch(`${backendUrl}/rest/health`);
  assert(backendHealth.ok, 'Live backend health check failed', { status: backendHealth.status });
  evidence.backendHealth = { status: backendHealth.status, body: await backendHealth.text() };

  const port = await choosePort();
  evidence.frontendUrl = `http://127.0.0.1:${port}`;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: true,
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: backendUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  await waitFor('Nuxt live frontend', async () => {
    if (childExited(nuxt)) throw new Error(`Nuxt exited: ${nuxt.exitCode}/${nuxt.signalCode}`);
    return (await fetch(`${evidence.frontendUrl}/agents`)).ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US' });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));
  page.on('request', (request) => {
    if (!request.url().includes('/graphql')) return;
    try {
      const payload = request.postDataJSON();
      if (payload?.operationName === 'GetTeamMemberRunProjection'
        || String(payload?.query || '').includes('getTeamMemberRunProjection')) {
        evidence.graphql.push({
          operationName: payload.operationName || 'GetTeamMemberRunProjection',
          variables: payload.variables,
          requestedAt: new Date().toISOString(),
        });
      }
    } catch {}
  });

  // A clean Vite cache can discover lazy workspace dependencies only after the
  // first run-open attempt and reload the page. Retry the same read-only open
  // after that one-time optimization instead of treating setup noise as a
  // product navigation failure.
  let workspaceOpened = false;
  for (let attempt = 1; attempt <= 3 && !workspaceOpened; attempt += 1) {
    await page.goto(`${evidence.frontendUrl}/agents`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-test="workspace-row"]').first().waitFor({ state: 'visible' });
    const tempWorkspace = page.locator('[data-test="workspace-row"][data-workspace-id="temp_ws_default"]');
    await tempWorkspace.waitFor({ state: 'visible' });
    if (await tempWorkspace.getAttribute('aria-expanded') !== 'true') {
      await tempWorkspace.locator('button').first().evaluate((button) => button.click());
      await sleep(1200);
    }
    const definitionFound = await page.evaluate(() => {
      const button = [...document.querySelectorAll('aside button')].find((element) =>
        element.hasAttribute('aria-expanded')
        && String(element.innerText || '').includes('Nested Classroom Test Team'));
      if (!button) return false;
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      return true;
    });
    assert(definitionFound, 'Nested Classroom Test Team definition was not found');
    const runButton = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
    await runButton.waitFor({ state: 'visible' });
    await runButton.evaluate((button) => button.click());
    try {
      await page.waitForURL('**/workspace', { timeout: 20_000, waitUntil: 'domcontentloaded' });
      workspaceOpened = true;
    } catch {
      await sleep(2500);
    }
  }
  assert(workspaceOpened, 'Live TeamRun did not open after the one-time Vite optimization retry');
  await page.locator('textarea[placeholder="Type a message..."]').waitFor({ state: 'visible' });
  await sleep(2000);

  let taskRow = null;
  await waitFor('exact retained task row', async () => {
    taskRow = await findExactTaskRow(page);
    if (taskRow) return true;
    await page.evaluate((teamRunId) => {
      const disclosures = [...document.querySelectorAll(
        `[data-team-run-id="${teamRunId}"][aria-expanded="false"]`,
      )];
      for (const disclosure of disclosures) {
        const test = disclosure.getAttribute('data-test');
        if (test === 'workspace-team-member-disclosure' || test === 'workspace-team-transient-disclosure') {
          disclosure.click();
        }
      }
    }, rootTeamRunId);
    return false;
  });
  assert(taskRow, 'Exact task row was not resolved');
  const taskRowModel = await componentRow(taskRow);
  const taskAriaLabel = await taskRow.getAttribute('aria-label');
  assert(taskRowModel.agentRunId === taskAgentRunId, 'Task row resolved to the wrong AgentRun', taskRowModel);
  assert(taskRowModel.memberAddress === memberAddress, 'Task row resolved to the wrong member address', taskRowModel);
  assert(taskAriaLabel.includes(taskMarker), 'Task row omitted the retained task description', taskAriaLabel);
  await taskRow.evaluate((row) => row.click());
  const taskCapture = await waitFor('exact task projection', async () => {
    const current = await capture(page, 'task-selected');
    return current.focusedAgentRunId === taskAgentRunId
      && current.focusedContext?.conversationMessageCount === 2
      && current.focusedContext?.activityCount === 5
      && current.focusedContext?.conversationText.includes(taskMarker)
      ? current : null;
  });
  evidence.captures.push(taskCapture);
  await page.screenshot({ path: path.join(outputDir, 'task-selected.png'), fullPage: true });

  const configuredRow = page.locator(
    `[data-test="workspace-team-member-${rootTeamRunId}-${memberAddress}"]`,
  );
  await configuredRow.waitFor({ state: 'visible' });
  await configuredRow.evaluate((row) => row.click());
  const configuredCapture = await waitFor('exact configured member projection', async () => {
    const current = await capture(page, 'configured-member-selected');
    return current.focusedAgentRunId === configuredAgentRunId
      && current.focusedContext?.conversationMessageCount >= 20
      && current.focusedContext?.activityCount >= 10
      && current.focusedContext?.conversationText.includes('STUDENT_TWO_TASK_FINISHED')
      ? current : null;
  });
  evidence.captures.push(configuredCapture);
  await page.screenshot({ path: path.join(outputDir, 'configured-member-selected.png'), fullPage: true });

  taskRow = await findExactTaskRow(page);
  assert(taskRow, 'Exact task row disappeared after configured member selection');
  await taskRow.evaluate((row) => row.click());
  const reselectionCapture = await waitFor('exact task projection after reselection', async () => {
    const current = await capture(page, 'task-reselected');
    return current.focusedAgentRunId === taskAgentRunId
      && current.focusedContext?.conversationMessageCount === 2
      && current.focusedContext?.activityCount === 5
      && current.focusedContext?.conversationText.includes(taskMarker)
      ? current : null;
  });
  evidence.captures.push(reselectionCapture);

  assert(taskCapture.focusedContext.conversationText !== configuredCapture.focusedContext.conversationText,
    'Task and configured member content were not identity-isolated');
  assert(!taskCapture.focusedContext.conversationText.includes('No delegated tasks yet'),
    'Task monitor content was replaced by configured member content');
  const taskProjectionRequests = evidence.graphql.filter((entry) => entry.variables?.agentRunId === taskAgentRunId);
  const configuredProjectionRequests = evidence.graphql.filter((entry) => entry.variables?.agentRunId === configuredAgentRunId);
  assert(taskProjectionRequests.length >= 1, 'No exact task projection request was observed', evidence.graphql);
  assert(configuredProjectionRequests.length >= 1, 'No exact configured member projection request was observed', evidence.graphql);
  assert([...taskProjectionRequests, ...configuredProjectionRequests].every(
    (entry) => entry.variables?.teamRunId === rootTeamRunId,
  ), 'An exact projection request used the wrong root TeamRun', evidence.graphql);

  evidence.result = 'Pass';
} catch (error) {
  evidence.error = {
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  };
} finally {
  try { await context?.close(); evidence.cleanup.browserContext = context ? 'closed' : 'not-started'; }
  catch (error) { evidence.cleanup.browserContext = `failed: ${error.message}`; evidence.result = 'Fail'; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { evidence.cleanup.browser = `failed: ${error.message}`; evidence.result = 'Fail'; }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxt); }
  catch (error) { evidence.cleanup.nuxt = `failed: ${error.message}`; evidence.result = 'Fail'; }
  if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve));
  evidence.cleanup.nuxtLog = nuxtLog ? 'closed' : 'not-started';
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({ result: evidence.result, outputPath, captures: evidence.captures.map((item) => item.label) }, null, 2));
if (evidence.result !== 'Pass') process.exitCode = 1;
