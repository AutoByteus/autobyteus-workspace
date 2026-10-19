#!/usr/bin/env node
// run-file-change-owner-scoped-reads (FU-3 of autobyteus-93): every file-change read names its owner. This probe checks it
// on a probe-owned real stack (this worktree's server dist/app.js + Nuxt dev + headless Chrome), on test-owned data only.
//   1. Seed (once per size):  pnpm -C autobyteus-web test:e2e:owner-scoped-file-reads --seed-to <new dir> [--unrelated 600]
//      Real server + scripted AGY (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs, no inference), public
//      GraphQL/WebSocket APIs only: a standalone run (hub) that writes a file and delegates a task agent (a copy) that
//      writes one; a Team run whose configured member writes a file and delegates a team task agent that writes one; an
//      Org run whose direct agent and member-team lead each write a file and each delegate a task agent that writes one;
//      then <unrelated> Team runs created and stopped in another workspace. Every root is stopped at the end. Each file is
//      then given its own text (the content route serves the file's current bytes), so a view shows which file it read.
//   2. Check (per seed):  ... --from-seed <seed dir> --output-dir <fresh dir> [--samples 7] [--cases T,B-001]
//      Copies the seed to a fresh data root, starts the backend and Nuxt dev, and records in evidence.json:
//      - T-API (AC-010, QR-001, QR-002): server time of each owner-scoped list and content read (median of --samples after
//        one warm-up), the run-id read of a member, and a control read that still scans every saved tree (a team-member
//        context-file read of an unknown agent, follow-up FU-A) to show what the unrelated runs cost a scanning read;
//      - B-00n (AC-001..AC-006, REQ-007): desktop Artifacts tab journeys: open the run or member in the Workspaces
//        sidebar, open the Artifacts tab, click the file; assert the content request goes to the owner route, answers
//        200 and the viewer shows that file's text; a deleted copy file shows "File not found" (server: "not available",
//        AC-001 alternate); B-006/B-007 (AC-012): the mobile Artifacts view (Phone Access, 390x844) of an agent run and of
//        a Team member. The phone pairs with a private-network URL (the server refuses loopback pairing URLs); the
//        probe's browser routes that host, HTTP and WebSocket, to the probe backend. Each opened file records how many
//        content requests the tab opening made (it selects the newest file) and how many the click made (a click on the
//        selected file refreshes it).
//      Every journey fails on a page exception or a console error raised during it; the only allowed lines are
//      Chrome's 404 resource lines for file-change content in B-005, at most one per 404 content response it received.
//      Errors during the Nuxt warm-up are recorded (warmUpBrowserErrors) but not asserted (cold-start reloads).
// Timing reads use the backend only; journeys add Nuxt dev (warmed up before asserting) and headless Chrome.
// Prereqs: pnpm install, server prebuild + build, nuxt prepare in this worktree; Chrome (playwright-core).
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
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stackRoot = fs.realpathSync(path.dirname(webDir));
const serverDir = path.join(stackRoot, 'autobyteus-server-ts');
const fixtureCli = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const seedTo = getArg('seed-to') ? path.resolve(getArg('seed-to')) : null;
const fromSeed = getArg('from-seed') ? path.resolve(getArg('from-seed')) : null;
const UNRELATED = Number(getArg('unrelated', '600'));
const SAMPLES = Number(getArg('samples', '7'));
const onlyCases = getArg('cases') ? getArg('cases').split(',') : null;
const wanted = (id) => !onlyCases || onlyCases.some((c) => id.startsWith(c));
const outputDir = path.resolve(getArg('output-dir', seedTo ? `${seedTo}-seed-evidence` : 'test-results/owner-scoped-file-reads'));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((c) => fs.existsSync(c));
const NAMES = { manager: 'OSR Manager', mate: 'OSR Mate', sibling: 'OSR Sibling', lead: 'OSR Lead', peer: 'OSR Peer', helper: 'OSR Helper',
  team: 'OSR Team', squad: 'OSR Squad', org: 'OSR Org', unrelatedTeam: 'OSR Unrelated Team' };

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
const gitHead = (dir) => { try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } };
const median = (values) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const evidence = { mode: seedTo ? 'seed' : 'real-stack', startedAt: new Date().toISOString(), stackRoot, stackHead: gitHead(stackRoot),
  dirty: (() => { try { return execFileSync('git', ['-C', stackRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean); } catch { return null; } })(),
  platform: `${process.platform}-${process.arch}`, node: process.version, cpus: os.cpus().length, loadAtStart: loadAverage(), cases: {}, cleanup: {}, failures: [] };
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
    evidence.cases[id] = { result: 'Fail', description, ms: Date.now() - startedAt, message: e.message, details: e.details }; evidence.failures.push(id); await save();
    console.log(`[${new Date().toISOString()}] ${id} Fail: ${e.message} ${e.details ? JSON.stringify(e.details).slice(0, 1500) : ''}`); return null;
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
  await fsp.mkdir(stack.dataDir, { recursive: true });
  stack.privateHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'owner-scoped-reads-home-'));
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
  assert(ok && !body.errors?.length, 'GraphQL failed', { errors: body.errors, query: query.slice(0, 200) });
  return body.data;
};
const restRaw = async (route) => {
  const started = performance.now();
  const response = await fetch(`${stack.backendUrl}/rest${route}`);
  const text = await response.text();
  return { ms: performance.now() - started, status: response.status, text };
};

// ---------------------------------------------------------------- seed
const sockets = [];
const openSocket = async (route, id, ready) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/${route}/${id}`); sockets.push(socket);
  const frames = []; socket.on('message', (raw) => frames.push(JSON.parse(String(raw))));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await until(`${route} stream ready`, () => frames.some(ready), 120000);
  return { socket, frames };
};
const config = (workspaceRootPath) => ({ workspaceRootPath, llmModelIdentifier: 'gemini-3.8-flash-low', runtimeKind: 'antigravity_cli', autoExecuteTools: true, llmConfig: null });
/** The files a run or member wrote, through its owner's list (asserts the expected count). */
const filesOf = {
  run: (runId) => gql('query($r:String!){getRunFileChanges(runId:$r){path}}', { r: runId }).then((d) => d.getRunFileChanges),
  standaloneMember: (s) => gql('query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberFileChanges(hostRunId:$h,memberAddress:$a,agentRunId:$r){path}}', { h: s.hostRunId, a: s.memberAddress, r: s.agentRunId }).then((d) => d.agentRunCollaborationMemberFileChanges),
  teamMember: (s) => gql('query($t:String!,$a:String!){getTeamMemberFileChanges(teamRunId:$t,agentRunId:$a){path}}', { t: s.teamRunId, a: s.agentRunId }).then((d) => d.getTeamMemberFileChanges),
  agentOrgMember: (s) => gql('query($o:String!,$m:String!,$a:String!){getAgentOrgMemberFileChanges(orgRunId:$o,memberAddress:$m,agentRunId:$a){path}}', { o: s.orgRunId, m: s.memberAddress, a: s.agentRunId }).then((d) => d.getAgentOrgMemberFileChanges),
};
const listOf = (subject) => filesOf[subject.kind](subject.kind === 'run' ? subject.runId : subject);
const seed = async () => {
  const workspace = path.join(stack.root, 'workspace'), archive = path.join(stack.root, 'archive');
  for (const dir of [workspace, archive]) await fsp.mkdir(dir, { recursive: true });
  for (const rootPath of [workspace, archive]) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath } });
  const agent = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  const ids = {};
  for (const key of ['manager', 'mate', 'sibling', 'lead', 'peer', 'helper']) ids[key] = await agent(NAMES[key]);
  const team = async (name, members, coordinator) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: name, instructions: 'Do the assigned task.', coordinatorMemberName: coordinator,
    nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: 'SHARED' })) } })).createAgentTeamDefinition.id;
  ids.team = await team(NAMES.team, [['manager', ids.manager], ['mate', ids.mate]], 'manager');
  ids.squad = await team(NAMES.squad, [['lead', ids.lead], ['peer', ids.peer]], 'lead');
  ids.unrelatedTeam = await team(NAMES.unrelatedTeam, [['manager', ids.manager], ['mate', ids.mate]], 'manager');
  ids.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: NAMES.org, description: NAMES.org,
    instructions: 'Organization instruction.', handoffs: [], members: [
      { memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'sibling', ref: ids.sibling, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  const fileIn = (name) => path.join(workspace, name);
  const writeImage = (name) => `GENERATE_IMAGE:${fileIn(name)} \nProduce the file.`;
  const delegateWriter = (name) => callTool('delegate_task', { recipient_address: `/${segment(NAMES.helper)}`, description: writeImage(name) });
  const files = [];
  /**
   * Polls the owner's list (a live read while the run runs) until it shows the file. The first poll usually overlaps the
   * agent's first file-change event, as a hydrating Artifacts tab does; the list must still show the file
   * (run-file-change-live-cache-race, autobyteus-180).
   */
  const recorded = async (label, subject, name) => {
    await until(`${label} file ${name} listed live`, async () => (await listOf(subject)).some((e) => e.path === name), 90000);
    files.push({ label, subject, path: name, absolutePath: fileIn(name), text: `Owner-scoped file of ${label} (${name}) ${randomUUID().slice(0, 8)}` });
  };
  const taskAgentsIn = (tree) => {
    const out = []; const walk = (v) => { if (Array.isArray(v)) return v.forEach(walk); if (!v || typeof v !== 'object') return;
      const startedAt = v.startedAt ?? v.started_at, agentRunId = v.agentRunId ?? v.agent_run_id;
      if (typeof startedAt === 'string' && agentRunId && !(v.teamRunId ?? v.team_run_id)) out.push({ agentRunId, address: v.address });
      Object.values(v).forEach(walk); };
    walk(tree); return out;
  };
  const newTaskAgent = async (label, treeOf, before) => until(`${label} task agent recorded`, async () => {
    const known = new Set(before.map((t) => t.agentRunId));
    return taskAgentsIn(await treeOf()).find((t) => !known.has(t.agentRunId));
  }, 90000);

  // Standalone run (hub): its own file and a delegated copy's file.
  const hub = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...config(workspace) } })).createAgentRun;
  assert(hub.success, hub.message);
  const hubInput = await openSocket('agent', hub.runId, (f) => f.type === 'CONNECTED');
  const toHub = (content) => hubInput.socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: hub.runId, message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
  toHub(writeImage('hub-notes.md'));
  await recorded('standalone run', { kind: 'run', runId: hub.runId }, 'hub-notes.md');
  const hubTree = async () => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: hub.runId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
  toHub(delegateWriter('copy-notes.md'));
  const copy = await newTaskAgent('copy', hubTree, []);
  await recorded('delegated copy', { kind: 'standaloneMember', hostRunId: hub.runId, memberAddress: copy.address, agentRunId: copy.agentRunId }, 'copy-notes.md');

  // Team run: configured member file, team task agent file.
  const teamRun = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId: ids.team,
    teamConfigs: [{ teamAddress: '/', ...config(workspace) }], memberConfigs: [
      { memberAddress: '/manager', agentDefinitionId: ids.manager, ...config(workspace) }, { memberAddress: '/mate', agentDefinitionId: ids.mate, ...config(workspace) }] } })).createAgentTeamRun;
  assert(teamRun.success, teamRun.message);
  const teamTreeOf = async () => (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRun.teamRunId })).getTeamRunResumeConfig.executionTree;
  const configuredIn = (tree) => { const out = {}; const walk = (v) => { if (Array.isArray(v)) return v.forEach(walk); if (!v || typeof v !== 'object') return;
    const id = v.agentRunId ?? v.agent_run_id, address = v.memberAddress ?? v.address; if (id && address && !(v.startedAt ?? v.started_at)) out[address] = id; Object.values(v).forEach(walk); }; walk(tree); return out; };
  const teamMembers = configuredIn(await teamTreeOf());
  const teamView = await openSocket('agent-team', teamRun.teamRunId, (f) => f.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT');
  const toTeamMember = (agentRunId, content) => teamView.socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: agentRunId, message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
  const teamManager = { kind: 'teamMember', teamRunId: teamRun.teamRunId, memberAddress: '/manager', agentRunId: teamMembers['/manager'] };
  assert(teamManager.agentRunId, 'team manager run id', teamMembers);
  toTeamMember(teamManager.agentRunId, writeImage('team-manager-notes.md'));
  await recorded('team configured member', teamManager, 'team-manager-notes.md');
  toTeamMember(teamManager.agentRunId, delegateWriter('team-task-agent-notes.md'));
  const teamTask = await newTaskAgent('team task agent', teamTreeOf, []);
  await recorded('team task agent', { kind: 'teamMember', teamRunId: teamRun.teamRunId, memberAddress: teamTask.address, agentRunId: teamTask.agentRunId }, 'team-task-agent-notes.md');

  // Org run: direct agent and member-team lead files; an org-root and a member-team task agent file.
  const orgRun = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: ids.org,
    rootConfiguration: config(workspace), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(orgRun.success, orgRun.message);
  const orgConfigTree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRun.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgMembers = {};
  for (const member of orgConfigTree.rootOrg.members) {
    if (member.agentRunId) orgMembers[member.address] = member.agentRunId;
    for (const inner of member.members ?? []) if (inner.agentRunId) orgMembers[inner.address] = inner.agentRunId;
  }
  const orgTreeOf = async () => (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: orgRun.agentOrgRunId })).getAgentOrgRootHistory.org;
  const orgView = await openSocket('agent-org', orgRun.agentOrgRunId, (f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT');
  const toOrgMember = (agentRunId, content) => orgView.socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: {
    root_subject_kind: 'agent_org', root_run_id: orgRun.agentOrgRunId, target_agent_run_id: agentRunId,
    command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
  const orgManager = { kind: 'agentOrgMember', orgRunId: orgRun.agentOrgRunId, memberAddress: '/manager', agentRunId: orgMembers['/manager'] };
  const orgLead = { kind: 'agentOrgMember', orgRunId: orgRun.agentOrgRunId, memberAddress: '/squad/lead', agentRunId: orgMembers['/squad/lead'] };
  assert(orgManager.agentRunId && orgLead.agentRunId, 'org member run ids', orgMembers);
  toOrgMember(orgManager.agentRunId, writeImage('org-manager-notes.md'));
  await recorded('org direct agent', orgManager, 'org-manager-notes.md');
  toOrgMember(orgLead.agentRunId, writeImage('org-squad-lead-notes.md'));
  await recorded('org member-team member', orgLead, 'org-squad-lead-notes.md');
  toOrgMember(orgManager.agentRunId, delegateWriter('org-task-agent-notes.md'));
  const orgTask = await newTaskAgent('org-root task agent', orgTreeOf, []);
  await recorded('org-root task agent', { kind: 'agentOrgMember', orgRunId: orgRun.agentOrgRunId, memberAddress: orgTask.address, agentRunId: orgTask.agentRunId }, 'org-task-agent-notes.md');
  toOrgMember(orgLead.agentRunId, delegateWriter('org-squad-task-agent-notes.md'));
  const squadTask = await newTaskAgent('member-team task agent', orgTreeOf, [orgTask]);
  await recorded('org member-team task agent', { kind: 'agentOrgMember', orgRunId: orgRun.agentOrgRunId, memberAddress: squadTask.address, agentRunId: squadTask.agentRunId }, 'org-squad-task-agent-notes.md');

  // Stop every root (the journeys open saved runs).
  const stopped = async (mutation, id) => { const r = Object.values(await gql(mutation, { id }))[0]; assert(r.success, r.message); };
  await stopped('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', hub.runId);
  await stopped('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', teamRun.teamRunId);
  await stopped('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', orgRun.agentOrgRunId);
  for (const socket of sockets.splice(0)) socket.close();
  // After the stop every list comes from the saved record: it still holds every recorded file (autobyteus-180 REQ-002).
  for (const file of files) {
    const listed = (await listOf(file.subject)).map((e) => e.path);
    assert(listed.includes(file.path), `${file.label}: the saved record lists ${file.path} after the stop`, { listed });
  }

  // Unrelated saved Team runs in another workspace (what a scanning read has to pass).
  const memberConfigs = [{ memberAddress: '/manager', agentDefinitionId: ids.manager, ...config(archive) }, { memberAddress: '/mate', agentDefinitionId: ids.mate, ...config(archive) }];
  let unrelated = 0;
  for (let i = 0; i < UNRELATED; i++) {
    const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
      { input: { teamDefinitionId: ids.unrelatedTeam, teamConfigs: [{ teamAddress: '/', ...config(archive) }], memberConfigs } })).createAgentTeamRun;
    assert(created.success, created.message);
    await stopped('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', created.teamRunId);
    unrelated += 1;
    if (unrelated % 100 === 0) console.log(`  unrelated team runs ${unrelated}/${UNRELATED}`);
  }
  // Each file gets its own text: the content route serves the current bytes, so a view shows which file it read.
  for (const file of files) await fsp.writeFile(file.absolutePath, file.text);
  const memoryDir = path.join(stack.dataDir, 'memory');
  const counts = {};
  for (const sub of await fsp.readdir(memoryDir).catch(() => [])) counts[sub] = (await fsp.readdir(path.join(memoryDir, sub)).catch(() => [])).length;
  return { names: NAMES, workspace, archive, hubRunId: hub.runId, teamRunId: teamRun.teamRunId, orgRunId: orgRun.agentOrgRunId,
    copy, teamTask, orgTask, squadTask, files, unrelatedTeamRuns: unrelated, memoryFolders: counts };
};

// ---------------------------------------------------------------- server timing
const contentRoute = (subject, filePath) => {
  const p = `path=${encodeURIComponent(filePath)}`, e = encodeURIComponent;
  switch (subject.kind) {
    case 'run': return `/runs/${e(subject.runId)}/file-change-content?${p}`;
    case 'teamMember': return `/team-runs/${e(subject.teamRunId)}/agent-runs/${e(subject.agentRunId)}/file-change-content?${p}`;
    case 'agentOrgMember': return `/agent-org-runs/${e(subject.orgRunId)}/agent-runs/${e(subject.agentRunId)}/file-change-content?memberAddress=${e(subject.memberAddress)}&${p}`;
    case 'standaloneMember': return `/agent-collaborations/${e(subject.hostRunId)}/agent-runs/${e(subject.agentRunId)}/file-change-content?memberAddress=${e(subject.memberAddress)}&${p}`;
  }
  throw new Error(subject.kind);
};
const listQuery = (subject) => {
  switch (subject.kind) {
    case 'run': return ['query($r:String!){getRunFileChanges(runId:$r){id path status}}', { r: subject.runId }];
    case 'teamMember': return ['query($t:String!,$a:String!){getTeamMemberFileChanges(teamRunId:$t,agentRunId:$a){id path status}}', { t: subject.teamRunId, a: subject.agentRunId }];
    case 'agentOrgMember': return ['query($o:String!,$m:String!,$a:String!){getAgentOrgMemberFileChanges(orgRunId:$o,memberAddress:$m,agentRunId:$a){id path status}}', { o: subject.orgRunId, m: subject.memberAddress, a: subject.agentRunId }];
    case 'standaloneMember': return ['query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberFileChanges(hostRunId:$h,memberAddress:$a,agentRunId:$r){id path status}}', { h: subject.hostRunId, a: subject.memberAddress, r: subject.agentRunId }];
  }
  throw new Error(subject.kind);
};
const timed = async (fn, check) => {
  const first = await fn(); check(first);
  const samples = [];
  for (let i = 0; i < SAMPLES; i++) { const r = await fn(); check(r); samples.push(Number(r.ms.toFixed(1))); }
  return { firstMs: Number(first.ms.toFixed(1)), medianMs: median(samples), maxMs: Math.max(...samples), samples };
};
const apiTimings = async () => {
  const result = {};
  for (const file of setup.files) {
    const [q, v] = listQuery(file.subject);
    result[`${file.label} list`] = await timed(() => gqlRaw(q, v), (r) => assert(r.ok && !r.body.errors && Object.values(r.body.data)[0].some((e) => e.path === file.path), `${file.label} list`, r.body));
    result[`${file.label} content`] = await timed(() => restRaw(contentRoute(file.subject, file.path)), (r) => assert(r.status === 200 && r.text === file.text, `${file.label} content`, { status: r.status, text: r.text.slice(0, 200) }));
  }
  const copy = setup.files.find((f) => f.subject.kind === 'standaloneMember');
  result['run-id list of a member (QR-002)'] = await timed(() => gqlRaw('query($r:String!){getRunFileChanges(runId:$r){id}}', { r: copy.subject.agentRunId }),
    (r) => assert(r.ok && r.body.data.getRunFileChanges.length === 0, 'run-id list of a member is empty', r.body));
  result['run-id content of a member (QR-002)'] = await timed(() => restRaw(contentRoute({ kind: 'run', runId: copy.subject.agentRunId }, copy.path)),
    (r) => assert(r.status === 404, 'run-id content of a member is 404', r));
  // Control: a read that still scans every saved team, org and hub tree (team-member context-file owner lookup, FU-A).
  result['control: scanning context-file read (FU-A)'] = await timed(() => restRaw(`/team-runs/${encodeURIComponent(setup.hubRunId)}/agent-runs/unknown_agent_run/context-files/missing.txt`),
    (r) => assert(r.status === 404, 'scanning control answers 404', r));
  const owners = Object.entries(result).filter(([k]) => !k.startsWith('control') && !k.startsWith('run-id'));
  const slowest = owners.reduce((m, [k, v]) => (v.medianMs > m.ms ? { name: k, ms: v.medianMs } : m), { name: null, ms: 0 });
  const slowestMax = owners.reduce((m, [k, v]) => (v.maxMs > m.ms ? { name: k, ms: v.maxMs } : m), { name: null, ms: 0 });
  assert(slowestMax.ms < 500, 'an owner-scoped read took 500 ms or more (QR-001)', { slowestMax, result });
  return { unrelatedTeamRuns: setup.unrelatedTeamRuns, samples: SAMPLES, slowestMedian: slowest, slowestSample: slowestMax, reads: result };
};

// ---------------------------------------------------------------- main
let setup = null, browser = null;
const main = async () => {
  await fsp.mkdir(outputDir, { recursive: true });
  if (fs.readdirSync(outputDir).length) throw new Error(`--output-dir must be new or empty: ${outputDir}`);
  try {
    if (seedTo) {
      assert(!fs.existsSync(seedTo) || fs.readdirSync(seedTo).length === 0, `--seed-to must be new or empty: ${seedTo}`);
      await prepareStack(seedTo);
      await startBackend();
      const seeded = await runCase('SEED', `Seed hub, Team and Org runs with member files, plus ${UNRELATED} unrelated saved team runs, through public APIs`, seed);
      if (seeded) await fsp.writeFile(path.join(seedTo, 'seed-manifest.json'), `${JSON.stringify(seeded, null, 2)}\n`);
    } else {
      assert(fromSeed, 'Pass --seed-to <dir> or --from-seed <dir>');
      setup = JSON.parse(await fsp.readFile(path.join(fromSeed, 'seed-manifest.json'), 'utf8'));
      const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'owner-scoped-reads-run-'));
      await fsp.cp(fromSeed, root, { recursive: true });
      // The copied seed keeps its workspace paths: files live in the seed's workspace (never modified by timing).
      evidence.seed = { from: fromSeed, copy: root, unrelatedTeamRuns: setup.unrelatedTeamRuns, memoryFolders: setup.memoryFolders };
      await prepareStack(root);
      await startBackend();
      await runCase('T-API', 'Server time of owner-scoped list and content reads, member run-id reads and a scanning control (AC-010, QR-001, QR-002)', apiTimings);
      if (journeys.some(([id]) => wanted(id))) {
        await startFrontend();
        browser = await chromium.launch({ headless: true, executablePath });
        // Warm the Nuxt dev optimizer before asserting (a cold start reloads pages; TESTING.md "Browser probes").
        await freshPage(); await sleep(8000); await freshPage();
        evidence.warmUpBrowserErrors = errors.splice(0);
        for (const [id, description, fn, options] of journeys) await runCase(id, description, withBrowserErrorCheck(id, fn, options));
        evidence.browserErrors = errors;
      }
    }
  } finally {
    for (const socket of sockets.splice(0)) socket.terminate();
    if (browser) await browser.close().catch(() => {});
    evidence.cleanup.frontend = await stopGroup(stack.frontend);
    evidence.cleanup.backend = await stopGroup(stack.backend);
    if (stack.privateHome) await fsp.rm(stack.privateHome, { recursive: true, force: true });
    if (fromSeed && stack.root) { await fsp.rm(stack.root, { recursive: true, force: true }); evidence.cleanup.dataCopyRemoved = stack.root; }
    evidence.finishedAt = new Date().toISOString(); evidence.loadAtEnd = loadAverage();
    await save();
    const result = evidence.failures.length ? 'Fail' : 'Pass';
    console.log(JSON.stringify({ result, cases: Object.fromEntries(Object.entries(evidence.cases).map(([k, v]) => [k, v.result])), failures: evidence.failures, cleanup: evidence.cleanup, evidencePath }));
    process.exitCode = evidence.failures.length ? 1 : 0;
  }
};

// ---------------------------------------------------------------- browser journeys
let page = null;
/** Every page exception and console error, with the resource URL Chrome reports for it (TESTING.md: probes fail on browser errors). */
const errors = [];
const watchBrowserErrors = (target) => {
  target.on('pageerror', (e) => errors.push({ at: Date.now(), kind: 'pageerror', text: e.message, url: null }));
  target.on('console', (m) => { if (m.type() === 'error') errors.push({ at: Date.now(), kind: 'console', text: m.text(), url: m.location()?.url ?? null }); });
};
const NOT_FOUND_RESOURCE = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
/**
 * Runs one journey and fails it on any browser error raised during it. The only allowed lines are Chrome's 404 resource
 * lines for file-change content, and only in a journey that expects them (B-005, a deleted file), at most one per 404
 * content response that journey received.
 */
const withBrowserErrorCheck = (id, fn, { allowContent404 = false } = {}) => async () => {
  const errorStart = errors.length, responseStart = contentResponses.length;
  const details = await fn();
  await sleep(500);
  const caseErrors = errors.slice(errorStart);
  const content404s = contentResponses.slice(responseStart).filter((r) => r.status === 404).length;
  const isContent404 = (e) => e.kind === 'console' && e.text === NOT_FOUND_RESOURCE && String(e.url).includes('/file-change-content');
  const allowed = allowContent404 ? caseErrors.filter(isContent404) : [];
  const unexpected = caseErrors.filter((e) => !allowed.includes(e));
  assert(unexpected.length === 0, `${id}: browser errors during the journey`, { unexpected, caseErrors });
  assert(allowed.length <= content404s, `${id}: more 404 resource errors than 404 content responses`, { allowed, content404s });
  return { ...details, browserErrors: caseErrors, allowedContent404Errors: allowed.length, content404Responses: content404s };
};
const contentResponses = [];
const freshPage = async () => {
  if (page) await page.close().catch(() => {});
  page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  watchBrowserErrors(page);
  page.on('response', (r) => { if (r.url().includes('/file-change-content')) contentResponses.push({ at: Date.now(), url: r.url(), status: r.status() }); });
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('[data-test="workspace-row"]').first().waitFor({ timeout: 180000 });
  const workspace = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first();
  await workspace.waitFor({ timeout: 120000 });
  if (await workspace.getAttribute('aria-expanded') !== 'true') await workspace.locator('button').first().click();
};
const shot = (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => {});
const fileOf = (label) => { const f = setup.files.find((x) => x.label === label); assert(f, `seed file ${label}`); return f; };
const expectedUrl = (file) => `${stack.backendUrl}/rest${contentRoute(file.subject, file.path)}`;
const viewer = () => page.locator('[data-testid="artifact-content-viewer-shell"]');
/** With the run or member selected: the Artifacts tab, click its file; the content request and the shown text. */
const openArtifact = async (file, { expectText = file.text, expectStatus = 200 } = {}) => {
  const tabs = page.locator('[data-test="right-side-tab-list"]');
  const tabMark = Date.now();
  await tabs.getByText('Artifacts', { exact: true }).click();
  const item = page.locator('[data-test="right-side-tab-content-shell"]').getByText(file.path, { exact: true }).first();
  await item.waitFor({ timeout: 60000 });
  // The tab selects the newest file by itself; settle, then count what the tab opening alone requested.
  await sleep(1500);
  const onTabOpen = contentResponses.filter((r) => r.at >= tabMark && r.url === expectedUrl(file)).length;
  const mark = Date.now();
  await item.click();
  await until(`${file.label}: viewer shows the file`, async () => (await viewer().innerText()).includes(expectText), 60000);
  await sleep(1000);
  const own = contentResponses.filter((r) => r.at >= tabMark && r.url === expectedUrl(file));
  assert(own.some((r) => r.status === expectStatus), `${file.label}: content request to the owner route with ${expectStatus}`, { expected: expectedUrl(file), seen: contentResponses.slice(-6) });
  return { label: file.label, subject: file.subject, path: file.path, requestUrl: expectedUrl(file).replace(stack.backendUrl, ''), statuses: own.map((r) => r.status),
    requestsOnTabOpen: onTabOpen, requestsOnItemClick: own.length - onTabOpen,
    shown: (await viewer().innerText()).replace(/\s+/g, ' ').slice(0, 200), sinceClickMs: Date.now() - mark };
};
/** Every content request of the journey went to an owner route of the opened subjects (no run-id read of a member). */
const expectOnlyOwnerRequests = (start, files) => {
  const allowed = new Set(files.map(expectedUrl));
  const seen = contentResponses.filter((r) => r.at >= start);
  const stray = seen.filter((r) => !allowed.has(r.url));
  assert(stray.length === 0, 'a content request went to another route than the owner route', { stray, allowed: [...allowed] });
  return seen.map((r) => `${r.status} ${r.url.replace(stack.backendUrl, '')}`);
};
const expandAgentGroup = async () => {
  const agent = page.locator('[data-test="workspace-agent-row"]', { hasText: setup.names.manager });
  await agent.waitFor({ timeout: 120000 });
  if (await agent.getAttribute('aria-expanded') !== 'true') await agent.click();
  const run = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${setup.hubRunId}"]`);
  await run.waitFor({ timeout: 120000 });
  return run;
};
const copyRow = () => page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${setup.hubRunId}"] [data-test="workspace-team-transient-execution-row"][data-agent-run-id="${setup.copy.agentRunId}"]`);

// Mobile (Phone Access): the phone pairs with a private-network server URL (the server refuses loopback pairing URLs);
// the probe's browser routes that host, HTTP and WebSocket, to the probe backend (network emulation only).
const MOBILE_HOST = '192.168.77.10';
const mobileRemote = () => `http://${MOBILE_HOST}:${stack.backendPort}`;
const dumpTestIds = () => page.evaluate(() => [...document.querySelectorAll('[data-testid],[data-test]')].filter((e) => e.offsetParent !== null)
  .map((e) => `${e.getAttribute('data-testid') ?? e.getAttribute('data-test')}: ${e.innerText?.replace(/\s+/g, ' ').slice(0, 80)}`).slice(0, 80)).catch(() => []);
const freshMobilePage = async () => {
  if (page) await page.close().catch(() => {});
  const settings = await fetch(`${stack.backendUrl}/rest/remote-access/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneAccessEnabled: true }) });
  assert(settings.ok, 'Phone Access enabled', await settings.text());
  const session = await (await fetch(`${stack.backendUrl}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serverBaseUrl: mobileRemote(), trustedPrivateHttpAcknowledged: true }) })).json();
  assert(session.mobileUrl, 'pairing session', session);
  const pairing = new URL(session.mobileUrl).searchParams.get('pairing');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await context.route(`${mobileRemote()}/**`, async (route) => {
    const response = await route.fetch({ url: route.request().url().replace(mobileRemote(), stack.backendUrl) });
    await route.fulfill({ response });
  });
  const wsRemote = mobileRemote().replace(/^http/, 'ws');
  await context.routeWebSocket((url) => url.href.startsWith(wsRemote), (ws) => {
    const upstream = new WebSocket(ws.url().replace(wsRemote, stack.backendUrl.replace(/^http/, 'ws')));
    const queued = [];
    upstream.on('open', () => { for (const m of queued.splice(0)) upstream.send(m); });
    upstream.on('message', (data, isBinary) => ws.send(isBinary ? data : String(data)));
    upstream.on('close', () => ws.close());
    upstream.on('error', () => ws.close());
    ws.onMessage((m) => { if (upstream.readyState === 1) upstream.send(m); else queued.push(m); });
    ws.onClose(() => upstream.close());
  });
  page = await context.newPage();
  watchBrowserErrors(page);
  page.on('response', (r) => { if (r.url().includes('/file-change-content')) contentResponses.push({ at: Date.now(), url: r.url().replace(mobileRemote(), stack.backendUrl), status: r.status() }); });
  await page.goto(`${stack.frontendUrl}/mobile?pairing=${encodeURIComponent(pairing)}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 120000 });
  await page.locator('[data-testid="mobile-home"]').waitFor({ timeout: 120000 }).catch(async (e) => { throw Object.assign(new Error(`mobile home: ${e.message}`), { details: await dumpTestIds() }); });
};
/** Mobile: choose the run in the work picker (search its summary, the first message, which names the file), open Artifacts, open the file. */
const mobileOpenArtifact = async (segment, runId, file) => {
  await page.getByText('Choose work', { exact: true }).click();
  await page.locator(`[data-testid="mobile-context-segment-${segment}"]`).click();
  await page.locator('[data-testid="mobile-context-search"]').fill(file.path);
  const row = page.locator('[data-testid="mobile-context-list"] [data-testid="mobile-readable-work-row"]', { hasText: file.path }).first();
  await row.waitFor({ timeout: 60000 }).catch(async (e) => { throw Object.assign(new Error(`work row: ${e.message}`), { details: await dumpTestIds() }); });
  await row.click();
  await page.locator('[data-testid="mobile-work-shell"]').waitFor({ timeout: 60000 });
  const mark = Date.now();
  await page.locator('[data-testid="mobile-tab-artifacts"]').click();
  const artifactRow = page.locator('[data-testid="mobile-artifact-row"]', { hasText: file.path }).first();
  await artifactRow.waitFor({ timeout: 60000 }).catch(async (e) => { throw Object.assign(new Error(`artifact row: ${e.message}`), { details: await dumpTestIds() }); });
  await artifactRow.click();
  const viewerText = () => page.locator('[data-testid="mobile-artifacts-viewer"]').innerText();
  await until(`${file.label}: mobile viewer shows the file`, async () => (await viewerText()).includes(file.text), 60000)
    .catch(async (e) => { throw Object.assign(e, { details: { shown: await viewerText().catch(() => null), requests: contentResponses.filter((r) => r.at >= mark) } }); });
  await sleep(1000);
  const own = contentResponses.filter((r) => r.at >= mark && r.url === expectedUrl(file));
  assert(own.some((r) => r.status === 200), `${file.label}: mobile content request to the owner route`, { expected: expectedUrl(file), seen: contentResponses.filter((r) => r.at >= mark) });
  return { label: file.label, requestUrl: expectedUrl(file).replace(stack.backendUrl, ''), statuses: own.map((r) => r.status), shown: (await viewerText()).replace(/\s+/g, ' ').slice(0, 160), mark };
};

const journeys = [
  ['B-001', 'Desktop: a delegated copy\'s file opens through the hub route (AC-001, REQ-007)', async () => {
    await freshPage(); const start = Date.now();
    await (await expandAgentGroup()).click();
    await copyRow().waitFor({ timeout: 120000 });
    await copyRow().click();
    const opened = await openArtifact(fileOf('delegated copy'));
    await shot('B-001-copy-file');
    return { opened, requests: expectOnlyOwnerRequests(start, [fileOf('delegated copy'), fileOf('standalone run')]) };
  }],
  ['B-002', 'Desktop: a Team run\'s configured member and team task agent files open through the team route (AC-002, AC-003, REQ-007)', async () => {
    await freshPage(); const start = Date.now();
    await page.locator(`[data-test="workspace-team-definition-row-${setup.teamDefinitionId ?? 'osr-team'}"]`).click();
    const teamRow = page.locator(`[data-test="workspace-team-row-${setup.teamRunId}"]`);
    await teamRow.waitFor({ timeout: 120000 });
    if (await teamRow.getAttribute('aria-expanded') !== 'true') await teamRow.locator('[data-test="workspace-team-run-disclosure"]').click();
    const opened = [];
    await page.locator(`[data-test="workspace-team-member-${setup.teamRunId}-/manager"]`).click();
    opened.push(await openArtifact(fileOf('team configured member')));
    await shot('B-002-team-member-file');
    const taskRow = page.locator(`[data-test="workspace-team-execution-tree"] [data-test="workspace-team-transient-execution-row"][data-agent-run-id="${setup.teamTask.agentRunId}"]`);
    await taskRow.click();
    opened.push(await openArtifact(fileOf('team task agent')));
    await shot('B-002-team-task-agent-file');
    return { opened, requests: expectOnlyOwnerRequests(start, [fileOf('team configured member'), fileOf('team task agent')]) };
  }],
  ['B-003', 'Desktop: an Org run\'s direct agent, member-team member, org-root and member-team task agent files open through the org route (AC-004, AC-005, REQ-007)', async () => {
    await freshPage(); const start = Date.now();
    await page.locator('[data-test="agent-org-definition-osr-org"]').click();
    const orgRun = page.locator(`[data-test="agent-org-run-open-${setup.orgRunId}"]`);
    await orgRun.waitFor({ timeout: 120000 });
    if (await orgRun.getAttribute('aria-expanded') !== 'true') await page.locator(`[data-test="agent-org-run-disclosure-${setup.orgRunId}"]`).click();
    const opened = [];
    const managerFile = fileOf('org direct agent');
    await page.locator(`[data-test="agent-org-agent-row-${managerFile.subject.agentRunId}"]`).click();
    opened.push(await openArtifact(managerFile));
    await shot('B-003-org-direct-agent-file');
    const leadFile = fileOf('org member-team member');
    const leadRow = page.locator(`[data-test="agent-org-agent-row-${leadFile.subject.agentRunId}"]`);
    if (!(await leadRow.count())) await page.locator('[data-test^="agent-org-team-row-"]').first().click();
    await leadRow.waitFor({ timeout: 60000 });
    await leadRow.click();
    opened.push(await openArtifact(leadFile));
    for (const label of ['org-root task agent', 'org member-team task agent']) {
      const file = fileOf(label);
      await page.locator(`[data-test="agent-org-task-agent-row-${file.subject.agentRunId}"]`).click();
      opened.push(await openArtifact(file));
    }
    await shot('B-003-org-task-agent-file');
    return { opened, requests: expectOnlyOwnerRequests(start, ['org direct agent', 'org member-team member', 'org-root task agent', 'org member-team task agent'].map(fileOf)) };
  }],
  ['B-004', 'Desktop: a standalone run\'s own file opens through the run route (AC-006)', async () => {
    await freshPage(); const start = Date.now();
    await (await expandAgentGroup()).click();
    const opened = await openArtifact(fileOf('standalone run'));
    await shot('B-004-standalone-run-file');
    return { opened, requests: expectOnlyOwnerRequests(start, [fileOf('standalone run')]) };
  }],
  ['B-005', 'Desktop: a delegated copy\'s deleted file shows "File not found" through the hub route (AC-001 alternate, REQ-008)', async () => {
    const file = fileOf('delegated copy');
    const aside = `${file.absolutePath}.probe-moved`;
    await fsp.rename(file.absolutePath, aside);
    try {
      await freshPage(); const start = Date.now();
      await (await expandAgentGroup()).click();
      await copyRow().waitFor({ timeout: 120000 });
      await copyRow().click();
      const opened = await openArtifact(file, { expectText: 'File not found', expectStatus: 404 });
      const body = await (await fetch(expectedUrl(file))).text();
      assert(body === JSON.stringify({ detail: 'File change content is not available' }), 'server says not available', { body });
      await shot('B-005-copy-file-deleted');
      return { opened, serverBody: body, requests: expectOnlyOwnerRequests(start, [file, fileOf('standalone run')]) };
    } finally { await fsp.rename(aside, file.absolutePath); }
  }, { allowContent404: true }],
  ['B-006', 'Mobile (Phone Access): an agent run\'s file opens in the mobile Artifacts view through the run route (AC-012, REQ-007)', async () => {
    await freshMobilePage();
    const opened = await mobileOpenArtifact('recent', setup.hubRunId, fileOf('standalone run'));
    await shot('B-006-mobile-agent-run-file');
    return { opened, requests: expectOnlyOwnerRequests(opened.mark, [fileOf('standalone run')]) };
  }],
  ['B-007', 'Mobile (Phone Access): a Team run member\'s file opens in the mobile Artifacts view through the team route (AC-012, REQ-007)', async () => {
    await freshMobilePage();
    const opened = await mobileOpenArtifact('recent', setup.teamRunId, fileOf('team configured member'));
    await shot('B-007-mobile-team-member-file');
    return { opened, requests: expectOnlyOwnerRequests(opened.mark, [fileOf('team configured member')]) };
  }],
];

main().catch((error) => { console.error(error); process.exitCode = 1; });
