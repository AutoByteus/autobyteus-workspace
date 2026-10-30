/** TEMPORARY API/E2E probe (autobyteus-284), kept as evidence; not repository test code.
 * A real server process (`node <server>/dist/app.js --port --data-dir`, the desktop's spawn shape) with live runtimes:
 * Codex (`gpt-6.1-terra`, reasoning effort medium, throwaway CODEX_HOME) and Claude (host login, real HOME).
 * Busy = the agent runs a foreground `python3 -c "import time; time.sleep(900)" <run marker>`.
 * Modes:
 *   mixed  (API-04, API-05, API-06): Terminate a busy Codex run and a busy Claude run; then make busy a Codex standalone,
 *          a Claude standalone, a Codex Team member and a Claude Org agent; SIGTERM the server; relaunch on the same data
 *          and read `terminatedAt` (AC-010).
 *   many   (API-07, U-A1): 3 busy + 2 idle Claude runs; SIGTERM the server.
 * Usage (from the ticket worktree root):
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" \
 *     node tickets/in-progress/busy-quit-shutdown-orphan/evidence/API-live-server-probe.mjs <mode> <server dir> <evidence dir>
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const [mode, serverDirArg, evidenceArg] = process.argv.slice(2);
const serverDir = resolve(serverDirArg), evidence = resolve(evidenceArg);
const WebSocket = createRequire(join(serverDir, 'package.json'))('ws');
const caseId = mode === 'mixed' ? 'API-04-05-06' : mode === 'history' ? 'API-06H' : mode === 'repeat' ? 'API-06R' : mode === 'baseline' ? 'API-09' : 'API-07';
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), `bq284-live-${mode}-`)));
const data = join(own, 'data'), workspace = join(own, 'workspace'), codexHome = join(own, 'codex-home');
for (const d of [data, workspace, codexHome]) await fs.mkdir(d);
await fs.writeFile(join(data, '.env'), 'APP_ENV=test\nLOG_LEVEL=INFO\n');
await fs.symlink(join(homedir(), '.codex', 'auth.json'), join(codexHome, 'auth.json'));
await fs.writeFile(join(codexHome, 'config.toml'), 'check_for_update_on_startup = false\n');
const runTag = `BQ284L${Date.now().toString(36)}`;
const T0 = Date.now();
const record = { case: caseId, mode, serverDir, date: new Date().toISOString(), own, runTag, versions: {}, steps: [] };
const log = (step, value) => { const at = ((Date.now() - T0) / 1000).toFixed(1); record.steps.push({ at, step, value }); console.log(`[+${at}s] ${step} ${JSON.stringify(value).slice(0, 400)}`); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000) => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await delay(250); } throw Error(`Timed out: ${label}`); };
const table = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(line => {
  const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4].length > 400 ? `${m[4].slice(0, 200)} … ${m[4].slice(-180)}` : m[4] }] : [];
});
const descendants = root => { const rows = table(), out = []; let frontier = [root]; while (frontier.length) { const kids = rows.filter(r => frontier.includes(r.ppid) && !out.some(o => o.pid === r.pid)); out.push(...kids); frontier = kids.map(k => k.pid); } return out; };
const markedProcs = (tag = runTag) => table().filter(r => r.command.includes(tag) && !r.command.includes('ps -ww') && /python/i.test(r.command));
for (const [name, cmd] of [['codex', ['codex', '--version']], ['claude', ['claude', '--version']], ['node', [process.execPath, '--version']], ['python3', ['python3', '--version']]]) {
  try { record.versions[name] = execFileSync(cmd[0], cmd.slice(1), { encoding: 'utf8', env: process.env }).trim(); } catch (e) { record.versions[name] = `unavailable: ${e.message}`; }
}
const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const servers = [], sockets = [], frameLog = [];
const startServer = async label => {
  const port = await freePort();
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR,
    CODEX_HOME: codexHome, AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '' };
  const child = spawn(process.execPath, [join(serverDir, 'dist/app.js'), '--port', String(port), '--data-dir', data], { cwd: serverDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const s = { label, port, child, pid: child.pid, log: '', exit: null };
  const stamp = b => String(b).split('\n').filter(Boolean).map(l => `[${((Date.now() - T0) / 1000).toFixed(2)}] ${l}`).join('\n') + '\n';
  child.stdout.on('data', b => { s.log += stamp(b); }); child.stderr.on('data', b => { s.log += stamp(b); });
  child.on('exit', (code, signal) => { s.exit = { code, signal, at: Date.now() }; });
  servers.push(s);
  await wait(async () => { if (s.exit) throw Error(`server exited ${JSON.stringify(s.exit)}\n${s.log.slice(-3000)}`); return fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok, () => false); }, `${label} health`, 90_000);
  s.gql = async (query, variables = {}, timeout = 60_000) => {
    const body = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeout) }).then(r => r.json());
    if (body.errors?.length) throw Error(JSON.stringify(body.errors)); return body.data;
  };
  log('server started', { label, pid: s.pid, port });
  return s;
};
const connect = async (s, route, id) => {
  const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws/${route}/${id}`); sockets.push(ws);
  const frames = []; ws.on('message', raw => { try { const f = JSON.parse(String(raw)); frames.push(f); if (!/STREAM_DELTA|SEGMENT_CONTENT|TOKEN/.test(f.type)) frameLog.push({ at: ((Date.now() - T0) / 1000).toFixed(1), route, id, type: f.type, payload: JSON.stringify(f.payload ?? null).slice(0, 300) }); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  return { ws, frames };
};
const send = (ws, payload) => { const id = randomUUID(); ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:${id}`, ...(payload.root_subject_kind ? { command_id: randomUUID() } : {}), context_file_paths: [], image_urls: [], ...payload } })); };
const busyText = marker => `Run exactly this shell command in the foreground and wait for it to finish. Do not run it in the background, do not add a timeout, do not change it: python3 -c "import time; time.sleep(900)" ${marker}\nWhen it finishes, reply with the single word DONE.`;
const waitBusy = async (server, marker, label) => {
  const started = Date.now();
  const proc = await wait(() => descendants(server.pid).find(r => r.command.includes(marker) && /python/i.test(r.command)), `${label} busy (${marker})`, Number(process.env.BUSY_TIMEOUT_MS ?? 240_000))
    .catch(error => {
      const rows = table(), chain = pid => { const out = []; let row = rows.find(r => r.pid === pid); while (row && out.length < 12) { out.push(row); row = rows.find(r => r.pid === row.ppid); } return out; };
      log('busy wait failed: every process carrying the marker, with its ancestors', rows.filter(r => r.command.includes(marker) && !r.command.includes('ps -ww')).map(r => chain(r.pid)));
      throw error;
    });
  log('busy', { label, marker, pid: proc.pid, ppid: proc.ppid, pgid: proc.pgid, afterMs: Date.now() - started });
  return proc;
};
let models;
const loadModels = async s => {
  const pick = async (runtimeKind, re) => {
    const snaps = (await s.gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier value}}}', { r: runtimeKind })).providerModelCatalogSnapshots;
    const all = snaps.flatMap(x => x.llmModels); const m = all.find(x => re.test(x.modelIdentifier) || re.test(x.value ?? ''));
    assert(m, `${runtimeKind} model ${re} not in catalog: ${all.map(x => x.modelIdentifier).join(', ')}`); return m.modelIdentifier;
  };
  models = { codex: await pick('codex_app_server', /gpt-6\.1-terra/), claude: await pick('claude_agent_sdk', /haiku/i) };
  log('models', models);
};
const launch = runtime => runtime === 'codex'
  ? { runtimeKind: 'codex_app_server', llmModelIdentifier: models.codex, llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: true, workspaceRootPath: workspace }
  : { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: models.claude, autoExecuteTools: true, workspaceRootPath: workspace };
const defs = {};
const agentDef = async (s, name) => defs[name] ??= (await s.gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
  { input: { name: `${name} ${runTag}`, role: 'engineer', description: 'busy quit live probe', instructions: 'Follow the user instructions exactly. Use your shell tool to run commands.', category: 'api-e2e' } })).createAgentDefinition.id;
const standalone = async (s, runtime, label, text) => {
  const created = (await s.gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: await agentDef(s, 'Probe Agent'), ...launch(runtime) } })).createAgentRun;
  assert(created.success, created.message);
  const c = await connect(s, 'agent', created.runId);
  await wait(() => c.frames.some(f => f.type === 'CONNECTED'), `${label} connected`);
  send(c.ws, { content: text });
  log('standalone sent', { label, runtime, runId: created.runId });
  return { label, runtime, kind: 'agent', runId: created.runId, ...c };
};
const teamMember = async (s, runtime, label, text) => {
  const coordinator = await agentDef(s, `Probe Team Coordinator ${label}`);
  const teamDefinitionId = (await s.gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: `Probe Team ${runTag} ${label}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', coordinatorMemberName: 'coordinator', nodes: [{ memberName: 'coordinator', ref: coordinator, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const created = (await s.gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...launch(runtime) }], memberConfigs: [{ memberAddress: '/coordinator', agentDefinitionId: coordinator, ...launch(runtime) }] } })).createAgentTeamRun;
  assert(created.success, created.message);
  const tree = JSON.stringify((await s.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: created.teamRunId })).getTeamRunResumeConfig.executionTree);
  const memberRunId = tree.match(/"agent_?[rR]un_?[iI]d":"([^"]+)"/)?.[1];
  assert(memberRunId, `team member run id not found: ${tree.slice(0, 400)}`);
  const c = await connect(s, 'agent-team', created.teamRunId);
  await delay(1000);
  send(c.ws, { agent_run_id: memberRunId, content: text });
  log('team sent', { label, runtime, teamRunId: created.teamRunId, memberRunId });
  return { label, runtime, kind: 'team', runId: memberRunId, rootId: created.teamRunId, ...c };
};
const orgAgent = async (s, runtime, label, text) => {
  const manager = await agentDef(s, `Probe Org Manager ${label}`);
  const orgId = (await s.gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: `Probe Org ${runTag} ${label}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', handoffs: [], members: [{ memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  const created = (await s.gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: orgId, rootConfiguration: launch(runtime), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(created.success, created.message);
  const tree = (await s.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: created.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const member = (tree.rootOrg ?? tree.root_org).members.find(m => m.address === '/manager');
  const memberRunId = member.agentRunId ?? member.agent_run_id;
  const c = await connect(s, 'agent-org', created.agentOrgRunId);
  await delay(1000);
  send(c.ws, { root_subject_kind: 'agent_org', root_run_id: created.agentOrgRunId, target_agent_run_id: memberRunId, content: text });
  log('org sent', { label, runtime, orgRunId: created.agentOrgRunId, memberRunId });
  return { label, runtime, kind: 'org', runId: memberRunId, rootId: created.agentOrgRunId, ...c };
};
const terminateCase = async (s, runtime, id) => {
  const marker = `${runTag}_${id}`;
  const run = await standalone(s, runtime, id, busyText(marker));
  const proc = await waitBusy(s, marker, id);
  const tree = descendants(s.pid);
  const started = Date.now();
  const result = await s.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: run.runId }, 30_000).then(d => d.terminateAgentRun, e => ({ success: false, message: `pending or failed: ${e}` }));
  const elapsedMs = Date.now() - started;
  await wait(() => !alive(proc.pid), `${id} tool command gone`, 5_000).catch(() => {});
  const out = { case: id, runtime, runId: run.runId, marker, result, elapsedMs, toolCommand: { ...proc, aliveAfter: alive(proc.pid) }, treeAtBusy: tree, markedLeft: markedProcs(marker) };
  log('terminate', out); record[id] = out;
  return out;
};
const shutdownCase = async (s, id, runs) => {
  const busy = [];
  for (const r of runs) busy.push({ ...r, proc: await waitBusy(s, r.marker, r.label) });
  await delay(1500);
  const before = descendants(s.pid);
  const started = Date.now(); s.child.kill('SIGTERM');
  await wait(() => s.exit, 'server exit after SIGTERM', 30_000).catch(() => {});
  const exitMs = s.exit ? s.exit.at - started : null;
  await delay(1000);
  const out = { case: id, serverPid: s.pid, exit: s.exit, elapsedMs: exitMs, runs: busy.map(b => ({ label: b.label, kind: b.kind, runtime: b.runtime, runId: b.runId, toolCommand: { pid: b.proc.pid, ppid: b.proc.ppid, pgid: b.proc.pgid, aliveAfter: alive(b.proc.pid) } })),
    before, survivors: before.map(r => ({ ...r, alive: alive(r.pid) })).filter(r => r.alive), markedLeft: markedProcs(),
    shutdownLog: s.log.split('\n').filter(l => /process-tree sweep|exceeded 10s|Backend shutdown incomplete|did not accept the stop fence/.test(l)) };
  log('shutdown', { ...out, before: out.before.length }); record[id] = out;
  return out;
};
try {
  await fs.mkdir(evidence, { recursive: true });
  const s1 = await startServer('first');
  await loadModels(s1);
  if (mode === 'mixed') {
    await terminateCase(s1, 'codex', 'API-04');
    await terminateCase(s1, 'claude', 'API-05');
    const runs = [];
    const add = async (fn, runtime, label) => { const marker = `${runTag}_${label}`; runs.push({ ...(await fn(s1, runtime, label, busyText(marker))), marker }); };
    await add(standalone, 'codex', 'sa-codex');
    await add(standalone, 'claude', 'sa-claude');
    await add(teamMember, 'codex', 'team-codex');
    await add(orgAgent, 'claude', 'org-claude');
    const shut = await shutdownCase(s1, 'API-06', runs);
    for (const ws of sockets.splice(0)) ws.terminate();
    const s2 = await startServer('second');
    const history = (await s2.gql('query{listWorkspaceRunHistory(limitPerAgent:100){workspaceRootPath agentDefinitions{agentName runs{runId terminatedAt isActive}} teamDefinitions{teamDefinitionName runs{teamRunId terminatedAt}}}}')).listWorkspaceRunHistory;
    record.rawHistoryAfterRelaunch = history;
    const agentRuns = history.flatMap(g => g.agentDefinitions.flatMap(d => d.runs)), teamRuns = history.flatMap(g => g.teamDefinitions.flatMap(d => d.runs));
    const lookup = (rows, key, id) => { const row = rows.find(x => x[key] === id); return row ? { listed: true, terminatedAt: row.terminatedAt } : { listed: false }; };
    record.history = {
      userTerminated: ['API-04', 'API-05'].map(id => ({ case: id, runId: record[id].runId, ...lookup(agentRuns, 'runId', record[id].runId) })),
      shutdownStopped: shut.runs.filter(r => r.kind === 'agent').map(r => ({ label: r.label, runId: r.runId, ...lookup(agentRuns, 'runId', r.runId) })),
      teamRoot: runs.filter(r => r.kind === 'team').map(r => ({ teamRunId: r.rootId, ...lookup(teamRuns, 'teamRunId', r.rootId) })),
    };
    log('history after relaunch', record.history);
    const started = Date.now(); s2.child.kill('SIGTERM'); await wait(() => s2.exit, 'idle exit', 20_000);
    record.idleShutdown = { exit: s2.exit, elapsedMs: s2.exit.at - started, shutdownLog: s2.log.split('\n').filter(l => /process-tree sweep|exceeded 10s/.test(l)) };
    log('idle shutdown', record.idleShutdown);
  } else if (mode === 'baseline') {
    // API-09 "before" baseline: the same busy SIGTERM against a server build WITHOUT the change (base checkout).
    const runs = [];
    for (const [runtime, label] of [['codex', 'base-codex'], ['claude', 'base-claude']]) { const marker = `${runTag}_${label}`; runs.push({ ...(await standalone(s1, runtime, label, busyText(marker))), marker }); }
    const shut = await shutdownCase(s1, 'API-09', runs);
    record.baselineTreeToClean = shut.before;
  } else if (mode === 'repeat') {
    // API-11R1 cause hunt: restart emulation (busy Codex → SIGTERM → relaunch on the same data), then four busy roots → SIGTERM. Repeated.
    let current = s1; record.iterations = [];
    const iterations = Number(process.env.REPEAT ?? 4);
    for (let i = 1; i <= iterations; i++) {
      const pre = { ...(await standalone(current, 'codex', `pre${i}`, busyText(`${runTag}_pre${i}`))), marker: `${runTag}_pre${i}` };
      const restart = await shutdownCase(current, `API-06R-${i}-restart`, [pre]);
      for (const ws of sockets.splice(0)) ws.terminate();
      current = await startServer(`iter${i}`);
      const runs = [];
      const add = async (fn, runtime, label) => { const marker = `${runTag}_${label}`; runs.push({ ...(await fn(current, runtime, label, busyText(marker))), marker }); };
      await add(standalone, 'codex', `sa-codex-${i}`);
      await add(standalone, 'claude', `sa-claude-${i}`);
      await add(teamMember, 'codex', `team-codex-${i}`);
      await add(orgAgent, 'claude', `org-claude-${i}`);
      const shut = await shutdownCase(current, `API-06R-${i}`, runs);
      record.iterations.push({ i, restartMs: restart.elapsedMs, restartExit: restart.exit, shutdownMs: shut.elapsedMs, exit: shut.exit, survivors: shut.survivors.length, marked: shut.markedLeft.length, shutdownLog: shut.shutdownLog });
      log('iteration', record.iterations.at(-1));
      for (const ws of sockets.splice(0)) ws.terminate();
      if (i < iterations) current = await startServer(`next${i}`);
    }
  } else if (mode === 'history') {
    // Diagnostic for the API-06 history read: where does a run stopped by shutdown appear after relaunch?
    const historyQuery = 'query{listWorkspaceRunHistory(limitPerAgent:100){workspaceRootPath agentDefinitions{agentDefinitionId agentName runs{runId terminatedAt isActive status summary}}}}';
    const marker = `${runTag}_hist`;
    const run = await standalone(s1, 'codex', 'hist', busyText(marker));
    record.historyBeforeBusy = (await s1.gql(historyQuery)).listWorkspaceRunHistory;
    await waitBusy(s1, marker, 'hist');
    record.historyWhileBusy = (await s1.gql(historyQuery)).listWorkspaceRunHistory;
    await shutdownCase(s1, 'API-06H', [{ ...run, marker }]);
    for (const ws of sockets.splice(0)) ws.terminate();
    const s2 = await startServer('second');
    record.historyAfterRelaunch = (await s2.gql(historyQuery)).listWorkspaceRunHistory;
    record.histRunId = run.runId;
    record.dataTree = execFileSync('find', [data, '-maxdepth', '5'], { encoding: 'utf8' }).split('\n').filter(l => l.includes(run.runId));
    log('history diag', { runId: run.runId, before: JSON.stringify(record.historyBeforeBusy).includes(run.runId), whileBusy: JSON.stringify(record.historyWhileBusy).includes(run.runId), afterRelaunch: JSON.stringify(record.historyAfterRelaunch).includes(run.runId), dataTree: record.dataTree });
    s2.child.kill('SIGTERM'); await wait(() => s2.exit, 'idle exit', 20_000);
  } else if (mode === 'many') {
    const idle = [];
    for (const label of ['idle-1', 'idle-2']) {
      const r = await standalone(s1, 'claude', label, 'Reply with the single word READY and nothing else. Do not use any tool.');
      await wait(() => r.frames.some(f => /TURN_COMPLETED/.test(f.type)), `${label} turn completed`, 180_000);
      idle.push(r); log('idle ready', { label, runId: r.runId });
    }
    const runs = [];
    for (const label of ['busy-1', 'busy-2', 'busy-3']) { const marker = `${runTag}_${label}`; runs.push({ ...(await standalone(s1, 'claude', label, busyText(marker))), marker }); }
    const claudeBefore = descendants(s1.pid).filter(r => /claude/.test(r.command) && !/python/.test(r.command));
    record.claudeCliCount = claudeBefore.length;
    const shut = await shutdownCase(s1, 'API-07', runs);
    record['API-07'].idleRuns = idle.map(r => r.runId);
  }
  record.result = 'Completed';
} catch (error) { record.result = 'Error'; record.error = String(error.stack ?? error); console.error(error); process.exitCode = 1; }
finally {
  for (const ws of sockets) ws.terminate();
  for (const s of servers) if (!s.exit) { s.child.kill('SIGTERM'); await wait(() => s.exit, 'cleanup exit', 20_000).catch(() => { s.child.kill('SIGKILL'); }); log('cleanup stopped server', s.pid); }
  await delay(500);
  if (record.baselineTreeToClean) { record.baselineLeftAfterServerKill = record.baselineTreeToClean.filter(r => alive(r.pid)); for (const r of record.baselineLeftAfterServerKill) { try { process.kill(r.pid, 'SIGKILL'); } catch {} } }
  const left = markedProcs();
  for (const row of left) { try { process.kill(row.pid, 'SIGKILL'); } catch {} }
  record.fallbackCleanup = left;
  await fs.writeFile(join(evidence, `${caseId}-ws-frames.json`), JSON.stringify(frameLog, null, 1));
  for (const s of servers) await fs.writeFile(join(evidence, `${caseId}-server-${s.label}.log`), `# ${caseId} server ${s.label} pid ${s.pid}; mode ${mode}; ${record.date}\n${s.log}`);
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  await fs.writeFile(join(evidence, `${caseId}-result.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null, fallbackCleanup: left.length }));
}
