#!/usr/bin/env node
// API-09 / API-10 / API-11: real-use lifecycle scenarios of large-file Memory Sync between two real built servers.
// Temporary probe (autobyteus-workspace-7, API/E2E engineer). Not a CI test.
//
//   RS3  (API-11)  the staged routes' gate and limits, as a hub that is the user's own node sees them: no credential, the node's
//                  owner credential, a wrong token, the source's token for another source id, oversize piece, wrong offset, wrong type.
//   RS1  (API-09)  Sync now (twice) while the background loop is uploading a large file: one manual run is queued, runs do not overlap.
//   RS2a (API-10)  the hub process is killed (SIGKILL) while pieces are uploading; it restarts on the same port and data; the next run resumes.
//   RS2b (API-10)  the hub process is killed while it verifies the committed file; it restarts; the next run commits without re-uploading.
// Usage: node lifecycle-probe.mjs <worktree> <outputDir>
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [worktree, outputDir] = process.argv.slice(2);
const serverRoot = path.join(worktree, 'autobyteus-server-ts');
const { attachOwnerCredentialToLoopback, createTestOwnerCredential } = await import(path.join(worktree, 'test-support/node-access/owner-credential-attachment.mjs'));
const credential = createTestOwnerCredential();
attachOwnerCredentialToLoopback(credential);
const MiB = 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
fs.mkdirSync(outputDir, { recursive: true });
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-')));
const children = new Set();
const result = { startedAt: new Date().toISOString(), node: process.version, cases: {}, cleanup: {}, error: null };
const SOURCE_ID = 'rs-source';
const check = (caseId, name, ok, detail) => { (result.cases[caseId] ??= { checks: [] }).checks.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${caseId} ${name} ${detail !== undefined ? JSON.stringify(detail) : ''}`); };

const startServer = async (name, logLevel, port, dataDir) => {
  const baseUrl = `http://127.0.0.1:${port}`;
  fs.mkdirSync(dataDir, { recursive: true });
  const envFile = path.join(dataDir, '.env');
  if (!fs.existsSync(envFile)) fs.writeFileSync(envFile, `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=${logLevel}\nHTTP_ACCESS_LOG_MODE=off\n`);
  const home = path.join(root, `${name}-home`); fs.mkdirSync(home, { recursive: true });
  const log = fs.createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
  const child = spawn(process.execPath, [path.join(serverRoot, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverRoot, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: logLevel, HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: credential } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  children.add(child);
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`${name} exited ${child.exitCode}`);
    if (await fetch(`${baseUrl}/rest/health`).then((r) => r.ok).catch(() => false)) break;
    if (Date.now() > deadline) throw new Error(`${name} health timeout`);
    await sleep(300);
  }
  return { name, port, baseUrl, dataDir, child };
};
const gql = async (server, query, variables) => {
  const r = await fetch(`${server.baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const p = await r.json();
  if (!r.ok || p.errors?.length) throw new Error(`${server.name} graphql: ${r.status} ${JSON.stringify(p.errors ?? p)}`);
  return p.data;
};
const sha256Buffer = (b) => createHash('sha256').update(b).digest('hex');
const hashFile = (file) => new Promise((resolve, reject) => {
  const h = createHash('sha256');
  fs.createReadStream(file).on('data', (c) => h.update(c)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});
const writeBig = (file, mib) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const block = randomBytes(Math.min(mib, 64) * MiB);
  const fd = fs.openSync(file, 'w');
  let left = mib;
  while (left > 0) { const n = Math.min(left, Math.min(mib, 64)); fs.writeSync(fd, block, 0, n * MiB); left -= n; }
  fs.closeSync(fd);
};
const waitFor = async (what, fn, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) { if (await fn()) return; if (Date.now() > deadline) throw new Error(`timeout: ${what}`); await sleep(50); }
};

// Relay between the source and the hub: records every request, throttles pieces, can kill the hub.
const startRelay = async (getHub) => {
  const events = [];
  const control = { putDelayMs: 0, killHubAfterPuts: null, killHubOnCommitAfterMs: null, puts: 0, killed: false };
  const server = http.createServer(async (request, response) => {
    const chunks = []; for await (const c of request) chunks.push(c);
    const body = Buffer.concat(chunks);
    const method = request.method ?? 'GET';
    const url = request.url ?? '/';
    const kind = method === 'PUT' ? 'put' : method === 'POST' ? 'commit' : 'get';
    events.push({ t: Date.now(), phase: 'in', kind, url: url.replace(/[0-9a-f]{64}/, (m) => m.slice(0, 8)), bytes: body.length });
    const hub = getHub();
    try {
      if (method === 'PUT') {
        control.puts += 1;
        if (control.putDelayMs) await sleep(control.putDelayMs);
      }
      const forward = fetch(`${hub.baseUrl}${url}`, { method, headers: { authorization: String(request.headers.authorization ?? ''),
        ...(request.headers['content-type'] ? { 'content-type': String(request.headers['content-type']) } : {}) }, body: method === 'GET' || method === 'HEAD' ? undefined : body });
      if (method === 'POST' && control.killHubOnCommitAfterMs !== null) {
        await sleep(control.killHubOnCommitAfterMs);
        control.killHubOnCommitAfterMs = null;
        hub.child.kill('SIGKILL'); control.killed = true;
        events.push({ t: Date.now(), phase: 'hub-killed', kind: 'during-commit' });
      }
      const upstream = await forward;
      const payload = Buffer.from(await upstream.arrayBuffer());
      events.push({ t: Date.now(), phase: 'out', kind, status: upstream.status });
      response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
      response.end(payload);
      if (method === 'PUT' && control.killHubAfterPuts !== null && control.puts >= control.killHubAfterPuts) {
        control.killHubAfterPuts = null;
        hub.child.kill('SIGKILL'); control.killed = true;
        events.push({ t: Date.now(), phase: 'hub-killed', kind: 'during-upload' });
      }
    } catch (error) {
      events.push({ t: Date.now(), phase: 'relay-error', kind, error: String(error?.cause?.code ?? error) });
      request.socket.destroy();
    }
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { baseUrl: `http://127.0.0.1:${port}`, events, control, close: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); }) };
};

// A raw HTTP/1.1 request on a socket: nothing attaches a credential to it.
const rawRequest = (port, method, pathName, headers = {}, body = Buffer.alloc(0)) => new Promise((resolve, reject) => {
  const socket = net.connect(port, '127.0.0.1');
  const chunks = [];
  socket.on('data', (c) => chunks.push(c));
  socket.on('error', reject);
  socket.on('close', () => {
    const text = Buffer.concat(chunks).toString('utf-8');
    resolve({ status: Number(text.split(' ')[1]), body: text.split('\r\n\r\n').slice(1).join('\r\n\r\n').slice(0, 300) });
  });
  const head = [`${method} ${pathName} HTTP/1.1`, `Host: 127.0.0.1:${port}`, 'Connection: close', `Content-Length: ${body.length}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), '', ''].join('\r\n');
  socket.write(head); socket.write(body); socket.end();
});

let hub; let source; let relay;
const hubDir = path.join(root, 'hub');
const startHub = () => startServer('hub', 'ERROR', hubPort, hubDir);
const hubPort = await freePort();
const state = async () => (await gql(source, '{getMemorySyncStatus{sourceState{jobState lastError fileFailureCount lastSuccessfulSyncAt}}}')).getMemorySyncStatus.sourceState;
const syncNow = () => gql(source, 'mutation{startMemorySync{scannedFiles changedFiles unchangedFiles committedBatches failedFiles deferredFiles}}').then((d) => d.startMemorySync);
const hubManifest = () => JSON.parse(fs.readFileSync(path.join(hubDir, 'memory/imports', SOURCE_ID, 'sync-manifest.json'), 'utf-8')).files;
const imported = (...segments) => path.join(hubDir, 'memory/imports', SOURCE_ID, 'agents', ...segments);
const stagingDir = path.join(hubDir, 'memory/memory-sync-staging', SOURCE_ID);

try {
  hub = await startHub();
  source = await startServer('source', 'INFO', await freePort(), path.join(root, 'source'));
  relay = await startRelay(() => hub);
  const enabled = await gql(hub, 'mutation($i:UpdateMemoryHubConfigInput!){updateMemoryHubConfig(input:$i){oneTimePlaintextToken}}', { i: { enabled: true, advertisedHubBaseUrl: hub.baseUrl } });
  const hubToken = enabled.updateMemoryHubConfig.oneTimePlaintextToken;
  const configureSource = (extra = {}) => gql(source, 'mutation($i:UpdateMemorySyncSourceConfigInput!){updateMemorySyncSourceConfig(input:$i){source{enabled}}}',
    { i: { enabled: true, memorySyncSourceId: SOURCE_ID, displayName: 'lifecycle', hubBaseUrl: relay.baseUrl, hubToken, backgroundEnabled: false, batchSize: 25, ...extra } });
  await configureSource();
  const memoryDir = path.join(source.dataDir, 'memory', 'agents');
  const srcFile = (...s) => path.join(memoryDir, ...s);

  // ---------------- RS3 (API-11): the staged routes' gate and limits ----------------
  {
    const id = 'API-11';
    const sha = sha256Buffer(Buffer.from('gate-probe'));
    const route = (sourceId = SOURCE_ID) => `/rest/memory-sync/v1/sources/${sourceId}/staged-files/${sha}`;
    result.cases['API-11'] = { checks: [] };
    const noCred = await rawRequest(hub.port, 'GET', route());
    check(id, 'no credential -> refused (401/403)', [401, 403].includes(noCred.status), noCred);
    const viaFetch = async (method, pathName, headers, body) => { const r = await fetch(`${hub.baseUrl}${pathName}`, { method, headers, body }); return { status: r.status, body: (await r.text()).slice(0, 300) }; };
    const owner = await viaFetch('GET', route(), { Authorization: `Bearer ${credential}` });
    check(id, "the node's own owner credential on the staged route -> refused (401/403)", [401, 403].includes(owner.status), owner);
    const wrong = await viaFetch('GET', route(), { Authorization: 'Bearer mhub_wrongtokenwrongtokenwrongtoken0000' });
    check(id, 'a wrong token -> refused (401/403)', [401, 403].includes(wrong.status), wrong);
    const goodRaw = await rawRequest(hub.port, 'GET', route(), { Authorization: `Bearer ${hubToken}` }).catch((e) => ({ status: null, body: String(e) }));
    result.cases['API-11'].rawGoodTokenObservation = goodRaw;
    const good = await viaFetch('GET', route(), { Authorization: `Bearer ${hubToken}` });
    check(id, 'the source token, its own source id -> 200 receivedBytes 0', good.status === 200 && good.body.includes('"receivedBytes":0'), good);
    const other = await viaFetch('GET', route('other-source'), { Authorization: `Bearer ${hubToken}` });
    check(id, 'the source token for another source id -> refused (4xx, not 200)', other.status >= 400 && other.status < 500, other);
    const piece = (offset, bytes, type = 'application/octet-stream') => viaFetch('PUT', `${route()}?offset=${offset}`, { Authorization: `Bearer ${hubToken}`, 'Content-Type': type }, bytes);
    const over = await piece(0, Buffer.alloc(8 * MiB + 1));
    check(id, 'a piece of 8 MiB + 1 byte -> 413', over.status === 413, over);
    const badOffset = await piece(5, Buffer.from('abc'));
    check(id, 'a piece at an offset that is not the received length -> 409', badOffset.status === 409, badOffset);
    const wrongType = await piece(0, Buffer.from('{}'), 'application/json');
    // The route answers 400 with an explicit message (it checks the body is a Buffer); round 1 of this probe expected 415 by guess.
    check(id, 'a piece sent as application/json -> 400 "must be sent as application/octet-stream"', wrongType.status === 400 && wrongType.body.includes('application/octet-stream'), wrongType);
    const badSha = await viaFetch('GET', `/rest/memory-sync/v1/sources/${SOURCE_ID}/staged-files/not-a-sha`, { Authorization: `Bearer ${hubToken}` });
    check(id, 'a malformed SHA-256 -> 400', badSha.status === 400, badSha);
    // Observed (OBS-2): the refused offset-mismatch piece leaves a zero-byte `<sha>.partial` (appendPiece opens in append mode before it compares the offset).
    const leftovers = fs.existsSync(stagingDir) ? fs.readdirSync(stagingDir).map((name) => ({ name, bytes: fs.statSync(path.join(stagingDir, name)).size })) : [];
    check(id, 'the refused requests left no content in staging (only zero-byte partials, OBS-2)', leftovers.every((f) => f.bytes === 0), leftovers);
    check(id, 'nothing of them is in imports or the manifest', !fs.existsSync(path.join(hubDir, 'memory/imports', SOURCE_ID)) || Object.keys(hubManifest()).length === 0, null);
    check(id, 'the hub still serves its owner (GraphQL with the owner credential)', Boolean((await gql(hub, '{__typename}')).__typename));
  }

  // ---------------- RS1 (API-09): Sync now during a background run that uploads a large file ----------------
  {
    const id = 'API-09';
    relay.control.putDelayMs = 400;
    writeBig(srcFile('run-bg', 'context_files', 'big.bin'), 400); // 50 pieces x 400 ms = about 20 s
    fs.mkdirSync(srcFile('run-bg'), { recursive: true });
    fs.writeFileSync(srcFile('run-bg', 'raw_traces_active.jsonl'), '{"bg":1}\n');
    relay.events.length = 0;
    await configureSource({ backgroundEnabled: true, intervalMs: 5000 });
    await waitFor('the background run to start uploading', async () => (await state()).jobState === 'running' && relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').length >= 4, 60_000);
    const startedAtPuts = relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').length;
    fs.writeFileSync(srcFile('run-bg', 'late.txt'), 'written during the background run\n'); // after the background run's scan
    const tManual = Date.now();
    const [a, b] = await Promise.all([syncNow(), syncNow()]);
    const manualMs = Date.now() - tManual;
    await configureSource({ backgroundEnabled: false });
    const posts = relay.events.filter((e) => e.kind === 'commit' && e.phase === 'in');
    const lastBigPutOut = Math.max(...relay.events.filter((e) => e.kind === 'put' && e.phase === 'out').map((e) => e.t));
    const getsForBig = relay.events.filter((e) => e.kind === 'get' && e.phase === 'in').length;
    check(id, 'the background run was uploading (>= 4 pieces) when Sync now was pressed', startedAtPuts >= 4, { pieces: startedAtPuts });
    check(id, 'both Sync now calls returned the same single queued run', JSON.stringify(a) === JSON.stringify(b), { a, b });
    check(id, 'the queued manual run found only the file written after the background scan (changedFiles 1)', a.changedFiles === 1 && a.failedFiles === 0, a);
    check(id, 'exactly two commit requests in total: one background batch, one queued manual batch', posts.length === 2, { posts: posts.length });
    check(id, 'the big file was negotiated once (one status GET), never uploaded by two runs', getsForBig === 1 && relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').length === 50,
      { gets: getsForBig, puts: relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').length });
    check(id, 'the manual run started only after the background run finished (its commit came after the last piece)', posts[1].t > lastBigPutOut, { lastPieceAt: lastBigPutOut, secondCommitAt: posts[1].t });
    check(id, 'imported big file identical', (await hashFile(srcFile('run-bg', 'context_files', 'big.bin'))) === (await hashFile(imported('run-bg', 'context_files', 'big.bin'))));
    check(id, 'late file imported by the manual run', fs.readFileSync(imported('run-bg', 'late.txt'), 'utf-8') === 'written during the background run\n');
    check(id, 'final state success, no file failures', (await state()).jobState === 'success' && (await state()).fileFailureCount === 0, await state());
    result.cases[id].detail = { manualCallMs: manualMs, relayEventCount: relay.events.length };
    fs.writeFileSync(path.join(outputDir, 'API-09-relay-events.json'), JSON.stringify(relay.events, null, 1));
    relay.control.putDelayMs = 0;
  }

  // ---------------- RS2a (API-10): hub killed while pieces upload ----------------
  {
    const id = 'API-10a';
    relay.control.putDelayMs = 150;
    writeBig(srcFile('run-kill-a', 'context_files', 'a.bin'), 200);
    const sha = await hashFile(srcFile('run-kill-a', 'context_files', 'a.bin'));
    relay.events.length = 0; relay.control.puts = 0; relay.control.killHubAfterPuts = 6; relay.control.killed = false;
    let firstError = null;
    await syncNow().catch((e) => { firstError = String(e.message ?? e); });
    check(id, 'the hub was killed mid-upload and the run ended with a run-level error', Boolean(firstError) && relay.control.killed, firstError);
    const afterKill = await state();
    check(id, 'state: jobState error, the error shown, no file failure recorded', afterKill.jobState === 'error' && Boolean(afterKill.lastError) && afterKill.fileFailureCount === 0, afterKill);
    let secondError = null;
    await syncNow().catch((e) => { secondError = String(e.message ?? e); });
    check(id, 'Sync now while the hub is down also fails as a run (hub unreachable), not as file problems', Boolean(secondError) && (await state()).fileFailureCount === 0, secondError);
    hub = await startHub();
    const partial = path.join(stagingDir, `${sha}.partial`);
    const partialBytes = fs.existsSync(partial) ? fs.statSync(partial).size : -1;
    check(id, 'after the restart the partial file is on the hub, outside imports, not in the manifest', partialBytes > 0 && !fs.existsSync(imported('run-kill-a', 'context_files', 'a.bin')) && !(Object.keys(hubManifest()).includes('agents/run-kill-a/context_files/a.bin')), { partialBytes, multipleOfPiece: partialBytes % (8 * MiB) === 0 });
    relay.control.putDelayMs = 0; relay.events.length = 0;
    const resumed = await syncNow();
    const putOffsets = relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').map((e) => Number(e.url.match(/offset=(\d+)/)[1]));
    check(id, 'the next run resumed from what the hub held (first piece offset equals the partial size)', putOffsets[0] === partialBytes, { firstOffset: putOffsets[0], partialBytes, pieces: putOffsets.length });
    check(id, 'only the remaining bytes were sent', putOffsets.length === Math.ceil((200 * MiB - partialBytes) / (8 * MiB)), { pieces: putOffsets.length });
    check(id, 'run succeeded; imported file identical to the source', resumed.failedFiles === 0 && (await hashFile(imported('run-kill-a', 'context_files', 'a.bin'))) === sha, resumed);
    check(id, 'staging holds nothing for the file afterwards', !fs.existsSync(partial), fs.readdirSync(stagingDir));
    check(id, 'state success, no file failures', (await state()).jobState === 'success' && (await state()).fileFailureCount === 0, await state());
    result.cases[id].detail = { firstError, secondError, partialBytes };
    fs.writeFileSync(path.join(outputDir, 'API-10a-relay-events.json'), JSON.stringify(relay.events, null, 1));
  }

  // ---------------- RS2b (API-10): hub killed while it verifies the committed file ----------------
  {
    const id = 'API-10b';
    writeBig(srcFile('run-kill-b', 'context_files', 'b.bin'), 1024);
    const sha = await hashFile(srcFile('run-kill-b', 'context_files', 'b.bin'));
    relay.events.length = 0; relay.control.killed = false; relay.control.killHubOnCommitAfterMs = 600;
    let firstError = null;
    await syncNow().catch((e) => { firstError = String(e.message ?? e); });
    const puts1 = relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').length;
    check(id, 'the hub was killed during the commit request; the run ended with a run-level error', Boolean(firstError) && relay.control.killed, firstError);
    check(id, 'all 128 pieces had been uploaded before the commit', puts1 === 128, { puts1 });
    hub = await startHub();
    const partial = path.join(stagingDir, `${sha}.partial`);
    check(id, 'after the restart: the complete staged file is still outside imports and the manifest', fs.existsSync(partial) && fs.statSync(partial).size === 1024 * MiB
      && !fs.existsSync(imported('run-kill-b', 'context_files', 'b.bin')) && !Object.keys(hubManifest()).includes('agents/run-kill-b/context_files/b.bin'), { staged: fs.existsSync(partial) ? fs.statSync(partial).size : null });
    relay.events.length = 0;
    const resumed = await syncNow();
    const puts2 = relay.events.filter((e) => e.kind === 'put' && e.phase === 'in').length;
    check(id, 'the next run uploaded no piece and committed the staged file', puts2 === 0 && resumed.failedFiles === 0 && resumed.committedBatches >= 1, { puts2, resumed });
    check(id, 'imported file identical to the source', (await hashFile(imported('run-kill-b', 'context_files', 'b.bin'))) === sha);
    check(id, 'staging empty and state success', !fs.existsSync(partial) && (await state()).jobState === 'success' && (await state()).fileFailureCount === 0, await state());
    result.cases[id].detail = { firstError };
    fs.writeFileSync(path.join(outputDir, 'API-10b-relay-events.json'), JSON.stringify(relay.events, null, 1));
  }
  result.result = Object.values(result.cases).every((c) => c.checks.every((x) => x.ok)) ? 'Pass' : 'Fail';
} catch (error) {
  result.result = 'Error'; result.error = String(error?.stack ?? error); console.error(result.error);
} finally {
  await relay?.close();
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
  await sleep(3000);
  for (const c of children) if (c.exitCode === null) c.kill('SIGKILL');
  fs.rmSync(root, { recursive: true, force: true });
  result.cleanup = { rootRemoved: !fs.existsSync(root), serversStopped: [...children].every((c) => c.exitCode !== null || c.signalCode !== null) };
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, 'lifecycle-probe-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ result: result.result, cleanup: result.cleanup }));
}
