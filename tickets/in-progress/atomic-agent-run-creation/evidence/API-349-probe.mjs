/** TEMPORARY API/E2E probe (autobyteus-349), kept as evidence; not repository test code.
 * Every server here runs on a TEMPORARY data root created by this probe. Never the user's data.
 * A real server process (`node <server>/dist/app.js --port --data-dir`) with scripted LM Studio inference for native runs.
 * Modes:
 *   ac001 <server dir>                AC-001: a codex run whose CLI is not on the server's PATH (activation cannot spawn it)
 *                                     and a native run with an unknown model, through GraphQL `createAgentRun`.
 *   ac003 <server dir> [bulk]         AC-003 + N-4: seed the shapes through real code (+ minimal structure edits), restart,
 *                                     check removal, kept shapes, logs; `bulk` adds N empty + N started runs.
 *   ac004 <server dir> <base dir>     AC-004: (a) SIGKILL during staggered codex creates; (b) stuck codex activation
 *                                     (`codex app-server` SIGSTOPped) + SIGTERM; then relaunch copies on the new and base builds.
 *   ac004g <server dir>               AC-004 (SR-005): codex creates in flight around a SIGTERM (normal stop), relaunch.
 *   ac005 <server dir>                AC-005: two-step creation (prepareAgentRun → first message) and a restart.
 * Usage: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" node API-349-probe.mjs <mode> ... <evidence dir> <case id>
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const mode = args[0];
const evidence = resolve(args.at(-2)), caseId = args.at(-1);
const serverDir = resolve(args[1]);
const baseDir = mode === 'ac004' ? resolve(args[2]) : null;
const bulk = mode === 'ac003' ? Number(args[2]) || 0 : 0;
const WebSocket = createRequire(join(serverDir, 'package.json'))('ws');
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), `ar349-${mode}-`)));
const T0 = Date.now();
const record = { case: caseId, mode, serverDir, baseDir, date: new Date().toISOString(), own, steps: [] };
const log = (step, value) => { const at = ((Date.now() - T0) / 1000).toFixed(2); record.steps.push({ at, step, value }); console.log(`[+${at}s] ${step} ${JSON.stringify(value).slice(0, 600)}`); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000) => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await delay(100); } throw Error(`Timed out: ${label}`); };
const table = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : []; });
const descendants = root => { const rows = table(), out = []; let f = [root]; while (f.length) { const k = rows.filter(r => f.includes(r.ppid) && !out.some(o => o.pid === r.pid)); out.push(...k); f = k.map(x => x.pid); } return out; };

// Scripted native inference: any message gets a short reply.
let calls = 0;
const model = createServer(async (req, res) => {
  if (req.method === 'GET') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ models: [{ key: 'ar349-fixture', max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] })); return; }
  let raw = ''; for await (const c of req) raw += c; calls++;
  const chunk = (d, f) => ({ id: `fx-${calls}`, object: 'chat.completion.chunk', created: 1, model: 'ar349-fixture', choices: [{ index: 0, delta: d, finish_reason: f }] });
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  res.end(`data: ${JSON.stringify(chunk({ role: 'assistant', content: 'Seed reply.' }, null))}\n\ndata: ${JSON.stringify(chunk({}, 'stop'))}\n\ndata: [DONE]\n\n`);
});
await new Promise(r => model.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${model.address().port}`;
const codexHome = join(own, 'codex-home'); await fs.mkdir(codexHome);
await fs.symlink(join(homedir(), '.codex', 'auth.json'), join(codexHome, 'auth.json')).catch(() => {});
await fs.writeFile(join(codexHome, 'config.toml'), 'check_for_update_on_startup = false\n');
const workspace = join(own, 'workspace'); await fs.mkdir(workspace);
const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const servers = [];
const newDataRoot = async name => { const d = join(own, name); await fs.mkdir(d, { recursive: true }); await fs.writeFile(join(d, '.env'), `APP_ENV=test\nLMSTUDIO_HOSTS=${origin}\n`); return d; };
const startServer = async (dir, data, label, opts = {}) => {
  const port = await freePort();
  const env = { PATH: opts.path ?? process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR,
    CODEX_HOME: codexHome, AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', LMSTUDIO_HOSTS: origin, APP_ENV: 'test' };
  const startedAt = Date.now();
  const child = spawn(process.execPath, [join(dir, 'dist/app.js'), '--port', String(port), '--data-dir', data], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const s = { label, dir, data, port, child, pid: child.pid, log: '', exit: null };
  const stamp = b => String(b).split('\n').filter(Boolean).map(l => `[${((Date.now() - T0) / 1000).toFixed(2)}] ${l}`).join('\n') + '\n';
  child.stdout.on('data', b => { s.log += stamp(b); }); child.stderr.on('data', b => { s.log += stamp(b); });
  child.on('exit', (code, signal) => { s.exit = { code, signal, at: Date.now() }; });
  servers.push(s);
  await wait(async () => { if (s.exit) throw Error(`${label} exited ${JSON.stringify(s.exit)}\n${s.log.slice(-2500)}`); return fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok, () => false); }, `${label} health`, 120_000);
  s.readyMs = Date.now() - startedAt;
  s.gql = async (query, variables = {}, timeout = 60_000) => {
    const body = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeout) }).then(r => r.json());
    if (body.errors?.length) throw Error(JSON.stringify(body.errors)); return body.data;
  };
  log('server started', { label, pid: s.pid, port, readyMs: s.readyMs, data: data.replace(own, '<own>') });
  return s;
};
const stopServer = async (s, signal = 'SIGTERM', timeout = 30_000) => {
  const t = Date.now(); s.child.kill(signal); await wait(() => s.exit, `${s.label} exit`, timeout).catch(() => {});
  log('server stopped', { label: s.label, signal, exit: s.exit, ms: s.exit ? s.exit.at - t : null }); return s.exit;
};
const saveLog = async s => fs.writeFile(join(evidence, `${caseId}-server-${s.label}.log`), `# ${caseId} server ${s.label} (${s.dir.includes('/base/') ? 'BASE build' : 'new build'}) pid ${s.pid}; data root ${s.data.replace(own, '<temp>')}; ${record.date}\n${s.log}`);
const defs = new Map();
const agentDef = async (s, name, toolNames = []) => {
  if (!defs.has(`${s.data}:${name}`)) defs.set(`${s.data}:${name}`, (await s.gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: `${name} ${Date.now().toString(36)}`, role: 'engineer', description: 'ar349 probe', instructions: 'Reply briefly.', toolNames, skillNames: [] } })).createAgentDefinition.id);
  return defs.get(`${s.data}:${name}`);
};
let nativeModel;
const loadNativeModel = async s => nativeModel ??= (await s.gql('mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}')).reloadProviderModelCatalog.llmModels.map(m => m.modelIdentifier).find(id => id.startsWith('ar349-fixture'));
const runInput = async (s, runtime, extra = {}) => ({ agentDefinitionId: await agentDef(s, 'Probe Agent'), workspaceRootPath: workspace, autoExecuteTools: true,
  ...(runtime === 'codex' ? { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6.1-terra', llmConfig: { reasoning_effort: 'medium' } } : { runtimeKind: 'autobyteus', llmModelIdentifier: await loadNativeModel(s) }), ...extra });
const createRun = async (s, input) => (await s.gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input })).createAgentRun;
const prepareRun = async (s, input) => (await s.gql('mutation($input:CreateAgentRunInput!){prepareAgentRun(input:$input){success message runId}}', { input })).prepareAgentRun;
const history = async s => (await s.gql('query{listWorkspaceRunHistory(limitPerAgent:5000){agentDefinitions{agentName runs{runId summary status isActive}}}}')).listWorkspaceRunHistory.flatMap(g => g.agentDefinitions.flatMap(d => d.runs));
const agentsDir = data => join(data, 'memory', 'agents');
const diskRuns = async data => {
  const out = {};
  for (const id of await fs.readdir(agentsDir(data)).catch(() => [])) {
    const files = execFileSync('find', [join(agentsDir(data), id)], { encoding: 'utf8' }).split('\n').filter(Boolean).map(p => p.slice(join(agentsDir(data), id).length) || '/');
    let meta = null; try { const m = JSON.parse(await fs.readFile(join(agentsDir(data), id, 'run_metadata.json'), 'utf8')); meta = { preparedAt: !!m.preparedAt, startedAtKey: 'startedAt' in m, startedAt: !!m.startedAt, activationState: m.activationState ?? null, taskAgent: !!m.taskAgent }; } catch (e) { meta = { unreadable: String(e).slice(0, 80) }; }
    const sizes = {};
    for (const rel of files) { if (rel === '/') continue; const full = join(agentsDir(data), id, rel); try { const st = await fs.lstat(full); if (st.isFile()) { sizes[rel] = st.size; if (st.size > 0 && st.size < 1500 && rel !== '/run_metadata.json') sizes[rel + ' (content)'] = (await fs.readFile(full, 'utf8')).slice(0, 1500); if (rel.endsWith('.jsonl') && st.size > 0) sizes[rel + ' (lines)'] = (await fs.readFile(full, 'utf8')).split('\n').filter(Boolean).map(l => { try { const o = JSON.parse(l); return { keys: Object.keys(o).slice(0, 12), type: o.trace_type ?? o.event_type ?? o.type ?? o.kind ?? null, contentHead: typeof o.content === "string" ? o.content.slice(0, 60) : null, role: o.role ?? o.payload?.role ?? null, chars: l.length }; } catch { return { unparsable: l.length }; } }); } } catch {} }
    out[id] = { meta, entries: files, sizes };
  }
  return out;
};
const sendFirstMessage = async (s, runId, text) => {
  const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws/agent/${runId}`); const frames = [];
  ws.on('message', raw => { try { frames.push(JSON.parse(String(raw))); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  await wait(() => frames.some(f => f.type === 'CONNECTED'), 'ws connected');
  const id = randomUUID(); ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: text, message_id: id, dedupe_key: `agent_run_input:${id}`, context_file_paths: [], image_urls: [] } }));
  await wait(() => frames.some(f => f.type === 'TURN_COMPLETED'), 'turn completed', 60_000);
  ws.terminate(); return frames.filter(f => /TURN|STATUS|ERROR/.test(f.type)).map(f => f.type);
};
const relevantLog = s => s.log.split('\n').filter(l => /Removed empty never-started|Kept run|Kept never-started|skipped \d+ folder|failed to activate and was kept|Error in createAgentRun|Error in prepareAgentRun|349-DIAG/.test(l));

try {
  await fs.mkdir(evidence, { recursive: true });
  if (mode === 'ac001') {
    const data = await newDataRoot('data');
    const s = await startServer(serverDir, data, 'nocodex', { path: '/usr/bin:/bin:/usr/sbin:/sbin' });
    record.serverPath = '/usr/bin:/bin:/usr/sbin:/sbin (no codex)';
    const results = [];
    for (const [label, input] of [['codex-not-installed', await runInput(s, 'codex')], ['native-unknown-model', await runInput(s, 'native', { llmModelIdentifier: 'ar349-no-such-model:lmstudio' })]]) {
      const t = Date.now(); const r = await createRun(s, input).catch(e => ({ success: false, message: `transport: ${e}` }));
      results.push({ label, ms: Date.now() - t, result: r }); log('createAgentRun', results.at(-1));
    }
    record.creates = results;
    record.historyAfter = await history(s); record.diskAfter = await diskRuns(data);
    record.serverLogLines = relevantLog(s);
    log('after', { historyRows: record.historyAfter.length, diskRuns: Object.keys(record.diskAfter).length, lines: record.serverLogLines });
    await stopServer(s); await saveLog(s);
  } else if (mode === 'ac003') {
    const data = await newDataRoot('data');
    const s1 = await startServer(serverDir, data, 'seed');
    const seed = {};
    const prep = async (label, extra = {}) => { const r = await prepareRun(s1, await runInput(s1, 'native', { initialSummary: `Seed ${label}`, ...extra })); if (!r.success) throw Error(`${label}: ${r.message}`); seed[label] = r.runId; return r.runId; };
    await prep('E1-empty');
    const e2 = await prep('E2-empty-subfolders');
    const ctx = await prep('CTX-context-file-only');
    const unread = await prep('UNREADABLE-record');
    const collab = await prep('COLLAB-never-started-root');
    const may = await createRun(s1, await runInput(s1, 'native')); seed['MAY-conversation-no-startedAt'] = may.runId;
    log('may turn', await sendFirstMessage(s1, may.runId, 'hello, how are you doing'));
    const started = await createRun(s1, await runInput(s1, 'native')); seed['STARTED'] = started.runId;
    const bulkIds = { empty: [], started: [] };
    for (let i = 0; i < bulk; i += 10) {
      await Promise.all(Array.from({ length: Math.min(10, bulk - i) }, async (_, k) => {
        const p = await prepareRun(s1, await runInput(s1, 'native', { initialSummary: `Bulk empty ${i + k}` })); bulkIds.empty.push(p.runId);
        const c = await createRun(s1, await runInput(s1, 'native')); bulkIds.started.push(c.runId);
      }));
    }
    record.seed = seed; record.bulk = { empty: bulkIds.empty.length, started: bulkIds.started.length };
    const historyBefore = await history(s1);
    await stopServer(s1); await saveLog(s1);
    // Minimal structure edits, learned read-only from real records (key names only; investigation notes):
    const A = agentsDir(data);
    await fs.mkdir(join(A, e2, 'context_files'), { recursive: true }); await fs.mkdir(join(A, e2, 'work_journal'), { recursive: true });
    await fs.mkdir(join(A, ctx, 'context_files'), { recursive: true }); await fs.writeFile(join(A, ctx, 'context_files', 'note.txt'), 'seed attachment');
    await fs.writeFile(join(A, unread, 'run_metadata.json'), '{ not json');
    await fs.mkdir(join(A, collab, 'collaboration'), { recursive: true }); await fs.writeFile(join(A, collab, 'collaboration', 'collaboration_tree.json'), '{}');
    const mayMetaPath = join(A, may.runId, 'run_metadata.json'); const mayMeta = JSON.parse(await fs.readFile(mayMetaPath, 'utf8'));
    delete mayMeta.startedAt; mayMeta.activationState = 'ACTIVATED'; await fs.writeFile(mayMetaPath, JSON.stringify(mayMeta, null, 2));
    const taskId = `task_seed_${Date.now().toString(36)}`; await fs.mkdir(join(A, taskId));
    await fs.writeFile(join(A, taskId, 'run_metadata.json'), JSON.stringify({ runId: taskId, agentDefinitionId: 'x', workspaceRootPath: workspace, memoryDir: join(A, taskId), llmModelIdentifier: 'x', llmConfig: null, autoExecuteTools: true, runtimeKind: 'autobyteus', platformAgentRunId: null, preparedAt: new Date().toISOString(), taskAgent: { address: '/worker', coordinatingRun: { kind: 'agent', runId: 'x' }, delegatorAgentRunId: 'x' } }, null, 2));
    seed['TASK-agent-folder'] = taskId;
    const diskBefore = await diskRuns(data);
    record.before = { historyRows: historyBefore.length, seedHistory: Object.fromEntries(Object.entries(seed).map(([k, id]) => [k, historyBefore.find(r => r.runId === id) ?? null])), seedDisk: Object.fromEntries(Object.entries(seed).map(([k, id]) => [k, diskBefore[id] ?? null])), diskRuns: Object.keys(diskBefore).length };
    log('seeded', { seed, bulk: record.bulk, historyRows: historyBefore.length, diskRuns: record.before.diskRuns });
    const s2 = await startServer(serverDir, data, 'restart-1');
    const historyAfter = await history(s2); const diskAfter = await diskRuns(data);
    record.after = { readyMs: s2.readyMs, historyRows: historyAfter.length, diskRuns: Object.keys(diskAfter).length,
      seed: Object.fromEntries(Object.entries(seed).map(([k, id]) => [k, { listed: !!historyAfter.find(r => r.runId === id), onDisk: !!diskAfter[id], disk: diskAfter[id] ?? null }])),
      bulkEmptyLeft: bulkIds.empty.filter(id => diskAfter[id] || historyAfter.find(r => r.runId === id)).length, bulkStartedKept: bulkIds.started.filter(id => diskAfter[id] && historyAfter.find(r => r.runId === id)).length,
      removedLines: relevantLog(s2).filter(l => /Removed empty/.test(l)).length, logLines: relevantLog(s2).filter(l => !/Removed empty never-started run '[^']*' \('Bulk/.test(l)) };
    const indexText = async () => { try { return await fs.readFile(join(data, 'memory', 'run_history_index.json'), 'utf8'); } catch (e) { return `unreadable: ${e}`; } };
    const idxAfter = await indexText();
    record.after.index = Object.fromEntries(Object.entries(seed).map(([k, id]) => [k, idxAfter.includes(id)]));
    log('after restart-1', record.after);
    await stopServer(s2); await saveLog(s2);
    if (process.env.BASE_DIR) {
      // Listing contrast: the same data on the base build (no stage) — is an unreadable record listed there?
      const copy = join(own, 'base-copy'); execFileSync('cp', ['-R', data, copy]);
      const sb = await startServer(resolve(process.env.BASE_DIR), copy, 'base-listing');
      const hb = await history(sb);
      record.baseListing = Object.fromEntries(Object.entries(seed).map(([k, id]) => [k, !!hb.find(r => r.runId === id)]));
      log('base listing of the same data', record.baseListing);
      await stopServer(sb); await saveLog(sb);
    }
    const s3 = await startServer(serverDir, data, 'restart-2');
    record.second = { readyMs: s3.readyMs, logLines: relevantLog(s3), historyRows: (await history(s3)).length };
    log('after restart-2', record.second);
    await stopServer(s3); await saveLog(s3);
  } else if (mode === 'ac004') {
    const onlyCrash = process.env.ONLY_CRASH === '1';
    // (a) crash during creates.
    const dataA = await newDataRoot('crash');
    let attempts = 0, preparedOnly = [];
    record.crash = [];
    while (attempts < 5 && preparedOnly.length === 0) {
      attempts++;
      const s = await startServer(serverDir, dataA, `crash-${attempts}`);
      const input = await runInput(s, 'codex');
      const lat = []; for (let i = 0; i < 2; i++) { const t = Date.now(); await createRun(s, input); lat.push(Date.now() - t); }
      const median = Math.max(...lat);
      const inflight = Array.from({ length: 6 }, (_, k) => delay(k * Math.max(5, Math.round(median / 6))).then(() => createRun(s, input).then(r => ({ k, r }), e => ({ k, error: String(e).slice(0, 80) }))));
      await delay(Math.round(median / 2)); const tree = descendants(s.pid); s.child.kill('SIGKILL'); await wait(() => s.exit, 'kill', 10_000);
      const settled = await Promise.all(inflight);
      for (const d of tree) if (alive(d.pid)) { try { process.kill(d.pid, 'SIGTERM'); } catch {} } // orphans of the killed server (recorded before the kill; own)
      await delay(1500); for (const d of tree) if (alive(d.pid)) { try { process.kill(d.pid, 'SIGKILL'); } catch {} }
      const disk = await diskRuns(dataA);
      preparedOnly = Object.entries(disk).filter(([, v]) => v.meta?.preparedAt && !v.meta?.startedAt).map(([id]) => id);
      record.crash.push({ attempt: attempts, latencyMs: lat, inflight: settled, preparedOnly, leftoverDisk: Object.fromEntries(preparedOnly.map(id => [id, disk[id]])) });
      log('crash attempt', record.crash.at(-1)); await saveLog(s);
    }
    // (b) stuck activation + SIGTERM.
    record.stuck = { preparedOnly: [] }; const dataB = await newDataRoot('stuck');
    if (!onlyCrash) {
    const sb = await startServer(serverDir, dataB, 'stuck');
    const inputB = await runInput(sb, 'codex');
    const first = await createRun(sb, inputB); log('first codex run', first);
    const appServer = descendants(sb.pid).find(r => /codex app-server/.test(r.command));
    if (!appServer) throw Error('codex app-server not found');
    process.kill(appServer.pid, 'SIGSTOP'); record.stoppedAppServer = appServer.pid;
    const pending = createRun(sb, inputB).then(r => ({ r }), e => ({ error: String(e).slice(0, 120) }));
    await delay(1500);
    const tStop = Date.now(); sb.child.kill('SIGTERM'); await wait(() => sb.exit, 'stuck exit', 30_000).catch(() => {});
    record.stuck = { first: first.runId, stopMs: sb.exit ? sb.exit.at - tStop : null, exit: sb.exit, pendingCreate: await pending, appServerAliveAfter: alive(appServer.pid),
      shutdownLog: sb.log.split('\n').filter(l => /exceeded 10s|process-tree sweep/.test(l)) };
    if (alive(appServer.pid)) { try { process.kill(appServer.pid, 'SIGCONT'); process.kill(appServer.pid, 'SIGKILL'); } catch {} }
    const diskB = await diskRuns(dataB);
    record.stuck.preparedOnly = Object.entries(diskB).filter(([, v]) => v.meta?.preparedAt && !v.meta.startedAt).map(([id]) => id);
    log('stuck', record.stuck); await saveLog(sb);
    }
    // Relaunch copies of both data roots on the new build and on the base build.
    record.relaunch = {};
    for (const [name, data, leftovers] of [['crash', dataA, preparedOnly], ['stuck', dataB, record.stuck.preparedOnly]]) {
      for (const [build, dir] of [['new', serverDir], ['base', baseDir]]) {
        const copy = join(own, `${name}-${build}`); execFileSync('cp', ['-R', data, copy]);
        const s = await startServer(dir, copy, `${name}-relaunch-${build}`);
        const h = await history(s); const disk = await diskRuns(copy);
        record.relaunch[`${name}-${build}`] = { leftoverDiskAfter: Object.fromEntries(leftovers.map(id => [id, disk[id] ?? null])), leftovers, listedAfter: leftovers.filter(id => h.find(r => r.runId === id)), onDiskAfter: leftovers.filter(id => disk[id]),
          emptyNeverStartedListed: h.filter(r => disk[r.runId]?.meta?.preparedAt && !disk[r.runId]?.meta?.startedAt).map(r => r.runId), historyRows: h.length, logLines: relevantLog(s) };
        log(`relaunch ${name} on ${build}`, record.relaunch[`${name}-${build}`]);
        await stopServer(s); await saveLog(s);
      }
    }
  } else if (mode === 'ac004g') {
    // AC-004 (SR-005): creates in flight around a NORMAL stop (SIGTERM; 339's grace lets them finish), then relaunch.
    const data = await newDataRoot('graceful');
    record.samples = []; const known = new Set();
    for (let sample = 1; sample <= Number(process.env.SAMPLES ?? 2); sample++) {
      const s = await startServer(serverDir, data, `graceful-${sample}`);
      const input = await runInput(s, 'codex');
      const lat = []; const pre = [];
      for (let i = 0; i < 3; i++) { const t = Date.now(); const r = await createRun(s, input); lat.push(Date.now() - t); pre.push(r.runId); }
      const median = [...lat].sort((a, b) => a - b)[1];
      let sigtermAt = 0;
      const inflight = Array.from({ length: 6 }, (_, k) => delay(k * Math.max(5, Math.round(median / 5))).then(() => { const sentAt = Date.now(); return createRun(s, input).then(r => ({ k, sentAt, endedAt: Date.now(), r }), e => ({ k, sentAt, endedAt: Date.now(), error: String(e).slice(0, 100) })); }));
      await delay(Math.round(median / 2)); sigtermAt = Date.now(); s.child.kill('SIGTERM');
      await wait(() => s.exit, 'graceful exit', 30_000).catch(() => {});
      const settled = (await Promise.all(inflight)).map(e => ({ ...e, sentRelSigtermMs: e.sentAt - sigtermAt, endedRelSigtermMs: e.endedAt - sigtermAt }));
      for (const id of [...pre, ...settled.filter(e => e.r?.runId).map(e => e.r.runId)]) known.add(id);
      const diskBefore = await diskRuns(data);
      const s2 = await startServer(serverDir, data, `graceful-${sample}-relaunch`);
      const h = await history(s2); const disk = await diskRuns(data);
      const out = { sample, latencyMs: lat, exit: s.exit, stopMs: s.exit ? s.exit.at - sigtermAt : null, inflight: settled,
        neverStartedBeforeRelaunch: Object.entries(diskBefore).filter(([, v]) => v.meta?.preparedAt && !v.meta?.startedAt).map(([id]) => id),
        unknownOnDiskBeforeRelaunch: Object.keys(diskBefore).filter(id => !known.has(id)),
        neverStartedListedAfter: h.filter(r => disk[r.runId]?.meta?.preparedAt && !disk[r.runId]?.meta?.startedAt).map(r => r.runId),
        unknownListedAfter: h.filter(r => !known.has(r.runId)).map(r => r.runId), historyRows: h.length, knownRuns: known.size, logLines: relevantLog(s2) };
      record.samples.push(out); log(`graceful sample ${sample}`, out);
      await stopServer(s2); await saveLog(s); await saveLog(s2);
    }
  } else if (mode === 'ac005') {
    const data = await newDataRoot('data');
    const s1 = await startServer(serverDir, data, 'two-step');
    const p = await prepareRun(s1, await runInput(s1, 'native', { initialSummary: 'Two-step first message' }));
    const before = (await diskRuns(data))[p.runId];
    const frames = await sendFirstMessage(s1, p.runId, 'Two-step first message');
    const afterSend = (await diskRuns(data))[p.runId];
    record.twoStep = { prepared: p, before, frames, afterSend };
    log('two-step', record.twoStep);
    await stopServer(s1); await saveLog(s1);
    const s2 = await startServer(serverDir, data, 'restart');
    const h = await history(s2);
    record.afterRestart = { listed: h.find(r => r.runId === p.runId) ?? null, onDisk: !!(await diskRuns(data))[p.runId], logLines: relevantLog(s2) };
    log('after restart', record.afterRestart);
    await stopServer(s2); await saveLog(s2);
  }
  record.result = 'Completed';
} catch (error) { record.result = 'Error'; record.error = String(error.stack ?? error); console.error(error); process.exitCode = 1; }
finally {
  for (const s of servers) if (!s.exit) { s.child.kill('SIGKILL'); await delay(300); }
  for (const s of servers) for (const d of descendants(s.pid)) { try { process.kill(d.pid, 'SIGKILL'); } catch {} }
  if (record.stoppedAppServer && alive(record.stoppedAppServer)) { try { process.kill(record.stoppedAppServer, 'SIGCONT'); process.kill(record.stoppedAppServer, 'SIGKILL'); } catch {} }
  model.closeAllConnections(); await new Promise(r => model.close(r));
  record.modelCalls = calls;
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  await fs.writeFile(join(evidence, `${caseId}-result.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null }));
}
