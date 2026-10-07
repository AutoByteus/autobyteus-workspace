#!/usr/bin/env node
// Live Projects pages (project-manager-ux): real Nuxt dev frontend + built backend + fresh headless Chrome.
// Run from the repository root: node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <fresh dir>
//   Optional: --browser-executable <path> --cases PMU-001,PMU-002,...
// Prerequisites: installed workspace dependencies, a current `pnpm -C autobyteus-server-ts prebuild && build`
// (the probe runs autobyteus-server-ts/dist/app.js), and Chrome.
// Agents run on the AGY runtime with the repository's scripted CLI (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs,
// AGY_FAKE_CASE=linked_skills): a message containing `CALL_TOOL:{...}` makes that agent call the actual scoped tool.
// No provider inference, no mocked routes. A raw `/ws/projects` client counts every published message (volume).
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
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/project-manager-ux'));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
const ALL_CASES = ['PMU-001', 'PMU-002', 'PMU-003', 'PMU-004', 'PMU-005', 'PMU-006', 'PMU-007', 'PMU-008', 'PMU-009', 'PMU-010', 'PMU-011', 'PMU-012'];
const selectedCases = (getArg('cases') ?? ALL_CASES.join(',')).split(',').map((c) => c.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000, every = 100) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const displayName = (address) => address.split('/').filter(Boolean).at(-1).replace(/[_-]+/g, ' ').trim();
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [], feed: {} };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

// ---------------------------------------------------------------- owned stack
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null, backendStarts: 0 };
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
const startBackend = async (port) => {
  stack.backendStarts += 1;
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_') && !k.startsWith('ENABLE_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', stack.dataRoot],
    serverDir, env, `backend-${stack.backendStarts}`);
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'project-manager-ux-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendPort = backendPort;
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  await startBackend(backendPort);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('ENABLE_'))), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1',
      BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};
const restartBackend = async () => {
  const before = stack.backend.pid;
  await stopGroup(stack.backend);
  await startBackend(stack.backendPort);
  return { before, after: stack.backend.pid, starts: stack.backendStarts };
};

// ---------------------------------------------------------------- feed volume (a raw /ws/projects client)
const feed = { socket: null, total: 0, byType: {}, messages: [] };
const openFeed = () => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/projects`);
  feed.socket = socket;
  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw));
    feed.total += 1; feed.byType[message.type] = (feed.byType[message.type] ?? 0) + 1;
    feed.messages.push({ at: Date.now(), type: message.type, taskId: message.taskId ?? message.task?.taskId, status: message.status ?? message.task?.root?.status });
  });
  socket.on('close', () => { if (feed.socket === socket) { feed.socket = null; setTimeout(() => { if (!feed.stopped) openFeed(); }, 500); } });
  socket.on('error', () => undefined);
};
const feedMark = () => feed.messages.length;
const feedSince = (mark) => {
  const slice = feed.messages.slice(mark); const byType = {};
  for (const m of slice) byType[m.type] = (byType[m.type] ?? 0) + 1;
  return { total: slice.length, byType };
};

// ---------------------------------------------------------------- public API setup
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const workspace = () => path.join(stack.dataRoot, 'workspace');
const config = () => ({ workspaceRootPath: workspace(), llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });
const MANAGER_TOOLS = ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task'];
const createDefinitions = async (label) => {
  const s = `${label} ${randomUUID().slice(0, 4)}`;
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: `Manager ${s}`, worker: `Release Notes Writer ${s}`, helper: `Fact Checker ${s}`,
    squad: `Docs Review Team ${s}`, team: `Delivery Team ${s}`, org: `Delivery Org ${s}` };
  const ids = {};
  ids.manager = await agent(names.manager, MANAGER_TOOLS);
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
      { memberName: 'helper', ref: ids.helper, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  return { ids, names };
};
const ensureWorkspace = async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some((w) => w.absolutePath === workspace())) {
    await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace() } });
  }
};
const createProject = async (name) => (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name } })).createProject.projectId;
const createTask = async (projectId, description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
  { input: { projectId, description } })).createProjectTask.taskId;
const projectTasks = async (projectId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId status root{kind recipientAddress ingressAgentRunId teamRunId start closed status hostRoot{kind runId}}}}', { id: projectId })).projectTasks;
const tempTasks = async () => (await gql('query{tasksWithoutProject{taskId description status referenceFiles root{kind recipientAddress start closed status}}}')).tasksWithoutProject;
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
const terminate = async (root) => Object.values(await gql(root.kind === 'agent' ? 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}'
  : root.kind === 'team' ? 'mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}'
    : 'mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: root.rootId }))[0];
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
const rootOf = async (projectId, taskId) => (await projectTasks(projectId)).find((t) => t.taskId === taskId)?.root ?? null;

// ---------------------------------------------------------------- browser helpers
let browser;
const openPages = [];
const newPage = async ({ width = 1440, height = 1000 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US' });
  const page = await context.newPage();
  openPages.push({ context, page });
  const errors = [];
  // Every console line, kept for the failure capture below.
  page.consoleLog = [];
  page.on('console', (m) => { page.consoleLog.push(`${m.type()}: ${m.text()}`.slice(0, 400)); if (page.consoleLog.length > 200) page.consoleLog.shift(); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const goto = async (page, route) => { await page.goto(`${stack.frontendUrl}${route}`, { waitUntil: 'networkidle', timeout: 120000 }); };
const row = (page, taskId) => page.locator(`[data-testid="project-task-row-${taskId}"]`);
const rootLine = (page, taskId) => row(page, taskId).locator('[data-testid^="project-task-root-"][data-openable]');
const rootState = async (page, taskId) => {
  const line = rootLine(page, taskId);
  if (!(await line.count())) return null;
  return { state: (await line.getAttribute('data-testid')).replace('project-task-root-', ''), openable: await line.getAttribute('data-openable'),
    tag: await line.evaluate((e) => e.tagName), name: await row(page, taskId).locator('[data-testid="project-task-root-name"]').innerText() };
};
const columnOf = async (page, taskId) => row(page, taskId).evaluate((e) => e.closest('[data-testid^="project-task-column-"],[data-testid^="temp-task-lane-"]')?.getAttribute('data-testid') ?? null);
const inWorkspace = (page) => /^\/(workspace|chat)\b/.test(new URL(page.url()).pathname);
const centerText = async (page) => page.locator('[data-test="workspace-center-pane"]').innerText().catch(() => '');
const noHorizontalOverflow = (page) => page.evaluate(() => {
  const main = document.querySelector('[data-testid="temp-task-board-page"],[data-testid="project-detail"],[data-testid="temp-task-page"]') ?? document.querySelector('main') ?? document.body;
  return { scrollWidth: main.scrollWidth, clientWidth: main.clientWidth, ok: main.scrollWidth <= main.clientWidth + 1 };
});

// ---------------------------------------------------------------- shared scenario state
const shared = {};
const setupAgentRoot = async () => {
  if (shared.agent) return shared.agent;
  const { ids, names } = await createDefinitions('PmuAgent');
  const projectId = await createProject(`Prototype Launch ${randomUUID().slice(0, 6)}`);
  const taskA = await createTask(projectId, 'Write the release notes.\nKeep it short.');
  const taskB = await createTask(projectId, 'Review the docs site.');
  const root = await createRoot('agent', ids);
  const input = await managerInput(root);
  shared.agent = { ids, names, projectId, taskA, taskB, root, input };
  return shared.agent;
};

// ---------------------------------------------------------------- journeys
/** AC-001/002/005: the Projects list and a Project board follow writes live, without Refresh. */
const listAndBoardLive = async () => {
  const mark = feedMark();
  const s = await setupAgentRoot();
  const { page, errors, context } = await newPage();
  try {
    await goto(page, '/projects');
    await page.getByTestId(`project-card-${s.projectId}`).waitFor({ timeout: 30000 });
    // A Project created elsewhere (an agent or another window) appears live.
    const sentAt = Date.now();
    const other = await createProject(`Live Arrival ${randomUUID().slice(0, 6)}`);
    await page.getByTestId(`project-card-${other}`).waitFor({ timeout: 10000 });
    const projectArrivalMs = Date.now() - sentAt;
    await createTask(other, 'Counted live');
    await until('count follows live', async () => /1 open task/.test(await page.getByTestId(`project-card-${other}`).innerText()), 10000);
    await shot(page, 'pmu-001-projects-list-live');
    // The board: an agent-created Task arrives highlighted.
    await page.getByTestId(`project-card-${s.projectId}`).click();
    await row(page, s.taskA).waitFor({ timeout: 30000 });
    assert(await rootLine(page, s.taskA).count() === 0, 'an unassigned Task shows no root line');
    s.input.send(callTool('create_or_update_task', { project_id: s.projectId, description: 'Agent-created follow-up' }));
    const arrived = await until('agent-created Task arrives', async () => {
      const rows = await page.locator('[data-live="arrived"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-testid')));
      return rows.length ? rows : null;
    }, 30000, 50);
    await shot(page, 'pmu-001-board-arrived-highlight');
    await until('arrival highlight clears after ~2.4 s', async () => (await page.locator('[data-live="arrived"]').count()) === 0, 6000);
    assertNoBrowserErrors(errors);
    return { projectArrivalMs, arrivedRows: arrived, feed: feedSince(mark), errors };
  } finally { /* the runner captures a failing page, then closes it */ }
};

/** BEH-003/004, AR-002: an Agent root on the board — live status, live moves, opening, DONE → Offline muted. */
const agentRootOnBoard = async () => {
  const mark = feedMark();
  const s = await setupAgentRoot();
  const { page, errors, context } = await newPage();
  try {
    await goto(page, `/projects/${s.projectId}`);
    await row(page, s.taskA).waitFor({ timeout: 30000 });
    const workerAddress = `/${segment(s.names.worker)}`;
    s.input.send(callTool('delegate_task', { recipient_address: workerAddress, task_id: s.taskA }));
    const live = await until('root line appears live', async () => { const r = await rootState(page, s.taskA); return r && r.state !== 'initializing' ? r : null; }, 60000);
    assert(live.name === displayName(workerAddress), 'root shows the delegated address display name', live);
    assert(['idle', 'running'].includes(live.state) && live.openable === 'true' && live.tag === 'BUTTON', 'live started root is an openable button', live);
    await shot(page, 'pmu-002-board-agent-root');
    // The manager moves the Task: the row moves live, highlighted.
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'IN_PROGRESS' }));
    await until('row moved to In progress, highlighted', async () => (await columnOf(page, s.taskA)) === 'project-task-column-IN_PROGRESS'
      && (await row(page, s.taskA).getAttribute('data-live')) === 'moved', 30000, 50);
    await shot(page, 'pmu-002-board-moved-highlight');
    // Opening the root: the worker's conversation in its hosting Agent run, selected in the left panel.
    await rootLine(page, s.taskA).click();
    await until('worker conversation opened', async () => inWorkspace(page) && /Task delegator address/.test(await centerText(page)), 30000);
    const assigned = await rootOf(s.projectId, s.taskA);
    const workerRow = page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${assigned.ingressAgentRunId}"]`);
    await until('worker row selected', async () => (await workerRow.getAttribute('aria-selected')) === 'true', 15000);
    await shot(page, 'pmu-002-opened-worker');
    // DONE: Offline, muted, no chevron.
    await page.goBack({ waitUntil: 'networkidle' });
    await row(page, s.taskA).waitFor({ timeout: 30000 });
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'DONE' }));
    const done = await until('DONE root is Offline, not openable', async () => {
      const r = await rootState(page, s.taskA);
      return (await columnOf(page, s.taskA)) === 'project-task-column-DONE' && r?.state === 'offline' && r.openable === 'false' ? r : null;
    }, 30000);
    assert(done.tag === 'DIV', 'closed root is not a button', done);
    const nameClass = await row(page, s.taskA).locator('[data-testid="project-task-root-name"]').getAttribute('class');
    assert(/text-slate-400/.test(nameClass), 'closed root name is muted', { nameClass });
    await shot(page, 'pmu-002-board-done-offline');
    assertNoBrowserErrors(errors);
    return { live, done, feed: feedSince(mark), errors };
  } finally { /* the runner captures a failing page, then closes it */ }
};

/** A task Team root in an Agent run opens its coordinator with the Team expanded; Team- and Org-hosted roots open in their views. */
const teamAndOtherHosts = async () => {
  const mark = feedMark();
  const s = await setupAgentRoot();
  const { page, errors, context } = await newPage();
  const details = {};
  try {
    // A task Team (kind team) in the Agent run.
    s.input.send(callTool('delegate_task', { recipient_address: `/${segment(s.names.squad)}`, task_id: s.taskB }));
    await until('team root started', async () => (await rootOf(s.projectId, s.taskB))?.start === 'started', 60000);
    await goto(page, `/projects/${s.projectId}`);
    await row(page, s.taskB).waitFor({ timeout: 30000 });
    details.teamRoot = await until('team root line', async () => { const r = await rootState(page, s.taskB); return r?.openable === 'true' ? r : null; }, 30000);
    assert(details.teamRoot.name === displayName(`/${segment(s.names.squad)}`), 'team root shows its address name', details.teamRoot);
    await rootLine(page, s.taskB).click();
    const teamRoot = await rootOf(s.projectId, s.taskB);
    await until('coordinator conversation opened', async () => /Task delegator address/.test(await centerText(page)), 30000);
    const teamRow = page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]');
    await until('task Team expanded', async () => (await teamRow.getAttribute('aria-expanded')) === 'true', 15000);
    const coordinatorRow = page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${teamRoot.ingressAgentRunId}"]`);
    await until('coordinator selected', async () => (await coordinatorRow.getAttribute('aria-selected')) === 'true', 15000);
    await shot(page, 'pmu-003-opened-task-team-coordinator');

    // Team-hosted and Org-hosted roots.
    for (const kind of ['team', 'org']) {
      const root = await createRoot(kind, s.ids);
      const input = await managerInput(root);
      const taskId = await createTask(s.projectId, `Hosted by an Agent ${kind === 'team' ? 'Team' : 'Org'} run`);
      input.send(callTool('delegate_task', { recipient_address: '/worker', task_id: taskId }));
      await until(`${kind}-hosted root started`, async () => (await rootOf(s.projectId, taskId))?.start === 'started', 60000);
      const hosted = await rootOf(s.projectId, taskId);
      await goto(page, `/projects/${s.projectId}`);
      await row(page, taskId).waitFor({ timeout: 30000 });
      const line = await until(`${kind}-hosted root openable`, async () => { const r = await rootState(page, taskId); return r?.openable === 'true' ? r : null; }, 30000);
      await rootLine(page, taskId).click();
      await until(`${kind}-hosted worker conversation`, async () => inWorkspace(page) && /Task delegator address/.test(await centerText(page)), 30000);
      await shot(page, `pmu-003-opened-${kind}-hosted-root`);
      details[`${kind}Hosted`] = { line, hostRoot: hosted.hostRoot, url: page.url() };
      shared[`${kind}Hosted`] = { root, taskId, projectId: s.projectId };
    }
    assertNoBrowserErrors(errors);
    return { ...details, feed: feedSince(mark), errors };
  } finally { /* the runner captures a failing page, then closes it */ }
};

/** AR-002: a root whose hosting run was deleted from history shows its status but cannot be opened. */
const deletedHost = async () => {
  const s = await setupAgentRoot();
  const { page, errors, context } = await newPage();
  try {
    assert((await rootOf(s.projectId, s.taskB))?.start === 'started', 'needs PMU-003 (task Team root)');
    assert((await terminate(s.root)).success, 'terminate the Agent run');
    await goto(page, `/projects/${s.projectId}`);
    const listed = await until('terminated host still listed: openable, Offline', async () => { const r = await rootState(page, s.taskB); return r?.state === 'offline' && r.openable === 'true' ? r : null; }, 30000);
    const deleted = (await gql('mutation($id:String!){deleteStoredRun(runId:$id){success message}}', { id: s.root.rootId })).deleteStoredRun;
    assert(deleted.success, 'delete the Agent run', deleted);
    await goto(page, `/projects/${s.projectId}`);
    const gone = await until('deleted host: not openable', async () => { const r = await rootState(page, s.taskB); return r?.openable === 'false' ? r : null; }, 30000);
    assert(gone.tag === 'DIV', 'not focusable', gone);
    await shot(page, 'pmu-004-deleted-host-not-openable');
    assertNoBrowserErrors(errors);
    return { listed, gone, errors };
  } finally { /* the runner captures a failing page, then closes it */ }
};

/** AC-019..021: Temp tasks — header button with the open count, Open/Done board, read-only page, live moves. */
const tempTasksJourney = async () => {
  const mark = feedMark();
  const { ids, names } = await createDefinitions('PmuTemp');
  const root = await createRoot('agent', ids);
  const input = await managerInput(root);
  const reference = path.join(workspace(), 'brief.md');
  await fsp.writeFile(reference, '# Brief\n');
  const { page, errors, context } = await newPage();
  try {
    await goto(page, '/projects');
    await page.getByTestId('temp-tasks-link').waitFor({ timeout: 30000 });
    const before = (await tempTasks()).filter((t) => t.status !== 'DONE').length;
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: 'Check the changelog links.\nReport broken ones.', reference_files: [reference] }));
    await until('Temp tasks count follows live', async () => (await page.getByTestId('temp-tasks-link-count').innerText().catch(() => '')) === `${before + 1} open`, 60000);
    await shot(page, 'pmu-005-temp-tasks-button');
    const temp = await until('temp task listed', async () => (await tempTasks()).find((t) => t.description.startsWith('Check the changelog links')), 30000);
    await page.getByTestId('temp-tasks-link').click();
    await page.getByTestId('temp-task-lane-open').locator(`[data-testid="project-task-row-${temp.taskId}"]`).waitFor({ timeout: 30000 });
    const line = await until('temp root line', async () => { const r = await rootState(page, temp.taskId); return r && r.state !== 'initializing' ? r : null; }, 30000);
    await shot(page, 'pmu-005-temp-board-open');
    // The read-only page.
    await row(page, temp.taskId).getByTestId('project-task-row-link').click();
    await page.getByTestId('temp-task-page').waitFor();
    const pageText = await page.getByTestId('temp-task-page').innerText();
    assert(pageText.includes('brief.md') && pageText.includes('Report broken ones.'), 'description and reference files shown', { pageText });
    assert(await page.locator('[data-testid="temp-task-page"] textarea, [data-testid="temp-task-page"] input').count() === 0, 'read only');
    assert(await page.getByTestId('task-page-assigned').locator('[data-openable="true"]').count() === 1, 'root openable on the Temp task page');
    await shot(page, 'pmu-005-temp-task-page');
    await page.getByTestId('temp-task-back').click();
    await page.getByTestId('temp-task-board').waitFor();
    // The agent closes it: it moves to Done live.
    input.send(callTool('create_or_update_task', { task_id: temp.taskId, status: 'DONE' }));
    await until('temp task moved to Done, highlighted', async () => (await columnOf(page, temp.taskId)) === 'temp-task-lane-done', 30000, 50);
    const moved = await row(page, temp.taskId).getAttribute('data-live');
    await shot(page, 'pmu-005-temp-board-done');
    shared.temp = { root, taskId: temp.taskId };
    assertNoBrowserErrors(errors);
    return { line, moved, feed: feedSince(mark), errors };
  } finally { /* the runner captures a failing page, then closes it */ }
};

/** F-006: a task row in the left panel opens its conversation from another page while its run is already selected. */
const leftPanelTaskRowFromOtherPage = async () => {
  const { ids, names } = await createDefinitions('PmuF006');
  const root = await createRoot('agent', ids);
  const input = await managerInput(root);
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: 'Summarize the plan.' }));
  const temp = await until('worker delegated', async () => (await tempTasks()).find((t) => t.description === 'Summarize the plan.' && t.root?.start === 'started'), 60000);
  const { page, errors, context } = await newPage();
  try {
    await goto(page, '/workspace');
    await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
    await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]');
    await runRow.click();
    const workerRow = page.locator('[data-test="workspace-team-transient-execution-row"]').first();
    await workerRow.waitFor({ timeout: 30000 });
    // Leave for the Projects page in-app (the run stays the selected run), then click the task row.
    await page.locator('[data-test="app-left-panel-primary-nav"]').getByText('Projects', { exact: true }).click();
    await until('on Projects', async () => new URL(page.url()).pathname === '/projects', 15000);
    const visible = await workerRow.isVisible().catch(() => false);
    if (!visible) {
      await shot(page, 'pmu-006-left-panel-on-projects');
      return { skipped: 'The task row is not visible in the left panel on the Projects page; the regression is covered by AgentRunTaskRowsSelect.spec.ts', errors };
    }
    await shot(page, 'pmu-006-on-projects-run-still-selected');
    await workerRow.click();
    await until('worker conversation opened from another page', async () => inWorkspace(page) && /Task delegator address/.test(await centerText(page)), 30000);
    await shot(page, 'pmu-006-f006-opened');
    assertNoBrowserErrors(errors);
    return { taskId: temp.taskId, url: page.url(), errors };
  } finally { /* the runner captures a failing page, then closes it */ }
};

/** DS-006: after a backend restart the pages reconnect, re-read (roots of stopped runs are Offline), and follow new writes. */
const reconnectAndNarrow = async () => {
  const s = await setupAgentRoot();
  const hosted = shared.teamHosted;
  assert(hosted, 'needs PMU-003 (team-hosted root)');
  const { page, errors, context } = await newPage();
  try {
    await goto(page, `/projects/${s.projectId}`);
    await row(page, hosted.taskId).waitFor({ timeout: 30000 });
    const before = await rootState(page, hosted.taskId);
    const beforeRestart = errors.length;
    const restart = await restartBackend();
    await until('stopped run root reads Offline after the reconnect', async () => (await rootState(page, hosted.taskId))?.state === 'offline', 60000);
    // Errors while the backend was down and the page reconnected are expected; none may follow.
    const restartWindowErrors = errors.splice(beforeRestart);
    const taskId = await createTask(s.projectId, 'Written after the restart');
    await until('new Task arrives after the reconnect', async () => (await row(page, taskId).count()) === 1, 30000);
    await shot(page, 'pmu-007-after-restart');
    // Narrow layout: board, Task page, Temp tasks.
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(300);
    const narrow = { board: await noHorizontalOverflow(page) };
    await shot(page, 'pmu-007-narrow-board');
    await row(page, hosted.taskId).getByTestId('project-task-row-link').click();
    await page.getByTestId('task-page-assigned').waitFor({ timeout: 30000 });
    narrow.taskPage = await noHorizontalOverflow(page);
    await shot(page, 'pmu-007-narrow-task-page');
    await goto(page, '/projects/temp-tasks');
    await page.getByTestId('temp-task-board').waitFor({ timeout: 30000 });
    narrow.tempBoard = await noHorizontalOverflow(page);
    await shot(page, 'pmu-007-narrow-temp-board');
    for (const [where, value] of Object.entries(narrow)) assert(value.ok, `horizontal overflow at 390 px: ${where}`, value);
    assertNoBrowserErrors(errors);
    return { before, restart, narrow, restartWindowErrors: restartWindowErrors.length };
  } finally { /* the runner captures a failing page, then closes it */ }
};

// ---------------------------------------------------------------- dev-server warm-up
/**
 * A cold Nuxt dev server optimizes dependencies on first use and reloads open pages ("optimized dependencies
 * changed. reloading"); a page caught by that reload can lose its first data reads (e.g. the left panel's run
 * history), which is a harness effect, not product behavior. Visit the probe's routes once and wait until the
 * dev server has been quiet, before any case runs. The packaged app has no such reload.
 */
const warmUpFrontend = async () => {
  const reloads = () => (stack.frontend.output.match(/optimized dependencies changed/g) ?? []).length;
  const before = reloads();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    for (const route of ['/workspace', '/projects', '/projects/temp-tasks', '/workspace']) {
      await page.goto(`${stack.frontendUrl}${route}`, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => undefined);
    }
    let last = reloads(), quietSince = Date.now();
    await until('dev server quiet after dependency optimization', async () => {
      const now = reloads();
      if (now !== last) { last = now; quietSince = Date.now(); await page.reload({ waitUntil: 'networkidle' }).catch(() => undefined); }
      return Date.now() - quietSince >= 5000;
    }, 180000, 500);
  } finally { await context.close().catch(() => undefined); }
  return { reloadsDuringWarmup: reloads() - before };
};

// ---------------------------------------------------------------- API/E2E additions (PMU-008..PMU-012)
const slug = (name) => segment(name).replace(/_/g, '-');
const SELECTED_BG = 'rgb(238, 242, 255)';
const isSelected = async (locator) => locator.evaluate((e, bg) => e.getAttribute('aria-selected') === 'true'
  || e.getAttribute('aria-current') === 'true' || getComputedStyle(e).backgroundColor === bg, SELECTED_BG).catch(() => false);
const navTo = async (page, label) => {
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(label, { exact: true }).click();
};
const expandWorkspace = async (page) => {
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  const agentRows = page.locator('[data-test="workspace-agent-row"]');
  if (!(await agentRows.count())) await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
};
/** The Manager's run row in the left panel, expanded and selected (what a user does in Chat/Workspace). */
const selectAgentRun = async (page, names) => {
  await expandWorkspace(page);
  const agentRow = page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager });
  const runRow = page.locator('[data-test="workspace-agent-run-row"]', { has: page.locator(':scope') }).filter({ hasText: /./ });
  if (!(await agentRow.locator('xpath=following-sibling::*').count()) || !(await page.locator('[data-test="workspace-agent-run-row"]').count())) await agentRow.click();
  const rows = page.locator('[data-test="workspace-agent-run-row"]');
  await until('run row listed', async () => (await rows.count()) >= 1, 30000);
  return { agentRow, runRow: rows.first() };
};
/** Rejects any browser error the case collected. */
const assertNoBrowserErrors = (errors) => { assert(errors.length === 0, 'browser errors', errors); };

/** AC-012 + AC-013: the left panel keeps runs, expansion and selection across pages; every row kind opens from Projects. */
const leftPanelAcrossPages = async () => {
  const { ids, names } = await createDefinitions('PmuLeft');
  const agentRoot = await createRoot('agent', ids);
  const input = await managerInput(agentRoot);
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: 'Collect release dates.' }));
  const temp = await until('worker started', async () => (await tempTasks()).find((t) => t.description === 'Collect release dates.' && t.root?.start === 'started'), 60000);
  const teamRoot = await createRoot('team', ids);
  const orgRoot = await createRoot('org', ids);
  const projectId = await createProject(`Left Panel ${randomUUID().slice(0, 6)}`);
  const taskId = await createTask(projectId, 'A Task to visit.');
  const { page, errors } = await newPage();
  const steps = [];
  try {
    await goto(page, '/workspace');
    const { agentRow } = await selectAgentRun(page, names);
    const runRow = page.locator('[data-test="workspace-agent-run-row"]').first();
    await runRow.click();
    const workerRow = page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${temp.root.ingressAgentRunId ?? ''}"]`);
    const anyWorkerRow = page.locator('[data-test="workspace-team-transient-execution-row"]').first();
    await anyWorkerRow.waitFor({ timeout: 30000 });
    await until('run selected', () => isSelected(runRow), 15000);
    const state = async (label) => {
      const s = { label, path: new URL(page.url()).pathname, runRows: await page.locator('[data-test="workspace-agent-run-row"]').count(),
        runSelected: await isSelected(runRow), workerRowVisible: await anyWorkerRow.isVisible().catch(() => false),
        agentRowVisible: await agentRow.isVisible().catch(() => false) };
      steps.push(s);
      assert(s.runRows >= 1 && s.runSelected && s.workerRowVisible && s.agentRowVisible, `left panel state lost on ${label}`, s);
    };
    await state('chat');
    // AC-012: Chat → Projects list → board → Task page → Chat, all in-app.
    await navTo(page, 'Projects');
    await until('projects list', async () => new URL(page.url()).pathname === '/projects', 15000);
    await page.getByTestId(`project-card-${projectId}`).waitFor({ timeout: 30000 });
    await state('projects list');
    await page.getByTestId(`project-card-${projectId}`).click();
    await row(page, taskId).waitFor({ timeout: 30000 });
    await state('board');
    await row(page, taskId).getByTestId('project-task-row-link').click();
    await page.getByTestId('task-page-assigned').waitFor({ timeout: 30000 });
    await state('task page');
    await shot(page, 'pmu-008-left-panel-kept-on-task-page');
    // AC-013: the already-selected run row itself opens its conversation from a Projects page.
    await runRow.click();
    await until('run conversation opened from a Projects page', async () => inWorkspace(page), 30000);
    const runUrl = page.url();
    assert(runUrl.includes(agentRoot.rootId), 'opened the selected run', { runUrl });
    await state('back in chat via the run row');
    // AC-013: a Team member row and an Org agent row open from a Projects page (each already selected first).
    const opened = { run: runUrl };
    for (const [kind, root] of [['team', teamRoot], ['org', orgRoot]]) {
      if (kind === 'team') {
        await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
        await page.locator(`[data-test="workspace-team-row-${root.rootId}"]`).click();
      } else {
        await page.locator(`[data-test="agent-org-definition-${slug(names.org)}"]`).click();
        await page.locator(`[data-test="agent-org-run-open-${root.rootId}"]`).click();
      }
      const member = kind === 'team' ? page.locator(`[data-test="workspace-team-member-${root.rootId}-/worker"]`)
        : page.locator(`[data-test="agent-org-agent-row-${root.managerRunId}"]`);
      await member.waitFor({ timeout: 30000 });
      await member.click();
      await until(`${kind} row selected`, () => isSelected(member), 15000);
      await navTo(page, 'Projects');
      await until('projects list', async () => new URL(page.url()).pathname === '/projects', 15000);
      await member.click();
      await until(`${kind} row opened from a Projects page`, async () => inWorkspace(page)
        && await isSelected(member) && (await centerText(page)).trim().length > 0, 30000);
      opened[kind] = page.url();
      await shot(page, `pmu-008-${kind}-row-opened-from-projects`);
    }
    assertNoBrowserErrors(errors);
    return { steps, opened };
  } finally { input.close(); }
};

/** AC-020/021/023 on the Temp tasks board: DONE, reopen (Offline), reactivation (openable), then deleting the chat in the UI. */
const tempReactivationAndChatDeletion = async () => {
  const { ids, names } = await createDefinitions('PmuTempRe');
  const root = await createRoot('agent', ids);
  const input = await managerInput(root);
  const { page, errors } = await newPage();
  const details = {};
  try {
    await goto(page, '/projects/temp-tasks');
    await page.getByTestId('temp-task-board').waitFor({ timeout: 30000 });
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: 'Draft the FAQ.' }));
    const temp = await until('temp task started', async () => ((await gql('query{tasksWithoutProject{taskId description root{ingressAgentRunId start}}}'))
      .tasksWithoutProject).find((t) => t.description === 'Draft the FAQ.' && t.root?.start === 'started'), 60000);
    await until('row in Open, root openable', async () => (await columnOf(page, temp.taskId)) === 'temp-task-lane-open'
      && (await rootState(page, temp.taskId))?.openable === 'true', 60000);
    // DONE → Done lane, Offline, not openable.
    input.send(callTool('create_or_update_task', { task_id: temp.taskId, status: 'DONE' }));
    details.done = await until('Done, Offline', async () => { const r = await rootState(page, temp.taskId);
      return (await columnOf(page, temp.taskId)) === 'temp-task-lane-done' && r?.state === 'offline' && r.openable === 'false' ? r : null; }, 30000);
    // AC-023: the agent reopens → Open lane with the moved highlight; the root stays Offline and not openable.
    input.send(callTool('create_or_update_task', { task_id: temp.taskId, status: 'TODO' }));
    await until('reopened row moved back to Open', async () => (await columnOf(page, temp.taskId)) === 'temp-task-lane-open'
      && (await row(page, temp.taskId).getAttribute('data-live')) === 'moved', 30000, 50);
    await sleep(1500);
    details.reopened = await rootState(page, temp.taskId);
    assert(details.reopened?.state === 'offline' && details.reopened.openable === 'false' && details.reopened.tag === 'DIV',
      'a reopened Task keeps an Offline, not openable root until the worker is messaged', details.reopened);
    await shot(page, 'pmu-009-reopened-offline');
    // The assigner messages the worker → reactivated: live status, openable, opens the worker with its row back.
    input.send(callTool('send_message_to', { target_agent_run_id: temp.root.ingressAgentRunId, content: 'One more FAQ entry.' }));
    details.reactivated = await until('root openable again', async () => { const r = await rootState(page, temp.taskId);
      return r?.openable === 'true' && ['idle', 'running'].includes(r.state) && r.tag === 'BUTTON' ? r : null; }, 60000);
    await shot(page, 'pmu-009-reactivated-openable');
    await rootLine(page, temp.taskId).click();
    const workerRow = page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${temp.root.ingressAgentRunId}"]`);
    await until('worker opened and selected in the left panel', async () => inWorkspace(page) && (await workerRow.getAttribute('aria-selected')) === 'true', 30000);
    await shot(page, 'pmu-009-reactivated-opened');
    // A second Temp task of the same chat; then the user deletes the chat from the left panel (AC-021).
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.helper)}`, description: 'Check the FAQ links.' }));
    const second = await until('second temp task', async () => (await tempTasks()).find((t) => t.description === 'Check the FAQ links.' && t.root?.start === 'started'), 60000);
    await goto(page, '/projects/temp-tasks');
    for (const id of [temp.taskId, second.taskId]) await row(page, id).waitFor({ timeout: 30000 });
    await goto(page, '/projects');
    await page.getByTestId('temp-tasks-link').waitFor({ timeout: 30000 });
    const countBefore = await page.getByTestId('temp-tasks-link-count').innerText().catch(() => '');
    await page.getByTestId('temp-tasks-link').click();
    await page.getByTestId('temp-task-board').waitFor({ timeout: 30000 });
    await expandWorkspace(page);
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]').first();
    await runRow.waitFor({ timeout: 30000 });
    await runRow.hover();
    await runRow.locator('[data-test="terminate-agent-run"]').click();
    await until('run inactive', async () => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: root.rootId })) !== undefined
      && (await runRow.locator('[data-test="terminate-agent-run"]').count()) === 0, 30000);
    await runRow.hover();
    await runRow.locator('button[title="Delete run permanently"]').click();
    await page.locator('[role="dialog"] button').last().click();
    await until('both Temp tasks left the board live', async () => (await row(page, temp.taskId).count()) === 0 && (await row(page, second.taskId).count()) === 0, 30000);
    assert(new URL(page.url()).pathname === '/projects/temp-tasks', 'stayed on the Temp tasks board (live, no navigation)');
    await shot(page, 'pmu-009-chat-deleted-rows-left');
    await goto(page, '/projects');
    const countAfter = await page.getByTestId('temp-tasks-link-count').innerText().catch(() => '');
    details.counts = { countBefore, countAfter };
    assert(countBefore !== countAfter, 'open count followed the deletion', details.counts);
    assert(!(await tempTasks()).some((t) => [temp.taskId, second.taskId].includes(t.taskId)), 'server no longer lists them');
    assertNoBrowserErrors(errors);
    return details;
  } finally { input.close(); }
};

/** AC-007 rendered from a real start failure: a Team member configured with a model its runtime does not offer. */
const couldntStartRendered = async () => {
  const { ids, names } = await createDefinitions('PmuFail');
  const r = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
    { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config() }], memberConfigs: ['manager', 'worker', 'helper']
      .map((m) => ({ memberAddress: `/${m}`, agentDefinitionId: ids[m], ...config(), ...(m === 'worker' ? { llmModelIdentifier: 'pmu-no-such-model' } : {}) })) } })).createAgentTeamRun;
  assert(r.success, r.message);
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
  const root = { kind: 'team', rootId: r.teamRunId, managerRunId: tree.root_team.members.find((m) => m.address === '/manager').agent_run_id };
  const input = await managerInput(root);
  const projectId = await createProject(`Start Failure ${randomUUID().slice(0, 6)}`);
  const taskId = await createTask(projectId, 'Translate the notes.');
  const { page, errors } = await newPage();
  try {
    await goto(page, `/projects/${projectId}`);
    await row(page, taskId).waitFor({ timeout: 30000 });
    input.send(callTool('delegate_task', { recipient_address: '/worker', task_id: taskId }));
    const failed = await until('Couldn\'t start arrives live', async () => { const s = await rootState(page, taskId); return s?.state === 'failed' ? s : null; }, 60000);
    assert(failed.openable === 'false' && failed.tag === 'DIV', 'not openable', failed);
    const statusText = await row(page, taskId).getByTestId('project-task-root-status').innerText();
    const tooltip = await rootLine(page, taskId).getAttribute('title');
    const color = await row(page, taskId).getByTestId('project-task-root-status').evaluate((e) => getComputedStyle(e).color);
    assert(/Couldn.t start/.test(statusText) && /AGY_MODEL_UNAVAILABLE/.test(tooltip ?? ''), 'red Couldn\'t start with the reason as tooltip', { statusText, tooltip, color });
    assert((await columnOf(page, taskId)) === 'project-task-column-TODO', 'the Task stays in its column');
    await shot(page, 'pmu-010-board-couldnt-start');
    await row(page, taskId).getByTestId('project-task-row-link').click();
    const reason = await page.getByTestId('project-task-root-error').innerText({ timeout: 30000 });
    assert(/AGY_MODEL_UNAVAILABLE/.test(reason), 'reason under the row on the Task page', { reason });
    assert(await page.getByTestId('task-page-root-help').count() === 0, 'no help line for a failed root');
    await shot(page, 'pmu-010-task-page-couldnt-start');
    // Re-delegation replaces it (live on the open Task page).
    input.send(callTool('delegate_task', { recipient_address: '/helper', task_id: taskId }));
    const replaced = await until('re-delegated root replaces it', async () => {
      const line = page.getByTestId('task-page-assigned').locator('[data-testid^="project-task-root-"][data-openable]');
      const state = (await line.getAttribute('data-testid').catch(() => ''))?.replace('project-task-root-', '');
      return ['idle', 'running'].includes(state) && (await line.getAttribute('data-openable')) === 'true' ? state : null;
    }, 60000);
    assert(await page.getByTestId('project-task-root-error').count() === 0, 'no stale reason after re-delegation');
    await shot(page, 'pmu-010-task-page-redelegated');
    assertNoBrowserErrors(errors);
    return { failed, statusText, tooltip, color, reason, replaced };
  } finally { input.close(); }
};

/** Two windows on the same node follow the same write live (feed fan-out). */
const twoWindows = async () => {
  const projectId = await createProject(`Two Windows ${randomUUID().slice(0, 6)}`);
  const first = await newPage(); const second = await newPage();
  await goto(first.page, `/projects/${projectId}`); await goto(second.page, `/projects/${projectId}`);
  await first.page.getByTestId('project-detail').waitFor({ timeout: 30000 }).catch(() => undefined);
  await sleep(1000);
  const sentAt = Date.now();
  const taskId = await createTask(projectId, 'Seen in both windows.');
  const times = {};
  for (const [label, { page }] of [['first', first], ['second', second]]) {
    await row(page, taskId).waitFor({ timeout: 10000 });
    times[label] = Date.now() - sentAt;
  }
  for (const [label, { page }] of [['first', first], ['second', second]]) await shot(page, `pmu-011-${label}-window`);
  assert(Object.values(times).every((ms) => ms <= 2000), 'both windows within ~2 s (QR-001)', times);
  assertNoBrowserErrors([...first.errors, ...second.errors]);
  return { arrivalMs: times };
};

/** An Org-hosted root opened from a freshly loaded Task page, before the Org run was opened in this window. */
const orgRootUnhydrated = async () => {
  const { ids } = await createDefinitions('PmuOrgCold');
  const root = await createRoot('org', ids);
  const input = await managerInput(root);
  const projectId = await createProject(`Org Cold ${randomUUID().slice(0, 6)}`);
  const taskId = await createTask(projectId, 'Org-hosted work.');
  input.send(callTool('delegate_task', { recipient_address: '/worker', task_id: taskId }));
  await until('org-hosted root started', async () => (await rootOf(projectId, taskId))?.start === 'started', 60000);
  const hosted = await rootOf(projectId, taskId);
  const { page, errors } = await newPage();
  try {
    await goto(page, `/projects/${projectId}/tasks/${taskId}`);
    const line = page.getByTestId('task-page-assigned').locator('[data-testid^="project-task-root-"][data-openable="true"]');
    await line.waitFor({ timeout: 30000 });
    await line.click();
    await until('org worker conversation opened', async () => inWorkspace(page) && /Task delegator address/.test(await centerText(page)), 30000);
    const workerRow = page.locator(`[data-test="agent-org-task-agent-row-${hosted.ingressAgentRunId}"]`);
    const selected = await until('org worker row selected', () => isSelected(workerRow), 15000).catch(() => false);
    await shot(page, 'pmu-012-org-root-opened-cold');
    assertNoBrowserErrors(errors);
    return { url: page.url(), workerRowSelected: selected, hostRoot: hosted.hostRoot };
  } finally { input.close(); }
};

const CASES = {
  'PMU-001': ['Projects list and board follow writes live (arrival highlight, counts)', listAndBoardLive],
  'PMU-002': ['Agent root: live status, live move highlight, opening the worker, DONE → Offline muted', agentRootOnBoard],
  'PMU-003': ['Task Team root opens the coordinator expanded; Team- and Org-hosted roots open in their views', teamAndOtherHosts],
  'PMU-004': ['AR-002: a deleted hosting run makes the root not openable (terminated but listed stays openable)', deletedHost],
  'PMU-005': ['Temp tasks: header count, Open/Done board, read-only page, live move to Done', tempTasksJourney],
  'PMU-006': ['F-006: a left-panel task row opens its conversation from another page', leftPanelTaskRowFromOtherPage],
  'PMU-007': ['Backend restart: reconnect + re-read (Offline), new writes; narrow layout', reconnectAndNarrow],
  'PMU-008': ['AC-012/013: left panel kept across Chat, Projects, board and Task page; run, Team member and Org rows open from Projects', leftPanelAcrossPages],
  'PMU-009': ['AC-020/021/023: Temp task DONE, reopen (Offline), reactivation (openable), then the chat deleted from the left panel', tempReactivationAndChatDeletion],
  'PMU-010': ["AC-007: Couldn't start from a real start failure (board tooltip, Task page reason), then re-delegation", couldntStartRendered],
  'PMU-011': ['Two windows on the same node follow a write live', twoWindows],
  'PMU-012': ['An Org-hosted root opened from a fresh Task page before the Org run is hydrated', orgRootUnhydrated],
};

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found; pass --browser-executable');
  await startStack();
  await ensureWorkspace();
  await gql('mutation{setProjectsEnabled(enabled:true){enabled}}');
  openFeed();
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  evidence.warmup = await warmUpFrontend();
  for (const id of selectedCases) {
    const [description, fn] = CASES[id] ?? [];
    if (!fn) throw new Error(`Unknown case ${id}`);
    const started = Date.now();
    try {
      const details = await fn();
      evidence.cases[id] = { result: 'Pass', description, durationMs: Date.now() - started, details };
    } catch (error) {
      result = 'Fail';
      const pages = [];
      for (const [index, { page }] of openPages.entries()) {
        await page.screenshot({ path: path.join(outputDir, `${id}-failure-${index}.png`) }).catch(() => undefined);
        pages.push({ url: page.url(), center: (await centerText(page)).slice(0, 600), console: (page.consoleLog ?? []).slice(-40) });
      }
      evidence.cases[id] = { result: 'Fail', description, durationMs: Date.now() - started, message: error.message, details: error.details, pages };
      evidence.failures.push({ id, message: error.message });
    }
    for (const { context } of openPages.splice(0)) await context.close().catch(() => undefined);
    await save();
  }
} catch (error) {
  result = 'Fail';
  evidence.failures.push({ id: 'HARNESS', message: error.message, details: error.details });
} finally {
  feed.stopped = true; feed.socket?.terminate();
  evidence.feed = { total: feed.total, byType: feed.byType };
  await fsp.writeFile(path.join(outputDir, 'feed-messages.json'), `${JSON.stringify(feed.messages, null, 2)}\n`).catch(() => undefined);
  for (const socket of sockets) socket.terminate();
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = `failed: ${e.message}`; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = `failed: ${e.message}`; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = `failed: ${e.message}`; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`Project manager UX probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);
