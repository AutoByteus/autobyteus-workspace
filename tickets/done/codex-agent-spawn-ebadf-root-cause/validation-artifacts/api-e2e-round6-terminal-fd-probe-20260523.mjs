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
const summaryPath = path.join(artifactDir, 'api-e2e-round6-terminal-fd-probe-20260523.json');
const logPath = path.join(artifactDir, 'api-e2e-round6-terminal-fd-probe-20260523-server.log');
const lsofPath = path.join(artifactDir, 'api-e2e-round6-terminal-fd-probe-20260523-final-lsof.log');

const events = [];
const serverLog = [];
let server;
let dataDir;
let workspaceRoot;
let port;
function log(event, data = {}) { const entry = { at: new Date().toISOString(), event, ...data }; events.push(entry); console.log(JSON.stringify(entry)); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function freePort() { const srv = net.createServer(); await new Promise((resolve, reject) => { srv.once('error', reject); srv.listen(0, '127.0.0.1', resolve); }); const address = srv.address(); await new Promise((resolve) => srv.close(resolve)); return address.port; }
async function waitHealth(baseUrl) { const deadline = Date.now() + 90000; while (Date.now() < deadline) { if (server?.exitCode !== null) throw new Error('server exited'); try { const res = await fetch(`${baseUrl}/rest/health`); if (res.ok) return; } catch {} await sleep(500); } throw new Error('health timeout'); }
function lsof(pid) { try { return execFileSync('/usr/sbin/lsof', ['-nP', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }); } catch { return ''; } }
function fdCount() { const text = lsof(server.pid).trim(); return text ? Math.max(0, text.split('\n').length - 1) : 0; }
function children() { const output = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,comm='], { encoding: 'utf8' }); return output.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => { const m = line.match(/^(\d+)\s+(\d+)\s+(.+)$/); return m ? { pid: Number(m[1]), ppid: Number(m[2]), command: m[3] } : null; }).filter((entry) => entry && entry.ppid === server.pid); }

function findPrismaEnginePair() {
  const target = process.platform === 'darwin'
    ? (process.arch === 'arm64' ? 'darwin-arm64' : 'darwin')
    : process.platform === 'win32'
      ? 'windows'
      : 'debian-openssl-3.0.x';
  const cacheRoot = path.join(os.homedir(), '.cache', 'prisma', 'master');
  let best = null;
  try {
    for (const version of fs.readdirSync(cacheRoot)) {
      const targetDir = path.join(cacheRoot, version, target);
      const query = path.join(targetDir, 'libquery-engine');
      const schema = path.join(targetDir, process.platform === 'win32' ? 'schema-engine.exe' : 'schema-engine');
      if (!fs.existsSync(query) || !fs.existsSync(schema)) continue;
      const mtimeMs = Math.max(fs.statSync(query).mtimeMs, fs.statSync(schema).mtimeMs);
      if (!best || mtimeMs > best.mtimeMs) best = { query, schema, mtimeMs };
    }
  } catch {
    return null;
  }
  return best;
}

async function openTerminal(baseUrl, id) { const wsUrl = baseUrl.replace(/^http:/, 'ws:') + `/ws/terminal/${encodeURIComponent(id)}?cwd=${encodeURIComponent(workspaceRoot)}`; const socket = new WebSocket(wsUrl); await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`open timeout ${id}`)), 10000); socket.once('open', () => { clearTimeout(timer); resolve(); }); socket.once('error', (err) => { clearTimeout(timer); reject(err); }); }); return socket; }
async function closeSocket(socket) { if (!socket || socket.readyState === WebSocket.CLOSED) return; await new Promise((resolve) => { const timer = setTimeout(() => { socket.terminate(); resolve(); }, 5000); socket.once('close', () => { clearTimeout(timer); resolve(); }); socket.close(); }); }
function sendInput(socket, input) { socket.send(JSON.stringify({ type: 'input', data: Buffer.from(input).toString('base64') })); }
async function waitOutput(socket, marker) { let combined = ''; await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`output timeout ${marker}: ${combined.slice(-400)}`)), 10000); socket.on('message', function onMessage(raw) { try { const msg = JSON.parse(raw.toString()); if (msg?.type === 'output') combined += Buffer.from(msg.data, 'base64').toString('utf8'); } catch {} if (combined.includes(marker)) { clearTimeout(timer); socket.off('message', onMessage); resolve(); } }); }); return combined; }

async function main() {
  await fsp.mkdir(artifactDir, { recursive: true });
  port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'autobyteus-terminal-fd-probe-data-'));
  workspaceRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'autobyteus-terminal-fd-probe-ws-'));
  await fsp.writeFile(path.join(workspaceRoot, 'README.md'), 'terminal fd probe\n');
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
  const childEnv = { ...process.env, APP_ENV: 'production', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_DATA_DIR: dataDir, AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_INTERNAL_SERVER_BASE_URL: baseUrl, AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_MEMORY_DIR: path.join(dataDir, 'memory'), AUTOBYTEUS_LOG_DIR: path.join(dataDir, 'logs'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataDir, 'temp_workspace'), PRISMA_LOG_QUERIES: '0' };
  if (prismaEnginePair) {
    childEnv.PRISMA_QUERY_ENGINE_LIBRARY = prismaEnginePair.query;
    childEnv.PRISMA_SCHEMA_ENGINE_BINARY = prismaEnginePair.schema;
  } else {
    delete childEnv.PRISMA_QUERY_ENGINE_LIBRARY;
    delete childEnv.PRISMA_SCHEMA_ENGINE_BINARY;
  }
  server = spawn(process.execPath, [serverEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], { cwd: serverCwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => serverLog.push(chunk.toString()));
  server.stderr.on('data', (chunk) => serverLog.push(chunk.toString()));
  await waitHealth(baseUrl);
  await sleep(1000);
  const samples = [];
  const sample = (label) => { const item = { label, fdCount: fdCount(), childCount: children().length, children: children() }; samples.push(item); log('sample', item); return item; };
  sample('baseline');

  // One fully attached session to distinguish normal PTY setup costs from close-before-connect churn.
  const normal = await openTerminal(baseUrl, 'normal-1');
  sendInput(normal, 'printf "__AB_FD_PROBE_OK__:%s\\n" "$PWD"\n');
  await waitOutput(normal, '__AB_FD_PROBE_OK__');
  await closeSocket(normal);
  await sleep(2000);
  sample('after_normal_attached_close');

  for (let i = 1; i <= 25; i += 1) {
    const socket = await openTerminal(baseUrl, `early-${i}`);
    await closeSocket(socket);
    await sleep(i % 5 === 0 ? 1000 : 100);
    if (i === 1 || i === 5 || i === 10 || i === 15 || i === 20 || i === 25) sample(`after_early_close_${i}`);
  }
  await sleep(3000);
  const finalSample = sample('after_25_early_close_final_wait');
  await fsp.writeFile(lsofPath, lsof(server.pid));
  const normalSample = samples.find((item) => item.label === 'after_normal_attached_close');
  const allowedGrowth = 15;
  if (normalSample && finalSample.fdCount > normalSample.fdCount + allowedGrowth) {
    throw new Error(`terminal close-before-connect FD growth exceeded bound: after_normal_attached_close=${normalSample.fdCount}, after_25_early_close_final_wait=${finalSample.fdCount}, allowed_growth=${allowedGrowth}`);
  }
  await fsp.writeFile(summaryPath, JSON.stringify({ result: 'pass', samples, events }, null, 2));
}

async function cleanup() {
  await fsp.writeFile(logPath, serverLog.join('')).catch(() => undefined);
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([new Promise((resolve) => server.once('exit', resolve)), sleep(8000).then(() => server.kill('SIGKILL'))]).catch(() => undefined); }
  if (dataDir) await fsp.rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
  if (workspaceRoot) await fsp.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
}
try { await main(); } catch (error) { await fsp.writeFile(summaryPath, JSON.stringify({ result: 'fail', error: String(error), stack: error?.stack, events }, null, 2)).catch(() => undefined); console.error(error); process.exitCode = 1; } finally { await cleanup(); }
