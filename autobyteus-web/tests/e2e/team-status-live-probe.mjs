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
// TS-003 a Team delegated by a Team run's member; TS-004 delegated and Org-internal Teams under an Org run.
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
const ALL_CASES = ['TS-001', 'TS-002', 'TS-003', 'TS-004'];
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
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
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
    serverDir, env, 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
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
  ids.manager = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task']);
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
    { input: { projectId, description } })).createProjectTask.taskId;
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
const storedTree = async (root) => {
  if (root.kind === 'agent') return (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: root.rootId })).agentRunCollaboration?.root_agent?.execution_tree;
  if (root.kind === 'team') return (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: root.rootId })).getTeamRunResumeConfig.executionTree;
  return (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: root.rootId })).getAgentOrgRootHistory.org;
};
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
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
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
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 2, 60000);
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
const TASK_TEAM_ROW = '[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]';
const taskTeamRow = (page, kind, teamRunId) => page.locator(kind === 'org' ? `[data-test="agent-org-task-team-row-${teamRunId}"]` : TASK_TEAM_ROW).first();
const agentRow = (page, kind, agentRunId) => page.locator(kind === 'org' ? `[data-test="agent-org-task-agent-row-${agentRunId}"], [data-test="agent-org-agent-row-${agentRunId}"]`
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
  if ((await row.getAttribute('aria-expanded')) === 'false') await (kind === 'org' ? row : row.locator('[data-test="workspace-team-transient-disclosure"]')).click();
};
const collapseTaskTeam = async (page, kind, teamRunId) => {
  const row = taskTeamRow(page, kind, teamRunId);
  if ((await row.getAttribute('aria-expanded')) === 'true') await (kind === 'org' ? row : row.locator('[data-test="workspace-team-transient-disclosure"]')).click();
};
/** Counts the app's HTTP requests while a status change arrives (REQ-008: no new request or polling is needed). */
const countRequests = (page) => { const seen = []; const on = (r) => { if (/\/graphql|\/rest\//.test(r.url())) seen.push(`${r.method()} ${r.url()}`); }; page.on('request', on);
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
    // AC-007: the user terminates the Agent run → the Team is gray, whatever its members last reported.
    await runRow.hover();
    await page.locator('[data-test="terminate-agent-run"]').first().click();
    await waitTeamStatus('stopped run → gray', row, 'offline', 60000);
    out.stopped = await teamDotOf(row);
    assertTeamDot(out.stopped, 'offline', 'stopped Team');
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
    assert(await page.locator('[data-test="team-activity-dot"]').count() === 0, 'binary Team dot still rendered');
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
    await shot(page, 'ts003-team-root-idle');
    // The Manager stays idle; only the delegated coordinator works → the delegated Team row AND the run row read busy.
    await collapseTaskTeam(page, 'team', s.team.teamRunId);
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.coordinator.agentRunId, content: 'Second pass. HOLD_TURN' }));
    await waitTeamStatus('delegated Team busy', row, 'running', 60000);
    await waitTeamStatus('run row busy through delegated agents', runRow, 'running', 60000);
    const group = page.locator(`[data-test="workspace-team-definition-row-${slug(s.names.team)}"]`);
    out.busy = { team: await teamDotOf(row), run: await teamDotOf(runRow), group: await teamDotOf(group) };
    assertTeamDot(out.busy.team, 'running', 'delegated Team busy (collapsed)');
    assertTeamDot(out.busy.run, 'running', 'run row', { icon: false });
    assertTeamDot(out.busy.group, 'running', 'group row', { icon: false });
    await shot(page, 'ts003-team-root-busy');
    // AC-007: the user stops the Team run → every Team row of it gray.
    await runRow.locator('xpath=..').locator('button[aria-label="Terminate team"]').click();
    await waitTeamStatus('delegated Team gray', row, 'offline', 60000);
    await waitTeamStatus('run row gray', runRow, 'offline', 60000);
    out.stopped = { team: await teamDotOf(row), run: await teamDotOf(runRow) };
    assertTeamDot(out.stopped.team, 'offline', 'stopped delegated Team');
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
    assert(/Team status: Idle/.test(out.idle.dot.rowLabel ?? ''), 'Org task Team accessible label lacks the status', out.idle.dot);
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
    await shot(page, 'ts004-org-idle');
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.coordinator.agentRunId, content: 'Another look please. HOLD_TURN' }));
    await waitTeamStatus('Org task Team busy', row, 'running', 60000);
    out.busy = await consistency(page, 'org', s, true, 'org busy');
    assertTeamDot(out.busy.dot, 'running', 'Org task Team busy');
    await shot(page, 'ts004-org-busy');
    // AC-007: the Org run stops → its Team rows gray.
    const t = await terminateViaApi(s.root);
    assert(t.success, `Org terminate failed: ${t.message}`);
    await waitTeamStatus('Org task Team gray', row, 'offline', 60000);
    out.stopped = await teamDotOf(row);
    assertTeamDot(out.stopped, 'offline', 'stopped Org task Team');
    for (let i = 0; i < await configured.count(); i += 1) assert((await teamDotOf(configured.nth(i))).status === 'offline', 'Org-internal Team not gray after stop');
    await shot(page, 'ts004-org-stopped');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { s.input.close(); await context.close(); }
};

const CASES = {
  'TS-001': ['Agent run: delegated Team idle → busy while collapsed → busy+error → error after Stop generation → gray when the run stops', agentRootJourney],
  'TS-002': ['TEAMS rows: idle run green, alive unstarted gray with Stop, group = highest run, Stop button → gray, all stopped → gray', teamsSectionJourney],
  'TS-003': ['Team run: member-delegated Team row and the run row count the delegated agents; Stop → gray', teamRootJourney],
  'TS-004': ['Org run: delegated and Org-internal Team rows, Org root row unchanged; stop → gray', orgRootJourney],
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
      evidence.failures.push({ id, message: error.message });
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
