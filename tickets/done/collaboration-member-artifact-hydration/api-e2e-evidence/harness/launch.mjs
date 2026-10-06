#!/usr/bin/env node
// Temporary API/E2E launcher for collaboration-member-artifact-hydration (adapted from the predecessor ticket's launcher).
// Owns: a private HOME/data/SQLite, the built worktree backend (dist) with the fake AGY CLI scripted for a gated
// multi-image turn, and a Nuxt dev frontend. Writes <owned>/state.json. On SIGTERM/SIGINT it stops its own process
// groups and removes the owned directory. Usage: node launch.mjs <worktree> <label>
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(process.argv[2]);
const label = process.argv[3] || 'run';
const server = path.join(root, 'autobyteus-server-ts');
const web = path.join(root, 'autobyteus-web');
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const owned = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `cmah-browser-${label}-`)));
const home = path.join(owned, 'home'); const data = path.join(owned, 'data');
await fs.mkdir(path.join(data, 'db'), { recursive: true }); await fs.mkdir(home); await fs.mkdir(path.join(owned, 'gates'));
const workspace = path.join(owned, 'workspace'); await fs.mkdir(workspace);
const port = await freePort(); const webPort = await freePort();
const backendUrl = `http://127.0.0.1:${port}`; const frontendUrl = `http://127.0.0.1:${webPort}`;
const database = pathToFileURL(path.join(data, 'db', 'test.db')).href;
const conversationId = randomUUID(); const gate = path.join(owned, 'gate');
const baseEnv = Object.fromEntries(['PATH', 'TMPDIR', 'LANG'].filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
const backendEnv = { ...baseEnv, HOME: home, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: database,
  AUTOBYTEUS_SERVER_HOST: backendUrl, AUTOBYTEUS_MEMORY_DIR: path.join(data, 'memory'), AUTOBYTEUS_LOG_DIR: path.join(data, 'logs'),
  AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(data, 'workspaces'),
  ANTIGRAVITY_CLI_COMMAND: '/tmp/cmah/agy-member-wrapper.mjs', CMAH_FIXTURE: path.join(server, 'tests/fixtures/agy-failure-cli.mjs'), CMAH_GATE_ROOT: path.join(owned, 'gates'), CMAH_LAUNCH_LOG: path.join(owned, 'agy-launches.jsonl'),
  AGY_FAKE_CASE: 'image_done', AGY_FAKE_IMAGE_STEPS: '1,2,3' };
await fs.writeFile(path.join(data, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${database}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
const children = [];
const start = (cmd, args, cwd, env, name) => {
  const log = createWriteStream(path.join(owned, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child); return child;
};
const stopAll = async () => {
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
    for (let i = 0; i < 100 && child.exitCode === null && child.signalCode === null; i++) await sleep(100);
    if (child.exitCode === null && child.signalCode === null) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
};
let stopping = false;
const shutdown = async () => {
  if (stopping) return; stopping = true;
  await stopAll();
  const keep = process.env.RFC_KEEP_LOGS_TO;
  if (keep) { await fs.mkdir(keep, { recursive: true }); for (const f of ['backend.log', 'frontend.log', 'migrate.log', 'agy-launches.jsonl']) await fs.copyFile(path.join(owned, f), path.join(keep, `${label}-${f}`)).catch(() => {}); }
  await fs.rm(owned, { recursive: true, force: true });
  console.log(`CLEANED ${owned}`);
  process.exit(0);
};
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
const migrate = start('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], server, backendEnv, 'migrate');
await new Promise((resolve, reject) => migrate.once('close', (code) => code === 0 ? resolve() : reject(new Error('migration failed'))));
const backend = start(process.execPath, [path.join(server, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], server, backendEnv, 'backend');
const waitHttp = async (url, what, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fetch(url).then((r) => r.ok).catch(() => false)) return; await sleep(250); } throw new Error(`timeout ${what}`); };
await waitHttp(`${backendUrl}/rest/health`, 'backend', 120000);
const frontend = start('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], web, { ...baseEnv, HOME: process.env.HOME, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, 'frontend');
await waitHttp(`${frontendUrl}/`, 'frontend', 300000);
const state = { owned, home, data, workspace, backendUrl, frontendUrl, conversationId, gate, backendPid: backend.pid, frontendPid: frontend.pid,
  brainDir: path.join(home, '.gemini', 'antigravity-cli', 'brain', conversationId) };
await fs.writeFile(path.join(owned, 'state.json'), JSON.stringify(state, null, 2));
console.log(`READY ${JSON.stringify(state)}`);
setInterval(() => {}, 1 << 30);
