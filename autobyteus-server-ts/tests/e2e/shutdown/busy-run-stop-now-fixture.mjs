/** Private fixture for busy-run-stop-now.e2e.test.ts (mode `server`). Run from the server package after `pnpm build`.
 * A real server process (`node dist/app.js --port --data-dir`, the desktop's spawn shape) with a native agent whose
 * scripted LM Studio inference starts a background command and then a long foreground `run_bash` (a busy turn).
 * 1. GraphQL Terminate of a busy run returns within 10 s and its foreground command is gone (REQ-001).
 * 2. SIGTERM with a busy run: the server exits 0 within 10 s and nothing it started is left (REQ-002, REQ-003).
 * 3. Relaunch on the same data: the user-terminated run keeps `terminatedAt`; the shutdown-stopped one has none (BEH-007).
 * Only inference is emulated. Optional BUSY_STOP_SERVER_DIR points at another server build (e.g. a base build).
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const serverDir = resolve(process.env.BUSY_STOP_SERVER_DIR ?? '.');
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'busy-run-stop-now-')));
const data = join(own, 'data'), home = join(own, 'home'), workspace = join(own, 'workspace');
for (const dir of [data, home, workspace]) await fs.mkdir(dir);
const tag = `BQ284_${process.pid}_${Date.now()}`;
const record = { case: 'busy-run-stop-now', serverDir, date: new Date().toISOString(), own, tag, steps: [] };
const note = (step, value) => record.steps.push({ step, value, at: new Date().toISOString() });
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn()) return; await delay(50); } throw Error(`Timed out: ${label}`); };
const quote = s => "'" + s.replaceAll("'", "'\\''") + "'";
const table = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(line => {
  const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : [];
});
const descendants = root => { const rows = table(), out = []; let frontier = [root]; while (frontier.length) { const kids = rows.filter(r => frontier.includes(r.ppid) && !out.some(o => o.pid === r.pid)); out.push(...kids); frontier = kids.map(k => k.pid); } return out; };
const marked = () => table().filter(r => r.command.includes(tag) && !r.command.includes('ps -ww'));
const brief = rows => rows.map(r => ({ ...r, command: r.command.slice(0, 160) }));

/** A long-lived command whose argv carries the run tag and which writes a pid receipt. */
const owned = name => {
  const receipt = join(workspace, `${name}.json`);
  const code = `/*${tag}_${name}*/require('fs').writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid}));setInterval(()=>{},1000)`;
  return { receipt, command: `${quote(process.execPath)} -e ${quote(code)} ${tag}_${name}` };
};
const turns = new Map();
let calls = 0;
const model = createServer(async (req, res) => {
  if (req.method === 'GET') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ models: [{ key: 'busy-stop-fixture', max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] })); return; }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const input = JSON.parse(raw); calls++;
  const user = [...(input.messages ?? [])].reverse().find(m => m.role === 'user');
  const label = String(typeof user?.content === 'string' ? user.content : JSON.stringify(user?.content ?? '')).match(/TURN:(\w+)/)?.[1];
  const plan = label ? turns.get(label) : undefined;
  const invoke = plan && !input.messages?.some(m => m.role === 'tool');
  const toolCalls = invoke ? plan.map((c, i) => ({ index: i, id: `call-${label}-${i}`, type: 'function', function: { name: c.tool, arguments: JSON.stringify({ command: c.command, cwd: workspace, timeout_seconds: 600 }) } })) : null;
  const delta = toolCalls ? { role: 'assistant', tool_calls: toolCalls } : { role: 'assistant', content: 'Done.' };
  const chunk = (d, finish_reason) => ({ id: `fixture-${calls}`, object: 'chat.completion.chunk', created: 1, model: 'busy-stop-fixture', choices: [{ index: 0, delta: d, finish_reason }] });
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, toolCalls ? 'tool_calls' : 'stop'))}\n\ndata: [DONE]\n\n`);
  note('model', { calls, label: label ?? null, invoke: !!toolCalls });
});
await new Promise(r => model.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${model.address().port}`;
const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

const servers = [], sockets = [];
const startServer = async label => {
  const port = await freePort();
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: own, AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`, LMSTUDIO_HOSTS: origin, APP_ENV: 'test' };
  const child = spawn(process.execPath, [join(serverDir, 'dist/app.js'), '--port', String(port), '--data-dir', data], { cwd: serverDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const server = { label, port, child, pid: child.pid, log: '', exit: null };
  child.stdout.on('data', b => { server.log += b; }); child.stderr.on('data', b => { server.log += b; });
  child.on('exit', (code, signal) => { server.exit = { code, signal, at: Date.now() }; });
  servers.push(server);
  await wait(async () => { if (server.exit) throw Error(`server exited ${JSON.stringify(server.exit)}\n${server.log.slice(-3000)}`); return fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok, () => false); }, `${label} health`, 90_000);
  server.gql = async (query, variables = {}, timeout = 30_000) => {
    const body = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeout) }).then(r => r.json());
    if (body.errors?.length) throw Error(JSON.stringify(body.errors)); return body.data;
  };
  note('server started', { label, pid: server.pid, port });
  return server;
};
const busyRun = async (server, definitionId, modelId, label, plan) => {
  turns.set(label, plan);
  const created = (await server.gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
    { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: modelId, autoExecuteTools: true, runtimeKind: 'autobyteus' } })).createAgentRun;
  assert(created.success, created.message);
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws/agent/${created.runId}`); sockets.push(ws);
  const frames = []; ws.on('message', raw => { try { frames.push(JSON.parse(String(raw))); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  await wait(() => frames.some(f => f.type === 'CONNECTED'), `${label} connected`);
  const id = randomUUID();
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: `TURN:${label} run the owned commands.`, message_id: id, dedupe_key: `agent_run_input:${id}`, context_file_paths: [], image_urls: [] } }));
  const pids = {};
  for (const c of plan) await wait(async () => { try { pids[c.name] = JSON.parse(await fs.readFile(c.receipt, 'utf8')).pid; return true; } catch { return false; } }, `${label} ${c.name} receipt`);
  await delay(300);
  note('busy', { label, runId: created.runId, pids });
  return { runId: created.runId, pids, frames };
};

try {
  await fs.access(join(serverDir, 'dist/app.js'));
  await fs.writeFile(join(data, '.env'), `APP_ENV=test\nLMSTUDIO_HOSTS=${origin}\n`);
  const first = await startServer('first');
  const modelId = (await first.gql('mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}'))
    .reloadProviderModelCatalog.llmModels.map(m => m.modelIdentifier).find(id => id.startsWith('busy-stop-fixture'));
  assert(modelId, 'fixture model missing from the LM Studio catalog');
  const definitionId = (await first.gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name: `Busy stop ${tag}`, role: 'engineer', description: 'busy stop fixture', instructions: 'Run the requested commands.', toolNames: ['run_bash', 'start_background_process'], skillNames: [] } })).createAgentDefinition.id;

  // 1. Terminate a busy run.
  const fgA = { name: 'terminate-fg', tool: 'run_bash', ...owned('terminate-fg') };
  const a = await busyRun(first, definitionId, modelId, 'A', [fgA]);
  let started = Date.now();
  const terminated = await first.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: a.runId }, 20_000)
    .then(d => d.terminateAgentRun, e => ({ success: false, message: `pending or failed: ${String(e)}` }));
  record.terminate = { runId: a.runId, result: terminated, elapsedMs: Date.now() - started };
  await wait(() => !alive(a.pids['terminate-fg']), 'terminated run foreground command gone', 5_000).catch(() => {});
  record.terminate.foregroundGone = !alive(a.pids['terminate-fg']);
  note('terminate', record.terminate);
  assert.equal(terminated.success, true, `terminate: ${terminated.message}`);
  assert(record.terminate.elapsedMs <= 10_000, `terminate took ${record.terminate.elapsedMs} ms`);
  assert(record.terminate.foregroundGone, 'the terminated run left its foreground command');

  // 2. SIGTERM the server while a run is busy (a background command plus a foreground command).
  const bgB = { name: 'shutdown-bg', tool: 'start_background_process', ...owned('shutdown-bg') };
  const fgB = { name: 'shutdown-fg', tool: 'run_bash', ...owned('shutdown-fg') };
  const b = await busyRun(first, definitionId, modelId, 'B', [bgB, fgB]);
  const before = brief(descendants(first.pid));
  started = Date.now(); first.child.kill('SIGTERM');
  await wait(() => first.exit, 'server exit after SIGTERM', 25_000).catch(() => {});
  const after = before.map(row => ({ ...row, alive: alive(row.pid) }));
  record.shutdown = { runId: b.runId, serverPid: first.pid, exit: first.exit, elapsedMs: first.exit ? first.exit.at - started : null, before, survivors: after.filter(r => r.alive), markedLeft: brief(marked()),
    sweepLines: first.log.split('\n').filter(l => /process-tree sweep|exceeded 10s|Backend shutdown incomplete/.test(l)) };
  note('shutdown', record.shutdown);
  assert(first.exit, 'server did not exit within 25 s of SIGTERM');
  assert.equal(first.exit.code, 0, `server exit ${JSON.stringify(first.exit)}`);
  assert(record.shutdown.elapsedMs <= 10_000, `server exit took ${record.shutdown.elapsedMs} ms`);
  assert(before.some(r => r.pid === b.pids['shutdown-fg']) && before.some(r => r.pid === b.pids['shutdown-bg']), 'busy commands were server descendants');
  assert.deepEqual(record.shutdown.survivors, [], 'processes the server started survived its exit');
  assert.deepEqual(record.shutdown.markedLeft, [], 'tagged commands survived the server');

  // 3. Relaunch on the same data: BEH-007.
  for (const ws of sockets.splice(0)) ws.terminate();
  const second = await startServer('second');
  const history = (await second.gql('query{listWorkspaceRunHistory(limitPerAgent:50){workspaceRootPath agentDefinitions{agentDefinitionId runs{runId terminatedAt isActive}}}}')).listWorkspaceRunHistory;
  const runs = history.flatMap(g => g.agentDefinitions.flatMap(d => d.runs));
  record.history = { terminatedRun: runs.find(r => r.runId === a.runId) ?? null, shutdownRun: runs.find(r => r.runId === b.runId) ?? null };
  note('history', record.history);
  assert(record.history.terminatedRun?.terminatedAt, 'the user-terminated run lost terminatedAt');
  assert(record.history.shutdownRun && record.history.shutdownRun.terminatedAt === null, 'shutdown recorded terminatedAt');
  started = Date.now(); second.child.kill('SIGTERM');
  await wait(() => second.exit, 'idle server exit', 15_000);
  record.idleShutdown = { exit: second.exit, elapsedMs: second.exit.at - started };
  assert.equal(second.exit.code, 0);
  record.result = 'Pass';
} catch (error) { record.result = 'Fail'; record.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  for (const ws of sockets) ws.terminate();
  for (const s of servers) if (!s.exit) { s.child.kill('SIGKILL'); await wait(() => s.exit, 'cleanup server', 5_000).catch(() => {}); note('cleanup forced server', s.pid); }
  for (const row of marked()) { try { process.kill(row.pid, 'SIGKILL'); note('fixture fallback cleanup', row); } catch {} }
  model.closeAllConnections(); await new Promise(r => model.close(r));
  record.calls = calls;
  record.serverLogs = servers.map(s => ({ label: s.label, pid: s.pid, tail: s.log.split('\n').slice(-60).join('\n') }));
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  if (process.env.TEST_BUSY_STOP_EVIDENCE_DIR) { const out = resolve(process.env.TEST_BUSY_STOP_EVIDENCE_DIR); await fs.mkdir(out, { recursive: true }); await fs.writeFile(join(out, `busy-run-stop-now-${process.env.TEST_BUSY_STOP_LABEL ?? 'result'}.json`), JSON.stringify(record, null, 2)); }
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null, terminate: record.terminate ?? null, shutdown: record.shutdown ? { exit: record.shutdown.exit, elapsedMs: record.shutdown.elapsedMs, survivors: record.shutdown.survivors, markedLeft: record.shutdown.markedLeft } : null, history: record.history ?? null, rootRemoved: record.rootRemoved }));
}
