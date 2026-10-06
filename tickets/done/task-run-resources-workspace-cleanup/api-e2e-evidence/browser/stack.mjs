#!/usr/bin/env node
// Owned real local stack for task-run-resources-workspace-cleanup browser validation.
// Same command line and environment keys as `pnpm dev` (scripts/development/development-runtime.mjs),
// but on free ports with a private temporary data root so no other work is touched. The AGY CLI is the
// repository's scripted fixture (TESTING.md), so Manager actions are real tool calls without inference.
//   node stack.mjs start <stateFile>   -> starts backend + Nuxt dev, writes {urls,pids,dataRoot} and keeps running
//   node stack.mjs restart-backend <stateFile> -> handled by the running process on SIGUSR2 (same data root, same port)
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.resolve(here, '../../../../..');
const serverRoot = path.join(worktree, 'autobyteus-server-ts');
const webRoot = path.join(worktree, 'autobyteus-web');
const stateFile = path.resolve(process.argv[3] ?? path.join(here, 'stack-state.json'));
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const waitFor = async (label, predicate, ms = 180000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await predicate()) return; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 250)); }
  throw new Error(`Timed out: ${label}`);
};

const dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'trrwc-browser-stack-'));
for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(dataRoot, dir), { recursive: true });
const backendPort = await freePort();
const frontendPort = await freePort();
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const databaseUrl = `file:${path.join(dataRoot, 'db', 'development.db')}`;
const backendEnv = {
  APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: backendUrl,
  AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'),
  AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
};
await fsp.writeFile(path.join(dataRoot, '.env'), `${Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
const ws = backendUrl.replace(/^http/, 'ws');
const frontendEnv = { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1',
  BACKEND_NODE_BASE_URL: backendUrl, BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`,
  BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`, BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`,
  BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` };

let backend; let backendStarts = 0;
const startBackend = async () => {
  backendStarts += 1;
  const log = fs.createWriteStream(path.join(here, `backend-${backendStarts}.log`));
  const env = { ...process.env, ...backendEnv, ANTIGRAVITY_CLI_COMMAND: path.join(serverRoot, 'tests/fixtures/agy-failure-cli.mjs'),
    AGY_FAKE_CASE: 'linked_skills' };
  for (const key of Object.keys(env)) if (key.startsWith('AUTOBYTEUS_') && !(key in backendEnv)) delete env[key];
  backend = spawn(process.execPath, [path.join(serverRoot, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot],
    { cwd: serverRoot, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let out = '';
  backend.stdout.on('data', (d) => { out += d; log.write(d); }); backend.stderr.on('data', (d) => { out += d; log.write(d); });
  await waitFor('backend listening', () => out.includes(`Server listening`) || out.includes(`:${backendPort}`) && out.toLowerCase().includes('listening'));
  await waitFor('backend graphql', async () => (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{__typename}' }) })).ok);
  return backend.pid;
};
const stopBackend = async () => {
  if (!backend || backend.exitCode !== null) return;
  process.kill(-backend.pid, 'SIGTERM');
  await waitFor('backend exit', () => backend.exitCode !== null || backend.signalCode !== null, 20000).catch(() => process.kill(-backend.pid, 'SIGKILL'));
};

await startBackend();
const frontendLog = fs.createWriteStream(path.join(here, 'frontend.log'));
const frontend = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)],
  { cwd: webRoot, env: frontendEnv, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
await waitFor('frontend', async () => (await fetch(frontendUrl)).ok);
const writeState = (extra = {}) => fs.writeFileSync(stateFile, `${JSON.stringify({ backendUrl, frontendUrl, dataRoot,
  workspace: path.join(dataRoot, 'workspace'), backendPid: backend.pid, frontendPid: frontend.pid, launcherPid: process.pid,
  backendStarts, ...extra }, null, 2)}\n`);
writeState();
process.stdout.write(`STACK_READY ${stateFile}\n`);

// SIGUSR2: restart the backend process on the same port and data root (real server restart).
process.on('SIGUSR2', async () => {
  try { await stopBackend(); await startBackend(); writeState({ restartedAt: new Date().toISOString() }); process.stdout.write('BACKEND_RESTARTED\n'); }
  catch (error) { process.stdout.write(`BACKEND_RESTART_FAILED ${error.message}\n`); }
});
const shutdown = async () => {
  await stopBackend();
  try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
  await waitFor('frontend exit', () => frontend.exitCode !== null || frontend.signalCode !== null, 20000).catch(() => { try { process.kill(-frontend.pid, 'SIGKILL'); } catch {} });
  await fsp.rm(dataRoot, { recursive: true, force: true });
  writeState({ stoppedAt: new Date().toISOString(), dataRootRemoved: !fs.existsSync(dataRoot),
    backendExit: backend.exitCode ?? backend.signalCode, frontendExit: frontend.exitCode ?? frontend.signalCode });
  process.exit(0);
};
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
setInterval(() => {}, 1 << 30);
