#!/usr/bin/env node
// API-04 (temporary probe, autobyteus-290): a real upgrade from the released build.
// The released build (origin/personal c78ffb15a2, built in its own worktree) makes real data on two nodes: they pair
// and alpha syncs memory into beta's hub. Then this worktree's build starts on the same data. A fresh pair of this
// build gives the current writers' shapes, which the converted files must match key for key.
//
// Usage: node API-04-released-upgrade-probe.mjs <released app.js> <current app.js> <output dir>
// Needs a clean environment (run under env -i with a temp HOME). Removes its temp root.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const [releasedApp, currentApp, outputDir] = process.argv.slice(2);
const SOURCE_ID = 'api04-source';
const RUN = 'api04-run';
const evidence = { releasedApp, currentApp, steps: {}, checks: [], result: 'Fail', error: null };
const check = (name, ok, detail) => { evidence.checks.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const listFiles = dir => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'api04-')));
const procs = new Set();

const node = async (name, app) => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(root, name);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  return { name, port, baseUrl, dataDir, app, child: null };
};
const start = async (n, app = n.app) => {
  const log = fs.createWriteStream(path.join(outputDir, `server-${n.name}.log`), { flags: 'a' });
  log.write(`--- start ${new Date().toISOString()} ${app}\n`);
  const child = spawn(process.execPath, [app, '--host', '127.0.0.1', '--port', String(n.port), '--data-dir', n.dataDir], {
    cwd: path.dirname(path.dirname(app)), stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, APP_ENV: 'test', LOG_LEVEL: 'WARN', HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: n.baseUrl } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  procs.add(child); n.child = child;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${n.name} exited`);
    if (await fetch(`${n.baseUrl}/rest/health`).then(r => r.ok).catch(() => false)) return;
    await sleep(300);
  }
  throw new Error(`${n.name} not healthy`);
};
const stop = async n => {
  if (!n.child || n.child.exitCode !== null) return;
  const done = new Promise(resolve => n.child.once('exit', resolve));
  n.child.kill('SIGTERM');
  await Promise.race([done, sleep(15_000)]);
  if (n.child.exitCode === null) n.child.kill('SIGKILL');
  procs.delete(n.child);
};
const gql = async (n, query, variables) => {
  const body = await (await fetch(`${n.baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors?.length) throw new Error(`${n.name}: ${JSON.stringify(body.errors)}`);
  return body.data;
};
const statusOf = async n => (await fetch(`${n.baseUrl}/rest/remote-access/status`)).json();
/** Sets up a pair with the given build's names: peers both ways; alpha syncs into beta's hub. */
const setUp = async (alpha, beta, idField, sourceField) => {
  const ids = { alpha: (await statusOf(alpha))[idField], beta: (await statusOf(beta))[idField] };
  for (const n of [alpha, beta]) await gql(n, 'mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await gql(alpha, 'mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: ids.beta, name: 'beta-node', baseUrl: beta.baseUrl } });
  await gql(beta, 'mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: ids.alpha, name: 'alpha-node', baseUrl: alpha.baseUrl } });
  const hub = await gql(beta, 'mutation($i:UpdateMemoryHubConfigInput!){updateMemoryHubConfig(input:$i){oneTimePlaintextToken}}', { i: { enabled: true, advertisedHubBaseUrl: beta.baseUrl } });
  const runDir = path.join(alpha.dataDir, 'memory', 'agents', RUN);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'run_metadata.json'), JSON.stringify({ runId: RUN, agentDefinitionId: 'api04-agent', workspaceRootPath: '/w', memoryDir: runDir,
    llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: false, runtimeKind: 'autobyteus', platformAgentRunId: null, startedAt: '2026-10-24T00:00:00.000Z' }));
  fs.writeFileSync(path.join(runDir, 'raw_traces_active.jsonl'), `${JSON.stringify({ id: 'b1', traceType: 'user', content: 'BEFORE-UPGRADE', seq: 1, ts: 1 })}\n`);
  await gql(alpha, `mutation($i:UpdateMemorySyncSourceConfigInput!){updateMemorySyncSourceConfig(input:$i){source{${sourceField}}}}`,
    { i: { enabled: true, [sourceField]: SOURCE_ID, displayName: 'Alpha', hubBaseUrl: beta.baseUrl, hubToken: hub.updateMemoryHubConfig.oneTimePlaintextToken, backgroundEnabled: false, batchSize: 25 } });
  const synced = (await gql(alpha, 'mutation{startMemorySync{committedBatches}}')).startMemorySync;
  return { ids, synced };
};
const keysOf = value => Array.isArray(value) ? value.map(entry => Object.keys(entry).sort()) : Object.keys(value).sort();
/** The stored files of the renamed stores with their key sets (and the nested `source` keys of the config). */
const shapes = n => {
  const out = {};
  const add = (label, file) => { if (fs.existsSync(file)) { const value = readJson(file); out[label] = { keys: keysOf(value), ...(value.source ? { sourceKeys: Object.keys(value.source).sort() } : {}) }; } };
  add('identity(released)', path.join(n.dataDir, 'remote-access', 'server-instance.json'));
  add('identity', path.join(n.dataDir, 'remote-access', 'node-identity.json'));
  add('config', path.join(n.dataDir, 'memory-sync', 'memory-sync-config.json'));
  for (const file of listFiles(path.join(n.dataDir, 'memory-sync', 'source-state')).filter(f => f.endsWith('.json'))) add(`state`, file);
  add('credentials', path.join(n.dataDir, 'memory-sync', 'hub-credentials.json'));
  const imp = path.join(n.dataDir, 'memory', 'imports', SOURCE_ID);
  add('import source(released)', path.join(imp, 'source-node.json'));
  add('import source', path.join(imp, 'memory-sync-source.json'));
  add('manifest', path.join(imp, 'sync-manifest.json'));
  add('peers', path.join(n.dataDir, 'remote-collaboration', 'peers.json'));
  return out;
};

fs.mkdirSync(outputDir, { recursive: true });
try {
  // 1. The released build makes real data.
  const alpha = await node('alpha', releasedApp);
  const beta = await node('beta', releasedApp);
  await Promise.all([start(alpha), start(beta)]);
  const releasedStatus = await statusOf(alpha);
  evidence.steps.releasedStatusKeys = Object.keys(releasedStatus).sort();
  const released = await setUp(alpha, beta, 'serverInstanceId', 'sourceNodeId');
  evidence.steps.released = released;
  await Promise.all([stop(alpha), stop(beta)]);
  const releasedFiles = { alpha: shapes(alpha), beta: shapes(beta) };
  evidence.steps.releasedShapes = releasedFiles;
  const releasedIdentity = { alpha: readJson(path.join(alpha.dataDir, 'remote-access', 'server-instance.json')), beta: readJson(path.join(beta.dataDir, 'remote-access', 'server-instance.json')) };
  check('the released build wrote server-instance.json {serverInstanceId, createdAt}', JSON.stringify(releasedFiles.alpha['identity(released)']?.keys) === JSON.stringify(['createdAt', 'serverInstanceId']), releasedFiles.alpha['identity(released)']);
  check('the released config has source.sourceNodeId', releasedFiles.alpha.config?.sourceKeys?.includes('sourceNodeId'), releasedFiles.alpha.config);
  check('the released state has sourceNodeId', releasedFiles.alpha.state?.keys?.includes('sourceNodeId'), releasedFiles.alpha.state);
  check('the released credentials have boundSourceNodeId', releasedFiles.beta.credentials?.keys?.[0]?.includes('boundSourceNodeId'), releasedFiles.beta.credentials);
  check('the released import has source-node.json {sourceNodeId}', releasedFiles.beta['import source(released)']?.keys?.includes('sourceNodeId'), releasedFiles.beta['import source(released)']);
  check('the released manifest has sourceNodeId', releasedFiles.beta.manifest?.keys?.includes('sourceNodeId'), releasedFiles.beta.manifest);

  // 2. This build starts on the released data.
  await Promise.all([start(alpha, currentApp), start(beta, currentApp)]);
  const upgradedStatus = { alpha: await statusOf(alpha), beta: await statusOf(beta) };
  check('alpha keeps its node ID', upgradedStatus.alpha.nodeId === releasedIdentity.alpha.serverInstanceId, upgradedStatus.alpha);
  check('beta keeps its node ID', upgradedStatus.beta.nodeId === releasedIdentity.beta.serverInstanceId, upgradedStatus.beta);
  const offer = async (from, id) => (await gql(from, 'query($n:String!){peerNodeOffer(nodeId:$n){entries{name} refusalCode}}', { n: id })).peerNodeOffer;
  const ab = await offer(alpha, upgradedStatus.beta.nodeId);
  const ba = await offer(beta, upgradedStatus.alpha.nodeId);
  check('alpha → beta: the peer is recognized', ab.entries !== null, ab);
  check('beta → alpha: the peer is recognized', ba.entries !== null, ba);
  const conn = (await gql(alpha, 'mutation{testMemoryHubConnection(input:{mode:SAVED}){ok authenticated memorySyncSourceId}}')).testMemoryHubConnection;
  check('Memory Sync: the hub knows the same source', conn.ok && conn.authenticated && conn.memorySyncSourceId === SOURCE_ID, conn);
  fs.writeFileSync(path.join(alpha.dataDir, 'memory', 'agents', RUN, 'raw_traces_after.jsonl'), `${JSON.stringify({ id: 'a1', traceType: 'user', content: 'AFTER-UPGRADE', seq: 1, ts: 1 })}\n`);
  const after = (await gql(alpha, 'mutation{startMemorySync{committedBatches changedFiles deferredFiles}}')).startMemorySync;
  check('Memory Sync continues: only the new file is sent', after.committedBatches === 1 && after.changedFiles === 1, after);
  check('one import folder, the same one', JSON.stringify(fs.readdirSync(path.join(beta.dataDir, 'memory', 'imports'))) === JSON.stringify([SOURCE_ID]), fs.readdirSync(path.join(beta.dataDir, 'memory', 'imports')));
  const backups = [alpha, beta].flatMap(n => listFiles(n.dataDir).filter(f => /\.backup-/.test(f)).map(f => path.relative(root, f)));
  evidence.steps.backups = backups;
  check('backups: identity ×2, config, state, credentials, import source, manifest', backups.filter(b => b.includes('server-instance.json.backup-')).length === 2
    && backups.some(b => b.includes('memory-sync-config.json.backup-')) && backups.some(b => b.includes('source-state') && b.includes('.backup-'))
    && backups.some(b => b.includes('hub-credentials.json.backup-')) && backups.some(b => b.includes('source-node.json.backup-')) && backups.some(b => b.includes('sync-manifest.json.backup-')), backups);
  await Promise.all([stop(alpha), stop(beta)]);
  const converted = { alpha: shapes(alpha), beta: shapes(beta) };
  evidence.steps.convertedShapes = converted;

  // 3. A third start changes nothing.
  const hashes = n => Object.fromEntries(listFiles(n.dataDir).filter(f => /remote-access|memory-sync|imports|remote-collaboration/.test(f)).sort()
    .map(f => [path.relative(n.dataDir, f), createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
  const settled = { alpha: hashes(alpha), beta: hashes(beta) };
  await Promise.all([start(alpha, currentApp), start(beta, currentApp)]);
  await sleep(1_000);
  check('a third start changes no stored file', JSON.stringify(hashes(alpha)) === JSON.stringify(settled.alpha) && JSON.stringify(hashes(beta)) === JSON.stringify(settled.beta));
  await Promise.all([stop(alpha), stop(beta)]);

  // 4. A fresh pair of this build: the current writers' shapes; the converted files must match them key for key.
  const fa = await node('fresh-alpha', currentApp);
  const fb = await node('fresh-beta', currentApp);
  await Promise.all([start(fa), start(fb)]);
  await setUp(fa, fb, 'nodeId', 'memorySyncSourceId');
  await Promise.all([stop(fa), stop(fb)]);
  const fresh = { alpha: shapes(fa), beta: shapes(fb) };
  evidence.steps.freshShapes = fresh;
  for (const side of ['alpha', 'beta']) {
    for (const label of Object.keys(fresh[side])) {
      check(`${side} ${label}: converted keys equal the current writer's`, JSON.stringify(converted[side][label]) === JSON.stringify(fresh[side][label]),
        { converted: converted[side][label], fresh: fresh[side][label] });
    }
    check(`${side}: no released file left`, !converted[side]['identity(released)'] && !converted[side]['import source(released)']);
  }
  evidence.result = evidence.checks.every(c => c.ok) ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error instanceof Error ? error.stack : String(error);
} finally {
  for (const child of procs) if (child.exitCode === null) child.kill('SIGKILL');
  fs.rmSync(root, { recursive: true, force: true });
  evidence.cleanup = { rootRemoved: !fs.existsSync(root) };
  fs.writeFileSync(path.join(outputDir, 'api04-released-upgrade.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`result ${evidence.result}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}
