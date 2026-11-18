// `pnpm dev` WebSockets through the dev frontend (autobyteus-437 CR-003, API-15).
//
// Purpose: the window of `pnpm dev` uses the frontend origin (http://127.0.0.1:3000) as its node, and the Nuxt dev
// server's proxy adds the development launch credential. A real WebSocket upgrade to the frontend must reach the
// backend: /ws/projects opens and is not closed for a missing credential, a GraphQL subscription socket
// (graphql-transport-ws) is acknowledged, and HTTP GraphQL answers through the same proxy. The client sends no
// credential: only the dev server holds it.
// Setup: starts `node scripts/development/run-dev.mjs` (this worktree's development stack: its own data root
// `.autobyteus/development`, ports 8000 and 3000, which must be free) and stops it afterwards.
// Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`); `pnpm install` done.
// Run (from the repository root, clean environment):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-web test:e2e:dev-proxy-websockets
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FRONTEND = 'http://127.0.0.1:3000';
const WS_FRONTEND = 'ws://127.0.0.1:3000';
const STARTUP_MS = 300_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (name, ok, details) => { results.push({ name, ok, details }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(details)}`); };

/** Opens a socket through the dev frontend and reports how it went within `settleMs`. */
const upgrade = (pathname, { protocol, onOpen, settleMs = 2_000 } = {}) => new Promise((resolve) => {
  const socket = new WebSocket(`${WS_FRONTEND}${pathname}`, protocol ? [protocol] : [], { headers: { origin: FRONTEND } });
  const outcome = { opened: false, status: null, close: null, messages: [] };
  const finish = () => { clearTimeout(timer); try { socket.close(); } catch { /* closed */ } resolve(outcome); };
  const timer = setTimeout(finish, settleMs);
  socket.on('upgrade', (response) => { outcome.status = response.statusCode; });
  socket.on('unexpected-response', (_request, response) => { outcome.status = response.statusCode; response.resume(); finish(); });
  socket.on('open', () => { outcome.opened = true; onOpen?.(socket); });
  socket.on('message', (data) => outcome.messages.push(String(data).slice(0, 200)));
  socket.on('close', (code, reason) => { outcome.close = { code, reason: String(reason) }; finish(); });
  socket.on('error', (error) => { outcome.error = error.message; });
});

const dev = spawn(process.execPath, ['scripts/development/run-dev.mjs'], { cwd: repositoryRoot, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
let devOutput = '';
dev.stdout.on('data', (chunk) => { devOutput += chunk; });
dev.stderr.on('data', (chunk) => { devOutput += chunk; });

let exitCode = 1;
try {
  const deadline = Date.now() + STARTUP_MS;
  let ready = false;
  while (Date.now() < deadline && dev.exitCode === null) {
    ready = await fetch(`${FRONTEND}/rest/health`).then((response) => response.ok, () => false);
    if (ready) break;
    await sleep(1_000);
  }
  if (!ready) throw new Error(`the dev stack did not answer on ${FRONTEND} in time:\n${devOutput.slice(-3000)}`);
  // A cold Nuxt dev server reloads once while it optimizes dependencies (TESTING.md): warm it up first.
  await fetch(`${FRONTEND}/`).catch(() => null);
  await sleep(5_000);

  const projects = await upgrade('/ws/projects');
  check('/ws/projects upgrades through the dev frontend and stays open', projects.opened && projects.status === 101 && projects.close === null, projects);

  const subscriptions = await upgrade('/graphql', {
    protocol: 'graphql-transport-ws',
    onOpen: (socket) => socket.send(JSON.stringify({ type: 'connection_init', payload: {} })),
  });
  check('/graphql subscription socket is acknowledged through the dev frontend', subscriptions.opened && subscriptions.messages.some((message) => message.includes('connection_ack')), subscriptions);

  const http = await fetch(`${FRONTEND}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', origin: FRONTEND }, body: JSON.stringify({ query: '{ __typename }' }) });
  const httpBody = await http.json().catch(() => null);
  check('HTTP GraphQL answers through the dev frontend', http.status === 200 && httpBody?.data?.__typename === 'Query', { status: http.status, body: httpBody });

  const restarts = (devOutput.match(/ECONNRESET/g) ?? []).length;
  check('the dev server did not reset on the upgrades', restarts === 0, { econnreset: restarts });
  exitCode = results.every((result) => result.ok) ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  dev.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => dev.once('exit', resolve)), sleep(20_000)]);
  if (dev.exitCode === null) dev.kill('SIGKILL');
}
console.log(JSON.stringify({ passed: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length }));
process.exit(exitCode);
