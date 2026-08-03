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
      team_run_id: 'browser-team-run',
      member_route_key: command.payload.target_member_route_key,
      member_run_id: command.payload.target_member_run_id ?? null,
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
      sendJson(socket, { type: 'CONNECTED', payload: { team_run_id: 'browser-team-run' } });
      sendJson(socket, {
        type: 'AGENT_STATUS',
        payload: {
          status: 'running',
          agent_id: 'browser-task-team-critic-run',
          team_run_id: 'browser-team-run',
          member_route_key: 'review_group/critic',
          member_run_id: 'browser-task-team-critic-run',
        },
      });
      sendJson(socket, { type: 'TEAM_RUN_LIFECYCLE', payload: { team_run_id: 'browser-team-run', is_active: true } });
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
      const payload = accepted
        ? {
            command_type: 'INTERRUPT_GENERATION',
            command_id: command.payload.command_id,
            state: 'accepted',
            target,
          }
        : {
            command_type: 'INTERRUPT_GENERATION',
            command_id: command.payload.command_id,
            state: 'failed',
            code: kind === 'team' ? 'NO_ACTIVE_MEMBER_TURN' : 'NO_ACTIVE_TURN',
            message: kind === 'team'
              ? 'The nested member has no active provider turn.'
              : 'The provider has no active turn.',
            target,
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
  await new Promise((resolve) => server.close(resolve));
};

const runScenario = async (id, fn) => {
  try {
    evidence.scenarios[id] = { result: 'Pass', details: await fn() };
  } catch (error) {
    const failure = { id, message: error instanceof Error ? error.message : String(error), stack: error?.stack };
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
let finalError;

try {
  assert(existsSync(fixturePath), `Missing fixture ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite ${installedPagePath}`);
  assert(existsSync(executablePath), `Missing browser ${executablePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;

  const ws = await startWsServer();
  wsServer = ws.server;
  evidence.wsPort = ws.port;
  const nuxtPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${nuxtPort}`;
  evidence.nuxtPort = nuxtPort;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
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
    await context.route('**/rest/health', (route) => route.fulfill({ status: 200, body: '{"status":"ok"}' }));
    await context.route('**/graphql', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          availableLlmProvidersWithModels: [],
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
    await page.waitForFunction(() => window.__interruptProbe?.ready === true);
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
      await context.close();
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
      await context.close();
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
      await context.close();
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
      assert.match(toasts[0], /Could not stop review_group\/critic.*no active provider turn/i);
      assert.match(await page.locator('.fixed.top-5.right-5').innerText(), /Could not stop review_group\/critic/i);
      assert.equal(await page.locator('button[title="Stop generation"]').count(), 1);
      assert.equal(after.teamIsActive, true);
      assert.equal(after.teamMemberStatus, 'running');
      assert.equal(after.teamTranscriptCount, before.teamTranscriptCount);
      const sent = evidence.frames.find((frame) =>
        frame.mode === mode && frame.direction === 'client-to-server' && frame.kind === 'team');
      assert.match(sent.message.payload.command_id, /^client_interrupt_/);
      assert.equal(sent.message.payload.target_member_route_key, 'review_group/critic');
      assert.equal(sent.message.payload.target_member_run_id, 'browser-task-team-critic-run');
      return { before, after, toasts, sent: sent.message };
    } finally {
      await context.close();
    }
  });

  assert.equal(evidence.failures.length, 0);
  assert.equal(evidence.browserEvents.filter((event) => event.type === 'pageerror').length, 0);
} catch (error) {
  finalError = error;
  evidence.failures.push({ id: 'probe', message: error instanceof Error ? error.message : String(error), stack: error?.stack });
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (wsServer) await closeWsServer(wsServer).catch((error) => {
    evidence.failures.push({ id: 'cleanup-ws', message: String(error) });
  });
  evidence.cleanup.nuxt = await stopOwnedProcess(nuxt).catch((error) => ({ status: 'failed', message: String(error) }));
  if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
  evidence.cleanup.fixtureRemoved = !existsSync(installedPagePath);
  if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve));
  evidence.completedAt = new Date().toISOString();
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (finalError) throw finalError;
console.log(`Interrupt result presentation probe passed. Evidence: ${evidencePath}`);
