import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fork, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const serverRoot = path.join(repoRoot, 'autobyteus-server-ts');
const taskRoot = path.join(repoRoot, 'tickets/in-progress/file-explorer-performance-analysis');
const artifactRoot = path.join(taskRoot, 'validation-artifacts/api-e2e');
const outputPath = path.join(artifactRoot, 'stop-path-e2e-tester-20260529.json');
const largeWorkspaceRoot = '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo';
const require = createRequire(path.join(serverRoot, 'package.json'));
const WebSocket = require('ws');

const capturedLogs = [];
for (const method of ['info', 'warn', 'error']) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    const line = args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    capturedLogs.push({ at: Date.now(), level: method, line });
    original(...args);
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = (promise, timeoutMs, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs)),
]);

async function psWatcherProcesses() {
  const { stdout } = await execFileAsync('ps', ['-axo', 'pid,ppid,command']);
  return stdout.split('\n')
    .filter((line) => /node .*dist\/file-explorer\/watcher\/runtime\/watcher-runtime-process\.js/.test(line))
    .map((line) => line.trim());
}

async function waitFor(predicate, timeoutMs, label, intervalMs = 10) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function waitWsOpen(ws, label, timeoutMs = 10000) {
  return withTimeout(new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  }), timeoutMs, `${label} open`);
}

function waitWsClose(ws, label, timeoutMs = 10000) {
  return withTimeout(new Promise((resolve, reject) => {
    ws.once('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    ws.once('error', reject);
  }), timeoutMs, `${label} close`);
}

function waitWsMessage(ws, predicate, label, timeoutMs = 20000) {
  return withTimeout(new Promise((resolve, reject) => {
    const onMessage = (data) => {
      const text = data.toString();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      if (predicate(parsed, text)) {
        cleanup();
        resolve({ parsed, text, at: Date.now(), now: performance.now() });
      }
    };
    const onClose = (code, reason) => {
      cleanup();
      reject(new Error(`${label} socket closed before expected message: ${code} ${reason}`));
    };
    const onError = (error) => { cleanup(); reject(error); };
    const cleanup = () => {
      ws.off('message', onMessage);
      ws.off('close', onClose);
      ws.off('error', onError);
    };
    ws.on('message', onMessage);
    ws.once('close', onClose);
    ws.once('error', onError);
  }), timeoutMs, label);
}

function encodeGraphql(query, variables = {}) {
  return JSON.stringify({ query, variables });
}

async function graphql(baseUrl, query, variables = {}) {
  const response = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: encodeGraphql(query, variables),
  });
  const text = await response.text();
  const parsed = JSON.parse(text);
  if (!response.ok || parsed.errors) {
    throw new Error(`GraphQL failed status=${response.status}: ${text}`);
  }
  return parsed.data;
}

async function startBuiltServer() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-stop-e2e-server-'));
  await fs.writeFile(path.join(dataDir, '.env'), [
    'AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:0',
    'LOG_LEVEL=INFO',
    'APP_ENV=test',
    'DB_TYPE=sqlite',
    '',
  ].join('\n'));
  process.env.AUTOBYTEUS_TIMING_TRACE = '1';
  process.env.AUTOBYTEUS_FILE_EXPLORER_WATCHER_TRACE = '1';
  process.env.LOG_LEVEL = 'INFO';
  process.env.APP_ENV = 'test';

  const { appConfigProvider } = await import(pathToFileURL(path.join(serverRoot, 'dist/config/app-config-provider.js')).href);
  appConfigProvider.resetForTests();
  const config = appConfigProvider.initialize({ appDataDir: dataDir });
  config.initialize();
  const { buildApp } = await import(pathToFileURL(path.join(serverRoot, 'dist/server-runtime.js')).href);
  const app = await buildApp();
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error(`Unexpected listen address ${String(address)}`);
  return {
    app,
    dataDir,
    baseUrl: `http://127.0.0.1:${address.port}`,
    wsBase: `ws://127.0.0.1:${address.port}`,
    port: address.port,
  };
}

async function createWorkspace(baseUrl, rootPath) {
  const data = await graphql(baseUrl, `
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
      createWorkspace(input: $input) { workspaceId workspaceRootPath }
    }
  `, { input: { rootPath } });
  return data.createWorkspace;
}

function extractTimingLines(sinceAt) {
  return capturedLogs.filter((entry) => entry.at >= sinceAt && entry.line.includes('[TIMING]')).map((entry) => entry.line);
}

async function realUiStopDuringSlowChildClose(server) {
  const workspace = await createWorkspace(server.baseUrl, largeWorkspaceRoot);
  const fileWs = new WebSocket(`${server.wsBase}/ws/file-explorer/${encodeURIComponent(workspace.workspaceId)}`);
  const fileOpenAt = performance.now();
  await waitWsOpen(fileWs, 'file explorer large workspace');
  await waitWsMessage(fileWs, (message) => message?.type === 'CONNECTED', 'file explorer CONNECTED', 30000);
  const fileConnectedMs = performance.now() - fileOpenAt;
  const processesWhileWatching = await psWatcherProcesses();

  const intervalGaps = [];
  let lastTick = performance.now();
  const interval = setInterval(() => {
    const now = performance.now();
    intervalGaps.push(now - lastTick);
    lastTick = now;
  }, 50);

  const closeRequestedAtWall = Date.now();
  const closeRequestedAt = performance.now();
  const fileClosePromise = waitWsClose(fileWs, 'file explorer stop websocket', 10000)
    .catch((error) => ({ error: error.message }));
  fileWs.close(1000, 'simulate-real-ui-files-tab-stop');

  const terminalSessionId = `stop-e2e-${randomUUID()}`;
  const marker = `STOP_E2E_READY_${Date.now()}`;
  const terminalUrl = new URL(`${server.wsBase}/ws/terminal/${encodeURIComponent(terminalSessionId)}`);
  terminalUrl.searchParams.set('cwd', largeWorkspaceRoot);
  const terminalWs = new WebSocket(terminalUrl.toString());
  const terminalOpenAt = performance.now();
  await waitWsOpen(terminalWs, 'terminal while file explorer stop is active', 8000);
  const terminalOpenMs = performance.now() - terminalOpenAt;
  terminalWs.send(JSON.stringify({ type: 'input', data: Buffer.from(`printf '${marker}\\n'\n`).toString('base64') }));
  await waitWsMessage(terminalWs, (message) => {
    if (message?.type !== 'output' || !message.data) return false;
    return Buffer.from(String(message.data), 'base64').toString('utf8').includes(marker);
  }, 'terminal readiness marker during stop', 10000);
  const terminalMarkerMs = performance.now() - terminalOpenAt;
  terminalWs.close(1000, 'terminal-stop-e2e-done');
  const fileCloseObserved = await fileClosePromise;
  clearInterval(interval);

  await sleep(6500);
  const timingLines = extractTimingLines(closeRequestedAtWall - 200);
  const stopBegin = timingLines.find((line) => line.includes('[FileSystemWatcher] stop.begin')) ?? null;
  const stopEnd = timingLines.find((line) => line.includes('[FileSystemWatcher] stop.end')) ?? null;
  const stopRequest = timingLines.find((line) => line.includes('[WatcherRuntimeClient] stop.request')) ?? null;
  const childStopped = timingLines.find((line) => line.includes('[WatcherRuntimeClient] message.stopped')) ?? null;
  const childKilled = timingLines.find((line) => line.includes('[WatcherRuntimeClient] kill')) ?? null;
  const childExit = timingLines.find((line) => line.includes('[WatcherRuntimeClient] exit')) ?? null;
  const processesAfterCleanup = await psWatcherProcesses();
  const logicalStopDurationMs = (() => {
    if (!stopEnd) return null;
    const match = stopEnd.match(/"durationMs":(\d+)/);
    return match ? Number(match[1]) : null;
  })();
  const maxParentEventLoopIntervalGapMs = intervalGaps.length ? Math.max(...intervalGaps) : 0;

  return {
    id: 'STOP-E2E-001',
    description: 'Real WebSocket stop during large-workspace child physical close, with Terminal opened immediately afterward.',
    workspace,
    fileConnectedMs: Number(fileConnectedMs.toFixed(1)),
    processesWhileWatching,
    closeToTerminalOpenStartMs: Number((terminalOpenAt - closeRequestedAt).toFixed(1)),
    terminalOpenMs: Number(terminalOpenMs.toFixed(1)),
    terminalMarkerMs: Number(terminalMarkerMs.toFixed(1)),
    fileCloseObserved,
    logicalStopDurationMs,
    maxParentEventLoopIntervalGapMs: Number(maxParentEventLoopIntervalGapMs.toFixed(1)),
    stopBegin,
    stopRequest,
    stopEnd,
    childStopped,
    childKilled,
    childExit,
    processesAfterCleanup,
    pass: Boolean(stopBegin && stopRequest && stopEnd && childExit)
      && logicalStopDurationMs !== null && logicalStopDurationMs < 100
      && terminalOpenMs < 1000
      && terminalMarkerMs < 5000
      && maxParentEventLoopIntervalGapMs < 500
      && processesAfterCleanup.length === 0,
  };
}

async function reconnectAfterStopAndResync(server) {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-stop-reconnect-ws-'));
  await fs.writeFile(path.join(workspaceRoot, 'initial.txt'), 'initial');
  const workspace = await createWorkspace(server.baseUrl, workspaceRoot);

  const first = new WebSocket(`${server.wsBase}/ws/file-explorer/${encodeURIComponent(workspace.workspaceId)}`);
  await waitWsOpen(first, 'first file explorer connection');
  await waitWsMessage(first, (message) => message?.type === 'CONNECTED', 'first CONNECTED', 15000);
  const firstClosePromise = waitWsClose(first, 'first file explorer connection');
  first.close(1000, 'first-stop-before-reconnect');
  await firstClosePromise;

  const second = new WebSocket(`${server.wsBase}/ws/file-explorer/${encodeURIComponent(workspace.workspaceId)}`);
  await waitWsOpen(second, 'second file explorer connection');
  await waitWsMessage(second, (message) => message?.type === 'CONNECTED', 'second CONNECTED', 15000);
  await graphql(server.baseUrl, `
    query FolderChildren($workspaceId: String!, $folderPath: String!) {
      folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
    }
  `, { workspaceId: workspace.workspaceId, folderPath: '' });
  const createdPath = path.join(workspaceRoot, 'after-reconnect.txt');
  const eventPromise = waitWsMessage(second, (message) => {
    if (message?.type !== 'FILE_SYSTEM_CHANGE') return false;
    return JSON.stringify(message.payload?.changes ?? []).includes('after-reconnect.txt');
  }, 'file event after reconnect', 15000);
  await fs.writeFile(createdPath, 'after reconnect');
  const event = await eventPromise;
  const secondClosePromise = waitWsClose(second, 'second file explorer connection');
  second.close(1000, 'second-stop-cleanup');
  await secondClosePromise;
  await sleep(1000);
  const processesAfterCleanup = await psWatcherProcesses();
  await fs.rm(workspaceRoot, { recursive: true, force: true });
  return {
    id: 'STOP-E2E-002',
    description: 'Stop/reconnect/resync simulation with real WebSocket clients and real watcher events.',
    workspaceId: workspace.workspaceId,
    eventReceivedAfterReconnect: event.parsed,
    processesAfterCleanup,
    pass: processesAfterCleanup.length === 0,
  };
}

async function childExitsOnParentDisconnect() {
  const entrypointPath = path.join(serverRoot, 'dist/file-explorer/watcher/runtime/watcher-runtime-process.js');
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ab-child-disconnect-ws-'));
  const watcherId = randomUUID();
  const generation = 1;
  const child = fork(entrypointPath, [], {
    cwd: path.dirname(entrypointPath),
    env: process.env,
    execArgv: [],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const childLogs = [];
  child.stdout?.on('data', (chunk) => childLogs.push(chunk.toString()));
  child.stderr?.on('data', (chunk) => childLogs.push(chunk.toString()));
  child.send({ type: 'start', watcherId, generation, workspaceRootPath: workspaceRoot });
  await withTimeout(new Promise((resolve, reject) => {
    child.on('message', (message) => {
      if (message?.type === 'ready') resolve(message);
      if (message?.type === 'error') reject(new Error(message.message));
    });
    child.once('error', reject);
  }), 10000, 'child ready before parent disconnect');
  const disconnectAt = performance.now();
  child.disconnect();
  const exit = await withTimeout(new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal, elapsedMs: performance.now() - disconnectAt }));
  }), 5000, 'child exit after parent disconnect');
  await fs.rm(workspaceRoot, { recursive: true, force: true });
  return {
    id: 'STOP-E2E-003',
    description: 'Built child runtime exits on parent IPC disconnect.',
    entrypointPath,
    exit: { ...exit, elapsedMs: Number(exit.elapsedMs.toFixed(1)) },
    childLogs: childLogs.join('').slice(-2000),
    pass: exit.code === 0 && !exit.signal && exit.elapsedMs < 5000,
  };
}

await fs.mkdir(artifactRoot, { recursive: true });
const result = {
  startedAt: new Date().toISOString(),
  serverRoot,
  scenarios: [],
};
const server = await startBuiltServer();
result.server = { baseUrl: server.baseUrl, wsBase: server.wsBase, port: server.port };
try {
  result.scenarios.push(await realUiStopDuringSlowChildClose(server));
  result.scenarios.push(await reconnectAfterStopAndResync(server));
  result.scenarios.push(await childExitsOnParentDisconnect());
} finally {
  await server.app.close().catch(() => undefined);
  await sleep(500);
  result.finalWatcherProcesses = await psWatcherProcesses().catch((error) => [`ps failed: ${error.message}`]);
  result.timingLogTail = capturedLogs.filter((entry) => entry.line.includes('[TIMING]')).slice(-120);
  result.finishedAt = new Date().toISOString();
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

if (!result.scenarios.every((scenario) => scenario.pass) || result.finalWatcherProcesses.length > 0) {
  process.exitCode = 1;
}
