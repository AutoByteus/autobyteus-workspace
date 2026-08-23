#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { WebSocketServer } from 'ws';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '../..');
const fixturePath = path.join(here, 'fixtures/interrupt-result-presentation.page.vue');
const installedPagePath = path.join(webDir, 'pages/__interrupt-result-presentation-probe.vue');
const routePath = '/__interrupt-result-presentation-probe';
const outputArg = process.argv.indexOf('--output-dir');
const outputDir = path.resolve(
  process.cwd(),
  outputArg >= 0 ? process.argv[outputArg + 1] : 'test-results/interrupt-result-presentation',
);
const browserArg = process.argv.indexOf('--browser-executable');
const executablePath = browserArg >= 0
  ? process.argv[browserArg + 1]
  : process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const timeoutMs = 45_000;
const TEAM_RUN_ID = 'browser-team-run';
const TEAM_MEMBER_ADDRESS = '/review_group/critic';
const TEAM_MEMBER_RUN_ID = 'browser-task-team-critic-run';
const teamExecutionTree = {
  schema_version: 1,
  created_at: '2026-08-03T00:00:00.000Z',
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    team_definition_id: 'browser-team-definition',
    team_definition_name: 'Browser Team',
    team_run_id: TEAM_RUN_ID,
    coordinator_address: TEAM_MEMBER_ADDRESS,
    members: [{
      kind: 'configured_agent',
      address: TEAM_MEMBER_ADDRESS,
      agent_definition_id: 'browser-critic-definition',
      role: null,
      description: null,
      agent_run_id: TEAM_MEMBER_RUN_ID,
      platform_agent_run_id: null,
      launch_configuration: {
        runtime_kind: 'AUTOBYTEUS',
        llm_model_identifier: 'browser-probe-model',
        llm_config: null,
        auto_execute_tools: false,
        skill_access_mode: 'NONE',
        workspace_root_path: null,
      },
    }],
    task_executions: [],
  },
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
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};

const errorDetails = (error) => ({
  message: error instanceof Error ? error.message : String(error),
  ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
});

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = (child, timeout) => new Promise((resolve) => {
  if (childExited(child)) return resolve(true);
  let timer;
  const finish = (value) => {
    clearTimeout(timer);
    child.off('exit', onExit);
    resolve(value);
  };
  const onExit = () => finish(true);
  child.once('exit', onExit);
  timer = setTimeout(() => finish(childExited(child)), timeout);
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

const evidence = {
  generatedAt: new Date().toISOString(),
  browserExecutable: executablePath,
  frames: [],
  browserEvents: [],
  scenarios: {},
  cleanup: {},
  failures: [],
};

let mode = 'standalone-failed';
const connections = { standalone: new Set(), team: new Set() };
const normalizeTarget = (kind, command) => kind === 'standalone'
  ? { target_kind: 'standalone_run', run_id: 'browser-agent-run' }
  : {
      target_kind: 'team_member',
      team_run_id: TEAM_RUN_ID,
      agent_run_id: command.payload.agent_run_id,
    };

const sendJson = (socket, message) => socket.send(JSON.stringify(message));

const startWsServer = async () => {
  const port = await getFreePort();
  const server = new WebSocketServer({ host: '127.0.0.1', port });
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  server.on('connection', (socket, request) => {
    const kind = request.url?.includes('/ws/agent-team/') ? 'team' : 'standalone';
    connections[kind].add(socket);
    evidence.frames.push({ direction: 'connect', kind, url: request.url });
    socket.once('close', () => connections[kind].delete(socket));
    if (kind === 'standalone') {
      sendJson(socket, { type: 'CONNECTED', payload: { agent_id: 'browser-agent-run' } });
      sendJson(socket, { type: 'AGENT_STATUS', payload: { status: 'running', agent_id: 'browser-agent-run' } });
    } else {
      sendJson(socket, { type: 'CONNECTED', payload: { session_id: 'browser-team-session', root_team_run_id: TEAM_RUN_ID } });
      sendJson(socket, {
        type: 'TEAM_EXECUTION_VIEW_SNAPSHOT',
        payload: {
          root_team_run_id: TEAM_RUN_ID,
          base_change_sequence: 0,
          execution_tree: teamExecutionTree,
          tasks: [],
          messages: [],
          agent_statuses: [{
            agent_run_id: TEAM_MEMBER_RUN_ID,
            member_address: TEAM_MEMBER_ADDRESS,
            status: 'running',
            trigger: null,
            tool_name: null,
            error_message: null,
            error_details: null,
          }],
        },
      });
      sendJson(socket, { type: 'TEAM_RUN_LIFECYCLE', payload: { is_active: true } });
    }
    socket.on('message', (raw) => {
      const command = JSON.parse(raw.toString());
      evidence.frames.push({ direction: 'client-to-server', kind, mode, message: command });
      if (command.type !== 'INTERRUPT_GENERATION') return;
      if (mode === 'pending-disconnect') {
        socket.close(1011, 'probe disconnect before ack');
        return;
      }
      const target = normalizeTarget(kind, command);
      const accepted = mode === 'standalone-accepted';
      const payload = {
        command_type: 'INTERRUPT_GENERATION',
        command_id: command.payload.command_id,
        state: accepted ? 'accepted' : 'failed',
        ...(!accepted ? {
          code: kind === 'team' ? 'NO_ACTIVE_MEMBER_TURN' : 'NO_ACTIVE_TURN',
          message: kind === 'team'
            ? 'The nested member has no active provider turn.'
            : 'The provider has no active turn.',
        } : {}),
        ...(kind === 'team' ? { agent_run_id: target.agent_run_id } : { target }),
      };
      const response = { type: 'AGENT_COMMAND_ACK', payload };
      evidence.frames.push({ direction: 'server-to-client', kind, mode, message: response });
      sendJson(socket, response);
    });
  });
  return { server, port };
};

const closeWsServer = async (server) => {
  for (const set of Object.values(connections)) {
    for (const socket of set) socket.terminate();
  }
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out closing the owned WebSocket server')),
      5_000,
    );
    server.close((error) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    });
  });
  await waitFor(
    'owned WebSocket connections to close',
    () => Object.values(connections).every((set) => set.size === 0),
    5_000,
  );
};

const runScenario = async (id, fn) => {
  try {
    evidence.scenarios[id] = { result: 'Pass', details: await fn() };
  } catch (error) {
    const failure = { id, ...errorDetails(error) };
    evidence.scenarios[id] = { result: 'Fail', failure };
    evidence.failures.push(failure);
    throw error;
  }
};

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
let nuxt;
let nuxtLog;
let browser;
let wsServer;
let fixtureInstalled = false;
let fixtureInstallAttempted = false;
let executionError;
let nuxtLogError;
let nextContextId = 1;
const activeContexts = new Map();
evidence.cleanup.contexts = [];

const recordFailure = (id, error) => {
  const failure = { id, ...errorDetails(error) };
  evidence.failures.push(failure);
  return failure;
};

const closeTrackedContext = async (context, phase = 'scenario') => {
  const contextId = activeContexts.get(context) ?? `context-${nextContextId++}`;
  try {
    await context.close();
    evidence.cleanup.contexts.push({ id: contextId, phase, status: 'closed' });
    activeContexts.delete(context);
  } catch (error) {
    evidence.cleanup.contexts.push({ id: contextId, phase, status: 'failed', ...errorDetails(error) });
    recordFailure(`cleanup-${contextId}`, error);
  }
};

try {
  assert(existsSync(fixturePath), `Missing fixture ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite ${installedPagePath}`);
  assert(existsSync(executablePath), `Missing browser ${executablePath}`);
  fixtureInstallAttempted = true;
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;

  const ws = await startWsServer();
  wsServer = ws.server;
  evidence.wsPort = ws.port;
  const nuxtPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${nuxtPort}`;
  evidence.nuxtPort = nuxtPort;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtLog.on('error', (error) => {
    nuxtLogError = error;
  });
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(nuxtPort)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  await waitFor('Nuxt fixture route', async () => {
    if (childExited(nuxt)) throw new Error(`Nuxt exited ${nuxt.exitCode}/${nuxt.signalCode}`);
    const response = await fetch(`${baseUrl}${routePath}?wsPort=${ws.port}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });

  const openFixture = async (selected = 'standalone') => {
    const context = await browser.newContext({ viewport: { width: 1000, height: 760 }, locale: 'en-US' });
    const contextId = `context-${nextContextId++}`;
    activeContexts.set(context, contextId);
    await context.route('**/rest/health', (route) => route.fulfill({ status: 200, body: '{"status":"ok"}' }));
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
    const page = await context.newPage();
    page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
    page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
    await page.goto(`${baseUrl}${routePath}?wsPort=${ws.port}`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => window.__interruptProbe?.ready === true);
    } catch (error) {
      evidence.browserEvents.push({
        type: 'probe-readiness-timeout',
        url: page.url(),
        body: (await page.locator('body').innerText()).slice(0, 4000),
      });
      throw error;
    }
    await waitFor('both browser WebSockets', () => connections.standalone.size > 0 && connections.team.size > 0);
    if (selected === 'team') await page.locator('[data-test="select-team"]').click();
    await page.locator('button[title="Stop generation"]').waitFor({ state: 'visible' });
    return { context, page };
  };

  const snapshot = (page) => page.evaluate(() => window.__interruptProbe.snapshot());
  const toastTexts = async (page) => (await snapshot(page)).toastMessages;

  mode = 'standalone-failed';
  await runScenario('SR008-BR-001', async () => {
    const { context, page } = await openFixture('standalone');
    try {
      const before = await snapshot(page);
      await page.locator('button[title="Stop generation"]').click();
      await waitFor('one standalone failure toast', async () => (await toastTexts(page)).length === 1);
      const after = await snapshot(page);
      const toasts = await toastTexts(page);
      assert.match(toasts[0], /Could not stop browser-agent-run.*no active turn/i);
      assert.match(await page.locator('.fixed.top-5.right-5').innerText(), /Could not stop browser-agent-run/i);
      assert.equal(await page.locator('button[title="Stop generation"]').count(), 1);
      assert.equal(after.standaloneStatus, 'running');
      assert.equal(after.standaloneTranscriptCount, before.standaloneTranscriptCount);
      return { before, after, toasts };
    } finally {
      await closeTrackedContext(context);
    }
  });

  mode = 'standalone-accepted';
  await runScenario('SR008-BR-002', async () => {
    const { context, page } = await openFixture('standalone');
    try {
      const before = await snapshot(page);
      await page.locator('button[title="Stop generation"]').click();
      await waitFor('accepted interrupt frame', () => evidence.frames.some((frame) =>
        frame.mode === mode && frame.direction === 'server-to-client' && frame.message?.payload?.state === 'accepted'));
      await page.waitForTimeout(200);
      assert.equal((await toastTexts(page)).length, 0);
      assert.equal(await page.locator('button[title="Stop generation"]').count(), 1);
      const beforeTerminal = await snapshot(page);
      assert.equal(beforeTerminal.standaloneStatus, 'running');
      for (const socket of connections.standalone) {
        sendJson(socket, { type: 'AGENT_STATUS', payload: { status: 'idle', agent_id: 'browser-agent-run' } });
      }
      await page.locator('button[title="Send message"]').waitFor({ state: 'visible' });
      const afterTerminal = await snapshot(page);
      assert.equal(afterTerminal.standaloneStatus, 'idle');
      assert.equal(afterTerminal.standaloneTranscriptCount, before.standaloneTranscriptCount);
      return { before, beforeTerminal, afterTerminal };
    } finally {
      await closeTrackedContext(context);
    }
  });

  mode = 'pending-disconnect';
  await runScenario('SR008-BR-003', async () => {
    const { context, page } = await openFixture('standalone');
    try {
      const before = await snapshot(page);
      await page.locator('button[title="Stop generation"]').click();
      await waitFor('one disconnect toast', async () => (await toastTexts(page)).length === 1);
      await page.waitForTimeout(300);
      const toasts = await toastTexts(page);
      assert.equal(toasts.length, 1);
      assert.match(toasts[0], /Could not send Stop.*probe disconnect before ack/i);
      assert.match(await page.locator('.fixed.top-5.right-5').innerText(), /Could not send Stop/i);
      assert.equal(await page.locator('button[title="Stop generation"]').count(), 1);
      const after = await snapshot(page);
      assert.equal(after.standaloneStatus, 'running');
      assert.equal(after.standaloneTranscriptCount, before.standaloneTranscriptCount);
      return { before, after, toasts };
    } finally {
      await closeTrackedContext(context);
    }
  });

  mode = 'team-failed';
  await runScenario('SR008-BR-004', async () => {
    const { context, page } = await openFixture('team');
    try {
      const before = await snapshot(page);
      await page.locator('button[title="Stop generation"]').click();
      await waitFor('one nested team failure toast', async () => (await toastTexts(page)).length === 1);
      const after = await snapshot(page);
      const toasts = await toastTexts(page);
      assert.match(toasts[0], /Could not stop browser-task-team-critic-run.*no active provider turn/i);
      assert.match(await page.locator('.fixed.top-5.right-5').innerText(), /Could not stop browser-task-team-critic-run/i);
      assert.equal(await page.locator('button[title="Stop generation"]').count(), 1);
      assert.equal(after.teamIsActive, true);
      assert.equal(after.teamMemberStatus, 'running');
      assert.equal(after.teamTranscriptCount, before.teamTranscriptCount);
      const sent = evidence.frames.find((frame) =>
        frame.mode === mode && frame.direction === 'client-to-server' && frame.kind === 'team');
      assert.match(sent.message.payload.command_id, /^client_interrupt_/);
      assert.equal(sent.message.payload.agent_run_id, TEAM_MEMBER_RUN_ID);
      return { before, after, toasts, sent: sent.message };
    } finally {
      await closeTrackedContext(context);
    }
  });
} catch (error) {
  executionError = error;
  recordFailure('probe', error);
} finally {
  for (const context of [...activeContexts.keys()]) {
    await closeTrackedContext(context, 'finalizer');
  }

  if (browser) {
    try {
      await browser.close();
      evidence.cleanup.browser = { status: 'closed' };
    } catch (error) {
      evidence.cleanup.browser = { status: 'failed', ...errorDetails(error) };
      recordFailure('cleanup-browser', error);
    }
  } else {
    evidence.cleanup.browser = { status: 'not-started' };
  }

  if (wsServer) {
    try {
      await closeWsServer(wsServer);
      evidence.cleanup.webSocketServer = { status: 'closed' };
    } catch (error) {
      evidence.cleanup.webSocketServer = { status: 'failed', ...errorDetails(error) };
      recordFailure('cleanup-ws', error);
    }
  } else {
    evidence.cleanup.webSocketServer = { status: 'not-started' };
  }

  try {
    evidence.cleanup.nuxt = await stopOwnedProcess(nuxt);
  } catch (error) {
    evidence.cleanup.nuxt = { status: 'failed', ...errorDetails(error) };
    recordFailure('cleanup-nuxt', error);
  }

  if (nuxtLog) {
    try {
      await new Promise((resolve, reject) => {
        nuxtLog.once('error', reject);
        nuxtLog.end(resolve);
      });
      if (nuxtLogError) throw nuxtLogError;
      evidence.cleanup.nuxtLog = { status: 'closed' };
    } catch (error) {
      evidence.cleanup.nuxtLog = { status: 'failed', ...errorDetails(error) };
      recordFailure('cleanup-nuxt-log', error);
    }
  } else {
    evidence.cleanup.nuxtLog = { status: 'not-started' };
  }

  if (fixtureInstallAttempted) {
    try {
      await fs.rm(installedPagePath, { force: true });
    } catch (error) {
      recordFailure('cleanup-fixture', error);
    }
  }
  evidence.cleanup.fixtureRemoved = !existsSync(installedPagePath);
  evidence.cleanup.fixture = {
    status: evidence.cleanup.fixtureRemoved ? (fixtureInstalled ? 'removed' : 'absent') : 'failed',
    path: installedPagePath,
  };
  if (!evidence.cleanup.fixtureRemoved) {
    recordFailure('cleanup-fixture', new Error(`Owned fixture still exists at ${installedPagePath}`));
  }

  for (const eventType of ['pageerror', 'console:error']) {
    const events = evidence.browserEvents.filter((event) => event.type === eventType);
    if (events.length > 0) {
      recordFailure(`browser-${eventType}`, new Error(
        `${events.length} ${eventType} event(s): ${events.map((event) => event.text).join(' | ')}`,
      ));
    }
  }

  evidence.completedAt = new Date().toISOString();
  evidence.cleanup.evidenceFile = { status: 'written', path: evidencePath };
  try {
    await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  } catch (error) {
    throw new Error(`Could not write authoritative probe evidence: ${errorDetails(error).message}`, { cause: error });
  }
}

if (evidence.failures.length > 0) {
  const summary = evidence.failures.map((failure) => `${failure.id}: ${failure.message}`).join('; ');
  throw new Error(`Interrupt result presentation probe failed after cleanup: ${summary}`, {
    cause: executionError,
  });
}
console.log(`Interrupt result presentation probe passed. Evidence: ${evidencePath}`);
