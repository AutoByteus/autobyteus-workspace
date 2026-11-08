#!/usr/bin/env node
// Run-history poll read budget (workspace-tree-vs-chooser, autobyteus-385, design "Tests → API/E2E" and "Risks").
// The run section polls the history every 5 s with two GraphQL reads in parallel: `listWorkspaceRunHistory(limitPerAgent)`
// and `listCollaborationRootHistory`. While the Runs view is shown the window is `null` (every non-archived run), and
// every Agent, Team and Org item carries `lastActivityAt`, read from memory files. Budget: 250 ms per poll read on a data
// set shaped like a heavy user's (about 40 Agent runs and about 200 Team runs). The Workspaces view's capped read (6 per
// agent) must not be slower than the base build's read by more than that budget.
// Two steps, both on test-owned data only (never a user's data or a copy of it):
//   1. Seed (once):  node autobyteus-web/tests/e2e/run-history-read-budget-probe.mjs --seed-to <new dir>
//        [--agent-runs 40] [--team-runs 200] [--org-runs 10] [--team-members 5]
//      This worktree's server (dist/app.js) with the scripted AGY CLI (tests/fixtures/agy-failure-cli.mjs, no inference)
//      and public GraphQL/WebSocket APIs only. Agent runs are spread over three agents (half, 30 % and 20 %: more than 6 per
//      agent, so the window matters) and three folders; Team runs (one five-member Team) and Org runs (a director and a
//      placed two-member Team) go to folders of their own. Every run gets one user message (one turn, so its memory files
//      exist, as for the user's runs) and is then stopped. Writes `<dir>.manifest.json`.
//   2. Measure (per build): ... --from-seed <seed dir> --output-dir <fresh dir> [--stack-root <worktree>] [--label base]
//        [--samples 40] [--compare-with <other evidence.json>] [--budget-ms 250]
//      Copies the seed to a fresh data root, starts that worktree's backend and times poll reads over HTTP, the two
//      queries in parallel, as the app sends them. The query documents are read from that worktree's own
//      `autobyteus-web/graphql/queries/*.ts`, so a base build is measured with the fields it has. Windows: `null` (when the
//      build accepts it) and 6. On a build with `lastActivityAt`, it also checks the read's content against the manifest:
//      `null` returns every seeded run, 6 returns the newest 6 per agent, the per-folder read with `null` is complete, and
//      every item's `lastActivityAt` is at or after its `createdAt` and after it when the run had a turn.
//      With --compare-with <base evidence>, it records the capped read's p50 and p95 difference against that build.
// Results: evidence.json in --output-dir (each sample, p50/p95/max per window, load average, cleanup receipt). Exit 1 on a
// failed check or a read over budget (p95 of the poll read).
// Prereqs: pnpm install and `pnpm -C autobyteus-server-ts prebuild && build` in each --stack-root. No browser, no logins.
// One heavy run at a time (TESTING.md): timings depend on the machine's load, which is recorded with each window.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';
// Every node needs a credential (autobyteus-437): the probe's nodes start with its launch credential, and the probe's
// own calls and its desktop browser contexts carry it (fixtures/probe-node-access.mjs).
attachToProbeProcess();

const ownWebDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(path.dirname(ownWebDir), 'autobyteus-server-ts/package.json'));
const WebSocket = require('ws');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const seedTo = getArg('seed-to') ? path.resolve(getArg('seed-to')) : null;
const fromSeed = getArg('from-seed') ? path.resolve(getArg('from-seed')) : null;
// Real path: dist/app.js starts only when its own URL equals argv[1].
const stackRoot = fs.realpathSync(path.resolve(getArg('stack-root', path.dirname(ownWebDir))));
const serverDir = path.join(stackRoot, 'autobyteus-server-ts');
const fixtureCli = path.join(path.dirname(ownWebDir), 'autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs');
const label = getArg('label', 'current');
const AGENT_RUNS = Number(getArg('agent-runs', '40'));
const TEAM_RUNS = Number(getArg('team-runs', '200'));
const ORG_RUNS = Number(getArg('org-runs', '10'));
const TEAM_MEMBERS = Number(getArg('team-members', '5'));
const SAMPLES = Number(getArg('samples', '40'));
const BUDGET_MS = Number(getArg('budget-ms', '250'));
const BATCH = 8;
const compareWith = getArg('compare-with');
const outputDir = path.resolve(getArg('output-dir', seedTo ? `${seedTo}-seed-evidence` : `test-results/run-history-read-budget-${Date.now()}`));
const MODEL = 'gemini-3.8-flash-low';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (what, predicate, ms = 60000, interval = 250) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(interval); }
  throw new Error(`Timed out: ${what}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const loadAverage = () => os.loadavg().map((v) => Number(v.toFixed(1)));
const gitHead = (dir) => { try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } };
const objectsIn = (value) => Array.isArray(value) ? value.flatMap(objectsIn) : value && typeof value === 'object' ? [value, ...Object.values(value).flatMap(objectsIn)] : [];
const percentile = (values, p) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] : null; };
const round = (v) => (v === null ? null : Number(v.toFixed(1)));
const stats = (values) => ({ n: values.length, p50: round(percentile(values, 50)), p95: round(percentile(values, 95)), max: round(Math.max(...values)),
  mean: round(values.reduce((a, b) => a + b, 0) / values.length) });

const evidence = { mode: seedTo ? 'seed' : 'measure', label, startedAt: new Date().toISOString(), stackRoot, stackHead: gitHead(stackRoot),
  probeHead: gitHead(ownWebDir), platform: `${process.platform}-${process.arch}`, node: process.version, cpus: os.cpus().length,
  loadAtStart: loadAverage(), budgetMs: BUDGET_MS, checks: {}, cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const check = (id, description, fn) => {
  try { const details = fn(); evidence.checks[id] = { result: 'Pass', description, details }; console.log(`${id} Pass ${description}`); }
  catch (e) { evidence.checks[id] = { result: 'Fail', description, message: e.message, details: e.details }; evidence.failures.push(id); console.log(`${id} Fail ${description} — ${e.message}`); }
};

// ---------------------------------------------------------------- owned backend
const stack = { dataDir: '', backendUrl: '', backend: null, privateHome: '', starts: 0 };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 20000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await until('owned process killed', () => exited(child), 5000);
  });
  return { pid: child.pid, status: 'terminated', exit: child.exitCode ?? child.signalCode };
};
const startBackend = async () => {
  stack.starts += 1;
  const serverEnv = { APP_ENV: 'production', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataDir, 'db', 'production.db')}`, AUTOBYTEUS_SERVER_HOST: stack.backendUrl };
  await fsp.writeFile(path.join(stack.dataDir, '.env'), `${Object.entries(serverEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  const env = { ...Object.fromEntries(['PATH', 'TMPDIR', 'LANG', 'SHELL'].filter((k) => process.env[k]).map((k) => [k, process.env[k]])), ...serverEnv,
    HOME: stack.privateHome, ANTIGRAVITY_CLI_COMMAND: fixtureCli, AGY_FAKE_CASE: 'linked_skills', DISABLE_HTTP_REQUEST_LOGS: 'true' };
  const log = fs.createWriteStream(path.join(outputDir, `backend-${stack.starts}.log`), { flags: 'a' });
  const child = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(stack.backendPort), '--data-dir', stack.dataDir],
    { cwd: serverDir, env: withNodeCredential(env), detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  stack.backend = child;
  await until('backend listening', () => { if (exited(child)) throw new Error('backend exited'); return child.output.includes('listening'); }, 300000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const prepareStack = async (root) => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), `Build the server first in ${stackRoot}`);
  stack.dataDir = path.join(root, 'server-data');
  stack.privateHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'read-budget-home-'));
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
  assert(ok && !body.errors?.length, `GraphQL failed: ${JSON.stringify(body.errors ?? body).slice(0, 400)}`, body);
  return body.data;
};

// ---------------------------------------------------------------- seed (public APIs only)
const sockets = [];
const openSocket = async (url) => {
  const socket = new WebSocket(url); sockets.push(socket);
  const frames = []; socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))); } catch { /* not JSON */ } });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return { socket, frames };
};
const ids = () => { const messageId = `budget-${randomUUID()}`; return { message_id: messageId, dedupe_key: `agent_run_input:budget:${messageId}` }; };
const config = (workspaceRootPath) => ({ workspaceRootPath, llmModelIdentifier: MODEL, runtimeKind: 'antigravity_cli', autoExecuteTools: true, llmConfig: null });
/** The agent at an address in an execution tree (the API answers snake_case). */
const runOf = (tree, address) => { const node = objectsIn(tree).find((o) => o.address === address && (o.agentRunId ?? o.agent_run_id)); return node ? { agentRunId: node.agentRunId ?? node.agent_run_id } : null; };
const hasTurn = (conversation, marker) => JSON.stringify(conversation ?? []).includes(marker);
const inBatches = async (items, fn) => { for (let i = 0; i < items.length; i += BATCH) await Promise.all(items.slice(i, i + BATCH).map(fn)); };

const seed = async (root) => {
  const folders = Object.fromEntries(['agents-main', 'agents-side', 'agents-third', 'teams', 'orgs'].map((n) => [n, path.join(root, 'folders', n)]));
  for (const dir of Object.values(folders)) await fsp.mkdir(dir, { recursive: true });
  for (const rootPath of Object.values(folders)) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath } });
  const agentDef = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  const agents = { main: await agentDef('Budget Main Agent'), side: await agentDef('Budget Side Agent'), third: await agentDef('Budget Third Agent') };
  const memberIds = []; for (let i = 0; i < TEAM_MEMBERS; i++) memberIds.push(await agentDef(`Budget Member ${i + 1}`));
  const teamDef = async (name, members) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: name, instructions: 'Work together.', coordinatorMemberName: 'member_1', handoffs: [],
    nodes: members.map((ref, i) => ({ memberName: `member_${i + 1}`, ref, refScope: 'SHARED' })) } })).createAgentTeamDefinition.id;
  const teamId = await teamDef('Budget Team', memberIds);
  const crewId = await teamDef('Budget Crew', memberIds.slice(0, 2));
  const director = await agentDef('Budget Director');
  const orgId = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: {
    name: 'Budget Org', description: 'Budget Org', instructions: 'Plan.', handoffs: [],
    members: [{ memberName: 'director', ref: director, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'crew', ref: crewId, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;

  // Agent runs: half on Main, 30 % on Side, the rest on Third; Main alternates between two folders.
  const plan = Array.from({ length: AGENT_RUNS }, (_, i) => {
    const share = i / AGENT_RUNS;
    const key = share < 0.5 ? 'main' : share < 0.8 ? 'side' : 'third';
    const folder = key === 'main' ? (i % 2 ? folders['agents-side'] : folders['agents-main']) : key === 'side' ? folders['agents-side'] : folders['agents-third'];
    return { index: i, key, agentDefinitionId: agents[key], folder };
  });
  const agentRuns = [];
  await inBatches(plan, async (p) => {
    const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
      { input: { agentDefinitionId: p.agentDefinitionId, ...config(p.folder) } })).createAgentRun;
    assert(created.success, created.message);
    const marker = `budget agent turn ${p.index}`;
    const { socket } = await openSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${created.runId}`);
    await sleep(200);
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: created.runId, ...ids(), content: marker, context_file_paths: [], image_urls: [] } }));
    await until(`agent turn ${p.index}`, async () => hasTurn((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: created.runId })).getRunProjection.conversation, marker), 180000, 500);
    socket.close();
    const stopped = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: created.runId })).terminateAgentRun;
    assert(stopped.success, stopped.message);
    agentRuns.push({ runId: created.runId, agent: p.key, agentDefinitionId: p.agentDefinitionId, folder: p.folder, turn: true });
  });
  console.log(`  agent runs ${agentRuns.length}/${AGENT_RUNS}`);

  const teamRuns = [];
  const memberConfigs = memberIds.map((ref, i) => ({ memberAddress: `/member_${i + 1}`, agentDefinitionId: ref, ...config(folders.teams) }));
  await inBatches(Array.from({ length: TEAM_RUNS }, (_, i) => i), async (index) => {
    const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
      { input: { teamDefinitionId: teamId, teamConfigs: [{ teamAddress: '/', ...config(folders.teams) }], memberConfigs } })).createAgentTeamRun;
    assert(created.success, created.message);
    const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: created.teamRunId })).getTeamRunResumeConfig.executionTree;
    const coordinator = runOf(tree, '/member_1');
    assert(coordinator, `Team ${index}: coordinator not in the tree`, JSON.stringify(tree).slice(0, 1500));
    const marker = `budget team turn ${index}`;
    const { socket } = await openSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent-team/${created.teamRunId}`);
    await sleep(200);
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: marker, agent_run_id: coordinator.agentRunId, context_file_paths: [], image_urls: [], ...ids() } }));
    await until(`team turn ${index}`, async () => hasTurn((await gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}',
      { t: created.teamRunId, a: coordinator.agentRunId })).getTeamMemberRunProjection.conversation, marker), 180000, 500);
    socket.close();
    const stopped = (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: created.teamRunId })).terminateAgentTeamRun;
    assert(stopped.success, stopped.message);
    teamRuns.push({ teamRunId: created.teamRunId, folder: folders.teams, turn: true });
    if (teamRuns.length % 40 === 0) console.log(`  team runs ${teamRuns.length}/${TEAM_RUNS}`);
  });

  const orgRuns = [];
  await inBatches(Array.from({ length: ORG_RUNS }, (_, i) => i), async (index) => {
    const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
      { input: { agentOrgDefinitionId: orgId, rootConfiguration: config(folders.orgs), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(created.success, created.message);
    const orgRunId = created.agentOrgRunId;
    const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRunId })).getAgentOrgRunConfig.executionTree;
    const directorNode = runOf(tree, '/director');
    assert(directorNode, `Org ${index}: director not in the tree`);
    const marker = `budget org turn ${index}`;
    const { socket, frames } = await openSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent-org/${orgRunId}`);
    await until(`Org ${index} stream ready`, () => frames.some((f) => f.type === 'ROOT_LIFECYCLE'), 60000);
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: directorNode.agentRunId,
      command_id: randomUUID(), content: marker, context_file_paths: [], image_urls: [], ...ids() } }));
    await until(`org turn ${index}`, async () => hasTurn((await gql('query($o:String!,$m:String!,$a:String!){getAgentOrgMemberRunProjection(orgRunId:$o,memberAddress:$m,agentRunId:$a){conversation}}',
      { o: orgRunId, m: '/director', a: directorNode.agentRunId })).getAgentOrgMemberRunProjection.conversation, marker), 180000, 500);
    socket.close();
    const stopped = (await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: orgRunId })).terminateAgentOrgRun;
    assert(stopped.success, stopped.message);
    orgRuns.push({ orgRunId, folder: folders.orgs, turn: true });
  });
  console.log(`  org runs ${orgRuns.length}/${ORG_RUNS}`);
  for (const socket of sockets.splice(0)) socket.close();
  return { folders, agents, teamDefinitionId: teamId, orgDefinitionId: orgId, agentRuns, teamRuns, orgRuns,
    shape: { agentRuns: agentRuns.length, teamRuns: teamRuns.length, orgRuns: orgRuns.length, teamMembers: TEAM_MEMBERS,
      perAgent: Object.fromEntries(Object.keys(agents).map((k) => [k, agentRuns.filter((r) => r.agent === k).length])) } };
};

// ---------------------------------------------------------------- measure
/** The app's own query document from the measured worktree (a base build is measured with the fields it has). */
const queryFromSource = (file, name) => {
  const text = fs.readFileSync(path.join(stackRoot, 'autobyteus-web/graphql/queries', file), 'utf8');
  const match = text.match(new RegExp(`export const ${name} = gql\`([\\s\\S]*?)\``));
  assert(match, `${name} not found in ${file}`);
  return match[1];
};
const pollRead = async (workspaceQuery, rootsQuery, limitPerAgent) => {
  const started = performance.now();
  const [workspace, roots] = await Promise.all([gqlRaw(workspaceQuery, { limitPerAgent }), gqlRaw(rootsQuery)]);
  const ms = performance.now() - started;
  for (const r of [workspace, roots]) assert(r.ok && !r.body.errors?.length, `poll read failed: ${JSON.stringify(r.body.errors ?? r.body).slice(0, 300)}`);
  return { ms, workspaceMs: workspace.ms, rootsMs: roots.ms, bytes: workspace.bytes + roots.bytes, groups: workspace.body.data.listWorkspaceRunHistory,
    roots: roots.body.data.listCollaborationRootHistory };
};
const countsOf = (read) => ({
  agentRuns: read.groups.flatMap((g) => g.agentDefinitions.flatMap((a) => a.runs)).length,
  teamRuns: read.groups.flatMap((g) => g.teamDefinitions.flatMap((t) => t.runs)).length,
  orgRuns: read.roots.filter((r) => r.root_subject_kind === 'agent_org').length,
});
const measureWindow = async (workspaceQuery, rootsQuery, limitPerAgent) => {
  const cold = await pollRead(workspaceQuery, rootsQuery, limitPerAgent);
  for (let i = 0; i < 3; i++) await pollRead(workspaceQuery, rootsQuery, limitPerAgent);
  const samples = []; const loadBefore = loadAverage();
  for (let i = 0; i < SAMPLES; i++) { samples.push(await pollRead(workspaceQuery, rootsQuery, limitPerAgent)); await sleep(150); }
  return { limitPerAgent, coldMs: round(cold.ms), counts: countsOf(samples.at(-1)), bytes: samples.at(-1).bytes, loadBefore, loadAfter: loadAverage(),
    poll: stats(samples.map((s) => s.ms)), workspaceRead: stats(samples.map((s) => s.workspaceMs)), rootsRead: stats(samples.map((s) => s.rootsMs)),
    samplesMs: samples.map((s) => round(s.ms)), last: samples.at(-1) };
};

const verifyContent = (manifest, uncapped, capped, folderRead) => {
  const agentItems = uncapped.groups.flatMap((g) => g.agentDefinitions.flatMap((a) => a.runs.map((r) => ({ ...r, agentDefinitionId: a.agentDefinitionId, folder: g.workspaceRootPath }))));
  const teamItems = uncapped.groups.flatMap((g) => g.teamDefinitions.flatMap((t) => t.runs));
  const orgItems = uncapped.roots.filter((r) => r.root_subject_kind === 'agent_org');
  check('RB-C1', 'window null returns every seeded run (Agent, Team, Org)', () => {
    const missing = {
      agent: manifest.agentRuns.filter((r) => !agentItems.some((i) => i.runId === r.runId)).map((r) => r.runId),
      team: manifest.teamRuns.filter((r) => !teamItems.some((i) => i.teamRunId === r.teamRunId)).map((r) => r.teamRunId),
      org: manifest.orgRuns.filter((r) => !orgItems.some((i) => i.root_run_id === r.orgRunId)).map((r) => r.orgRunId),
    };
    assert(Object.values(missing).every((m) => m.length === 0), 'seeded runs missing from the uncapped read', missing);
    return { agentItems: agentItems.length, teamItems: teamItems.length, orgItems: orgItems.length };
  });
  check('RB-C2', 'window 6 returns the newest 6 runs per agent and folder, and every Team and Org run', () => {
    const perGroup = capped.groups.flatMap((g) => g.agentDefinitions.map((a) => ({ folder: g.workspaceRootPath, agent: a.agentDefinitionId, runs: a.runs.map((r) => r.runId) })));
    const details = perGroup.map((group) => {
      const all = agentItems.filter((i) => i.folder === group.folder && i.agentDefinitionId === group.agent);
      const newest = [...all].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6).map((r) => r.runId);
      assert(group.runs.length === Math.min(6, all.length), `group ${group.folder} ${group.agent}: ${group.runs.length} of ${all.length}`, group);
      assert(newest.every((id) => group.runs.includes(id)), `group ${group.folder} ${group.agent}: not the newest 6`, { newest, got: group.runs });
      return { folder: path.basename(group.folder), agent: group.agent, listed: group.runs.length, stored: all.length };
    });
    assert(details.some((d) => d.stored > 6), 'the seed has no agent group over 6 runs', details);
    const counts = countsOf(capped);
    assert(counts.teamRuns === teamItems.length && counts.orgRuns === orgItems.length, 'the window caps only agent runs', counts);
    return details;
  });
  check('RB-C3', 'per-folder workspaceRunHistory with null is complete', () => {
    const listed = folderRead.agentDefinitions.flatMap((a) => a.runs).length;
    const stored = manifest.agentRuns.filter((r) => r.folder === folderRead.workspaceRootPath).length;
    assert(listed === stored && stored > 6, `folder lists ${listed} of ${stored}`, { folder: folderRead.workspaceRootPath });
    return { folder: path.basename(folderRead.workspaceRootPath), listed, stored };
  });
  check('RB-C4', 'every Agent, Team and Org item carries lastActivityAt at or after createdAt, after it for a run with a turn', () => {
    const rows = [
      ...agentItems.map((i) => ({ kind: 'agent', id: i.runId, created: i.createdAt, last: i.lastActivityAt })),
      ...teamItems.map((i) => ({ kind: 'team', id: i.teamRunId, created: i.createdAt, last: i.lastActivityAt })),
      ...orgItems.map((i) => ({ kind: 'org', id: i.root_run_id, created: i.created_at, last: i.last_activity_at })),
    ];
    const bad = rows.filter((r) => !r.last || Number.isNaN(Date.parse(r.last)) || Date.parse(r.last) < Date.parse(r.created));
    assert(bad.length === 0, 'items without a valid lastActivityAt', bad.slice(0, 5));
    const flat = rows.filter((r) => Date.parse(r.last) === Date.parse(r.created));
    assert(flat.length === 0, 'runs with a turn whose lastActivityAt equals createdAt', flat.slice(0, 5));
    return { items: rows.length, byKind: Object.fromEntries(['agent', 'team', 'org'].map((k) => [k, rows.filter((r) => r.kind === k).length])) };
  });
};

// ---------------------------------------------------------------- main
let exitCode = 0;
try {
  assert(!fs.existsSync(outputDir), `Output directory exists; pass a fresh --output-dir (${outputDir})`);
  await fsp.mkdir(outputDir, { recursive: true });
  if (seedTo) {
    assert(!fs.existsSync(seedTo), `Seed directory must be new: ${seedTo}`);
    await fsp.mkdir(path.join(seedTo, 'server-data'), { recursive: true });
    await prepareStack(seedTo);
    await startBackend();
    const started = Date.now();
    const seeded = await seed(seedTo);
    evidence.seed = { ms: Date.now() - started, shape: seeded.shape };
    await fsp.writeFile(`${seedTo}.manifest.json`, `${JSON.stringify(seeded, null, 2)}\n`);
    console.log(`Seeded ${JSON.stringify(seeded.shape)} in ${Math.round((Date.now() - started) / 1000)} s`);
  } else {
    assert(fromSeed && fs.existsSync(`${fromSeed}.manifest.json`), 'Pass --from-seed <seed dir> (with its .manifest.json)');
    const manifest = JSON.parse(await fsp.readFile(`${fromSeed}.manifest.json`, 'utf8'));
    evidence.seedShape = manifest.shape;
    const runRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'read-budget-run-'));
    // Same absolute folder paths as the seed: the registry and run records name them.
    await fsp.cp(path.join(fromSeed, 'server-data'), path.join(runRoot, 'server-data'), { recursive: true });
    evidence.runRoot = runRoot;
    await prepareStack(runRoot);
    await startBackend();
    const workspaceQuery = queryFromSource('runHistoryQueries.ts', 'ListWorkspaceRunHistory');
    const rootsQuery = queryFromSource('collaborationRootHistoryQueries.ts', 'ListCollaborationRootHistory');
    evidence.queryHasLastActivity = workspaceQuery.includes('lastActivityAt');
    evidence.windows = {};
    const nullAccepted = !(await gqlRaw(workspaceQuery, { limitPerAgent: null })).body.errors?.length && evidence.queryHasLastActivity;
    if (nullAccepted) evidence.windows.uncapped = await measureWindow(workspaceQuery, rootsQuery, null);
    evidence.windows.capped = await measureWindow(workspaceQuery, rootsQuery, 6);
    for (const [name, w] of Object.entries(evidence.windows)) {
      console.log(`${label} window ${w.limitPerAgent}: poll p50 ${w.poll.p50} ms, p95 ${w.poll.p95} ms, max ${w.poll.max} ms (cold ${w.coldMs} ms); `
        + `${JSON.stringify(w.counts)}; ${w.bytes} bytes; load ${w.loadBefore.join('/')} → ${w.loadAfter.join('/')}`);
    }
    if (evidence.queryHasLastActivity) {
      const folderPath = manifest.folders['agents-side'];
      const workspaces = (await gql('{workspaces{workspaceId workspaceRootPath}}')).workspaces;
      const metadata = workspaces.find((w) => w.workspaceRootPath === folderPath);
      assert(metadata, `workspace for ${folderPath} not found`, workspaces);
      const perFolderQuery = queryFromSource('runHistoryQueries.ts', 'GetWorkspaceRunHistory');
      const folderRead = (await gql(perFolderQuery, { workspaceId: metadata.workspaceId, limitPerAgent: null })).workspaceRunHistory;
      verifyContent(manifest, evidence.windows.uncapped.last, evidence.windows.capped.last, folderRead);
      check('RB-B1', `uncapped poll read (Runs view) p95 within ${BUDGET_MS} ms`, () => {
        const { p95 } = evidence.windows.uncapped.poll;
        assert(p95 <= BUDGET_MS, `p95 ${p95} ms over ${BUDGET_MS} ms`, evidence.windows.uncapped.poll);
        return evidence.windows.uncapped.poll;
      });
      check('RB-B2', `capped poll read (Workspaces view) p95 within ${BUDGET_MS} ms`, () => {
        const { p95 } = evidence.windows.capped.poll;
        assert(p95 <= BUDGET_MS, `p95 ${p95} ms over ${BUDGET_MS} ms`, evidence.windows.capped.poll);
        return evidence.windows.capped.poll;
      });
    }
    if (compareWith) {
      const other = JSON.parse(await fsp.readFile(path.resolve(compareWith), 'utf8'));
      check('RB-B3', `capped poll read not slower than ${other.label} (${other.stackHead}) by more than ${BUDGET_MS} ms`, () => {
        const mine = evidence.windows.capped.poll, theirs = other.windows.capped.poll;
        const delta = { p50: round(mine.p50 - theirs.p50), p95: round(mine.p95 - theirs.p95), mine, theirs };
        assert(delta.p50 <= BUDGET_MS && delta.p95 <= BUDGET_MS, `capped read ${delta.p50} ms (p50) / ${delta.p95} ms (p95) slower`, delta);
        return delta;
      });
    }
    for (const w of Object.values(evidence.windows)) delete w.last;
  }
} catch (error) {
  exitCode = 1;
  evidence.fatal = String(error?.stack ?? error);
  evidence.fatalDetails = error?.details ?? null;
  console.error(`[run-history-read-budget] ${error.message}`);
} finally {
  for (const socket of sockets.splice(0)) socket.close();
  evidence.cleanup.backend = await stopGroup(stack.backend).catch((e) => ({ error: e.message }));
  if (stack.privateHome) { await fsp.rm(stack.privateHome, { recursive: true, force: true }); evidence.cleanup.home = stack.privateHome; }
  if (evidence.runRoot) { await fsp.rm(evidence.runRoot, { recursive: true, force: true }); evidence.cleanup.runRoot = `${evidence.runRoot} removed`; }
  if (seedTo) evidence.cleanup.seedKept = `${seedTo} (test-owned seed; remove after the measurements)`;
  if (evidence.failures.length) exitCode = 1;
  evidence.completedAt = new Date().toISOString(); evidence.loadAtEnd = loadAverage();
  await fsp.mkdir(outputDir, { recursive: true });
  await save();
  console.log(`${exitCode ? 'FAIL' : 'PASS'} ${evidencePath}`);
  process.exitCode = exitCode;
}
