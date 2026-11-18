// API-02 (autobyteus-524 round 2, API/E2E): the desktop app's quit path. Spawns the built server (<root>/autobyteus-server-ts/
// dist/app.js) the way startBuiltTestServer does (same runtime root, sanitized env, launch owner credential), but with an IPC
// channel like the desktop's embedded server; waits for the IPC `ready`, an HTTP answer and <idleMs>; sends the shutdown
// `request` message and reports the time to the `complete`/`failed` reply and to the exit, and the exit code.
// Usage: node API-02-ipc-shutdown-probe.mjs <root> [rounds=10] [idleMs=3000]
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, rounds = '10', idleMs = '3000'] = process.argv.slice(2);
const boot = await import(pathToFileURL(path.join(root, 'test-support/live-e2e/test-runtime-bootstrap.mjs')).href);
const { createTestOwnerCredential } = await import(pathToFileURL(path.join(root, 'test-support/node-access/owner-credential-attachment.mjs')).href);
const WIRE = 'autobyteus.embedded-server.shutdown.v1:';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 1; i <= Number(rounds); i += 1) {
  const port = await boot.reserveLoopbackPort();
  const runtime = boot.materializeTestRuntime({ serverUrlOverride: `http://127.0.0.1:${port}` });
  const child = spawn(process.execPath, [boot.builtServerEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', runtime.runtimeRoot],
    { cwd: boot.serverRoot, env: boot.createSanitizedTestEnvironment({ AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: createTestOwnerCredential() }),
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let output = ''; child.stdout.on('data', (c) => { output += c; }); child.stderr.on('data', (c) => { output += c; });
  const messages = []; child.on('message', (m) => messages.push({ m, at: Date.now() }));
  const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal, at: Date.now() })));
  const t0 = Date.now();
  while (!messages.some((x) => x.m === `${WIRE}ready`) && Date.now() - t0 < 120_000) await wait(50);
  let http = null;
  while (Date.now() - t0 < 120_000) { try { http = (await fetch(`http://127.0.0.1:${port}/graphql`)).status; break; } catch { await wait(200); } }
  const startedMs = Date.now() - t0;
  await wait(Number(idleMs));
  const t1 = Date.now();
  child.send(`${WIRE}request`);
  const exit = await Promise.race([exited, wait(30_000).then(() => null)]);
  if (!exit) child.kill('SIGKILL');
  const reply = messages.find((x) => x.m === `${WIRE}complete` || x.m === `${WIRE}failed`);
  const lines = output.split('\n').filter((l) => /forcing exit|incomplete|unconfirmed|sweep/i.test(l)).slice(-4);
  console.log(JSON.stringify({ round: i, load: os.loadavg().map((v) => Math.round(v)), startedMs, httpStatus: http,
    replyMs: reply ? reply.at - t1 : null, reply: reply ? reply.m.slice(WIRE.length) : null,
    exitMs: exit ? exit.at - t1 : null, exitCode: exit?.code ?? null, signal: exit?.signal ?? null, shutdownLines: lines }));
}
process.exit(0);
