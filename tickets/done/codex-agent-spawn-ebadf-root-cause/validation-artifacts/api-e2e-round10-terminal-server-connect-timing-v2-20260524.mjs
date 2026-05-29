import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import process from 'node:process';
import { createRequire } from 'node:module';

const repoRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause';
const serverCwd = path.join(repoRoot, 'autobyteus-server-ts');
const serverEntry = path.join(serverCwd, 'dist/app.js');
const artifactDir = path.join(repoRoot, 'tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts');
const requireFromServer = createRequire(path.join(serverCwd, 'package.json'));
const WebSocket = requireFromServer('ws');
const summaryPath = path.join(artifactDir, 'api-e2e-round10-terminal-server-connect-timing-v2-20260524.json');
const eventLogPath = path.join(artifactDir, 'api-e2e-round10-terminal-server-connect-timing-v2-20260524.log');
const serverLogPath = path.join(artifactDir, 'api-e2e-round10-terminal-server-connect-timing-v2-20260524-server.log');
const finalLsofPath = path.join(artifactDir, 'api-e2e-round10-terminal-server-connect-timing-v2-20260524-final-lsof.log');

const events = [];
const serverLog = [];
let server;
let dataDir;
let workspaceRoot;
let port;

function nowMs() { return Number(process.hrtime.bigint() / 1000000n); }
function log(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...data };
  events.push(entry);
  console.log(JSON.stringify(entry));
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function freePort() {
  const srv = net.createServer();
  await new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', resolve);
  });
  const address = srv.address();
  await new Promise((resolve) => srv.close(resolve));
  return address.port;
}
async function waitHealth(baseUrl) {
  const start = nowMs();
  const deadline = Date.now() + 90000;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    if (server?.exitCode !== null) throw new Error(`server exited before health, code=${server.exitCode}`);
    try {
      const res = await fetch(`${baseUrl}/rest/health`);
      if (res.ok) return { attempts, healthReadyMs: nowMs() - start };
    } catch {}
    await sleep(250);
  }
  throw new Error('health timeout');
}
function lsof(pid) {
  try { return execFileSync('/usr/sbin/lsof', ['-nP', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }); }
  catch { return ''; }
}
function fdCount() {
  const text = lsof(server.pid).trim();
  return text ? Math.max(0, text.split('\n').length - 1) : 0;
}
function children() {
  const output = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,comm='], { encoding: 'utf8' });
  return output.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
      return m ? { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] } : null;
    })
    .filter((entry) => entry && entry.ppid === server.pid);
}
function findPrismaEnginePair() {
  const target = process.platform === 'darwin'
    ? (process.arch === 'arm64' ? 'darwin-arm64' : 'darwin')
    : process.platform === 'win32'
      ? 'windows'
      : 'debian-openssl-3.0.x';
  const candidates = [];
  const pnpmRoot = path.join(repoRoot, 'node_modules/.pnpm');
  try {
    for (const dir of fs.readdirSync(pnpmRoot)) {
      if (!dir.startsWith('@prisma+engines@')) continue;
      const engineDir = path.join(pnpmRoot, dir, 'node_modules/@prisma/engines');
      const query = process.platform === 'darwin'
        ? path.join(engineDir, `libquery_engine-${target}.dylib.node`)
        : process.platform === 'win32'
          ? path.join(engineDir, `query_engine-${target}.dll.node`)
          : path.join(engineDir, `libquery_engine-${target}.so.node`);
      const schema = path.join(engineDir, process.platform === 'win32' ? 'schema-engine.exe' : `schema-engine-${target}`);
      if (fs.existsSync(query) && fs.existsSync(schema)) {
        candidates.push({ query, schema, mtimeMs: Math.max(fs.statSync(query).mtimeMs, fs.statSync(schema).mtimeMs) });
      }
    }
  } catch {}
  const cacheRoot = path.join(os.homedir(), '.cache', 'prisma', 'master');
  try {
    for (const version of fs.readdirSync(cacheRoot)) {
      const targetDir = path.join(cacheRoot, version, target);
      const query = path.join(targetDir, 'libquery-engine');
      const schema = path.join(targetDir, process.platform === 'win32' ? 'schema-engine.exe' : 'schema-engine');
      if (fs.existsSync(query) && fs.existsSync(schema)) {
        candidates.push({ query, schema, mtimeMs: Math.max(fs.statSync(query).mtimeMs, fs.statSync(schema).mtimeMs) });
      }
    }
  } catch {}
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0] ?? null;
}
function terminalUrl(baseUrl, id, cwd = workspaceRoot) {
  const url = new URL(`${baseUrl.replace(/^http:/, 'ws:')}/ws/terminal/${encodeURIComponent(id)}`);
  url.searchParams.set('cwd', cwd);
  return url.toString();
}
async function openTerminal(baseUrl, id, cwd = workspaceRoot) {
  const start = nowMs();
  const socket = new WebSocket(terminalUrl(baseUrl, id, cwd));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`open timeout ${id}`)), 10000);
    socket.once('open', () => { clearTimeout(timer); resolve(); });
    socket.once('error', (err) => { clearTimeout(timer); reject(err); });
    socket.once('unexpected-response', (_req, res) => { clearTimeout(timer); reject(new Error(`Unexpected response ${res.statusCode}`)); });
  });
  return { socket, openMs: nowMs() - start };
}
async function closeSocket(socket) {
  const start = nowMs();
  if (!socket || socket.readyState === WebSocket.CLOSED) return 0;
  await new Promise((resolve) => {
    const timer = setTimeout(() => { socket.terminate(); resolve(); }, 5000);
    socket.once('close', () => { clearTimeout(timer); resolve(); });
    socket.close();
  });
  return nowMs() - start;
}
function sendInput(socket, input) {
  socket.send(JSON.stringify({ type: 'input', data: Buffer.from(input).toString('base64') }));
}
async function waitOutput(socket, marker) {
  const start = nowMs();
  let combined = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`output timeout ${marker}: ${combined.slice(-400)}`)), 10000);
    socket.on('message', function onMessage(raw) {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'output') combined += Buffer.from(msg.data, 'base64').toString('utf8');
      } catch {}
      if (combined.includes(marker)) {
        clearTimeout(timer);
        socket.off('message', onMessage);
        resolve();
      }
    });
  });
  return { outputMs: nowMs() - start, outputTail: combined.slice(-500) };
}
async function invalidCwdClose(baseUrl) {
  const start = nowMs();
  const socket = new WebSocket(terminalUrl(baseUrl, 'invalid-cwd-timing', path.join(workspaceRoot, 'missing')));
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('invalid cwd close timeout')), 10000);
    socket.once('close', (code, reason) => { clearTimeout(timer); resolve({ closeMs: nowMs() - start, code, reason: reason.toString() }); });
    socket.once('error', (err) => { clearTimeout(timer); reject(err); });
  });
}
async function abortedBeforeOpen(baseUrl, id) {
  const start = nowMs();
  const socket = new WebSocket(terminalUrl(baseUrl, id));
  setImmediate(() => socket.terminate());
  return await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ closeMs: nowMs() - start, timedOut: true }), 5000);
    socket.once('close', (code, reason) => { clearTimeout(timer); resolve({ closeMs: nowMs() - start, code, reason: reason.toString() }); });
    socket.once('error', (error) => { log('aborted_before_open_error', { id, message: error.message }); });
  });
}
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    p50: pick(0.50) ?? null,
    p95: pick(0.95) ?? null,
    max: sorted[sorted.length - 1] ?? null,
    avg: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null,
  };
}

async function main() {
  await fsp.mkdir(artifactDir, { recursive: true });
  port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'autobyteus-terminal-timing-data-'));
  workspaceRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'autobyteus-terminal-timing-ws-'));
  await fsp.writeFile(path.join(workspaceRoot, 'README.md'), 'terminal timing probe\n');
  await fsp.writeFile(path.join(workspaceRoot, '.terminal_probe_marker'), 'ROUND9_ACTUAL_COMMAND_OUTPUT\n');
  await fsp.mkdir(path.join(dataDir, 'db'), { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'memory'), { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'logs'), { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'temp_workspace'), { recursive: true });
  const dbUrl = `file:${path.join(dataDir, 'db', 'production.db').replace(/\\/g, '/')}`;
  await fsp.writeFile(path.join(dataDir, '.env'), [
    'APP_ENV=production',
    'LOG_LEVEL=INFO',
    'PRISMA_LOG_QUERIES=0',
    'DB_TYPE=sqlite',
    `DATABASE_URL=${dbUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${baseUrl}`,
    `AUTOBYTEUS_MEMORY_DIR=${path.join(dataDir, 'memory')}`,
    `AUTOBYTEUS_LOG_DIR=${path.join(dataDir, 'logs')}`,
    `AUTOBYTEUS_TEMP_WORKSPACE_DIR=${path.join(dataDir, 'temp_workspace')}`,
    '',
  ].join('\n'));
  const prismaEnginePair = findPrismaEnginePair();
  const childEnv = {
    ...process.env,
    APP_ENV: 'production',
    DB_TYPE: 'sqlite',
    DATABASE_URL: dbUrl,
    AUTOBYTEUS_DATA_DIR: dataDir,
    AUTOBYTEUS_SERVER_HOST: baseUrl,
    AUTOBYTEUS_INTERNAL_SERVER_BASE_URL: baseUrl,
    AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'off',
    AUTOBYTEUS_MEMORY_DIR: path.join(dataDir, 'memory'),
    AUTOBYTEUS_LOG_DIR: path.join(dataDir, 'logs'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataDir, 'temp_workspace'),
    PRISMA_LOG_QUERIES: '0',
  };
  if (prismaEnginePair) {
    childEnv.PRISMA_QUERY_ENGINE_LIBRARY = prismaEnginePair.query;
    childEnv.PRISMA_SCHEMA_ENGINE_BINARY = prismaEnginePair.schema;
  } else {
    delete childEnv.PRISMA_QUERY_ENGINE_LIBRARY;
    delete childEnv.PRISMA_SCHEMA_ENGINE_BINARY;
  }
  log('starting_server', { serverEntry, baseUrl, dataDir, workspaceRoot, prismaEnginePair: prismaEnginePair ? 'found' : 'not_found' });
  server = spawn(process.execPath, [serverEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], { cwd: serverCwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => serverLog.push(chunk.toString()));
  server.stderr.on('data', (chunk) => serverLog.push(chunk.toString()));
  const health = await waitHealth(baseUrl);
  await sleep(1000);
  const samples = [];
  const sample = (label) => {
    const item = { label, fdCount: fdCount(), childCount: children().length, children: children(), at: new Date().toISOString() };
    samples.push(item);
    log('sample', item);
    return item;
  };
  const baseline = sample('baseline_after_health');
  const invalidCwd = await invalidCwdClose(baseUrl);
  log('invalid_cwd_close', invalidCwd);
  sample('after_invalid_cwd');

  const normalRuns = [];
  for (let i = 1; i <= 8; i += 1) {
    const id = `normal-${i}`;
    const { socket, openMs } = await openTerminal(baseUrl, id);
    const outputMarker = 'ROUND9_ACTUAL_COMMAND_OUTPUT';
    sendInput(socket, 'cat .terminal_probe_marker\n');
    const { outputMs, outputTail } = await waitOutput(socket, outputMarker);
    const closeMs = await closeSocket(socket);
    await sleep(800);
    const item = { id, openMs, outputMs, closeMs, outputTail, fdAfterClose: fdCount(), childCountAfterClose: children().length };
    normalRuns.push(item);
    log('normal_run', item);
  }
  const afterNormal = sample('after_8_normal_runs');

  const earlyCloseRuns = [];
  for (let i = 1; i <= 25; i += 1) {
    const id = `early-${i}`;
    const { socket, openMs } = await openTerminal(baseUrl, id);
    const closeMs = await closeSocket(socket);
    const item = { id, openMs, closeMs };
    earlyCloseRuns.push(item);
    if (i <= 3 || i % 5 === 0) log('early_close_run', item);
    await sleep(i % 5 === 0 ? 500 : 50);
  }
  await sleep(3000);
  const afterEarly = sample('after_25_early_close_final_wait');

  const abortBeforeOpenRuns = [];
  for (let i = 1; i <= 10; i += 1) {
    const item = { id: `abort-before-open-${i}`, ...(await abortedBeforeOpen(baseUrl, `abort-before-open-${i}`)) };
    abortBeforeOpenRuns.push(item);
    log('abort_before_open_run', item);
    await sleep(50);
  }
  await sleep(2000);
  const afterAbort = sample('after_10_abort_before_open_final_wait');

  const summary = {
    result: 'pass',
    startedAt: events[0]?.at,
    completedAt: new Date().toISOString(),
    baseUrl,
    serverPid: server.pid,
    health,
    baseline,
    invalidCwd,
    normalStats: {
      openMs: stats(normalRuns.map((r) => r.openMs)),
      outputMs: stats(normalRuns.map((r) => r.outputMs)),
      closeMs: stats(normalRuns.map((r) => r.closeMs)),
    },
    earlyCloseStats: {
      openMs: stats(earlyCloseRuns.map((r) => r.openMs)),
      closeMs: stats(earlyCloseRuns.map((r) => r.closeMs)),
    },
    abortBeforeOpenStats: {
      closeMs: stats(abortBeforeOpenRuns.map((r) => r.closeMs)),
    },
    normalRuns,
    earlyCloseRuns,
    abortBeforeOpenRuns,
    samples,
    thresholds: {
      maxNormalOpenMs: 5000,
      maxNormalOutputMs: 10000,
      maxEarlyOpenMs: 5000,
      maxCloseMs: 5000,
      maxFdGrowthFromAfterNormalToFinal: 15,
      expectedFinalChildCount: 0,
    },
    events,
  };
  const failures = [];
  if (summary.normalStats.openMs.max > summary.thresholds.maxNormalOpenMs) failures.push(`normal open max ${summary.normalStats.openMs.max}ms exceeded ${summary.thresholds.maxNormalOpenMs}ms`);
  if (summary.normalStats.outputMs.max > summary.thresholds.maxNormalOutputMs) failures.push(`normal output max ${summary.normalStats.outputMs.max}ms exceeded ${summary.thresholds.maxNormalOutputMs}ms`);
  if (summary.earlyCloseStats.openMs.max > summary.thresholds.maxEarlyOpenMs) failures.push(`early-close open max ${summary.earlyCloseStats.openMs.max}ms exceeded ${summary.thresholds.maxEarlyOpenMs}ms`);
  if (summary.normalStats.closeMs.max > summary.thresholds.maxCloseMs) failures.push(`normal close max ${summary.normalStats.closeMs.max}ms exceeded ${summary.thresholds.maxCloseMs}ms`);
  if (summary.earlyCloseStats.closeMs.max > summary.thresholds.maxCloseMs) failures.push(`early-close close max ${summary.earlyCloseStats.closeMs.max}ms exceeded ${summary.thresholds.maxCloseMs}ms`);
  if (afterAbort.fdCount > afterNormal.fdCount + summary.thresholds.maxFdGrowthFromAfterNormalToFinal) failures.push(`FD growth ${afterNormal.fdCount}->${afterAbort.fdCount} exceeded ${summary.thresholds.maxFdGrowthFromAfterNormalToFinal}`);
  if (afterAbort.childCount !== summary.thresholds.expectedFinalChildCount) failures.push(`final childCount ${afterAbort.childCount} expected ${summary.thresholds.expectedFinalChildCount}`);
  summary.failures = failures;
  if (failures.length) {
    summary.result = 'fail';
    throw new Error(failures.join('; '));
  }
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  await fsp.writeFile(finalLsofPath, lsof(server.pid));
  log('result', { result: 'pass', summaryPath, serverLogPath, finalLsofPath });
}

async function cleanup() {
  await fsp.writeFile(eventLogPath, events.map((entry) => JSON.stringify(entry)).join('\n') + '\n').catch(() => undefined);
  await fsp.writeFile(serverLogPath, serverLog.join('')).catch(() => undefined);
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(8000).then(() => server.kill('SIGKILL')),
    ]).catch(() => undefined);
  }
  if (dataDir) await fsp.rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
  if (workspaceRoot) await fsp.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
}

try {
  await main();
} catch (error) {
  const failSummary = {
    result: 'fail',
    error: String(error),
    stack: error?.stack,
    events,
  };
  await fsp.writeFile(summaryPath, JSON.stringify(failSummary, null, 2)).catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
