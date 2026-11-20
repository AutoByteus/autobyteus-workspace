#!/usr/bin/env node
// Universal Team status in the Workspaces tree, live: real Nuxt dev frontend + built backend + fresh headless Chrome.
// Run from the repository root: pnpm -C autobyteus-web test:e2e:team-status-live --output-dir <fresh dir>
//   Optional: --browser-executable <path> --ledger-file <initialized absolute path> --cases TS-001,TS-002,...
// Prerequisites: installed workspace dependencies, a current `pnpm -C autobyteus-server-ts prebuild && build`
// (the probe runs autobyteus-server-ts/dist/app.js), and Chrome.
// Agents run on the AGY runtime with the repository's scripted CLI
// (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs, AGY_FAKE_CASE=linked_skills):
//   - `CALL_TOOL:{...}` makes that agent call the actual scoped MCP tool (delegate_task, send_message_to);
//   - `HOLD_TURN` keeps that agent's turn running (Running) until it is stopped;
//   - `CALL_TOOL:{` followed by invalid JSON ends that agent's turn with a provider ERROR (Error);
//   - any other text is answered at once (Idle).
// No provider inference and no mocked routes: every Team dot is derived from real AGENT_STATUS / lifecycle events.
// Cases: TS-001 delegated Team under an Agent run; TS-002 TEAMS run and group rows across three runs;
// TS-003 a Team delegated by a Team run's member; TS-004 delegated and Org-internal Teams under an Org run;
// TS-005/006/007 a task Team delegated by a task Team member under an Agent, Team and Org run (each dot = its shown agents).
// TS-008 (autobyteus-448 DEC-004) an Agent run and a Team run idle with a background task (`BACKGROUND_STEP`): the active,
// not pulsing dot and "Background task running" in the row, the Team row and the header; no Stop; Idle once it exits.
// TS-009 (autobyteus-448 part 2, as merged into autobyteus-500) the same in an Org run: its agent row and its mounted Team's row.
// TS-001/003/004 also check the delegated Team row's layout: dot → people-group icon → name, the dot centered on the
// name line, no overlap with the Task summary line or the per-copy Stop icon, and Stop shown only while the copy is live.
// The probe owns a private data root, free ports, the backend and Nuxt process groups and Chrome, and removes
// them in finally. It never uses the installed app or user data.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';
import { waitRunSocketReady } from './fixtures/run-socket-ready.mjs';
import { delegatedNodes, readRunTree } from './fixtures/run-tree.mjs';
// Every node needs a credential (autobyteus-437): the probe's nodes start with its launch credential, and the probe's
// own calls and its desktop browser contexts carry it (fixtures/probe-node-access.mjs).
attachToProbeProcess();

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/team-status-live'));
const ledger = getArg('ledger-file', getArg('ledger'));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
const ALL_CASES = ['TS-001', 'TS-002', 'TS-003', 'TS-004', 'TS-005', 'TS-006', 'TS-007', 'TS-008', 'TS-009'];
const selectedCases = (getArg('cases') ?? ALL_CASES.join(',')).split(',').map((c) => c.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(100); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const slug = (name) => segment(name).replace(/_/g, '-');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
/** Text that makes the scripted agent fail its turn at the provider (invalid tool-call JSON). */
const FAIL_TURN = 'CALL_TOOL:{this is not json}';

const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

// ---------------------------------------------------------------- owned stack
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 15000).catch(async () => {
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
const backendEnv = () => ({ APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') });
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'team-status-live-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot],
    serverDir, withNodeCredential(env), 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};

// ---------------------------------------------------------------- public API setup (what the app's own launch does)
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const workspace = () => path.join(stack.dataRoot, 'workspace');
const config = () => ({ workspaceRootPath: workspace(), llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });
const ensureWorkspace = async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some((w) => w.absolutePath === workspace())) {
    await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace() } });
  }
};
const createDefinitions = async (label) => {
  const s = `${label} ${randomUUID().slice(0, 4)}`;
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: `Manager ${s}`, worker: `Release Notes Writer ${s}`, helper: `Fact Checker ${s}`,
    squad: `Docs Review Team ${s}`, team: `Delivery Team ${s}`, org: `Delivery Org ${s}` };
  const ids = {};
  ids.manager = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_project', 'update_project', 'create_task', 'update_task']);
  ids.worker = await agent(names.worker, []); ids.helper = await agent(names.helper, []);
  const team = async (name, coordinatorMemberName, nodes) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name, description: name, instructions: 'Deliver.', coordinatorMemberName, nodes } })).createAgentTeamDefinition.id;
  ids.squad = await team(names.squad, 'reviewer', [{ memberName: 'reviewer', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.helper, refScope: 'SHARED' }]);
  ids.team = await team(names.team, 'manager', [{ memberName: 'manager', ref: ids.manager, refScope: 'SHARED' },
    { memberName: 'worker', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'helper', ref: ids.helper, refScope: 'SHARED' }]);
  ids.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
    { input: { name: names.org, description: 'Org root', instructions: 'Deliver.', handoffs: [], members: [
      { memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'worker', ref: ids.worker, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'helper', ref: ids.helper, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  return { ids, names };
};
const createTask = async (label, description) => {
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}',
    { input: { name: `Docs Launch ${label} ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const taskId = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
    { input: { projectId, title: description.split('\n')[0], description } })).createProjectTask.taskId; // autobyteus-260: Tasks have a title
  return { projectId, taskId };
};
const createRoot = async (kind, ids) => {
  if (kind === 'agent') {
    const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    assert(r.success, r.message); return { kind, rootId: r.runId, managerRunId: r.runId };
  }
  if (kind === 'team') {
    const r = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config() }], memberConfigs: ['manager', 'worker', 'helper']
        .map((m) => ({ memberAddress: `/${m}`, agentDefinitionId: ids[m], ...config() })) } })).createAgentTeamRun;
    assert(r.success, r.message);
    const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
    return { kind, rootId: r.teamRunId, managerRunId: tree.root_team.members.find((m) => m.address === '/manager').agent_run_id };
  }
  const r = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
    { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(r.success, r.message);
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  return { kind, rootId: r.agentOrgRunId, managerRunId: tree.rootOrg.members.find((m) => m.address === '/manager').agentRunId };
};
/** The root's delegated runs, from its tree (autobyteus-461 SR-084: its view carries its own parts only); each marked listed. */
const storedTree = async (root) => ({ taskExecutions: delegatedNodes(await readRunTree(gql, root.kind, root.rootId)).map((node) => ({ ...node, startedAt: 'listed' })) });
const terminateViaApi = async (root) => Object.values(await gql(root.kind === 'agent' ? 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}'
  : root.kind === 'team' ? 'mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}'
    : 'mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: root.rootId }))[0];
/** The task Team nodes (delegated Team copies) of a stored tree, with their members. */
const taskTeams = (tree) => {
  const found = [];
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    const startedAt = v.startedAt ?? v.started_at; const teamRunId = v.teamRunId ?? v.team_run_id;
    if (typeof startedAt === 'string' && teamRunId && Array.isArray(v.members)) {
      found.push({ teamRunId, address: v.address, members: v.members.map((m) => ({ address: m.address, agentRunId: m.agentRunId ?? m.agent_run_id })).filter((m) => m.agentRunId) });
    }
    Object.values(v).forEach(visit);
  };
  visit(tree); return found;
};
const sockets = [];
/** The Manager's input channel (what its composer sends). */
const managerInput = async (root) => {
  const route = root.kind === 'agent' ? `agent/${root.rootId}` : root.kind === 'team' ? `agent-team/${root.rootId}` : `agent-org/${root.rootId}`;
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/${route}`); sockets.push(socket);
  const frames = [];
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))); } catch { /* not JSON */ } });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await waitRunSocketReady(frames, route);
  const send = (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: root.kind === 'org'
    ? { root_subject_kind: 'agent_org', root_run_id: root.rootId, target_agent_run_id: root.managerRunId, command_id: randomUUID(),
      message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: root.managerRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
      content, context_file_paths: [], image_urls: [] } }));
  return { send, close: () => socket.close() };
};
/** A root whose Manager delegated one Project Task to the Docs Review Team (coordinator reviewer, member editor). */
const setupDelegatedTeam = async (kind, label) => {
  const { ids, names } = await createDefinitions(label);
  const { projectId, taskId } = await createTask(label, 'Review the docs site.');
  const root = await createRoot(kind, ids);
  const input = await managerInput(root);
  input.send(callTool('delegate_task', { recipient_address: kind === 'org' ? '/squad' : `/${segment(names.squad)}`, task_id: taskId }));
  const team = await until('delegated Team in the stored tree', async () => {
    const t = taskTeams(await storedTree(root)).find((n) => n.members.length >= 2); return t ?? null;
  }, 60000);
  const coordinator = team.members.find((m) => /\/reviewer$/.test(m.address));
  const member = team.members.find((m) => /\/editor$/.test(m.address));
  assert(coordinator && member, 'delegated Team members not found', team);
  return { ids, names, projectId, taskId, root, input, team, coordinator, member };
};

// ---------------------------------------------------------------- browser helpers
let browser;
const newPage = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US' });
  await attachToBrowserContext(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // A cold Nuxt dev server may reload once for dependency optimization; those transient errors are not app errors.
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const openWorkspace = async (page) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  // A folder is listed only while it has a run (workspace-tree-vs-chooser REQ-009), so Temp may be absent: wait for the folder used here.
  await until('workspace row', async () => (await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).count()) >= 1, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
};
const openRoot = async (page, root, names) => {
  await openWorkspace(page);
  if (root.kind === 'agent') {
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]');
    await until('agent run row', async () => (await runRow.count()) === 1, 30000);
    await runRow.click();
    await until('agent task tree', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 1, 30000);
    return runRow;
  }
  if (root.kind === 'team') {
    await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
    const runRow = page.locator(`[data-test="workspace-team-row-${root.rootId}"]`);
    await runRow.click();
    await until('team tree', async () => (await page.locator('[data-test="workspace-team-execution-tree"]').count()) >= 1, 30000);
    return runRow;
  }
  await page.locator(`[data-test="agent-org-definition-${slug(names.org)}"]`).click();
  const runRow = page.locator(`[data-test="agent-org-run-open-${root.rootId}"]`);
  await runRow.click();
  await until('org children', async () => (await page.locator(`[data-test="agent-org-run-children-${root.rootId}"]`).count()) === 1, 30000);
  return runRow;
};
const TEAM_DOT = '[data-test="team-aggregate-status-dot"]';
const TASK_TEAM_ROW = '[data-test="workspace-team-transient-execution-row"][data-delegated-run-kind="task_team"]';
const taskTeamRow = (page, kind, teamRunId) => page.locator(TASK_TEAM_ROW).first();
const agentRow = (page, kind, agentRunId) => page.locator(kind === 'org' ? `[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${agentRunId}"], [data-test="agent-org-agent-row-${agentRunId}"]`
  : `[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${agentRunId}"]`).first();
const COLOURS = [['gray', 'offline'], ['green', 'idle'], ['blue', 'running'], ['amber', 'initializing'], ['red', 'error']];
const statusFromClass = (cls) => COLOURS.find(([c]) => new RegExp(`(?:bg|text)-${c}-`).test(cls ?? ''))?.[1] ?? `unknown(${cls})`;
/** The rendered Team dot of a row: data-status, label, title, the dot colour, count and position before the people-group icon. */
const teamDotOf = async (row) => row.evaluate((el, sel) => {
  const dots = el.querySelectorAll(sel);
  const dot = dots[0];
  const inner = dot?.querySelector('span, svg');
  // The people-group icon: marked with data-team-icon on most Team rows; the Org-internal Team row's icon is the dot's next sibling.
  const icon = el.querySelector('[data-team-icon]') ?? (dot?.nextElementSibling?.matches('svg') ? dot.nextElementSibling : null);
  return { count: dots.length, status: dot?.getAttribute('data-status') ?? null, ariaLabel: dot?.getAttribute('aria-label') ?? null,
    title: dot?.getAttribute('title') ?? null, dotClass: inner?.getAttribute('class') ?? null,
    rowLabel: el.getAttribute('aria-label'), beforeIcon: icon && dot ? dot.getBoundingClientRect().right <= icon.getBoundingClientRect().left + 0.5 : null };
}, TEAM_DOT);
/** An agent row's own rendered status: an Org row's data-status, else its dot colour. */
const agentStatusOf = async (page, kind, agentRunId) => {
  const row = agentRow(page, kind, agentRunId);
  if (kind === 'org') return row.getAttribute('data-status');
  return statusFromClass(await row.locator('[data-test="workspace-transient-status-dot"]').getAttribute('class'));
};
/** The approved rule (REQ-001/003), used to check that a Team dot never contradicts the agent rows under it. */
const expectedTeamStatus = (statuses, alive) => {
  if (!alive) return 'offline';
  if (statuses.some((s) => s === 'running' || s === 'initializing')) return 'running';
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('idle')) return 'idle';
  return 'offline';
};
const DOT_CLASS = { running: 'bg-blue-500 animate-pulse', error: 'bg-red-500', idle: 'bg-green-500', offline: 'bg-gray-400' };
const LABEL = { running: 'Running', error: 'Error', idle: 'Idle', offline: 'Offline' };
/** Asserts a Team row shows exactly one dot with `status`, in colour and words, before the icon (REQ-006/007). */
const assertTeamDot = (dot, status, where, { icon = true } = {}) => {
  assert(dot.count === 1, `${where}: expected exactly one Team dot`, dot);
  assert(dot.status === status, `${where}: Team status ${dot.status}, expected ${status}`, dot);
  for (const c of DOT_CLASS[status].split(' ')) assert((dot.dotClass ?? '').split(/\s+/).includes(c), `${where}: dot class lacks ${c}`, dot);
  if (status !== 'running') assert(!(dot.dotClass ?? '').includes('animate-pulse'), `${where}: only busy pulses`, dot);
  assert(dot.ariaLabel === `Team status: ${LABEL[status]}` && dot.title === dot.ariaLabel, `${where}: dot label/title`, dot);
  if (icon) assert(dot.beforeIcon === true, `${where}: dot is not before the people-group icon`, dot);
};
const waitTeamStatus = (label, row, status, ms = 30000) => until(label, async () => ((await teamDotOf(row)).status === status ? true : null), ms);
const expandTaskTeam = async (page, kind, teamRunId) => {
  const row = taskTeamRow(page, kind, teamRunId);
  if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator('[data-test="workspace-team-transient-disclosure"]').click();
};
const collapseTaskTeam = async (page, kind, teamRunId) => {
  const row = taskTeamRow(page, kind, teamRunId);
  if ((await row.getAttribute('aria-expanded')) === 'true') await row.locator('[data-test="workspace-team-transient-disclosure"]').click();
};
/** Counts the app's HTTP requests while a status change arrives (REQ-008: no new request or polling is needed). */
const countRequests = (page) => { const seen = []; const on = (r) => { if (/\/graphql|\/rest\//.test(r.url())) {
  let op = ''; try { op = r.postDataJSON()?.operationName ?? ''; } catch { /* not JSON */ }
  seen.push(`${r.method()} ${r.url()}${op ? ` ${op}` : ''}`); } }; page.on('request', on);
  return () => { page.off('request', on); return seen; }; };
/** Checks one task Team row against the member rows under it (expanded), then returns the observation. */
const consistency = async (page, kind, s, alive, where) => {
  await expandTaskTeam(page, kind, s.team.teamRunId);
  for (const m of [s.coordinator, s.member]) await agentRow(page, kind, m.agentRunId).waitFor({ state: 'visible', timeout: 30000 });
  const members = { coordinator: await agentStatusOf(page, kind, s.coordinator.agentRunId), member: await agentStatusOf(page, kind, s.member.agentRunId) };
  const dot = await teamDotOf(taskTeamRow(page, kind, s.team.teamRunId));
  const expected = expectedTeamStatus(Object.values(members), alive);
  assert(dot.status === expected, `${where}: Team dot ${dot.status} contradicts its member rows (expected ${expected})`, { members, dot });
  for (const m of [s.coordinator, s.member]) assert(await agentRow(page, kind, m.agentRunId).locator(TEAM_DOT).count() === 0, `${where}: an agent row shows a Team dot`);
  return { members, dot };
};
/**
 * The geometry of a delegated Team row next to the per-copy Stop icon and (Agent/Team roots) the Task summary line:
 * dot, people-group icon, name, summary and Stop as rendered boxes. The Org row's Stop sits beside its row button.
 */
// autobyteus-461 FU-031: an Org's delegated rows are the shared transient row, laid out as in the other trees.
const rowLayoutOf = async (page, kind, teamRunId) => taskTeamRow(page, kind, teamRunId).evaluate((row, isOrg) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const scope = row;
  const dot = row.querySelector('[data-test="team-aggregate-status-dot"]');
  return { dot: box(dot), icon: box(row.querySelector('[data-team-icon]')),
    name: box(row.querySelector('.min-w-0.flex-1 > span.block.truncate')),
    summary: box(row.querySelector('[data-test="workspace-task-worker-task-summary"]')),
    stop: box(scope.querySelector('[data-test="workspace-delegated-stop"]')),
    stopLabel: scope.querySelector('[data-test="workspace-delegated-stop"]')?.getAttribute('aria-label') ?? null,
    row: box(row), dotStatus: dot?.getAttribute('data-status') ?? null };
}, false);
const overlaps = (a, b) => !!a && !!b && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
/** Merged-row regression: the dot stays first, aligned with the name line, and overlaps neither the summary line nor Stop. */
const assertRowLayout = (layout, where, { stop, summary }) => {
  const { dot, icon, name } = layout;
  assert(dot && icon && name, `${where}: dot, icon or name not rendered`, layout);
  assert(dot.right <= icon.left + 0.5 && icon.right <= name.left + 0.5, `${where}: order is not dot → icon → name`, layout);
  const nameLineMid = name.top + name.height / 2; const dotMid = dot.top + dot.height / 2;
  assert(Math.abs(dotMid - nameLineMid) <= 2, `${where}: dot not centered on the name line`, layout);
  for (const other of ['summary', 'stop']) for (const own of ['dot', 'icon']) assert(!overlaps(layout[own], layout[other]), `${where}: ${own} overlaps ${other}`, layout);
  assert(!overlaps(layout.name, layout.stop), `${where}: name overlaps Stop`, layout);
  if (summary) {
    assert(layout.summary, `${where}: Task summary line missing`, layout);
    assert(layout.summary.top >= name.bottom - 0.5 && layout.summary.left >= icon.right, `${where}: summary not under the name, right of the icon`, layout);
  }
  assert(stop ? !!layout.stop : !layout.stop, `${where}: per-copy Stop ${stop ? 'missing on a live copy' : 'shown on a stopped copy'}`, layout);
};

// ---------------------------------------------------------------- journeys
/** TS-001 (SCN-001; AC-001..005, AC-007, AC-009, AC-010): a delegated Team under an Agent run. */
const agentRootJourney = async () => {
  const s = await setupDelegatedTeam('agent', 'TsAgent');
  const { page, errors, context } = await newPage();
  const out = { root: s.root, team: s.team.teamRunId };
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const row = taskTeamRow(page, 'agent', s.team.teamRunId);
    await row.waitFor({ state: 'visible', timeout: 30000 });
    // AC-002: the coordinator answered (idle), the member no work reached is offline → green.
    await waitTeamStatus('Team idle', row, 'idle');
    out.idle = await consistency(page, 'agent', s, true, 'idle');
    assert(out.idle.members.coordinator === 'idle' && out.idle.members.member === 'offline', 'unexpected member statuses', out.idle);
    assertTeamDot(out.idle.dot, 'idle', 'idle Team');
    assert(/, idle, /.test(out.idle.dot.rowLabel ?? ''), 'Team row accessible label lacks the status word', out.idle.dot);
    assert(await runRow.locator(TEAM_DOT).count() === 0, 'the Agent run row shows a Team dot (BEH-006)');
    await shot(page, 'ts001-agent-idle-expanded');
    // Merged rows: the dot beside upstream's Task summary line and per-copy Stop icon.
    out.layoutIdle = await rowLayoutOf(page, 'agent', s.team.teamRunId);
    assertRowLayout(out.layoutIdle, 'TS-001 idle row', { stop: true, summary: true });
    // AC-001/AC-005: collapsed, the delegator messages the coordinator, which starts working → blue, live, no expand/reload.
    await collapseTaskTeam(page, 'agent', s.team.teamRunId);
    await until('members hidden', async () => (await agentRow(page, 'agent', s.coordinator.agentRunId).count()) === 0, 10000);
    const stopCounting = countRequests(page);
    const sentAt = Date.now();
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.coordinator.agentRunId, content: 'Please review the release page. HOLD_TURN' }));
    await waitTeamStatus('collapsed Team turns busy', row, 'running', 60000);
    out.busyLatencyMs = Date.now() - sentAt;
    out.requestsDuringChange = stopCounting();
    assert((await row.getAttribute('aria-expanded')) === 'false', 'Team row expanded by itself');
    out.busyCollapsed = await teamDotOf(row);
    assertTeamDot(out.busyCollapsed, 'running', 'collapsed busy Team');
    out.layoutBusy = await rowLayoutOf(page, 'agent', s.team.teamRunId);
    assertRowLayout(out.layoutBusy, 'TS-001 busy collapsed row', { stop: true, summary: true });
    await shot(page, 'ts001-agent-busy-collapsed');
    // AC-004 alternate: a member fails while the coordinator still works → still blue (busy > error).
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.member.agentRunId, content: FAIL_TURN }));
    await expandTaskTeam(page, 'agent', s.team.teamRunId);
    await until('member error', async () => (await agentStatusOf(page, 'agent', s.member.agentRunId)) === 'error', 60000);
    out.busyAndError = await consistency(page, 'agent', s, true, 'busy+error');
    assertTeamDot(out.busyAndError.dot, 'running', 'busy+error Team');
    await shot(page, 'ts001-agent-busy-and-error');
    // AC-004: the user stops the working coordinator (Stop generation) → no agent busy, one in error → red.
    await agentRow(page, 'agent', s.coordinator.agentRunId).click();
    const stop = page.locator('[data-test="workspace-center-pane"] button[aria-label="Stop generation"]').first();
    await stop.waitFor({ state: 'visible', timeout: 30000 });
    await stop.click();
    await until('coordinator no longer running', async () => (await agentStatusOf(page, 'agent', s.coordinator.agentRunId)) !== 'running', 60000);
    await sleep(1000);
    out.errorAfterStop = await consistency(page, 'agent', s, true, 'error after Stop generation');
    assertTeamDot(out.errorAfterStop.dot, 'error', 'error Team');
    await shot(page, 'ts001-agent-error');
    // autobyteus-461 REQ-001: the user terminates the Agent run; its delegated Team outlives it, keeping its own status and
    // its own Stop (base stopped it with the run, AC-007's gray).
    await runRow.hover();
    await page.locator('[data-test="terminate-agent-run"]').first().click();
    await until('the Agent run stopped', async () => !(await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: s.root.rootId })).getAgentRunResumeConfig?.isActive, 30000);
    await sleep(3000);
    out.afterRunStop = await teamDotOf(row);
    assert(out.afterRunStop.status !== 'offline', 'the delegated Team went gray with its delegator (REQ-001: it outlives the Stop)', out.afterRunStop);
    assert((await rowLayoutOf(page, 'agent', s.team.teamRunId)).stop, 'the delegated Team lost its own Stop with its delegator');
    // Its own Stop: then it is gray.
    assert((await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: s.team.teamRunId })).terminateAgentTeamRun.success, 'Stop of the delegated Team');
    await waitTeamStatus('the delegated Team stopped → gray', row, 'offline', 60000);
    out.stopped = await teamDotOf(row);
    assertTeamDot(out.stopped, 'offline', 'stopped Team');
    await until('per-copy Stop gone once the copy stopped', async () => !(await rowLayoutOf(page, 'agent', s.team.teamRunId)).stop, 30000);
    out.layoutStopped = await rowLayoutOf(page, 'agent', s.team.teamRunId);
    assertRowLayout(out.layoutStopped, 'TS-001 stopped row', { stop: false, summary: true });
    await shot(page, 'ts001-agent-stopped');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { s.input.close(); await context.close(); }
};

/** TS-002 (SCN-004/005; AC-002, AC-007, AC-008, AC-010; ASM-002): TEAMS run and group rows across three runs. */
const teamsSectionJourney = async () => {
  const { ids, names } = await createDefinitions('TsTeams');
  const idle = await createRoot('team', ids); const busy = await createRoot('team', ids); const unstarted = await createRoot('team', ids);
  const idleInput = await managerInput(idle); const busyInput = await managerInput(busy);
  idleInput.send('Hello, what is planned today?');
  busyInput.send('Draft the plan. HOLD_TURN');
  await sleep(3000);
  const { page, errors, context } = await newPage();
  const out = { runs: { idle: idle.rootId, busy: busy.rootId, unstarted: unstarted.rootId } };
  try {
    // A fresh page load: the TEAMS rows come from the history list and the streams opened for active runs.
    await openWorkspace(page);
    const group = page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`);
    await group.waitFor({ state: 'visible', timeout: 60000 });
    assert((await group.getAttribute('aria-expanded')) === 'false', 'group expected collapsed on load');
    // AC-008: collapsed group with an idle, a busy and an alive-unstarted run → blue.
    await waitTeamStatus('group busy', group, 'running', 60000);
    out.groupBusyCollapsed = await teamDotOf(group);
    assertTeamDot(out.groupBusyCollapsed, 'running', 'collapsed group', { icon: false });
    await group.click();
    const runRow = (r) => page.locator(`[data-test="workspace-team-row-${r.rootId}"]`);
    const stopButton = (r) => runRow(r).locator('xpath=..').locator('button[aria-label="Terminate team"]');
    for (const r of [idle, busy, unstarted]) await runRow(r).waitFor({ state: 'visible', timeout: 30000 });
    // AC-002 (screenshot 2): idle Manager + offline members → green, not blue. ASM-002: alive, nothing started → gray, Stop kept.
    await waitTeamStatus('idle run green', runRow(idle), 'idle');
    await waitTeamStatus('busy run blue', runRow(busy), 'running');
    out.alive = { idle: await teamDotOf(runRow(idle)), busy: await teamDotOf(runRow(busy)), unstarted: await teamDotOf(runRow(unstarted)) };
    assertTeamDot(out.alive.idle, 'idle', 'idle run', { icon: false });
    assertTeamDot(out.alive.busy, 'running', 'busy run', { icon: false });
    assertTeamDot(out.alive.unstarted, 'offline', 'alive unstarted run', { icon: false });
    for (const r of [idle, busy, unstarted]) assert(await stopButton(r).count() === 1, `Stop missing on alive run ${r.rootId} (AC-010)`);
    await shot(page, 'ts002-teams-alive');
    // AC-008: the user stops the busy run → that run gray, group green (idle run left).
    await stopButton(busy).click();
    await waitTeamStatus('stopped busy run gray', runRow(busy), 'offline', 60000);
    await waitTeamStatus('group idle', group, 'idle', 60000);
    out.afterBusyStopped = { group: await teamDotOf(group), busy: await teamDotOf(runRow(busy)) };
    assertTeamDot(out.afterBusyStopped.group, 'idle', 'group after busy stop', { icon: false });
    assert(await stopButton(busy).count() === 0, 'Stop still shown on a stopped run (AC-010)');
    await shot(page, 'ts002-teams-busy-stopped');
    // AC-007/AC-008: all stopped → group and every run gray; archive/delete appear as before.
    await stopButton(idle).click(); await stopButton(unstarted).click();
    await waitTeamStatus('group gray', group, 'offline', 60000);
    for (const r of [idle, busy, unstarted]) await waitTeamStatus(`run ${r.rootId} gray`, runRow(r), 'offline', 60000);
    out.allStopped = { group: await teamDotOf(group) };
    assertTeamDot(out.allStopped.group, 'offline', 'group all stopped', { icon: false });
    await until('archive/delete on stopped runs', async () => {
      for (const r of [idle, busy, unstarted]) {
        const container = runRow(r).locator('xpath=..');
        if (await container.locator('button[title="Archive team history"], button[aria-label="Delete team history permanently"]').count() < 1) return false;
      }
      return true;
    }, 30000);
    out.archiveDeleteOnStoppedRuns = true;
    await shot(page, 'ts002-teams-all-stopped');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { idleInput.close(); busyInput.close(); await context.close(); }
};

/** TS-003 (SCN-002; AC-009, REQ-002): a Team delegated by a Team run's member; the run row counts the delegated agents. */
const teamRootJourney = async () => {
  const s = await setupDelegatedTeam('team', 'TsTeamRoot');
  const { page, errors, context } = await newPage();
  const out = { root: s.root, team: s.team.teamRunId };
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const row = taskTeamRow(page, 'team', s.team.teamRunId);
    await row.waitFor({ state: 'visible', timeout: 30000 });
    await waitTeamStatus('delegated Team idle', row, 'idle');
    out.idle = await consistency(page, 'team', s, true, 'team root idle');
    assertTeamDot(out.idle.dot, 'idle', 'delegated Team under a Team run');
    await waitTeamStatus('run row idle', runRow, 'idle');
    const managerRow = page.locator(`[data-test="workspace-team-member-${s.root.rootId}-/manager"]`);
    assert(await managerRow.locator(TEAM_DOT).count() === 0, 'a Team member (agent) row shows a Team dot (BEH-006)');
    out.layoutIdle = await rowLayoutOf(page, 'team', s.team.teamRunId);
    assertRowLayout(out.layoutIdle, 'TS-003 idle row', { stop: true, summary: true });
    await shot(page, 'ts003-team-root-idle');
    // The Manager stays idle; only the delegated coordinator works → the delegated Team row reads busy. The run row and its
    // group keep their own status (autobyteus-461 SR-082, user-approved: each run's status is its own; base counted the
    // delegated agents in it).
    await collapseTaskTeam(page, 'team', s.team.teamRunId);
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.coordinator.agentRunId, content: 'Second pass. HOLD_TURN' }));
    await waitTeamStatus('delegated Team busy', row, 'running', 60000);
    await sleep(2000);
    const group = page.locator(`[data-test="workspace-team-definition-row-${slug(s.names.team)}"]`);
    out.busy = { team: await teamDotOf(row), run: await teamDotOf(runRow), group: await teamDotOf(group) };
    assertTeamDot(out.busy.team, 'running', 'delegated Team busy (collapsed)');
    assertTeamDot(out.busy.run, 'idle', 'run row: its own status, not its delegated agents\'', { icon: false });
    assertTeamDot(out.busy.group, 'idle', 'group row: its runs\' own status', { icon: false });
    out.layoutBusy = await rowLayoutOf(page, 'team', s.team.teamRunId);
    assertRowLayout(out.layoutBusy, 'TS-003 busy collapsed row', { stop: true, summary: true });
    await shot(page, 'ts003-team-root-busy');
    // The user stops the Team run: its row is gray; its delegated Team outlives it (autobyteus-461 REQ-001), keeping its own
    // status and its own Stop, and is gray once stopped by its own Stop (base stopped it with the run, AC-007).
    await runRow.locator('xpath=..').locator('button[aria-label="Terminate team"]').click();
    await waitTeamStatus('run row gray', runRow, 'offline', 60000);
    await sleep(3000);
    out.afterRunStop = await teamDotOf(row);
    assert(out.afterRunStop.status !== 'offline', 'the delegated Team went gray with its delegator (REQ-001: it outlives the Stop)', out.afterRunStop);
    assert((await rowLayoutOf(page, 'team', s.team.teamRunId)).stop, 'the delegated Team lost its own Stop with its delegator');
    assert((await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: s.team.teamRunId })).terminateAgentTeamRun.success, 'Stop of the delegated Team');
    await waitTeamStatus('delegated Team gray', row, 'offline', 60000);
    out.stopped = { team: await teamDotOf(row), run: await teamDotOf(runRow) };
    assertTeamDot(out.stopped.team, 'offline', 'stopped delegated Team');
    await until('per-copy Stop gone once the copy stopped', async () => !(await rowLayoutOf(page, 'team', s.team.teamRunId)).stop, 30000);
    out.layoutStopped = await rowLayoutOf(page, 'team', s.team.teamRunId);
    assertRowLayout(out.layoutStopped, 'TS-003 stopped row', { stop: false, summary: true });
    await shot(page, 'ts003-team-root-stopped');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { s.input.close(); await context.close(); }
};

/** TS-004 (SCN-003; AC-009, AC-007, BEH-006): delegated and Org-internal Teams under an Org run. */
const orgRootJourney = async () => {
  const s = await setupDelegatedTeam('org', 'TsOrg');
  const { page, errors, context } = await newPage();
  const out = { root: s.root, team: s.team.teamRunId };
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const row = taskTeamRow(page, 'org', s.team.teamRunId);
    await row.waitFor({ state: 'visible', timeout: 30000 });
    await waitTeamStatus('Org task Team idle', row, 'idle');
    out.idle = await consistency(page, 'org', s, true, 'org idle');
    assertTeamDot(out.idle.dot, 'idle', 'delegated Team under an Org run');
    // autobyteus-461 FU-031: an Org's delegated Team row is the shared transient row; its label names the status as the Agent tree's does.
    assert(/, idle, /.test(out.idle.dot.rowLabel ?? ''), 'Org task Team accessible label lacks the status word', out.idle.dot);
    assert(await runRow.locator(TEAM_DOT).count() === 0, 'the Org root row shows a Team dot (BEH-006)');
    // Org-internal (configured) Team rows: exactly one dot each, consistent with their member rows.
    const configured = page.locator('[data-test^="agent-org-team-row-"]');
    out.configured = [];
    for (let i = 0; i < await configured.count(); i += 1) {
      const c = configured.nth(i);
      const dot = await teamDotOf(c);
      // No work has reached the Org-internal Team's members (the Task went to a delegated copy) → offline, gray.
      assertTeamDot(dot, 'offline', 'Org-internal Team, no member started');
      out.configured.push(dot);
    }
    assert(out.configured.length >= 1, 'no Org-internal Team row rendered');
    // The Org task-Team row has no Task summary line; its Stop sits beside the row button.
    out.layoutIdle = await rowLayoutOf(page, 'org', s.team.teamRunId);
    assertRowLayout(out.layoutIdle, 'TS-004 idle row', { stop: true, summary: false });
    await shot(page, 'ts004-org-idle');
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.coordinator.agentRunId, content: 'Another look please. HOLD_TURN' }));
    await waitTeamStatus('Org task Team busy', row, 'running', 60000);
    out.busy = await consistency(page, 'org', s, true, 'org busy');
    assertTeamDot(out.busy.dot, 'running', 'Org task Team busy');
    await shot(page, 'ts004-org-busy');
    // The Org run stops: its own (Org-internal) Teams are gray; its delegated Team outlives it (autobyteus-461 REQ-001),
    // keeping its own status and Stop, and is gray once stopped by its own Stop (base stopped it with the Org, AC-007).
    const t = await terminateViaApi(s.root);
    assert(t.success, `Org terminate failed: ${t.message}`);
    for (let i = 0; i < await configured.count(); i += 1) await waitTeamStatus('Org-internal Team gray after the Org stops', configured.nth(i), 'offline', 60000);
    await sleep(3000);
    out.afterOrgStop = await teamDotOf(row);
    assert(out.afterOrgStop.status !== 'offline', 'the delegated Team went gray with its Org (REQ-001: it outlives the Stop)', out.afterOrgStop);
    assert((await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: s.team.teamRunId })).terminateAgentTeamRun.success, 'Stop of the delegated Team');
    await waitTeamStatus('Org task Team gray', row, 'offline', 60000);
    out.stopped = await teamDotOf(row);
    assertTeamDot(out.stopped, 'offline', 'stopped Org task Team');
    await until('per-copy Stop gone once the copy stopped', async () => !(await rowLayoutOf(page, 'org', s.team.teamRunId)).stop, 30000);
    out.layoutStopped = await rowLayoutOf(page, 'org', s.team.teamRunId);
    assertRowLayout(out.layoutStopped, 'TS-004 stopped row', { stop: false, summary: false });
    await shot(page, 'ts004-org-stopped');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { s.input.close(); await context.close(); }
};

/**
 * TS-005..007 (REQ-001..003, REQ-005, REQ-007; AC-005, AC-007, AC-009): a task Team delegated by a member of a task Team,
 * under an Agent, Team and Org run. The Manager delegates the Docs Review Team; its coordinator (as its own task) delegates
 * the Build Crew. Each Team row's dot equals the rule applied to the agent rows shown under it, the same collapsed and
 * expanded, live; agent rows have no Team dot; rows do not overlap; a stopped run makes both Teams gray. Where the inner
 * Team is shown (inside the outer Team or beside it) is recorded as `placement`, not assumed.
 */
const nestedTaskTeamJourney = (kind) => async () => {
  const label = { agent: 'TsNestAgent', team: 'TsNestTeam', org: 'TsNestOrg' }[kind];
  const { ids, names } = await createDefinitions(label);
  names.crew = `Build Crew ${label} ${randomUUID().slice(0, 4)}`;
  ids.crew = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: names.crew, description: names.crew, instructions: 'Deliver.', coordinatorMemberName: 'builder',
      nodes: [{ memberName: 'builder', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'checker', ref: ids.helper, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const root = await createRoot(kind, ids);
  const input = await managerInput(root);
  const crewAddress = `/${segment(names.crew)}`;
  // The outer coordinator's task description is its own tool call: it delegates the Build Crew.
  input.send(callTool('delegate_task', { recipient_address: kind === 'org' ? '/squad' : `/${segment(names.squad)}`,
    description: callTool('delegate_task', { recipient_address: crewAddress, description: 'Check the release page.' }) }));
  const { outer, inner } = await until('a task Team delegated by a task Team member', async () => {
    const teams = taskTeams(await storedTree(root));
    const inner = teams.find((t) => t.address === crewAddress && t.members.length >= 2);
    const outer = teams.find((t) => t !== inner && t.members.length >= 2);
    return inner && outer ? { outer, inner } : null;
  }, 90000);
  const byRole = (team, role) => team.members.find((m) => new RegExp(`/${role}$`).test(m.address));
  const agents = { reviewer: byRole(outer, 'reviewer'), editor: byRole(outer, 'editor'), builder: byRole(inner, 'builder'), checker: byRole(inner, 'checker') };
  assert(Object.values(agents).every(Boolean), 'task Team members not found', { outer, inner });
  const rowSelector = (team) => `${TASK_TEAM_ROW}[data-member-address="${team.address}"]`;
  const teamRow = (page, team) => page.locator(rowSelector(team)).first();
  const setExpanded = async (page, team, expanded) => {
    const row = teamRow(page, team);
    if ((await row.getAttribute('aria-expanded')) !== String(expanded)) {
      await row.locator('[data-test="workspace-team-transient-disclosure"]').click();
      await until(`${team.address} ${expanded ? 'expanded' : 'collapsed'}`, async () => (await row.getAttribute('aria-expanded')) === String(expanded), 10000);
    }
    await sleep(800); // let the tree-row transition settle before measuring
  };
  /** The visible tree rows in order (agent rows carry their run id), with depth and box; for subtree and overlap checks. */
  const treeRows = (page) => page.evaluate((isOrg) => {
    const sel = isOrg ? '[role="tree"] [role="treeitem"]'
      : '[data-test="workspace-team-transient-execution-row"], [data-test^="workspace-team-member-"]';
    const all = [...document.querySelectorAll(sel)];
    // Outermost matches only (a row's own parts, such as its avatar, can match the same prefix).
    return all.filter((el) => el.getClientRects().length && !all.some((other) => other !== el && other.contains(el))).map((el) => {
      const r = el.getBoundingClientRect();
      const depth = Number(el.getAttribute('aria-level') ?? el.getAttribute('data-tree-depth') ?? NaN);
      const agentRunId = el.getAttribute('data-agent-run-id') ?? (el.getAttribute('data-test') ?? '').match(/agent-org-(?:task-)?agent-row-(.+)$/)?.[1] ?? null;
      return { test: el.getAttribute('data-test'), address: el.getAttribute('data-member-address'), agentRunId, depth, top: r.top, bottom: r.bottom };
    });
  }, kind === 'org');
  /** The agent run ids shown under a Team row: the rows after it, deeper than it, until the next row at its depth or above. */
  const shownUnder = (rows, team) => {
    const index = rows.findIndex((r) => (r.address === team.address && r.agentRunId === null));
    assert(index >= 0, `${team.address} row not found among the tree rows`, rows);
    const out = [];
    for (let i = index + 1; i < rows.length && rows[i].depth > rows[index].depth; i += 1) if (rows[i].agentRunId) out.push(rows[i].agentRunId);
    return out;
  };
  /** Both Teams expanded: each dot equals the rule applied to the agent rows shown under it; agent rows have no Team dot; no overlap. */
  const check = async (page, where) => {
    await setExpanded(page, outer, true);
    await setExpanded(page, inner, true);
    for (const a of Object.values(agents)) await agentRow(page, kind, a.agentRunId).waitFor({ state: 'visible', timeout: 30000 });
    const rows = await treeRows(page);
    for (let i = 1; i < rows.length; i += 1) assert(rows[i].top >= rows[i - 1].bottom - 1, `${where}: tree rows overlap`, [rows[i - 1], rows[i]]);
    const statusOf = async (id) => agentStatusOf(page, kind, id);
    const result = { dots: {}, shown: {}, expected: {}, statuses: {} };
    for (const [role, a] of Object.entries(agents)) result.statuses[role] = await statusOf(a.agentRunId);
    for (const [name, team] of Object.entries({ outer, inner })) {
      result.shown[name] = shownUnder(rows, team);
      // autobyteus-461 SR-082 (user-approved): a Team's status is its own members'; a Team its member delegated (shown under
      // it, SR-084) is a run of its own and does not count.
      const own = result.shown[name].filter((id) => team.members.some((member) => member.agentRunId === id));
      const statuses = []; for (const id of own) statuses.push(await statusOf(id));
      result.expected[name] = expectedTeamStatus(statuses, true);
      result.dots[name] = await teamDotOf(teamRow(page, team));
      assertTeamDot(result.dots[name], result.expected[name], `${where}: ${name} Team against its own member rows`);
    }
    for (const a of Object.values(agents)) assert(await agentRow(page, kind, a.agentRunId).locator(TEAM_DOT).count() === 0, `${where}: an agent row shows a Team dot`);
    const innerIds = [agents.builder.agentRunId, agents.checker.agentRunId];
    result.placement = result.shown.outer.some((id) => innerIds.includes(id)) ? 'inner Team shown inside the outer Team' : 'inner Team shown beside the outer Team';
    return result;
  };
  const { page, errors, context } = await newPage();
  const out = { kind, root, outer: { teamRunId: outer.teamRunId, address: outer.address }, inner: { teamRunId: inner.teamRunId, address: inner.address } };
  try {
    const runRow = await openRoot(page, root, names);
    await teamRow(page, outer).waitFor({ state: 'visible', timeout: 30000 });
    await waitTeamStatus('outer Team idle', teamRow(page, outer), 'idle', 60000);
    out.idle = await check(page, 'idle');
    assert(out.idle.statuses.builder === 'idle' && out.idle.statuses.reviewer === 'idle', 'unexpected coordinator statuses', out.idle);
    if (kind !== 'team') assert(await runRow.locator(TEAM_DOT).count() === 0, 'the root row shows a Team dot (BEH-006)');
    if (kind === 'team') assert(await page.locator(`[data-test="workspace-team-member-${root.rootId}-/manager"]`).locator(TEAM_DOT).count() === 0, 'a configured Agent row shows a Team dot');
    await shot(page, `ts-nested-${kind}-idle-expanded`);
    // Only the inner Team's coordinator works, the inner Team collapsed under its expanded outer Team (autobyteus-461 SR-084: a
    // nested delegated Team sits under the member that delegated it, so it is shown while its outer Team is expanded): the
    // inner Team turns busy live, with no new request.
    await setExpanded(page, outer, true); await setExpanded(page, inner, false);
    const stopCounting = countRequests(page);
    input.send(callTool('send_message_to', { target_agent_run_id: agents.builder.agentRunId, content: 'Check it again. HOLD_TURN' }));
    await waitTeamStatus('collapsed inner Team busy', teamRow(page, inner), 'running', 60000);
    await sleep(1000);
    out.requestsDuringChange = stopCounting();
    const innerCollapsed = await teamDotOf(teamRow(page, inner));
    // The outer Team's own dot, read with it collapsed too (it hides its nested Team then).
    await setExpanded(page, outer, false);
    out.busyCollapsed = { outer: await teamDotOf(teamRow(page, outer)), inner: innerCollapsed };
    await setExpanded(page, outer, true);
    assertTeamDot(out.busyCollapsed.inner, 'running', 'collapsed inner Team');
    // SR-082 (user-approved): the Team run's own row keeps its own status; its delegated agents do not make it busy.
    if (kind === 'team') { await sleep(1000); assertTeamDot(await teamDotOf(runRow), 'idle', 'Team run row: its own status, not its delegated agents\'', { icon: false }); }
    await shot(page, `ts-nested-${kind}-busy-collapsed`);
    // Expanded: each dot against the rows shown under it, and the collapsed dots were the same.
    out.busyExpanded = await check(page, 'busy, expanded');
    assert(out.busyExpanded.statuses.builder === 'running' && out.busyExpanded.statuses.reviewer !== 'running', 'only the inner coordinator should be working', out.busyExpanded);
    for (const name of ['outer', 'inner']) assert(out.busyCollapsed[name].status === out.busyExpanded.dots[name].status, `${name} Team dot differs collapsed vs expanded`, out);
    await shot(page, `ts-nested-${kind}-busy-expanded`);
    // The run stops: its delegated Teams outlive it (autobyteus-461 REQ-001), keeping their own status; each is gray once
    // stopped by its own Stop (base stopped them with the run, AC-007).
    const t = await terminateViaApi(root);
    assert(t.success, `terminate failed: ${t.message}`);
    await sleep(3000);
    await setExpanded(page, outer, true);
    out.afterRunStop = { outer: await teamDotOf(teamRow(page, outer)), inner: await teamDotOf(teamRow(page, inner)) };
    for (const name of ['outer', 'inner']) assert(out.afterRunStop[name].status !== 'offline', `the ${name} delegated Team went gray with its delegator (REQ-001)`, out.afterRunStop);
    for (const team of [inner, outer]) assert((await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id: team.teamRunId })).terminateAgentTeamRun.success, `Stop of ${team.address}`);
    await waitTeamStatus('outer Team gray', teamRow(page, outer), 'offline', 60000);
    await waitTeamStatus('inner Team gray', teamRow(page, inner), 'offline', 60000);
    out.stopped = { outer: await teamDotOf(teamRow(page, outer)), inner: await teamDotOf(teamRow(page, inner)) };
    assertTeamDot(out.stopped.outer, 'offline', 'stopped outer Team'); assertTeamDot(out.stopped.inner, 'offline', 'stopped inner Team');
    await shot(page, `ts-nested-${kind}-stopped`);
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { input.close(); await context.close(); }
};

/** TS-008 (autobyteus-448 REQ-006, AC-005, DEC-004): runs idle with a background task show it; a Team shows its member's. */
const backgroundTaskJourney = async () => {
  const { ids, names } = await createDefinitions('TsBackground');
  const agentRoot = await createRoot('agent', ids);
  const teamRoot = await createRoot('team', ids);
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRoot.rootId })).getTeamRunResumeConfig.executionTree;
  const workerRunId = tree.root_team.members.find((m) => m.address === '/worker').agent_run_id;
  const agentInput = await managerInput(agentRoot);
  const teamInput = await managerInput(teamRoot);
  const workerInput = await managerInput({ ...teamRoot, managerRunId: workerRunId });
  const STEP = 'Start the docs server. BACKGROUND_STEP:{"seconds":45,"exitCode":0}';
  workerInput.send('Hello, what is planned today?'); // answered at once: idle, no background task
  agentInput.send(STEP); teamInput.send(STEP); // each turn ends with the daemon step open
  const { page, errors, context } = await newPage();
  const out = { runs: { agent: agentRoot.rootId, team: teamRoot.rootId, worker: workerRunId } };
  const BG = { dot: ['bg-blue-500'], label: 'Background task running' };
  try {
    await openWorkspace(page);
    // The Team run row: one member idle with a background task, another idle → the Team shows the background task.
    await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
    const teamRow = page.locator(`[data-test="workspace-team-row-${teamRoot.rootId}"]`);
    await waitTeamStatus('team row background', teamRow, 'background', 60000);
    out.teamRow = await teamDotOf(teamRow);
    assert(out.teamRow.ariaLabel === BG.label && out.teamRow.title === BG.label, 'Team row label', out.teamRow);
    assert(BG.dot.every((c) => (out.teamRow.dotClass ?? '').split(/\s+/).includes(c)) && !(out.teamRow.dotClass ?? '').includes('animate-pulse'), 'Team row dot: active blue, not pulsing', out.teamRow);
    await shot(page, 'ts008-team-row-background');
    // The Agent run: its row dot, the header and the composer.
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]').first();
    await runRow.click();
    const header = page.locator('[title^="Agent Status:"]').first();
    await until('header Background task running', async () => ((await header.innerText().catch(() => '')).trim() === BG.label ? true : null), 60000);
    out.agentRowDot = await runRow.locator('span.rounded-full').first().getAttribute('class');
    out.header = (await header.innerText()).trim();
    out.stop = await page.locator('button[title="Stop generation"]').count();
    out.send = await page.locator('button[title="Send message"]').count();
    assert((out.agentRowDot ?? '').split(/\s+/).includes('bg-blue-500') && !(out.agentRowDot ?? '').includes('animate-pulse'), 'agent row dot: active blue, not pulsing', out);
    assert(out.stop === 0 && out.send >= 1, 'no Stop for "Background task running"; Send is offered', out);
    await shot(page, 'ts008-agent-background');
    // The daemons exit (45 s after they started): Idle in the header and the Team row.
    await until('header Idle', async () => ((await header.innerText().catch(() => '')).trim() === 'Idle' ? true : null), 90000);
    await waitTeamStatus('team row idle', teamRow, 'idle', 30000);
    out.after = { header: (await header.innerText()).trim(), team: await teamDotOf(teamRow) };
    await shot(page, 'ts008-idle-again');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { agentInput.close(); teamInput.close(); workerInput.close(); await context.close(); }
};

/**
 * TS-009 (autobyteus-448 part 2 through autobyteus-500's merge: `backgroundTasksRunning` in AgentOrgRunMemberTree): an Org
 * run whose manager and a member of its mounted Team are each idle with a background step: the Org agent row and the Org
 * Team row say "Background task running" with the active, not pulsing dot; both are Idle once the steps exit.
 */
const orgBackgroundTaskJourney = async () => {
  const { ids, names } = await createDefinitions('TsOrgBackground');
  const root = await createRoot('org', ids);
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: root.rootId })).getAgentOrgRunConfig.executionTree;
  const objects = (v) => Array.isArray(v) ? v.flatMap(objects) : v && typeof v === 'object' ? [v, ...Object.values(v).flatMap(objects)] : [];
  const reviewer = objects(tree).find((o) => typeof o.address === 'string' && /\/squad\/reviewer$/.test(o.address) && (o.agentRunId ?? o.agent_run_id));
  assert(reviewer, 'the Org Team member /squad/reviewer in the Org tree', JSON.stringify(tree).slice(0, 1500));
  const reviewerRunId = reviewer.agentRunId ?? reviewer.agent_run_id;
  const managerIn = await managerInput(root);
  const reviewerIn = await managerInput({ ...root, managerRunId: reviewerRunId });
  const STEP = 'Start the docs server. BACKGROUND_STEP:{"seconds":45,"exitCode":0}';
  managerIn.send(STEP); reviewerIn.send(STEP);
  const { page, errors, context } = await newPage();
  const out = { root: root.rootId, manager: root.managerRunId, reviewer: reviewerRunId };
  const BG = 'Background task running';
  const activeNotPulsing = (cls) => (cls ?? '').split(/\s+/).includes('bg-blue-500') && !(cls ?? '').includes('animate-pulse');
  try {
    await openRoot(page, root, names);
    const managerRow = page.locator(`[data-test="agent-org-agent-row-${root.managerRunId}"]`);
    await until('Org agent row: background task', async () => ((await managerRow.getAttribute('aria-label').catch(() => '')) ?? '').includes(`, ${BG}, `) || null, 60000);
    out.managerRow = { label: await managerRow.getAttribute('aria-label'), dot: await managerRow.locator('span.rounded-full').first().getAttribute('class') };
    assert(activeNotPulsing(out.managerRow.dot), 'Org agent row dot: active blue, not pulsing', out.managerRow);
    const squadRow = page.locator('[data-test^="agent-org-team-row-"]').first();
    await until('Org Team row: its member\'s background task', async () => ((await squadRow.getAttribute('aria-label').catch(() => '')) ?? '').endsWith(`. ${BG}`) || null, 60000);
    out.squadRow = { label: await squadRow.getAttribute('aria-label'), dot: await teamDotOf(squadRow) };
    assert(out.squadRow.dot.status === 'background' || activeNotPulsing(out.squadRow.dot.dotClass), 'Org Team row dot: active, not pulsing', out.squadRow);
    await shot(page, 'ts009-org-background');
    // The daemons exit (45 s after they started): both rows are Idle.
    const labels = async () => ({ manager: await managerRow.getAttribute('aria-label').catch(() => null), squad: await squadRow.getAttribute('aria-label').catch(() => null) });
    const idleOrSay = async (label, check, ms) => until(label, check, ms).catch(async (error) => { error.details = await labels(); throw error; });
    // The agent row names its status ("manager, idle, /manager, <id>"); the Team row its Team status ("squad. Team status: Idle").
    await idleOrSay('Org agent row idle', async () => ((await managerRow.getAttribute('aria-label').catch(() => '')) ?? '').includes(', idle, ') || null, 90000);
    await idleOrSay('Org Team row idle', async () => ((await squadRow.getAttribute('aria-label').catch(() => '')) ?? '').endsWith('. Team status: Idle') || null, 60000);
    out.after = { manager: await managerRow.getAttribute('aria-label'), squad: await squadRow.getAttribute('aria-label') };
    await shot(page, 'ts009-org-idle-again');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { managerIn.close(); reviewerIn.close(); await context.close(); }
};

const CASES = {
  'TS-001': ['Agent run: delegated Team idle → busy while collapsed → busy+error → error after Stop generation → gray when the run stops', agentRootJourney],
  'TS-002': ['TEAMS rows: idle run green, alive unstarted gray with Stop, group = highest run, Stop button → gray, all stopped → gray', teamsSectionJourney],
  'TS-003': ['Team run: member-delegated Team row busy, the run row keeps its own status (SR-082); the delegated Team outlives the Stop (REQ-001), gray on its own Stop', teamRootJourney],
  'TS-004': ['Org run: delegated and Org-internal Team rows, Org root row unchanged; stop → gray', orgRootJourney],
  'TS-005': ['Agent run: a task Team delegated by a task Team member; each Team dot = its shown agents, collapsed or expanded; stop → gray', nestedTaskTeamJourney('agent')],
  'TS-006': ['Team run: a task Team delegated by a task Team member; each Team dot = its shown agents; the run row keeps its own status (SR-082); stop → gray', nestedTaskTeamJourney('team')],
  'TS-007': ['Org run: a task Team delegated by a member of a delegated Org Team copy; each Team dot = its shown agents; stop → gray', nestedTaskTeamJourney('org')],
  'TS-008': ['Background tasks: an Agent run and a Team run idle with a background task show "Background task running" with the active dot and no Stop; Idle once it exits', backgroundTaskJourney],
  'TS-009': ['Background tasks in an Org run: the Org agent row and the Org Team row of a member idle with a background task show "Background task running" with the active dot; Idle once it exits', orgBackgroundTaskJourney],
};

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found; pass --browser-executable');
  await startStack();
  await ensureWorkspace();
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  for (const id of selectedCases) {
    const [description, fn] = CASES[id] ?? [];
    if (!fn) throw new Error(`Unknown case ${id}`);
    const startedAt = new Date().toISOString();
    try {
      const details = await fn();
      evidence.cases[id] = { result: 'Pass', description, startedAt, details };
    } catch (error) {
      result = 'Fail';
      evidence.cases[id] = { result: 'Fail', description, startedAt, message: error.message, details: error.details };
      evidence.failures.push({ id, message: error.message, ...(error.details ? { details: error.details } : {}) });
    }
    if (ledger) await fsp.appendFile(ledger, `\n- ${new Date().toISOString()} ${id}: ${evidence.cases[id].result} — ${description}${evidence.cases[id].message ? ` (${evidence.cases[id].message})` : ''}. Evidence: ${evidencePath}\n`);
    await save();
  }
} catch (error) {
  result = 'Fail';
  evidence.failures.push({ id: 'HARNESS', message: error.message, details: error.details });
} finally {
  for (const socket of sockets) socket.terminate();
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = `failed: ${e.message}`; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = `failed: ${e.message}`; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = `failed: ${e.message}`; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`Team status live probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);
