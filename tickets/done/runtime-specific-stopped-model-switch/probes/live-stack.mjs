import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { startBuiltTestServer, reserveLoopbackPort, resolveTestDatabaseLocation, removeOwnedTestRuntime, createSanitizedTestEnvironment, testRuntimeRoot, workspaceRoot } from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const ticket = path.resolve(import.meta.dirname, '..');
const nonce = `runtime-switch-browser-${process.pid}-${Date.now()}`;
const runtimeRoot = path.join(testRuntimeRoot, nonce);
const database = resolveTestDatabaseLocation(`file:./db/${nonce}.db`);
const outputPath = path.join(ticket, 'probes', 'live-stack-info.json');
const logPath = path.join(ticket, 'probes', 'live-stack-nuxt.log');
const log = await fs.open(logPath, 'w');
let backend, frontend;
let ended = false;
const stop = async () => {
  if (ended) return;
  ended = true;
  if (frontend && frontend.exitCode === null) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { frontend.kill('SIGTERM'); }
    await new Promise(resolve => { const timer = setTimeout(resolve, 10000); frontend.once('exit', () => { clearTimeout(timer); resolve(); }); });
    if (frontend.exitCode === null) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { frontend.kill('SIGKILL'); } }
  }
  if (backend) await backend.stop().catch(() => backend.child.kill('SIGKILL'));
  await removeOwnedTestRuntime(runtimeRoot, database);
  await fs.rm(outputPath, { force: true });
  await log.close();
};
try {
  await fs.mkdir(path.join(runtimeRoot, 'isolated-home'), { recursive: true, mode: 0o700 });
  backend = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: process.env.HOME }) });
  const frontendPort = await reserveLoopbackPort();
  frontend = spawn('pnpm', ['dev', '--port', String(frontendPort)], {
    cwd: path.join(workspaceRoot, 'autobyteus-web'), detached: true,
    env: { ...process.env, NODE_ENV: 'development', NUXT_TEST: 'true', BACKEND_NODE_BASE_URL: backend.serverUrl, NUXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', log.fd, log.fd],
  });
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  let ready = false;
  for (let n=0;n<1200;n++) {
    if (frontend.exitCode !== null) throw new Error(`frontend exited ${frontend.exitCode}`);
    try { if ((await fetch(frontendUrl)).ok) { ready=true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('frontend readiness timeout');
  await fs.writeFile(outputPath, JSON.stringify({ backendUrl: backend.serverUrl, frontendUrl, runtimeRoot, databasePath: database.databasePath, backendPid: backend.child.pid, frontendPid: frontend.pid }, null, 2));
  console.log(`READY ${backend.serverUrl} ${frontendUrl}`);
  await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await stop(); }
