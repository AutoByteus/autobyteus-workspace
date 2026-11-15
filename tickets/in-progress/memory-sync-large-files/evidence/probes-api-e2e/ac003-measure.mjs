#!/usr/bin/env node
// API-07 (AC-003 / QR-002): independent RSS measurement of a large Memory Sync transfer between two real built servers.
// Temporary probe (autobyteus-workspace-7, API/E2E engineer). Not a CI test.
//
// Usage: node ac003-measure.mjs <worktree> <out.json> <scenario> [sizeMiB]
//   scenario: cold          fresh hub + source, one Sync now with a <sizeMiB> file + one small trace
//             tiny-then-big fresh hub + source, Sync now with only a 1 KiB file (inline), then Sync now with a <sizeMiB> file
//             staged30-then-big fresh processes, a 30 MiB staged file first, then a <sizeMiB> file
// RSS: `ps -o rss= -p <pid>` of each server process every ~50 ms (40 ms sleep + one ps call); baseline = the RSS read just before the Sync now
// that is measured (after a 4 s idle); peak = highest sample until the mutation returns.
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const [worktree, outFile, scenario, sizeArg] = process.argv.slice(2);
const sizeMiB = Number(sizeArg ?? 2048);
const MiB = 1024 * 1024;
const serverRoot = path.join(worktree, 'autobyteus-server-ts');
const { attachOwnerCredentialToLoopback, createTestOwnerCredential } = await import(path.join(worktree, 'test-support/node-access/owner-credential-attachment.mjs'));
const credential = createTestOwnerCredential();
attachOwnerCredentialToLoopback(credential);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const rssMiB = (pid) => Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)]).toString().trim()) / 1024;

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ac003-')));
const children = [];
const startServer = async (name, logLevel) => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(root, name);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=${logLevel}\nHTTP_ACCESS_LOG_MODE=off\n`);
  const env = { PATH: process.env.PATH, HOME: path.join(root, `${name}-home`), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
    AUTOBYTEUS_SERVER_HOST: baseUrl, APP_ENV: 'test', LOG_LEVEL: logLevel, HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: credential };
  fs.mkdirSync(env.HOME, { recursive: true });
  const log = fs.createWriteStream(path.join(root, `${name}.log`));
  const child = spawn(process.execPath, [path.join(serverRoot, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir],
    { cwd: serverRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  children.push(child);
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`${name} exited`);
    if (await fetch(`${baseUrl}/rest/health`).then((r) => r.ok).catch(() => false)) break;
    if (Date.now() > deadline) throw new Error(`${name} health timeout`);
    await sleep(300);
  }
  return { name, port, baseUrl, dataDir, child };
};
const gql = async (server, query, variables) => {
  const r = await fetch(`${server.baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const p = await r.json();
  if (!r.ok || p.errors?.length) throw new Error(`${server.name} graphql: ${JSON.stringify(p.errors ?? p)}`);
  return p.data;
};
const hashFile = (file) => new Promise((resolve, reject) => {
  const h = createHash('sha256');
  fs.createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});
const writeBig = (file, mib) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const block = randomBytes(64 * MiB);
  const fd = fs.openSync(file, 'w');
  let left = mib;
  while (left > 0) { const n = Math.min(left, 64); fs.writeSync(fd, block, 0, n * MiB); left -= n; }
  fs.closeSync(fd);
};

const result = { scenario, sizeMiB, node: process.version, startedAt: new Date().toISOString(), runs: [], cleanup: {} };
try {
  const hub = await startServer('hub', 'ERROR');
  const source = await startServer('source', 'WARN');
  const enabled = await gql(hub, 'mutation($i:UpdateMemoryHubConfigInput!){updateMemoryHubConfig(input:$i){oneTimePlaintextToken}}', { i: { enabled: true, advertisedHubBaseUrl: hub.baseUrl } });
  await gql(source, 'mutation($i:UpdateMemorySyncSourceConfigInput!){updateMemorySyncSourceConfig(input:$i){source{enabled}}}',
    { i: { enabled: true, memorySyncSourceId: 'ac003', displayName: 'ac003', hubBaseUrl: hub.baseUrl, hubToken: enabled.updateMemoryHubConfig.oneTimePlaintextToken, backgroundEnabled: false, batchSize: 25 } });
  const memoryDir = path.join(source.dataDir, 'memory');
  const importRoot = path.join(hub.dataDir, 'memory', 'imports', 'ac003');

  const measure = async (label, relPath, prepare) => {
    await prepare();
    await sleep(4000);
    const baseline = { source: rssMiB(source.child.pid), hub: rssMiB(hub.child.pid) };
    const samples = [];
    let stop = false;
    const sampler = (async () => {
      while (!stop) {
        samples.push({ t: Date.now(), source: rssMiB(source.child.pid), hub: rssMiB(hub.child.pid) });
        await sleep(40);
      }
    })();
    const t0 = Date.now();
    const run = (await gql(source, 'mutation{startMemorySync{scannedFiles changedFiles committedBatches failedFiles}}')).startMemorySync;
    const ms = Date.now() - t0;
    stop = true; await sampler;
    await sleep(3000);
    const settled = { source: rssMiB(source.child.pid), hub: rssMiB(hub.child.pid) };
    const peak = { source: Math.max(...samples.map((s) => s.source)), hub: Math.max(...samples.map((s) => s.hub)) };
    let identical = null;
    if (relPath) {
      const [a, b] = await Promise.all([hashFile(path.join(memoryDir, 'agents', relPath)), hashFile(path.join(importRoot, 'agents', relPath))]);
      identical = a === b;
    }
    const f = (x) => Math.round(x * 10) / 10;
    const entry = { label, ms, run, baseline: { source: f(baseline.source), hub: f(baseline.hub) }, peak: { source: f(peak.source), hub: f(peak.hub) },
      growth: { source: f(peak.source - baseline.source), hub: f(peak.hub - baseline.hub) }, settledAfter3s: { source: f(settled.source), hub: f(settled.hub) },
      identical, samples: samples.length };
    result.runs.push(entry);
    console.log(JSON.stringify(entry));
    return entry;
  };
  const trace = () => fs.writeFileSync(path.join(memoryDir, 'agents', 'run-t', 'raw_traces_active.jsonl'), '{"t":1}\n');
  const big = (mib, name = 'video.bin') => () => { writeBig(path.join(memoryDir, 'agents', 'run-big', 'context_files', name), mib); fs.mkdirSync(path.join(memoryDir, 'agents', 'run-t'), { recursive: true }); trace(); };

  if (scenario === 'cold') {
    await measure(`cold ${sizeMiB} MiB`, 'run-big/context_files/video.bin', big(sizeMiB));
  } else if (scenario === 'tiny-then-big') {
    await measure('cold tiny 1 KiB inline', null, () => { fs.mkdirSync(path.join(memoryDir, 'agents', 'run-t'), { recursive: true }); trace(); });
    await measure(`warm ${sizeMiB} MiB after tiny`, 'run-big/context_files/video.bin', big(sizeMiB));
  } else if (scenario === 'staged30-then-big') {
    await measure('cold 30 MiB staged', 'run-s/context_files/s.bin', () => writeBig(path.join(memoryDir, 'agents', 'run-s', 'context_files', 's.bin'), 30));
    await measure(`warm ${sizeMiB} MiB after 30 MiB`, 'run-big/context_files/video.bin', big(sizeMiB));
  } else {
    throw new Error(`unknown scenario ${scenario}`);
  }
  result.result = 'Done';
} catch (error) {
  result.result = 'Error';
  result.error = String(error?.stack ?? error);
  console.error(result.error);
} finally {
  for (const c of children) { if (c.exitCode === null) c.kill('SIGTERM'); }
  await sleep(3000);
  for (const c of children) { if (c.exitCode === null) c.kill('SIGKILL'); }
  fs.rmSync(root, { recursive: true, force: true });
  result.cleanup = { removedRoot: !fs.existsSync(root), serversStopped: children.every((c) => c.exitCode !== null || c.signalCode !== null) };
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);
}
