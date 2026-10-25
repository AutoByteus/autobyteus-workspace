#!/usr/bin/env node
// delegated-copies-slow-open REQ-008 / AC-008 regression check: a standalone run (the hub) with many delegated Team copies
// must show its copy rows, open, and open one copy in time independent of the number of copies (QR-001, QR-002), drawing
// the rows from one collaboration-view request and loading a copy's details only when it is opened (AC-001..AC-007, AC-009).
// Two steps, both on test-owned data only (never a user's data or a copy of it):
//   1. Seed (once):  pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --seed-to <new dir> [--teams 50] [--unrelated 300]
//      Real server of this worktree (dist/app.js) + scripted AGY (tests/fixtures/agy-failure-cli.mjs, no inference) and
//      public GraphQL/WebSocket APIs only: a hub that delegated <teams> six-member Team copies (one Project Task each), a
//      second hub with two copies, copy-to-hub messages that make a few-MB hub message log, two member conversations with
//      markers, and <unrelated> stopped team runs in another workspace. Hubs are stopped at the end. The layout is an
//      isolated desktop data root (`<dir>/server-data`), so `pnpm isolated-app start --data-root <copy>` can open it.
//   2. Measure (per build): ... --from-seed <seed dir> --output-dir <fresh dir> [--stack-root <worktree>] [--label fix]
//      [--samples 3] [--live] [--cases S,L-002] [--compare-with <other evidence.json>] [--desktop-instance <isolated-app start result JSON>]
//      Copies the seed to a fresh data root, starts that worktree's backend (dist/app.js) and Nuxt dev (or attaches to a
//      caller-owned isolated instance started on a seed copy), and records in evidence.json:
//      - S-API: server timings of the hub view, the hub conversation, a copy's projection and artifact list (scoped query
//        when the build has it; the generic run-id query always);
//      - S-001..S-00n: cold page: hub row → copy rows (T-1), hub click → hub conversation (T-2), copy click → copy
//        conversation (T-3), each with the GraphQL operations issued in its window; reopen without refetch;
//      - S-ROWS: every Team and member row (labels, statuses, Task summaries) for --compare-with (AC-005);
//      - --live (current build): L-001 running hub T-1/T-2, L-002 new delegation with one opened copy (AC-007 request counts,
//        opened copy keeps its conversation), L-003 composer send to the opened copy, L-004 queued input survives a reload,
//        L-005 copy under a hub that is not selected (R-004), L-006 Project Task locate (FU-4), L-007 composer send to a copy
//        of a stopped hub, L-008 a woken copy's status in the row/header equals the server's, L-009 opening a copy during a
//        burst of turns ends loaded with its whole conversation (needs >= 9 Teams), L-010 opening a copy whose stored
//        conversation is several MB, L-011 a copy load that fails on the network is logged, stays unloaded and retries.
// Regression check: a current build shows the copy rows with one view request per hub and no member request (S-00n
// opsUntilRows), and a copy open issues exactly one projection and one artifact request; the base build of this ticket
// (5ceb43039a) issued two requests per child agent before drawing any row.
// Prereqs: pnpm install, server prebuild + build and nuxt prepare in each --stack-root; Chrome (playwright-core).
// Times use the page performance clock; "cold" = fresh page and store after the Nuxt optimizer warm-up, warm OS cache.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const ownWebDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const seedTo = getArg('seed-to') ? path.resolve(getArg('seed-to')) : null;
const fromSeed = getArg('from-seed') ? path.resolve(getArg('from-seed')) : null;
// Real path: dist/app.js starts only when its own URL equals argv[1] (a symlinked /tmp path would exit silently).
const stackRoot = fs.realpathSync(path.resolve(getArg('stack-root', path.dirname(ownWebDir))));
const webDir = path.join(stackRoot, 'autobyteus-web');
const serverDir = path.join(stackRoot, 'autobyteus-server-ts');
const fixtureCli = path.join(path.dirname(ownWebDir), 'autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs');
const label = getArg('label', 'current');
const TEAMS = Number(getArg('teams', '50'));
const UNRELATED = Number(getArg('unrelated', '300'));
const SAMPLES = Number(getArg('samples', '3'));
const MESSAGE_KB = Number(getArg('message-kb', '10'));
const MESSAGES_PER_TEAM = Number(getArg('messages-per-team', '5'));
const live = process.argv.includes('--live');
const compareWith = getArg('compare-with');
const desktopFile = getArg('desktop-instance');
// --cases S,L-001,L-008 runs only cases whose ID starts with one of these (the others are recorded as not run).
const onlyCases = getArg('cases') ? getArg('cases').split(',') : null;
const wanted = (id) => !onlyCases || onlyCases.some((c) => id.startsWith(c));
const desktop = desktopFile ? JSON.parse(fs.readFileSync(desktopFile, 'utf8')) : null;
const outputDir = path.resolve(getArg('output-dir', seedTo ? `${seedTo}-seed-evidence` : 'test-results/delegated-copies-large-hub'));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((c) => fs.existsSync(c));
const MANAGER = 'Large Hub Manager Probe';
const TEAM = 'Large Hub Engineering Team';
const LATE_TEAM = 'Large Hub Late Team';
const ROLES = ['Solution Designer', 'Architecture Reviewer', 'Implementation Engineer', 'Code Reviewer', 'API E2E Engineer', 'Delivery Engineer'];
const STEP_TIMEOUT = 45 * 60_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (what, predicate, ms = 60000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${what}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const loadAverage = () => os.loadavg().map((v) => Number(v.toFixed(1)));
const dirBytes = async (dir) => {
  let total = 0;
  for (const entry of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await dirBytes(full) : (await fsp.stat(full)).size;
  }
  return total;
};
const gitHead = (dir) => { try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } };

const evidence = { mode: seedTo ? 'seed' : desktop ? 'isolated-electron' : 'real-stack-browser', label, startedAt: new Date().toISOString(),
  stackRoot, stackHead: gitHead(stackRoot), probeHead: gitHead(ownWebDir), platform: `${process.platform}-${process.arch}`, node: process.version,
  cpus: os.cpus().length, loadAtStart: loadAverage(), cases: {}, cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const runCase = async (id, description, fn) => {
  if (!wanted(id)) { evidence.cases[id] = { result: 'Not Run (filtered)', description }; return null; }
  const startedAt = Date.now();
  console.log(`[${new Date().toISOString()}] ${id} start: ${description}`);
  try {
    const details = await fn();
    evidence.cases[id] = { result: 'Pass', description, ms: Date.now() - startedAt, load: loadAverage(), details }; await save();
    console.log(`[${new Date().toISOString()}] ${id} Pass`); return details;
  } catch (e) {
    evidence.cases[id] = { result: 'Fail', description, ms: Date.now() - startedAt, message: e.message, details: e.details }; await save();
    console.log(`[${new Date().toISOString()}] ${id} Fail: ${e.message}`); throw e;
  }
};

// ---------------------------------------------------------------- owned stack
const stack = { root: '', dataDir: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null, privateHome: '', starts: 0 };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 20000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await until('owned process killed', () => exited(child), 5000);
  });
  return { pid: child.pid, status: 'terminated', exit: child.exitCode ?? child.signalCode };
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};
const baseEnv = () => Object.fromEntries(['PATH', 'TMPDIR', 'LANG', 'SHELL'].filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
const serverEnv = () => ({ APP_ENV: 'production', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataDir, 'db', 'production.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl });
const startBackend = async () => {
  stack.starts += 1;
  await fsp.writeFile(path.join(stack.dataDir, '.env'), `${Object.entries(serverEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  const env = { ...baseEnv(), ...serverEnv(), HOME: stack.privateHome, ANTIGRAVITY_CLI_COMMAND: fixtureCli, AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(stack.backendPort), '--data-dir', stack.dataDir],
    serverDir, env, `backend-${stack.starts}`);
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 300000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const startFrontend = async () => {
  const frontendPort = await freePort();
  stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...baseEnv(), HOME: process.env.HOME, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 300000);
};
const prepareStack = async (root) => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), `Build the server first in ${stackRoot}`);
  stack.root = root; stack.dataDir = path.join(root, 'server-data');
  stack.privateHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'large-hub-home-'));
  stack.backendPort = await freePort(); stack.backendUrl = `http://127.0.0.1:${stack.backendPort}`;
};
const gqlRaw = async (query, variables = {}) => {
  const started = performance.now();
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const text = await response.text();
  return { ms: performance.now() - started, bytes: text.length, ok: response.ok, body: JSON.parse(text) };
};
const gql = async (query, variables = {}) => {
  const { ok, body } = await gqlRaw(query, variables);
  assert(ok && !body.errors?.length, 'GraphQL failed', body);
  return body.data;
};
const sockets = [];
const inputFor = async (id) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${id}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: id, message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
};
/** The user's message to one copy through the hub's collaboration stream (as the app's composer sends it). */
const copyInputFor = async (hostId) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent-collaboration/${hostId}`); sockets.push(socket);
  const frames = []; socket.on('message', (raw) => frames.push(JSON.parse(String(raw))));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await until('hub collaboration snapshot', () => frames.some((f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'), 120000);
  const sendToCopy = (target, content) => {
    const messageId = `probe-${randomUUID()}`;
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent', root_run_id: hostId, target_agent_run_id: target,
      command_id: randomUUID(), message_id: messageId, dedupe_key: `agent_run_input:probe:${messageId}`, content, context_file_paths: [], image_urls: [] } }));
  };
  sendToCopy.problems = () => frames.filter((f) => f.type === 'ERROR' || (f.payload && ['rejected', 'failed'].includes(f.payload.state)))
    .map((f) => JSON.stringify(f).slice(0, 400));
  sendToCopy.acks = () => frames.filter((f) => /ACK/i.test(f.type)).map((f) => JSON.stringify(f).slice(0, 300));
  return sendToCopy;
};
const viewFor = async (id) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id })).agentRunCollaboration.root_agent;
const childProjection = async (host, address, run) => (await gql('query($host:String!,$address:String!,$run:String!){agentRunCollaborationMemberProjection(hostRunId:$host,memberAddress:$address,agentRunId:$run){conversation}}', { host, address, run })).agentRunCollaborationMemberProjection.conversation;
const tasksFor = async (id) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId status root {kind teamRunId ingressAgentRunId start status closed}}}', { id })).projectTasks;
const terminateAgent = async (id) => {
  const r = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun;
  assert(r.success, r.message);
};
const config = (workspaceRootPath) => ({ workspaceRootPath, llmModelIdentifier: 'gemini-3.8-flash-low', runtimeKind: 'antigravity_cli', autoExecuteTools: true, llmConfig: null });

// ---------------------------------------------------------------- seed
const seed = async () => {
  const workspace = path.join(stack.root, 'workspace'), archive = path.join(stack.root, 'archive');
  for (const dir of [workspace, archive]) await fsp.mkdir(dir, { recursive: true });
  const agent = async (name, tools = []) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: tools } })).createAgentDefinition.id;
  const roleIds = []; for (const name of ROLES) roleIds.push(await agent(name));
  const managerId = await agent(MANAGER, ['list_projects', 'list_project_tasks', 'create_task', 'update_task']);
  const team = async (name) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: name, instructions: 'Do the assigned task.', coordinatorMemberName: 'solution_designer',
    nodes: ROLES.map((n, i) => ({ memberName: segment(n), ref: roleIds[i], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id;
  const teamId = await team(TEAM); await team(LATE_TEAM);
  for (const rootPath of [workspace, archive]) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath } });
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: 'Large Hub Project' } })).createProject.projectId;
  // autobyteus-260: a Project Task has a title (here its description's first line).
  const task = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId, title: description.split('\n')[0], description } })).createProjectTask.taskId;
  const host = async () => {
    const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: managerId, ...config(workspace) } })).createAgentRun;
    assert(r.success, r.message); return r.runId;
  };
  const hostId = await host(), otherHostId = await host();
  const send = await inputFor(hostId), sendOther = await inputFor(otherHostId);
  const delegate = async (sender, taskId, n) => {
    sender(callTool('delegate_task', { recipient_address: `/${segment(TEAM)}`, task_id: taskId }));
    await until(`Task ${n} assigned`, async () => (await tasksFor(projectId)).find((t) => t.taskId === taskId)?.root?.start === 'started', 180000);
  };
  const taskIds = [];
  for (let i = 0; i < TEAMS; i++) {
    const taskId = await task(`Engineering Task ${i + 1}\nImplement and deliver part ${i + 1} of the large hub workload.`); taskIds.push(taskId);
    await delegate(send, taskId, i + 1);
    if ((i + 1) % 10 === 0) console.log(`  delegated ${i + 1}/${TEAMS}`);
  }
  const otherTaskIds = [];
  for (let i = 0; i < 2; i++) { const taskId = await task(`Other hub Task ${i + 1}`); otherTaskIds.push(taskId); await delegate(sendOther, taskId, `other-${i + 1}`); }
  const view = await viewFor(hostId);
  const teams = view.execution_tree.taskExecutions.filter((t) => t.teamRunId);
  assert(teams.length === TEAMS && teams.every((t) => t.members.length === 6), `Expected ${TEAMS} six-member Teams`, teams.length);
  const tasks = await tasksFor(projectId);
  const teamRows = teams.map((t) => ({ teamRunId: t.teamRunId, taskId: tasks.find((x) => x.root?.teamRunId === t.teamRunId)?.taskId,
    coordinator: t.members.find((m) => m.agentRunId === tasks.find((x) => x.root?.teamRunId === t.teamRunId)?.root?.ingressAgentRunId) ?? t.members[0],
    members: t.members.map((m) => ({ address: m.address, agentRunId: m.agentRunId })) }));
  const otherView = await viewFor(otherHostId);
  const otherTeams = otherView.execution_tree.taskExecutions.filter((t) => t.teamRunId).map((t) => ({ teamRunId: t.teamRunId, members: t.members.map((m) => ({ address: m.address, agentRunId: m.agentRunId })) }));

  // A member conversation with a marker in two copies (the copy-open journey's target).
  const markers = [];
  for (const index of [2, 3]) {
    const member = teamRows[index].members[2];
    send(callTool('send_message_to', { target_agent_run_id: member.agentRunId, content: `Persisted marker for copy ${index}` }));
    await until(`copy ${index} marker persisted`, async () => JSON.stringify(await childProjection(hostId, member.address, member.agentRunId)).includes(`Persisted marker for copy ${index}`), 120000);
    markers.push({ index, teamRunId: teamRows[index].teamRunId, taskId: teamRows[index].taskId, ...member, marker: `Persisted marker for copy ${index}` });
  }

  // Hub message log: each Team's coordinator sends the hub several report messages (copy → hub messages, as task Teams
  // report). The user starts each coordinator's turn through the hub's stream, so the bulk is in the coordinators'
  // traces and the hub's log, not in the hub's own requests.
  const toCopy = await copyInputFor(hostId);
  const filler = 'x'.repeat(Math.max(0, MESSAGE_KB * 1024 - 120));
  for (const [i, t] of teamRows.entries()) {
    const calls = Array.from({ length: MESSAGES_PER_TEAM }, (_, k) => ({ name: 'send_message_to',
      arguments: { target_agent_run_id: hostId, content: `Report ${k + 1} of Team ${i + 1}: ${filler}` } }));
    toCopy(t.coordinator.agentRunId, `CALL_TOOLS:${JSON.stringify(calls)}`);
    if (i % 10 === 9) await sleep(2000);
  }
  // The hub's stored log (append-only message logs): sealed communication_messages_<6 digits>.jsonl files in order, then
  // communication_messages_active.jsonl; one message per complete line, each id once (as the server's MessageLog reads it).
  const collaborationDir = path.join(stack.dataDir, 'memory', 'agents', hostId, 'collaboration');
  const hubLog = async () => {
    const names = (await fsp.readdir(collaborationDir).catch(() => [])).filter((n) => /^communication_messages_(\d{6}|active)\.jsonl$/.test(n))
      .sort((a, b) => (a.endsWith('_active.jsonl') ? 1 : 0) - (b.endsWith('_active.jsonl') ? 1 : 0) || a.localeCompare(b));
    const byId = new Map(); let bytes = 0;
    for (const name of names) {
      const text = await fsp.readFile(path.join(collaborationDir, name), 'utf8'); bytes += Buffer.byteLength(text);
      const lines = text.split('\n'); lines.pop();
      for (const line of lines) { const m = JSON.parse(line); if (!byId.has(m.messageId)) byId.set(m.messageId, m); }
    }
    return { files: names, bytes, messages: [...byId.values()] };
  };
  await sleep(8000);
  console.log(`  report commands: ${toCopy.acks().length} acks; problems: ${JSON.stringify(toCopy.problems().slice(0, 3))}; first ack: ${toCopy.acks()[0]}`);
  assert(toCopy.problems().length === 0, 'Copy commands were not accepted', toCopy.problems().slice(0, 5));
  const reportsIn = (messages) => (messages ?? []).filter((m) => /^Report \d+ of Team/.test(String(m.content))).length;
  const storedReports = async () => reportsIn((await hubLog()).messages);
  await until('hub message log complete (stored)', async () => (await storedReports()) >= TEAMS * MESSAGES_PER_TEAM, 10 * 60_000 + TEAMS * 20_000);
  await sleep(10000);
  // Recorded for the report: the running hub's live view against its stored log at the same moment.
  const liveViewMessages = (await viewFor(hostId)).communication_messages?.messages ?? [];
  const messageLogObservation = { at: new Date().toISOString(), liveViewMessages: liveViewMessages.length, liveViewReports: reportsIn(liveViewMessages),
    storedMessages: (await hubLog()).messages.length, storedReports: await storedReports(), storedFiles: (await hubLog()).files };
  console.log(`  message log: ${JSON.stringify(messageLogObservation)}`);

  // Unrelated stored team runs in another workspace (what the generic run-id lookup scanned).
  const memberConfigs = ROLES.map((n, i) => ({ memberAddress: `/${segment(n)}`, agentDefinitionId: roleIds[i], ...config(archive) }));
  let unrelated = 0;
  for (let i = 0; i < UNRELATED; i++) {
    const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
      { input: { teamDefinitionId: teamId, teamConfigs: [{ teamAddress: '/', ...config(archive) }], memberConfigs } })).createAgentTeamRun;
    assert(created.success, created.message);
    const stopped = (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: created.teamRunId })).terminateAgentTeamRun;
    assert(stopped.success, stopped.message); unrelated += 1;
    if (unrelated % 50 === 0) console.log(`  unrelated team runs ${unrelated}/${UNRELATED}`);
  }
  await terminateAgent(hostId); await terminateAgent(otherHostId);
  for (const socket of sockets.splice(0)) socket.close();
  const memoryDir = path.join(stack.dataDir, 'memory');
  const counts = {};
  for (const sub of await fsp.readdir(memoryDir).catch(() => [])) counts[sub] = (await fsp.readdir(path.join(memoryDir, sub)).catch(() => [])).length;
  const storedViewReports = reportsIn((await viewFor(hostId)).communication_messages?.messages);
  return { hostId, otherHostId, projectId, managerName: MANAGER, workspace, archive, taskIds, otherTaskIds, teams: teamRows, otherTeams, markers,
    messageLogObservation: { ...messageLogObservation, storedViewReportsAfterStop: storedViewReports },
    shape: { teams: TEAMS, childAgents: TEAMS * 6, unrelatedTeamRuns: unrelated, hubMessageLogBytes: (await hubLog()).bytes,
      hubViewBytes: (await gqlRaw('query($id:String!){agentRunCollaboration(runId:$id)}', { id: hostId })).bytes, memoryBytes: await dirBytes(memoryDir), memoryFolders: counts } };
};

// ---------------------------------------------------------------- browser journeys
let setup, browser, context, page, ownedBrowser = false;
const errors = [], requests = [], frames = [], warnings = [];
const opsSince = (start, filter = () => true) => requests.slice(start).filter(filter).reduce((m, r) => ({ ...m, [r.operationName]: (m[r.operationName] || 0) + 1 }), {});
const rowBase = '[data-test="workspace-team-transient-execution-row"]:not([aria-hidden="true"])';
const treeOf = (id = setup.hostId) => page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${id}"]`);
const teamRowsOf = (id = setup.hostId) => treeOf(id).locator(`${rowBase}[data-node-kind="agent_team"]`);
// Team rows are found by their Task summary (as the collapse probe does); member rows by their agent run id.
let taskByTeam = null;
const taskIdFor = async (teamRunId) => {
  if (!taskByTeam?.has(teamRunId)) taskByTeam = new Map((await tasksFor(setup.projectId)).filter((t) => t.root?.teamRunId).map((t) => [t.root.teamRunId, t.taskId]));
  return taskByTeam.get(teamRunId);
};
const membersOf = (teamRunId) => [...setup.teams, ...setup.otherTeams].find((t) => t.teamRunId === teamRunId)?.members ?? [];
const teamRowFor = async (teamRunId, id = setup.hostId) => treeOf(id).locator(`${rowBase}[data-node-kind="agent_team"]`)
  .filter({ has: page.locator(`[data-test="workspace-task-worker-task-summary"][data-task-id="${await taskIdFor(teamRunId)}"]`) });
const memberRow = (agentRunId, id = setup.hostId) => treeOf(id).locator(`${rowBase}[data-agent-run-id="${agentRunId}"]`);
const runRow = (id = setup.hostId) => page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${id}"]`);
const storeState = (id = setup.hostId) => page.evaluate((id) => {
  const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s;
  const c = stores.get('agentRunCollaboration'), target = stores.get('activeContext')?.activeWorkspaceTarget;
  const messages = target?.context.state.conversation.messages ?? [];
  return { selected: stores.get('agentSelection')?.selectedRunId, child: c?.selectedChild(id), target: target?.agentRunId ?? target?.context.state.runId,
    conversationId: target?.context.state.conversation.id, messageCount: messages.length,
    pending: messages.filter((m) => m.type === 'user' && m.pendingInput).map((m) => ({ text: String(m.text).slice(0, 80), state: m.pendingInput.state })),
    error: c?.errors?.[id] ?? null, phase: c?.contextFor(id)?.phase ?? null, rows: c?.taskRows(id)?.length ?? null,
    teams: c?.contextFor(id) ? c.contextFor(id).index.teams.size : null };
}, id);
const observe = async () => {
  page.__inflight = new Set();
  page.on('request', (r) => { if (r.url().endsWith('/graphql')) { page.__inflight.add(r); try { const body = r.postDataJSON(); requests.push({ at: Date.now(), operationName: body.operationName, variables: body.variables }); } catch { /* not JSON */ } } });
  for (const event of ['requestfinished', 'requestfailed']) page.on(event, (r) => page.__inflight.delete(r));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning' && m.text().includes('agentRunCollaboration')) warnings.push({ at: Date.now(), text: m.text() }); });
  page.on('websocket', (ws) => ws.on('framereceived', (f) => { try { const v = JSON.parse(String(f.payload)); frames.push({ at: Date.now(), url: ws.url(), type: v.type, kind: v.payload?.event?.kind }); } catch { /* protocol */ } }));
  const recordSockets = () => { if (window.__probeSockets) return; const Original = window.WebSocket; window.__probeSockets = [];
    window.WebSocket = class extends Original { constructor(...args) { super(...args); window.__probeSockets.push(this); } }; };
  await page.addInitScript(recordSockets);
  // T-1 observer from navigation start: when the hub row first shows, when its first copy row shows.
  await page.addInitScript((hub) => {
    window.__t1 = { hubRowAt: null, copyRowsAt: null, hub };
    const tick = () => {
      const t = window.__t1;
      if (t.hub) {
        if (t.hubRowAt === null && document.querySelector(`[data-test="workspace-agent-run-row"][data-run-id="${t.hub}"]`)) t.hubRowAt = performance.now();
        if (t.copyRowsAt === null && document.querySelector(`[data-test="workspace-agent-run-task-tree"][data-run-id="${t.hub}"] [data-test="workspace-team-transient-execution-row"]`)) t.copyRowsAt = performance.now();
      }
      if (t.hubRowAt === null || t.copyRowsAt === null) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, setup.hostId);
};
const quiet = async (ms = 1500, timeout = STEP_TIMEOUT) => {
  let since = Date.now();
  await until('GraphQL quiet', () => { if (page.__inflight?.size) since = Date.now(); return Date.now() - since >= ms; }, timeout);
};
const push = async (to) => {
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$router), null, { timeout: 120000 });
  return page.evaluate((to) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), to);
};
const shot = (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => {});
/** Fresh page and store, then the user's path to the hub: workspace expanded, manager group expanded. Returns T-1. */
const coldOpenWorkspace = async () => {
  if (page.__inflight) await quiet(750).catch(() => {});
  const requestStart = requests.length;
  if (desktop) await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  else await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (desktop) await push('/workspace');
  const workspace = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first();
  await workspace.waitFor({ timeout: 120000 });
  if (await workspace.getAttribute('aria-expanded') !== 'true') await workspace.locator('button').first().click();
  const agent = page.locator('[data-test="workspace-agent-row"]', { hasText: MANAGER });
  await agent.waitFor({ timeout: 120000 });
  if (await agent.getAttribute('aria-expanded') !== 'true') await agent.click();
  await runRow().waitFor({ timeout: 120000 });
  await page.waitForFunction(() => window.__t1.copyRowsAt !== null, null, { timeout: STEP_TIMEOUT, polling: 250 });
  const t1 = await page.evaluate(() => window.__t1);
  const ops = opsSince(requestStart, (r) => r.at <= Date.now());
  return { hubRowToCopyRowsMs: t1.copyRowsAt - t1.hubRowAt, hubRowAt: t1.hubRowAt, copyRowsAt: t1.copyRowsAt, requestStart, opsUntilRows: ops };
};
/** Click on a row (capture-phase start), then wait for a page-side predicate; returns ms in the page clock. */
const timedClick = async (locator, predicateSource, arg, timeout = STEP_TIMEOUT) => {
  await page.evaluate(() => { window.__click = { start: null }; document.addEventListener('click', () => { if (window.__click.start === null) window.__click.start = performance.now(); }, { capture: true, once: true }); });
  await locator.click();
  await page.waitForFunction(new Function('arg', `const p = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia; ${predicateSource}`), arg, { timeout, polling: 'raf' });
  return page.evaluate(() => performance.now() - window.__click.start);
};
const HOST_READY = `const t = p._s.get('activeContext')?.activeWorkspaceTarget; return p._s.get('agentSelection')?.selectedRunId === arg && t?.context.state.runId === arg && t.context.state.conversation.messages.length > 0;`;
const CHILD_READY = `const t = p._s.get('activeContext')?.activeWorkspaceTarget; return t?.agentRunId === arg.id && t.context.state.conversation.id === arg.id && t.context.state.conversation.messages.length > 0 && (!arg.marker || document.querySelector('[data-test="workspace-center-pane"]')?.textContent.includes(arg.marker));`;
const memberOps = (start, id) => opsSince(start, (r) => ['GetAgentRunCollaborationMemberProjection', 'GetAgentRunCollaborationMemberFileChanges', 'GetRunFileChanges'].includes(r.operationName) && (r.variables?.agentRunId === id || r.variables?.runId === id));
const allMemberOps = (start) => opsSince(start, (r) => ['GetAgentRunCollaborationMemberProjection', 'GetAgentRunCollaborationMemberFileChanges'].includes(r.operationName) || (r.operationName === 'GetRunFileChanges' && r.variables?.runId !== setup.hostId));
const expandTeam = async (teamRunId, id = setup.hostId) => {
  const row = await teamRowFor(teamRunId, id);
  await row.waitFor({ timeout: 60000 });
  if (await row.getAttribute('aria-expanded') !== 'true') await row.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const last = membersOf(teamRunId).at(-1);
  await until('team members shown', async () => (await memberRow(last.agentRunId, id).count()) === 1, 60000);
};
const rowsSnapshot = () => treeOf().locator(rowBase).evaluateAll((rows) => rows.map((row) => ({
  kind: row.getAttribute('data-node-kind'), teamRunId: row.getAttribute('data-team-run-id'), address: row.getAttribute('data-member-address'),
  agentRunId: row.getAttribute('data-agent-run-id'), depth: row.getAttribute('data-tree-depth'), expanded: row.getAttribute('aria-expanded'),
  label: row.getAttribute('aria-label'), status: row.querySelector('[status]')?.getAttribute('status') ?? null,
  summary: row.querySelector('[data-test="workspace-task-worker-task-summary"]')?.textContent?.trim() ?? null,
  text: row.innerText.replace(/\s+/g, ' ').trim() })));

const stoppedSample = async (n) => {
  const t1 = await coldOpenWorkspace();
  const state1 = await storeState(); assert(!state1.error, 'Collaboration error', state1);
  const teamCount = await teamRowsOf().count();
  // T-2: hub click → hub conversation shown.
  const t2Start = requests.length;
  const hubClickMs = await timedClick(runRow(), HOST_READY, setup.hostId);
  const t2Ops = opsSince(t2Start);
  await quiet(1500);
  const t2SettledOps = opsSince(t2Start);
  // T-3: open a copy (marker member of copy 2).
  const marker = setup.markers[0];
  await expandTeam(marker.teamRunId);
  const t3Start = requests.length;
  const copyClickMs = await timedClick(memberRow(marker.agentRunId), CHILD_READY, { id: marker.agentRunId, marker: marker.marker });
  await quiet(1000);
  const t3Ops = allMemberOps(t3Start);
  // Reopen without a new inspection: another copy, then back (AC-004 no refetch).
  const other = setup.markers[1];
  await expandTeam(other.teamRunId);
  await timedClick(memberRow(other.agentRunId), CHILD_READY, { id: other.agentRunId, marker: other.marker });
  await quiet(1000);
  const reopenStart = requests.length;
  const reopenMs = await timedClick(memberRow(marker.agentRunId), CHILD_READY, { id: marker.agentRunId, marker: marker.marker });
  await quiet(1000);
  const reopenOps = memberOps(reopenStart, marker.agentRunId);
  if (n === 1) await shot(`${label}-stopped-copy-open`);
  return { teamRowsShown: teamCount, t1, hubClickToConversationMs: hubClickMs, hubClickOps: t2Ops, hubClickSettledOps: t2SettledOps,
    copyClickToConversationMs: copyClickMs, copyClickMemberOps: t3Ops, copyReopenMs: reopenMs, copyReopenOps: reopenOps, state: await storeState() };
};

const apiTimings = async () => {
  const marker = setup.markers[0];
  const query = {
    hubView: ['query($id:String!){agentRunCollaboration(runId:$id)}', { id: setup.hostId }],
    hubConversation: ['query($id:String!){getRunProjection(runId:$id){conversation}}', { id: setup.hostId }],
    copyProjection: ['query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation activities}}', { h: setup.hostId, a: marker.address, r: marker.agentRunId }],
    copyArtifactsGeneric: ['query($r:String!){getRunFileChanges(runId:$r){id}}', { r: marker.agentRunId }],
    copyArtifactsScoped: ['query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberFileChanges(hostRunId:$h,memberAddress:$a,agentRunId:$r){id}}', { h: setup.hostId, a: marker.address, r: marker.agentRunId }],
  };
  const result = {};
  for (const [name, [q, v]] of Object.entries(query)) {
    const samples = [];
    for (let i = 0; i < 4; i++) { const r = await gqlRaw(q, v); samples.push({ ms: Number(r.ms.toFixed(1)), bytes: r.bytes, error: r.body.errors?.[0]?.message?.slice(0, 160) ?? null }); }
    result[name] = { samples: samples.slice(1), firstMs: samples[0].ms, medianMs: [...samples.slice(1)].map((s) => s.ms).sort((a, b) => a - b)[1], bytes: samples[0].bytes, supported: !samples[0].error, error: samples[0].error };
  }
  return result;
};

// ---------------------------------------------------------------- live journeys (current build)
const composerSend = async (text) => {
  const box = page.locator('textarea').first();
  await box.click(); await box.fill(text); await box.press('Enter');
};
const liveJourneys = async () => {
  const send = await inputFor(setup.hostId);
  const ensureHubRunning = async () => {
    if ((await viewFor(setup.hostId)).is_active === true) return;
    send('Continue managing these Tasks.');
    await until('hub running', async () => (await viewFor(setup.hostId)).is_active === true, 60000);
    await sleep(3000);
  };
  const statusOf = (id) => page.evaluate(({ host, id }) => {
    const p = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    const target = p._s.get('activeContext')?.activeWorkspaceTarget;
    const child = p._s.get('agentRunCollaboration').contextFor(host)?.listAgentContextEntries().find((e) => e.agentRunId === id);
    const row = document.querySelector(`[data-test="workspace-agent-run-task-tree"][data-run-id="${host}"] [data-test="workspace-team-transient-execution-row"][data-agent-run-id="${id}"]`);
    return { store: child?.context.state.currentStatus ?? null, target: target?.agentRunId === id ? target.context.state.currentStatus : null,
      row: /level \d+, ([^,]+),/.exec(row?.getAttribute('aria-label') ?? '')?.[1] ?? null,
      sameObject: target?.agentRunId === id ? target.context === child?.context : null };
  }, { host: setup.hostId, id });
  const serverStatusOf = async (id) => (await viewFor(setup.hostId)).agent_statuses?.find((s) => s.agent_run_id === id)?.status ?? null;
  await runCase('L-001', 'Running large hub: hub row → copy rows and hub click → conversation (AC-003 running, QR-001/QR-002)', async () => {
    await ensureHubRunning();
    const t1 = await coldOpenWorkspace();
    const t2Start = requests.length;
    const hubClickMs = await timedClick(runRow(), HOST_READY, setup.hostId);
    await until('live collaboration snapshot', async () => (await storeState()).phase === 'live', 120000);
    await quiet(1500);
    return { t1, hubClickToConversationMs: hubClickMs, ops: opsSince(t2Start), memberOps: allMemberOps(t1.requestStart), state: await storeState() };
  });
  const marker = setup.markers[0];
  await runCase('L-002', 'New delegation while one copy is open: new row, opened copy keeps its conversation, exactly one projection and one artifact request (AC-007, AC-006)', async () => {
    await expandTeam(marker.teamRunId);
    await timedClick(memberRow(marker.agentRunId), CHILD_READY, { id: marker.agentRunId, marker: marker.marker });
    await quiet(1500);
    const before = await storeState(); const teamsBefore = await teamRowsOf().count();
    await page.evaluate((id) => { window.__minMessages = Infinity; const tick = () => { const t = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('activeContext')?.activeWorkspaceTarget;
      if (t?.agentRunId === id) window.__minMessages = Math.min(window.__minMessages, t.context.state.conversation.messages.length); else window.__lostTarget = true; if (!window.__stopMin) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, marker.agentRunId);
    const start = requests.length, framesStart = frames.length;
    const taskId = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId: setup.projectId, title: 'New live Engineering Task', description: 'New live Engineering Task' } })).createProjectTask.taskId;
    send(callTool('delegate_task', { recipient_address: `/${segment(TEAM)}`, task_id: taskId }));
    await until('new Team row appears', async () => (await teamRowsOf().count()) === teamsBefore + 1, 180000);
    await until('opened copy reloaded once', async () => (memberOps(start, marker.agentRunId).GetAgentRunCollaborationMemberFileChanges ?? 0) >= 1, 60000).catch(() => {});
    await quiet(3000);
    await page.evaluate(() => { window.__stopMin = true; });
    const minMessages = await page.evaluate(() => window.__minMessages), lostTarget = await page.evaluate(() => window.__lostTarget ?? false);
    const after = await storeState();
    const ops = opsSince(start), member = memberOps(start, marker.agentRunId), all = allMemberOps(start);
    assert(after.target === marker.agentRunId && after.messageCount >= before.messageCount && minMessages > 0 && !lostTarget, 'Opened copy lost its conversation', { before, after, minMessages, lostTarget });
    assert(member.GetAgentRunCollaborationMemberProjection === 1 && member.GetAgentRunCollaborationMemberFileChanges === 1, 'Expected exactly one projection and one artifact request for the opened copy', { member, all });
    assert(JSON.stringify(all) === JSON.stringify(member), 'Requests for other copies', { member, all });
    await shot('live-new-delegation');
    return { teamsBefore, teamsAfter: await teamRowsOf().count(), minMessagesDuringRepublication: minMessages, ops, memberOps: member, allMemberOps: all,
      snapshotsReceived: frames.slice(framesStart).filter((f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT').length,
      events: frames.slice(framesStart).filter((f) => f.kind).map((f) => f.kind), before, after };
  });
  await runCase('L-003', 'Composer send to the opened copy of the running hub: shown, delivered, answered and stored (AC-006)', async () => {
    const text = `Live opened-copy send ${randomUUID().slice(0, 8)}`;
    await composerSend(text);
    await until('sent message shown', async () => (await page.locator('[data-test="workspace-center-pane"]').innerText()).includes(text), 30000);
    await until('copy answered and stored', async () => { const c = JSON.stringify(await childProjection(setup.hostId, marker.address, marker.agentRunId)); return c.includes(text) && c.slice(c.indexOf(text)).includes('OK'); }, 120000);
    await until('answer shown', async () => { const t = await page.locator('[data-test="workspace-center-pane"]').innerText(); return t.slice(t.indexOf(text)).includes('OK'); }, 30000);
    return { text, state: await storeState(), status: await statusOf(marker.agentRunId), serverStatus: await serverStatusOf(marker.agentRunId) };
  });
  const queuedTarget = setup.teams[5].coordinator;
  await runCase('L-004', 'Queued input of a busy copy (sent by a second client) survives a reload and shows when the copy is opened (AC-006, Assumption 2)', async () => {
    await ensureHubRunning();
    const toCopy = await copyInputFor(setup.hostId);
    toCopy(queuedTarget.agentRunId, 'HOLD_TURN keep working');
    await until('copy busy (server)', async () => ['running', 'RUNNING'].includes(String(await serverStatusOf(queuedTarget.agentRunId))), 60000).catch(() => {});
    await sleep(1500);
    const queuedText = `Queued while busy ${randomUUID().slice(0, 8)}`;
    toCopy(queuedTarget.agentRunId, queuedText);
    await until('queued input state on the server', async () => JSON.stringify((await viewFor(setup.hostId)).agent_input_states ?? []).includes(queuedText), 30000);
    const serverInputStates = ((await viewFor(setup.hostId)).agent_input_states ?? []).filter((s) => JSON.stringify(s).includes(queuedText));
    await coldOpenWorkspace();
    await runRow().click();
    await until('live snapshot after reload', async () => (await storeState()).phase === 'live', 120000);
    await expandTeam(setup.teams[5].teamRunId);
    const start = requests.length;
    await timedClick(memberRow(queuedTarget.agentRunId), CHILD_READY, { id: queuedTarget.agentRunId });
    await until('copy loaded', async () => (memberOps(start, queuedTarget.agentRunId).GetAgentRunCollaborationMemberProjection ?? 0) >= 1, 30000);
    await quiet(1500);
    const after = await storeState();
    const centerText = await page.locator('[data-test="workspace-center-pane"]').innerText();
    const hydrated = await page.evaluate(({ host, id }) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentRunCollaboration').contextFor(host)?.isChildHydrated(id), { host: setup.hostId, id: queuedTarget.agentRunId });
    assert(hydrated && after.pending.some((p) => p.text.includes(queuedText) && p.state === 'queued') && centerText.includes(queuedText), 'Queued input not shown after opening', { after, hydrated, centerHasText: centerText.includes(queuedText) });
    await shot('live-queued-after-reload');
    return { serverInputStates, after: after.pending, hydrated, messageCount: after.messageCount, ops: memberOps(start, queuedTarget.agentRunId), status: await statusOf(queuedTarget.agentRunId) };
  });
  await runCase('L-008', 'Status of a copy woken by a composer send into a held turn: row, header and server agree (REQ-005, REQ-006)', async () => {
    await ensureHubRunning();
    const team = setup.teams[4];
    if ((await storeState()).phase !== 'live') { await coldOpenWorkspace(); await runRow().click(); await until('live', async () => (await storeState()).phase === 'live', 120000); }
    await expandTeam(team.teamRunId);
    await timedClick(memberRow(team.coordinator.agentRunId), CHILD_READY, { id: team.coordinator.agentRunId });
    await quiet(1000);
    const before = { ui: await statusOf(team.coordinator.agentRunId), server: await serverStatusOf(team.coordinator.agentRunId) };
    await composerSend('HOLD_TURN status probe');
    const timeline = [];
    for (let i = 0; i < 16; i++) { timeline.push({ t: i * 1000, ui: await statusOf(team.coordinator.agentRunId), server: await serverStatusOf(team.coordinator.agentRunId) }); await sleep(1000); }
    const last = timeline.at(-1);
    await shot(`${label}-held-turn-status`);
    assert(String(last.server).toLowerCase() === String(last.ui.store).toLowerCase() && String(last.ui.row).toLowerCase() === String(last.server).toLowerCase(), 'Copy status in the app differs from the server', { before, timeline });
    return { before, timeline };
  });
  await runCase('L-009', 'Opening a copy while it works through a burst of turns: loads (or retries on reselect) and ends with its complete conversation (CAND-003 residual)', async () => {
    await ensureHubRunning();
    const team = setup.teams[8], target = team.coordinator;
    if ((await storeState()).phase !== 'live') { await coldOpenWorkspace(); await runRow().click(); await until('live', async () => (await storeState()).phase === 'live', 120000); }
    await expandTeam(team.teamRunId);
    const toCopy = await copyInputFor(setup.hostId);
    const tag = randomUUID().slice(0, 6);
    const texts = Array.from({ length: 8 }, (_, i) => `Burst ${tag} ${i + 1} ECHO_INPUT`);
    const warningsBefore = warnings.length, start = requests.length;
    for (const [i, text] of texts.entries()) {
      toCopy(target.agentRunId, text);
      if (i === 1) void memberRow(target.agentRunId).click();
      await sleep(300);
    }
    await until('burst processed (server)', async () => { const c = JSON.stringify(await childProjection(setup.hostId, target.address, target.agentRunId)); return texts.every((t) => c.includes(`ECHO:\\\"${t}`) || c.split(t).length > 2); }, 120000).catch(() => {});
    await quiet(2000);
    const host = setup.hostId, id = target.agentRunId;
    const hydratedNow = () => page.evaluate(({ host, id }) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentRunCollaboration').contextFor(host)?.isChildHydrated(id), { host, id });
    let hydrated = await hydratedNow(), reselected = false;
    const firstOps = memberOps(start, id), loadWarnings = warnings.slice(warningsBefore);
    if (!hydrated) { // The policy: a failed load is logged and the next selection retries.
      reselected = true;
      await memberRow(setup.markers[0].agentRunId).click().catch(() => {});
      await memberRow(id).click(); await quiet(2000); hydrated = await hydratedNow();
    }
    const centerText = await page.locator('[data-test="workspace-center-pane"]').innerText();
    const shown = texts.filter((t) => centerText.includes(t)).length;
    assert(hydrated && shown === texts.length, 'Busy copy did not end loaded with its complete conversation', { hydrated, shown, firstOps, loadWarnings, reselected });
    return { firstOps, allOps: memberOps(start, id), loadWarnings, reselected, hydrated, messagesShown: shown, status: await statusOf(id) };
  });
  await runCase('L-010', 'Opening a copy whose stored conversation is several MB: shown within QR-002 with one projection and one artifact request', async () => {
    await ensureHubRunning();
    const team = setup.teams[1], target = team.members[3];
    const toCopy = await copyInputFor(setup.hostId);
    // --large-shape words (default): prose lines like a real report; unbroken: one 60 KB token per message.
    const words = 'the copy reviewed the change and wrote a detailed report about files tests and risks'.split(' ');
    const chunk = getArg('large-shape', 'words') === 'unbroken' ? 'y'.repeat(60 * 1024)
      : Array.from({ length: 60 * 1024 / 6 }, (_, i) => words[i % words.length] + (i % 14 === 13 ? '\n' : ' ')).join('').slice(0, 60 * 1024);
    for (let i = 0; i < 20; i++) {
      toCopy(target.agentRunId, `Large ${i + 1} ECHO_INPUT ${chunk}`);
      await until(`large turn ${i + 1} stored`, async () => JSON.stringify(await childProjection(setup.hostId, target.address, target.agentRunId)).includes(`Large ${i + 1} ECHO_INPUT`), 60000);
    }
    await sleep(3000);
    const projection = await gqlRaw('query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation activities}}', { h: setup.hostId, a: target.address, r: target.agentRunId });
    await coldOpenWorkspace();
    await runRow().click(); await until('live', async () => (await storeState()).phase === 'live', 120000); await quiet(1500);
    await expandTeam(team.teamRunId);
    const start = requests.length;
    // Page-side: when the copy's 40 messages are in the store, when its last message is in the DOM (textContent).
    await page.evaluate(({ id }) => { window.__large = { click: null, loaded: null, shown: null };
      document.addEventListener('click', () => { if (window.__large.click === null) window.__large.click = performance.now(); }, { capture: true, once: true });
      const tick = () => { const L = window.__large, p = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
        const t = p._s.get('activeContext')?.activeWorkspaceTarget;
        if (L.click !== null && L.loaded === null && t?.agentRunId === id && t.context.state.conversation.messages.length >= 40) L.loaded = performance.now();
        if (L.click !== null && L.shown === null && document.querySelector('[data-test="workspace-center-pane"]')?.textContent.includes('Large 20 ECHO_INPUT')) L.shown = performance.now();
        if (L.loaded === null || L.shown === null) setTimeout(tick, 20); }; tick(); }, { id: target.agentRunId });
    await memberRow(target.agentRunId).click();
    await page.waitForFunction(() => window.__large.loaded !== null && window.__large.shown !== null, null, { timeout: STEP_TIMEOUT, polling: 500 });
    const large = await page.evaluate(() => window.__large);
    await quiet(1500);
    const ops = memberOps(start, target.agentRunId);
    const result = { clickToStoreLoadedMs: large.loaded - large.click, clickToLastMessageInDomMs: large.shown - large.click,
      projectionBytes: projection.bytes, projectionServerMs: Number(projection.ms.toFixed(1)), ops, state: await storeState() };
    await shot(`${label}-large-copy-open`);
    if (!label.startsWith('base')) assert(ops.GetAgentRunCollaborationMemberProjection === 1 && ops.GetAgentRunCollaborationMemberFileChanges === 1, 'Unexpected requests', result);
    return result;
  });
  await runCase('L-011', 'A copy whose load fails (network error on its projection) is logged with its identity, stays not loaded, other copies open, reopening loads it (AC-004 alternate)', async () => {
    const team = setup.teams[1], target = team.members[4], other = setup.markers[0];
    const step = (what) => console.log(`  L-011: ${what}`);
    await coldOpenWorkspace(); await runRow().click(); await quiet(1500);
    step('hub open');
    let failed = 0;
    const handler = async (route) => {
      let body = null; try { body = route.request().postDataJSON(); } catch { /* not JSON */ }
      if (!failed && body?.operationName === 'GetAgentRunCollaborationMemberProjection' && body.variables?.agentRunId === target.agentRunId) { failed += 1; return route.abort('failed'); }
      return route.continue();
    };
    await page.route('**/graphql', handler);
    const errorsBefore = errors.length, warningsBefore = warnings.length, start = requests.length;
    const hydratedNow = (id) => page.evaluate(({ host, id }) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentRunCollaboration').contextFor(host)?.isChildHydrated(id), { host: setup.hostId, id });
    await expandTeam(team.teamRunId);
    step('team expanded'); await memberRow(target.agentRunId).click(); step('copy clicked');
    await until('load failure logged', () => warnings.slice(warningsBefore).some((w) => w.text.includes(target.agentRunId) && w.text.includes(setup.hostId)), 30000);
    await quiet(1000);
    const afterFailure = { hydrated: await hydratedNow(target.agentRunId), error: (await storeState()).error, target: (await storeState()).target };
    step('failure logged'); await page.unroute('**/graphql', handler);
    await expandTeam(other.teamRunId);
    await timedClick(memberRow(other.agentRunId), CHILD_READY, { id: other.agentRunId, marker: other.marker });
    const otherOk = await hydratedNow(other.agentRunId); step('other copy opened');
    const retryStart = requests.length;
    await memberRow(target.agentRunId).click();
    await until('reopened copy loaded', () => hydratedNow(target.agentRunId), 30000); // a never-started member: empty conversation
    await quiet(1000);
    const retried = { hydrated: await hydratedNow(target.agentRunId), ops: memberOps(retryStart, target.agentRunId) };
    // The aborted request's own console line is the injected failure, not a product error.
    const injected = errors.splice(errorsBefore).filter((e) => !/ERR_FAILED|Failed to fetch|NetworkError|Failed to load resource/i.test(e));
    errors.push(...injected);
    const logged = warnings.slice(warningsBefore).map((w) => w.text.slice(0, 300));
    assert(failed === 1 && afterFailure.hydrated === false && !afterFailure.error && otherOk && retried.hydrated && retried.ops.GetAgentRunCollaborationMemberProjection === 1,
      'Failure path differs', { failed, afterFailure, otherOk, retried, logged });
    return { injectedFailures: failed, logged, afterFailure, otherCopyOpened: otherOk, retried, firstOps: memberOps(start, target.agentRunId) };
  });
  await runCase('L-005', 'Copy row of a hub that is not the selected run: at most two loads, ends loaded (MP-001, R-004)', async () => {
    const otherTeam = setup.otherTeams[0];
    await runRow().click(); await quiet(1000);
    await until('other hub rows', async () => (await (await teamRowFor(otherTeam.teamRunId, setup.otherHostId)).count()) === 1, 120000);
    await expandTeam(otherTeam.teamRunId, setup.otherHostId);
    const target = otherTeam.members[1];
    const start = requests.length;
    const ms = await timedClick(memberRow(target.agentRunId, setup.otherHostId), `const t = p._s.get('activeContext')?.activeWorkspaceTarget; return t?.agentRunId === arg && t.context.state.conversation.id === arg;`, target.agentRunId);
    await quiet(2000);
    const ops = memberOps(start, target.agentRunId);
    assert((ops.GetAgentRunCollaborationMemberProjection ?? 0) >= 1 && (ops.GetAgentRunCollaborationMemberProjection ?? 0) <= 2, 'Unexpected load count', ops);
    const hydrated = await page.evaluate(({ host, id }) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentRunCollaboration').contextFor(host)?.isChildHydrated(id), { host: setup.otherHostId, id: target.agentRunId });
    assert(hydrated === true, 'Copy did not end loaded', { hydrated, ops });
    return { clickToTargetMs: ms, ops, hydrated, selected: (await storeState(setup.otherHostId)).selected };
  });
  await runCase('L-006', 'Project Task locate on the large hub selects the worker within the 5 s navigation wait (FU-4)', async () => {
    const team = setup.teams[7];
    if (desktop) await page.reload({ waitUntil: 'domcontentloaded' }); else await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'domcontentloaded' });
    await push(`/projects/${setup.projectId}`);
    const root = page.locator(`[data-testid="project-task-row-${team.taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`);
    await root.waitFor({ timeout: 120000 });
    const start = Date.now();
    await root.click();
    await until('Task locate selected the worker', async () => (await storeState()).target === team.coordinator.agentRunId, 15000);
    const ms = Date.now() - start;
    assert(ms < 5000, 'Task locate took longer than its 5 s wait', { ms });
    await shot('live-task-locate');
    return { clickToWorkerSelectedMs: ms, state: await storeState() };
  });
  await runCase('L-007', 'Composer send to an opened copy of a stopped hub wakes the copy, which answers; stored (AC-006, REQ-006)', async () => {
    for (const socket of sockets.splice(0)) socket.close();
    await terminateAgent(setup.hostId);
    await sleep(2000);
    await coldOpenWorkspace();
    await runRow().click(); await quiet(1500);
    const target = setup.markers[1];
    await expandTeam(target.teamRunId);
    await timedClick(memberRow(target.agentRunId), CHILD_READY, { id: target.agentRunId, marker: target.marker });
    await quiet(1000);
    const text = `Stopped hub send ${randomUUID().slice(0, 8)}`;
    await composerSend(text);
    await until('sent message shown', async () => (await page.locator('[data-test="workspace-center-pane"]').innerText()).includes(text), 30000);
    await until('woken copy answered and stored', async () => { const c = JSON.stringify(await childProjection(setup.hostId, target.address, target.agentRunId)); return c.includes(text) && c.slice(c.indexOf(text)).includes('OK'); }, 180000);
    await shot('stopped-hub-send');
    return { text, state: await storeState() };
  });
};

// ---------------------------------------------------------------- main
await fsp.mkdir(path.dirname(outputDir), { recursive: true });
assert(!fs.existsSync(outputDir), `Use a fresh output directory: ${outputDir}`);
await fsp.mkdir(outputDir);
let runRoot = null;
try {
  if (seedTo) {
    assert(!fs.existsSync(seedTo), `Seed directory must be new: ${seedTo}`);
    await fsp.mkdir(path.join(seedTo, 'server-data'), { recursive: true });
    await prepareStack(seedTo);
    await startBackend();
    const seeded = await runCase('SEED', `Seed ${TEAMS} Team copies, ${UNRELATED} unrelated team runs through public APIs`, seed);
    await fsp.writeFile(`${seedTo}.manifest.json`, `${JSON.stringify(seeded, null, 2)}\n`);
    evidence.setup = seeded; evidence.result = 'Seeded';
  } else {
    assert(fromSeed && fs.existsSync(`${fromSeed}.manifest.json`), 'Pass --from-seed <seed dir> (with its .manifest.json)');
    setup = JSON.parse(await fsp.readFile(`${fromSeed}.manifest.json`, 'utf8'));
    evidence.setup = { hostId: setup.hostId, otherHostId: setup.otherHostId, shape: setup.shape, markers: setup.markers };
    if (desktop) {
      assert(desktop.dataRoot && desktop.serverPort, 'Desktop mode needs the isolated-app start result JSON');
      stack.backendUrl = `http://127.0.0.1:${desktop.serverPort}`; stack.dataDir = path.join(desktop.dataRoot, 'server-data');
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${desktop.controlPort}`);
      context = browser.contexts()[0]; page = context.pages().find((p) => /renderer\/index\.html|\/workspace|localhost|127\.0\.0\.1|file:/.test(p.url()));
      assert(page, 'Isolated renderer not found', context.pages().map((p) => p.url()));
    } else {
      runRoot = await fsp.mkdtemp(path.join(os.tmpdir(), `large-hub-${label}-`));
      await fsp.cp(fromSeed, runRoot, { recursive: true });
      await prepareStack(runRoot);
      await startBackend();
      await startFrontend();
      browser = await chromium.launch({ headless: true, executablePath }); ownedBrowser = true;
      context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US' }); page = await context.newPage();
      // Nuxt optimizer warm-up outside the measured cases.
      await page.goto(`${stack.frontendUrl}/workspace`, { timeout: 180000 }); await sleep(5000);
      await page.goto(`${stack.frontendUrl}/workspace`, { timeout: 180000 }); await sleep(3000);
    }
    evidence.browser = browser.version();
    await observe();
    await runCase('S-API', 'Server timings over HTTP: hub view, hub conversation, a copy projection, a copy artifact list (generic and scoped)', apiTimings);
    for (let n = 1; n <= SAMPLES; n++) await runCase(`S-00${n}`, `Stopped hub cold sample ${n}: T-1, T-2, T-3 with request counts; reopen without refetch`, () => stoppedSample(n));
    await runCase('S-ROWS', 'Every Team row and every member row with statuses and Task summaries (AC-005)', async () => {
      await coldOpenWorkspace(); await quiet(1500);
      await until('Task summaries', async () => (await treeOf().locator('[data-test="workspace-task-worker-task-summary"]').count()) === setup.teams.length, 120000).catch(() => {});
      const collapsed = await rowsSnapshot();
      for (const team of setup.teams) await expandTeam(team.teamRunId);
      await quiet(1500);
      const expanded = await rowsSnapshot();
      const memberRequests = allMemberOps(0);
      let comparison = null;
      if (compareWith) {
        const other = JSON.parse(await fsp.readFile(compareWith, 'utf8')).cases['S-ROWS']?.details;
        comparison = { collapsedEqual: JSON.stringify(other?.collapsed) === JSON.stringify(collapsed), expandedEqual: JSON.stringify(other?.expanded) === JSON.stringify(expanded),
          otherCounts: { collapsed: other?.collapsed?.length, expanded: other?.expanded?.length } };
        assert(comparison.collapsedEqual && comparison.expandedEqual, 'Rows differ from the compared build', comparison);
      }
      await shot(`${label}-rows-expanded`);
      return { collapsed, expanded, counts: { collapsed: collapsed.length, expanded: expanded.length }, memberRequestsWholeRun: memberRequests, comparison };
    });
    if (live) await liveJourneys();
    assert(errors.length === 0, 'Browser errors', errors);
    evidence.result = 'Pass';
  }
} catch (e) {
  evidence.result = 'Fail'; evidence.failures.push({ message: e.message, details: e.details, stack: e.stack }); process.exitCode = 1;
  if (page) { evidence.failureState = await storeState().catch((x) => ({ error: x.message })); await shot('failure'); }
} finally {
  evidence.errors = errors; evidence.warnings = warnings; evidence.requests = requests.map((r) => ({ at: r.at, op: r.operationName, v: r.variables }));
  evidence.loadAtEnd = loadAverage();
  for (const socket of sockets) socket.close();
  if (ownedBrowser) { await browser?.close(); evidence.cleanup.browserClosed = true; } else if (browser) { await browser.close().catch(() => {}); evidence.cleanup.cdpDetached = true; }
  if (!desktop) {
    evidence.cleanup.frontend = await stopGroup(stack.frontend); evidence.cleanup.backend = await stopGroup(stack.backend);
    if (runRoot) { await fsp.rm(runRoot, { recursive: true, force: true }); evidence.cleanup.runRootRemoved = !fs.existsSync(runRoot); }
    if (stack.privateHome) await fsp.rm(stack.privateHome, { recursive: true, force: true });
    const closed = (url) => new Promise((resolve) => { if (!url) return resolve(true);
      const socket = net.createConnection({ host: '127.0.0.1', port: Number(new URL(url).port) });
      socket.once('error', () => { socket.destroy(); resolve(true); }); socket.once('connect', () => { socket.destroy(); resolve(false); }); });
    evidence.cleanup.backendPortClosed = await closed(stack.backendUrl); evidence.cleanup.frontendPortClosed = await closed(stack.frontendUrl);
    if (seedTo) evidence.cleanup.seedKept = `${seedTo} (test-owned seed; remove after the measurements)`;
  } else evidence.cleanup.lifecycle = 'Caller owns the isolated instance (stop it with isolated-app stop)';
  await save();
}
console.log(JSON.stringify({ result: evidence.result, label, cases: Object.fromEntries(Object.entries(evidence.cases).map(([k, v]) => [k, v.result])), errors: errors.length, cleanup: evidence.cleanup, evidencePath }));
