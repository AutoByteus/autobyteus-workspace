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
const ALL_CASES = ['PMU-001', 'PMU-002', 'PMU-003', 'PMU-004', 'PMU-005', 'PMU-006', 'PMU-007', 'PMU-008', 'PMU-009', 'PMU-010', 'PMU-011', 'PMU-012', 'PMU-013', 'PMU-014', 'PMU-015', 'PMU-016', 'PMU-017'];
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
  // GraphQL requests in flight (see goto).
  page.graphqlInFlight = new Set();
  const isGraphql = (r) => r.url().includes('/graphql');
  page.on('request', (r) => { if (isGraphql(r)) page.graphqlInFlight.add(r); });
  for (const done of ['requestfinished', 'requestfailed']) page.on(done, (r) => page.graphqlInFlight.delete(r));
  // Every console line, kept for the failure capture below.
  page.consoleLog = [];
  page.on('console', (m) => { page.consoleLog.push(`${m.type()}: ${m.text()}`.slice(0, 400)); if (page.consoleLog.length > 200) page.consoleLog.shift(); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
/**
 * A full-page navigation, as the probe's cases use to start from a known route. The app shell keeps loading
 * after the page looks idle (agent/team definitions, workspace metadata); reloading while those GraphQL reads
 * are in flight aborts them and the app logs "Failed to fetch" (a test-only effect: users navigate in-app).
 * So first wait until the current page has had no GraphQL request in flight for 750 ms.
 */
const goto = async (page, route) => {
  if (page.graphqlInFlight !== undefined) {
    let quietSince = Date.now();
    await until('no GraphQL read in flight before a full navigation', async () => {
      if (page.graphqlInFlight.size) quietSince = Date.now();
      return Date.now() - quietSince >= 750;
    }, 15000, 50).catch(() => undefined);
  }
  await page.goto(`${stack.frontendUrl}${route}`, { waitUntil: 'networkidle', timeout: 120000 });
};
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

// ---------------------------------------------------------------- compact cards (task-card-compact-summary)
const fixtureWords = (count, prefix) => Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ');
/** Rendered card text: each clamped span's height in lines, the row height, and the accessible name. */
const measureCard = (page, taskId) => row(page, taskId).evaluate((element) => {
  const measure = (span) => {
    if (!span) return null;
    const style = getComputedStyle(span); const height = span.getBoundingClientRect().height; const lineHeight = parseFloat(style.lineHeight);
    return { height, lineHeight, withinTwoLines: height <= 2 * lineHeight + 1, display: style.display, clamp: style.webkitLineClamp, chars: span.textContent.length, text: span.textContent };
  };
  const link = element.querySelector('[data-testid="project-task-row-link"]');
  return { summary: measure(element.querySelector('[data-testid="project-task-row-text"]')), preview: measure(element.querySelector('[data-testid="project-task-row-preview"]')),
    rowHeight: element.getBoundingClientRect().height, label: link.getAttribute('aria-label') };
});
/** AC-001..003, AC-005, AC-006: real-length descriptions render as compact cards on both boards at 1440 and 1024. */
const compactCards = async () => {
  const huge = fixtureWords(10_000, 'brief');
  const multi = [fixtureWords(150, 'lead'), ...Array.from({ length: 40 }, (_, i) => fixtureWords(75, `detail${i}x`))].join('\n');
  const short = 'Write the release notes.\nKeep it short.';
  const projectId = await createProject(`Compact Cards ${randomUUID().slice(0, 6)}`);
  const ids = { huge: await createTask(projectId, huge), multi: await createTask(projectId, multi), short: await createTask(projectId, short) };
  const { ids: defs, names } = await createDefinitions('PmuCards');
  const root = await createRoot('agent', defs);
  const input = await managerInput(root);
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: huge }));
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: multi }));
  const temps = await until('both real-length Temp tasks', async () => {
    const listed = await tempTasks();
    const hugeTemp = listed.find((t) => t.description === huge); const multiTemp = listed.find((t) => t.description === multi);
    return hugeTemp && multiTemp ? { huge: hugeTemp.taskId, multi: multiTemp.taskId } : null;
  }, 90000);
  const { page, errors } = await newPage();
  const measured = {};
  const check = (where, cards) => {
    for (const [kind, card] of Object.entries(cards)) {
      assert(card.summary?.withinTwoLines && card.summary.display !== 'block', `${where} ${kind}: summary within 2 lines`, card);
      assert(!card.preview || card.preview.withinTwoLines, `${where} ${kind}: preview within 2 lines`, card);
      // 2+2 lines plus the root line measure 76–156 px; the bound leaves room for font differences, while the bug measured tens of thousands.
      assert(card.rowHeight <= 200, `${where} ${kind}: card height bounded`, card);
    }
    assert(cards.huge.summary.text.endsWith('…') && cards.huge.summary.chars <= 300 && cards.huge.preview === null, `${where}: huge paragraph → bounded summary, no preview`, cards.huge);
    assert(cards.multi.preview && cards.multi.preview.chars <= 300 && cards.multi.preview.text.startsWith('detail0x0 '), `${where}: multi-line → bounded preview`, cards.multi);
    for (const kind of ['huge', 'multi']) assert(cards[kind].label.length <= 120 && cards[kind].label.endsWith('…'), `${where} ${kind}: short accessible name`, cards[kind].label);
    if (cards.short) {
      assert(cards.short.summary.text === 'Write the release notes.' && cards.short.preview?.text === 'Keep it short.' && cards.short.label === 'Write the release notes.', `${where}: short text unchanged`, cards.short);
    }
  };
  for (const [width, height] of [[1440, 900], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    await goto(page, `/projects/${projectId}`);
    await row(page, ids.short).waitFor({ timeout: 30000 });
    const board = { huge: await measureCard(page, ids.huge), multi: await measureCard(page, ids.multi), short: await measureCard(page, ids.short) };
    check(`board@${width}`, board);
    await shot(page, `pmu-013-board-${width}`);
    await goto(page, '/projects/temp-tasks');
    await row(page, temps.huge).waitFor({ timeout: 30000 });
    const temp = { huge: await measureCard(page, temps.huge), multi: await measureCard(page, temps.multi) };
    check(`temp@${width}`, temp);
    await shot(page, `pmu-013-temp-board-${width}`);
    measured[width] = { board, temp };
  }
  // AC-004: search matches text beyond the visible lines; the Task pages show the full description.
  await goto(page, `/projects/${projectId}`);
  await page.getByTestId('project-tasks-search-input').fill('brief9999');
  await until('search finds the last word of the huge description', async () => (await row(page, ids.huge).count()) === 1 && (await row(page, ids.short).count()) === 0, 10000);
  await page.getByTestId('project-tasks-search-input').fill('');
  await row(page, ids.huge).getByTestId('project-task-row-link').click();
  await page.getByTestId('task-page-description').waitFor({ timeout: 30000 });
  const fullProject = (await page.getByTestId('task-page-description').textContent()).trim() === huge;
  assert(fullProject, 'Project Task page shows the full description');
  // AC-003: the delete confirmation names the Task with the shortened summary.
  await page.getByTestId('task-page-delete').click();
  const confirmation = await page.getByTestId('task-page-delete-confirmation').innerText();
  assert(confirmation.includes('…') && confirmation.length < 400, 'delete confirmation uses the shortened summary', { length: confirmation.length });
  await shot(page, 'pmu-013-delete-confirmation');
  await page.getByTestId('task-page-delete-cancel').click();
  await goto(page, `/projects/temp-tasks/tasks/${temps.huge}`);
  await page.getByTestId('temp-task-description').waitFor({ timeout: 30000 });
  const fullTemp = (await page.getByTestId('temp-task-description').textContent()).trim() === huge;
  assert(fullTemp, 'Temp task page shows the full description');
  assertNoBrowserErrors(errors);
  return { descriptionChars: { huge: huge.length, multi: multi.length }, measured, confirmationChars: confirmation.length, fullProject, fullTemp, errors };
};

/** A Project Task created with one uploaded context file (the app's own draft → upload → create path). */
const createTaskWithFile = async (projectId, description) => {
  const draft = await (await fetch(`${stack.backendUrl}/rest/projects/${projectId}/task-context-drafts`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{}' })).json();
  const data = new FormData(); data.set('file', new Blob(['Launch checklist bytes'], { type: 'text/plain' }), 'checklist.txt');
  const file = await (await fetch(`${stack.backendUrl}/rest/projects/${projectId}/task-context-drafts/${draft.draftId}/context-files`, { method: 'POST', body: data })).json();
  return (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
    { input: { projectId, description, contextDraft: { draftId: draft.draftId, storedFilenames: [file.storedFilename] } } })).createProjectTask.taskId;
};
/** Every part of a card must be inside the card and on screen (nothing pushed out, nothing overflowing sideways). */
const cardLayout = (page, taskId) => row(page, taskId).evaluate((element) => {
  const box = element.getBoundingClientRect();
  const inside = (selector) => { const e = element.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect();
    return { visible: r.height > 0 && r.width > 0, inside: r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.left >= box.left - 1 && r.right <= box.right + 1 }; };
  return { rowHeight: box.height, rowWidth: box.width, overflowX: element.scrollWidth > element.clientWidth + 1,
    fileCount: inside('[data-testid="task-row-file-count"]'), root: inside('[data-testid="project-task-root"]') };
});
/**
 * Compact-card edge cases: a long Task with a context file and a worker line; CJK text with no spaces (hard cut);
 * one unbroken ~5,000-character token (a pasted path/URL); a 390 px viewport; the delete confirmation's short half;
 * long text shows exactly 2 lines (not fewer).
 */
const compactCardEdges = async () => {
  const lead = fixtureWords(400, 'filed');
  const withFile = `${lead}\n${fixtureWords(300, 'more')}`;
  const cjk = '离线同步让你在没有网络时继续工作并在恢复连接后自动同步所有更改'.repeat(80);
  const token = `https://example.com/${'a'.repeat(5000)}`;
  const shortOne = 'Ship the FAQ.';
  const projectId = await createProject(`Compact Edges ${randomUUID().slice(0, 6)}`);
  const ids = { withFile: await createTaskWithFile(projectId, withFile), cjk: await createTask(projectId, cjk),
    token: await createTask(projectId, token), shortOne: await createTask(projectId, shortOne) };
  const { ids: defs, names } = await createDefinitions('PmuEdges');
  const root = await createRoot('agent', defs);
  const input = await managerInput(root);
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: ids.withFile }));
  await until('the long Task with a file has a started root', async () => (await rootOf(projectId, ids.withFile))?.start === 'started', 60000);
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: cjk }));
  const cjkTemp = await until('CJK Temp task', async () => (await tempTasks()).find((t) => t.description === cjk)?.taskId, 60000);
  const { page, errors } = await newPage();
  const measured = {};
  try {
    for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await goto(page, `/projects/${projectId}`);
      await row(page, ids.shortOne).waitFor({ timeout: 30000 });
      await until('root line rendered', async () => (await row(page, ids.withFile).locator('[data-testid="project-task-root"]').count()) === 1, 30000);
      const cards = {};
      for (const [kind, id] of Object.entries(ids)) cards[kind] = { text: await measureCard(page, id), layout: await cardLayout(page, id) };
      for (const kind of ['withFile', 'cjk', 'token']) {
        const s = cards[kind].text.summary;
        // Long text: exactly 2 lines visible (the clamp, not a shorter cut), within the card, no sideways overflow.
        assert(Math.abs(s.height - 2 * s.lineHeight) <= 1, `${width} ${kind}: summary shows exactly 2 lines`, cards[kind]);
        assert(!cards[kind].layout.overflowX, `${width} ${kind}: no horizontal overflow`, cards[kind].layout);
        assert(cards[kind].text.label.length <= 120 && cards[kind].text.label.endsWith('…'), `${width} ${kind}: bounded accessible name`, cards[kind].text.label);
        assert(s.chars <= 300 && s.text.endsWith('…'), `${width} ${kind}: bounded summary`, s);
      }
      // The hard-cut path: CJK has no word boundary, so the cut is at the bound itself.
      assert(cards.cjk.text.summary.chars === 300, `${width}: CJK summary hard-cut at the bound`, cards.cjk.text.summary);
      const wf = cards.withFile;
      assert(Math.abs(wf.text.preview.height - 2 * wf.text.preview.lineHeight) <= 1, `${width}: preview shows exactly 2 lines`, wf.text.preview);
      assert(wf.layout.fileCount?.visible && wf.layout.fileCount.inside, `${width}: the file-count line stays visible under clamped text`, wf.layout);
      assert(wf.layout.root?.visible && wf.layout.root.inside, `${width}: the worker line stays visible`, wf.layout);
      assert(wf.layout.rowHeight <= 240, `${width}: card with text, file count and worker line stays bounded`, wf.layout);
      assert(cards.shortOne.text.summary.text === shortOne && cards.shortOne.text.label === shortOne && cards.shortOne.text.preview === null
        && Math.abs(cards.shortOne.text.summary.height - cards.shortOne.text.summary.lineHeight) <= 1, `${width}: short Task is one plain line`, cards.shortOne);
      await shot(page, `pmu-014-board-${width}`);
      await goto(page, '/projects/temp-tasks');
      await row(page, cjkTemp).waitFor({ timeout: 30000 });
      const temp = { text: await measureCard(page, cjkTemp), layout: await cardLayout(page, cjkTemp) };
      assert(Math.abs(temp.text.summary.height - 2 * temp.text.summary.lineHeight) <= 1 && !temp.layout.overflowX, `${width}: CJK Temp card 2 lines, no overflow`, temp);
      await shot(page, `pmu-014-temp-board-${width}`);
      measured[width] = { cards, temp };
    }
    // AC-003, short half: the delete confirmation names a short Task with its whole summary (no "…").
    await page.setViewportSize({ width: 1440, height: 900 });
    await goto(page, `/projects/${projectId}/tasks/${ids.shortOne}`);
    await page.getByTestId('task-page-delete').click();
    const confirmation = await page.getByTestId('task-page-delete-confirmation').innerText();
    assert(confirmation.includes(shortOne) && !confirmation.includes('…'), 'delete confirmation shows the full short summary', { confirmation });
    await page.getByTestId('task-page-delete-cancel').click();
    // The long Task's page still shows the whole description and its file (reached in-app, as a user does:
    // a full reload while the app shell's first reads are in flight only aborts them and logs fetch errors).
    await page.getByTestId('task-back-to-board').click();
    await row(page, ids.withFile).getByTestId('project-task-row-link').click();
    await page.getByTestId('task-page-description').waitFor({ timeout: 30000 });
    assert((await page.getByTestId('task-page-description').textContent()).trim() === withFile, 'Task page shows the full description');
    assert(/checklist\.txt/.test(await page.locator('main, body').first().innerText()), 'Task page lists the context file');
    assertNoBrowserErrors(errors);
    return { measured, confirmation };
  } finally { input.close(); }
};

// ---------------------------------------------------------------- Projects tab in the right panel (projects-always-on SR-003, PMU-015)
/** AC-006..010: the tab is first; its board follows an agent live beside the chat; a worker opens in the center and the tab stays; card → detail → back; the choice survives a reload. */
const projectsTab = async () => {
  const { ids, names } = await createDefinitions('PmuTab');
  const projectId = await createProject(`Tab Board ${randomUUID().slice(0, 6)}`);
  const existing = await createTask(projectId, 'Prepare the launch checklist');
  const root = await createRoot('agent', ids);
  const input = await managerInput(root);
  const { page, errors } = await newPage();
  const panel = page.locator('[data-test="right-side-projects-panel"]');
  const tabButton = () => page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]');
  const panelRow = (taskId) => panel.locator(`[data-testid="project-task-row-${taskId}"]`);
  await goto(page, `/chat?id=${encodeURIComponent(root.rootId)}`);
  await page.locator('[data-test="right-side-tab-list"] [data-tab-name]').first().waitFor({ timeout: 60000 });
  const tabOrder = await page.locator('[data-test="right-side-tab-list"] [data-tab-name]').evaluateAll((es) => es.map((e) => e.getAttribute('data-tab-name')));
  assert(tabOrder[0] === 'projects' && tabOrder[1] === 'files', 'Projects is the first tab, before Files', tabOrder);
  await tabButton().click();
  await panelRow(existing).waitFor({ timeout: 30000 });
  const picked = await panel.getByTestId('projects-panel-picker-select').inputValue();
  assert(picked === `project:${projectId}`, 'defaults to the most recently updated Project', { picked });
  assert(await panel.getByTestId('project-tasks-new-button').count() === 0, 'no New task in the tab');
  const lanes = await panel.locator('[data-testid^="project-task-column-"]').filter({ has: page.locator('h2') }).evaluateAll((es) => es.map((e) => e.getBoundingClientRect().left));
  assert(lanes.length === 3 && lanes.every((left) => Math.abs(left - lanes[0]) < 2), 'lanes stack in the panel', lanes);
  await shot(page, 'pmu-015-tab-board');
  // The manager adds a Task while its chat stays in the center.
  const chatUrl = page.url();
  input.send(callTool('create_or_update_task', { project_id: projectId, description: 'Agent-added from the chat' }));
  const added = await until('Task arrives in the tab live', async () => (await projectTasks(projectId)).find((t) => t.taskId !== existing)?.taskId, 30000);
  await panelRow(added).waitFor({ timeout: 15000 });
  assert(page.url() === chatUrl, 'the chat stays in the center');
  // A worker opens in the center; the Projects tab stays selected.
  input.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: existing }));
  const workerLine = panelRow(existing).locator('[data-testid^="project-task-root-"][data-openable="true"]');
  await workerLine.waitFor({ timeout: 60000 });
  await workerLine.click();
  await until('worker conversation in the center', async () => /Task delegator address/.test(await centerText(page)), 30000);
  assert(await tabButton().getAttribute('aria-selected') === 'true' && await panel.isVisible(), 'the Projects tab stays selected');
  await shot(page, 'pmu-015-worker-open-tab-kept');
  // Card → detail in the tab → back, with search kept.
  await panel.getByTestId('project-tasks-search-input').fill('checklist');
  await panelRow(existing).getByTestId('project-task-row-link').click();
  await panel.getByTestId('projects-panel-task').waitFor();
  const detail = await panel.getByTestId('projects-panel-task-description').innerText();
  assert(detail === 'Prepare the launch checklist', 'full description in the tab', { detail });
  assert(await panel.getByTestId('projects-panel-task-open-page').getAttribute('href') === `/projects/${projectId}/tasks/${existing}`, 'Open in Projects links the Task page');
  // Icons load on first use; both header icons must render.
  const iconDrawn = (testId) => panel.getByTestId(testId).locator('svg path').first().waitFor({ timeout: 15000 });
  await iconDrawn('projects-panel-task-back'); await iconDrawn('projects-panel-task-open-page');
  const iconBoxes = await panel.locator('[data-testid="projects-panel-task-back"] svg, [data-testid="projects-panel-task-open-page"] svg')
    .evaluateAll((es) => es.map((e) => { const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, color: getComputedStyle(e).color }; }));
  await shot(page, 'pmu-015-task-detail');
  await panel.getByTestId('projects-panel-task-back').click();
  assert(await panel.getByTestId('project-tasks-search-input').inputValue() === 'checklist', 'search kept after back');
  // The choice survives a reload.
  await panel.getByTestId('projects-panel-picker-select').selectOption('temp');
  await panel.getByTestId('temp-task-board').waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await tabButton().waitFor({ timeout: 60000 });
  if (await tabButton().getAttribute('aria-selected') !== 'true') await tabButton().click();
  await until('Temp tasks remembered after reload', async () => (await panel.getByTestId('projects-panel-picker-select').inputValue().catch(() => '')) === 'temp', 30000);
  await shot(page, 'pmu-015-temp-remembered');
  assertNoBrowserErrors(errors);
  return { tabOrder, picked, lanes, iconBoxes, errors };
};

/**
 * AC-006/AC-009 beyond an Agent chat: in Team and Org conversations the Projects tab is first and a worker opened
 * from it keeps the tab; at a constrained width the collapsed strip lists Projects first and its drawer shows the board.
 */
const projectsTabOtherRootsAndNarrow = async () => {
  const { ids, names } = await createDefinitions('PmuTabRoots');
  const projectId = await createProject(`Tab Roots ${randomUUID().slice(0, 6)}`);
  const { page, errors } = await newPage();
  const panel = page.locator('[data-test="right-side-projects-panel"]');
  const tabList = page.locator('[data-test="right-side-tab-list"] [data-tab-name]');
  const details = {};
  const inputs = [];
  try {
    for (const kind of ['team', 'org']) {
      const taskId = await createTask(projectId, `Work hosted by the ${kind} run`);
      const root = await createRoot(kind, ids);
      const input = await managerInput(root); inputs.push(input);
      input.send(callTool('delegate_task', { recipient_address: '/worker', task_id: taskId }));
      await until(`${kind}: worker started`, async () => (await rootOf(projectId, taskId))?.start === 'started', 60000);
      // Open the root's conversation the way a user does: from the left panel.
      await goto(page, '/workspace');
      await expandWorkspace(page);
      if (kind === 'team') {
        await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
        await page.locator(`[data-test="workspace-team-row-${root.rootId}"]`).click();
      } else {
        await page.locator(`[data-test="agent-org-definition-${slug(names.org)}"]`).click();
        await page.locator(`[data-test="agent-org-run-open-${root.rootId}"]`).click();
      }
      await tabList.first().waitFor({ timeout: 60000 });
      const order = await tabList.evaluateAll((es) => es.map((e) => e.getAttribute('data-tab-name')));
      assert(order[0] === 'projects' && order[1] === 'files', `${kind}: Projects is the first tab`, order);
      await tabList.first().click();
      await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
      const line = panel.locator(`[data-testid="project-task-row-${taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`);
      await line.waitFor({ timeout: 60000 });
      await line.click();
      await until(`${kind}: worker conversation in the center`, async () => /Task delegator address/.test(await centerText(page)), 30000);
      const kept = await tabList.first().getAttribute('aria-selected') === 'true' && await panel.isVisible();
      assert(kept, `${kind}: the Projects tab stays selected after opening the worker`);
      await shot(page, `pmu-016-${kind}-worker-open-tab-kept`);
      details[kind] = { order, url: page.url() };
    }
    // Constrained width: the right panel collapses to a strip that opens a drawer.
    let narrow = null;
    const tried = [];
    for (const width of [1100, 1000, 900, 820, 760]) {
      await page.setViewportSize({ width, height: 900 });
      await sleep(600);
      const strips = await page.locator('[data-test="workspace-right-tool-strip"], [data-test="workspace-right-tool-strip-surface"]').evaluateAll((es) => es.map((e) => ({
        activation: e.getAttribute('data-strip-activation'), behavior: e.getAttribute('data-strip-behavior'), visible: e.getBoundingClientRect().width > 0 })));
      tried.push({ width, strips });
      const index = strips.findIndex((x) => x.visible && x.activation === 'open-drawer');
      if (index >= 0) { narrow = { width, strip: page.locator('[data-test="workspace-right-tool-strip"], [data-test="workspace-right-tool-strip-surface"]').nth(index) }; break; }
    }
    assert(narrow, 'a constrained width collapses the right panel to a drawer strip', { tried });
    const stripOrder = await narrow.strip.locator('[data-tab-name]').evaluateAll((es) => es.map((e) => e.getAttribute('data-tab-name')));
    assert(stripOrder[0] === 'projects' && stripOrder[1] === 'files', 'the strip lists Projects first', stripOrder);
    await narrow.strip.locator('[data-tab-name="projects"]').click();
    const drawer = page.locator('[data-test="workspace-right-tool-drawer"]');
    await drawer.waitFor({ state: 'visible', timeout: 15000 });
    const drawerOrder = await drawer.locator('[data-tab-name]').evaluateAll((es) => es.map((e) => e.getAttribute('data-tab-name')));
    assert(drawerOrder[0] === 'projects', 'the drawer lists Projects first', drawerOrder);
    await drawer.locator('[data-test="right-side-projects-panel"] [data-testid^="project-task-row-"]').first().waitFor({ timeout: 30000 });
    const overflow = await drawer.evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    assert(!overflow, 'the drawer board has no horizontal overflow');
    await shot(page, 'pmu-016-drawer-projects');
    details.narrow = { width: narrow.width, stripOrder, drawerOrder };
    assertNoBrowserErrors(errors);
    return details;
  } finally { for (const input of inputs) input.close(); }
};

// ---------------------------------------------------------------- Closed Tasks (task-closed-status, PMU-017)
/** The board's Closed toggle: absent, or its text, pressed state, tag and whether Refresh follows it. */
const closedToggleState = async (scope, testId) => {
  const toggle = scope.locator(`[data-testid="${testId}"]`);
  if (!(await toggle.count())) return null;
  return toggle.evaluate((e) => ({ text: e.textContent.trim(), pressed: e.getAttribute('aria-pressed'), tag: e.tagName, type: e.getAttribute('type'),
    title: e.getAttribute('title'), nextTestId: e.nextElementSibling?.getAttribute('data-testid') ?? null }));
};
/** Layout of a board's lanes: each lane's box, so a full-width Closed lane under the open lanes can be asserted. */
const laneBoxes = (scope, prefix) => scope.locator(`section[data-testid^="${prefix}"]`).evaluateAll((es) => es.map((e) => {
  const r = e.getBoundingClientRect(); const grid = e.parentElement.getBoundingClientRect();
  return { id: e.getAttribute('data-testid'), top: r.top, bottom: r.bottom, left: r.left, width: r.width, gridWidth: grid.width };
}));
const pillStyle = (locator) => locator.evaluate((e) => ({ text: e.textContent.trim(), className: e.className, background: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color }));
/**
 * AC-001, AC-003, AC-008..AC-011: an agent closes Tasks as not needed while the user watches. The Project board hides
 * them behind "Closed (N)" beside Refresh (absent at 0, aria-pressed, keyboard), which shows a full-width Closed lane
 * after Done; the Task page shows a muted "Closed" pill unlike Done; the card counts only open Tasks; the agent's
 * reopen moves the row back live; the Temp tasks board, its header count and page do the same; and the right-panel
 * Projects tab's compact board and Task detail follow live.
 */
const closedTasksJourney = async () => {
  const { ids, names } = await createDefinitions('PmuClosed');
  const projectId = await createProject(`Closed Board ${randomUUID().slice(0, 6)}`);
  const dropped = await createTask(projectId, 'Translate the legacy FAQ.');
  const kept = await createTask(projectId, 'Ship the onboarding guide.');
  const finished = await createTask(projectId, 'Publish the changelog.');
  const root = await createRoot('agent', ids);
  const input = await managerInput(root);
  const workerAddress = `/${segment(names.worker)}`;
  const { page, errors } = await newPage();
  const details = {};
  const statusOf = async (taskId) => (await projectTasks(projectId)).find((t) => t.taskId === taskId)?.status;
  try {
    input.send(callTool('delegate_task', { recipient_address: workerAddress, task_id: dropped }));
    await until('worker started on the Task to drop', async () => (await rootOf(projectId, dropped))?.start === 'started', 60000);
    input.send(callTool('create_or_update_task', { task_id: finished, status: 'DONE' }));
    await until('finished Task DONE', async () => (await statusOf(finished)) === 'DONE', 30000);
    await goto(page, '/projects');
    const card = page.getByTestId(`project-card-${projectId}`);
    await card.waitFor({ timeout: 30000 });
    details.cardBefore = await card.getByTestId('project-card-counts').innerText();
    assert(/\b2 open tasks\b/.test(details.cardBefore), 'card counts TODO + IN_PROGRESS before the close', details);
    await card.click();
    await row(page, dropped).waitFor({ timeout: 30000 });
    assert(await closedToggleState(page, 'project-tasks-closed-toggle') === null, 'no Closed toggle while nothing is Closed');

    // The agent drops the Task: it leaves the open lanes live, the toggle appears beside Refresh, the lane stays hidden.
    input.send(callTool('create_or_update_task', { task_id: dropped, status: 'CLOSED' }));
    details.toggleHidden = await until('row hidden and toggle "Closed (1)" appears live', async () => {
      const toggle = await closedToggleState(page, 'project-tasks-closed-toggle');
      return (await row(page, dropped).count()) === 0 && toggle?.text === 'Closed (1)' ? toggle : null;
    }, 30000, 50);
    assert(details.toggleHidden.pressed === 'false' && details.toggleHidden.tag === 'BUTTON' && details.toggleHidden.type === 'button'
      && details.toggleHidden.nextTestId === 'project-tasks-refresh' && details.toggleHidden.title === 'Show closed tasks', 'toggle: unpressed button right before Refresh', details.toggleHidden);
    assert(await page.getByTestId('project-task-column-CLOSED').count() === 0, 'Closed lane hidden by default');
    assert((await columnOf(page, finished)) === 'project-task-column-DONE' && (await columnOf(page, kept)) === 'project-task-column-TODO', 'other Tasks keep their lanes');
    assert((await statusOf(dropped)) === 'CLOSED', 'server status CLOSED');
    await until('dropped Task root closed (worker stopped and removed)', async () => (await rootOf(projectId, dropped))?.closed === true, 30000);
    await shot(page, 'pmu-017-board-closed-hidden');

    // Search ignores hidden Closed Tasks: no match until the toggle is on (the toggle stays with its count).
    await page.getByTestId('project-tasks-search-input').fill('legacy');
    await page.getByTestId('project-tasks-no-match').waitFor({ timeout: 10000 });
    assert((await closedToggleState(page, 'project-tasks-closed-toggle'))?.text === 'Closed (1)', 'toggle stays visible during a search');
    await page.getByTestId('project-tasks-closed-toggle').click();
    await row(page, dropped).waitFor({ timeout: 10000 });
    assert((await columnOf(page, dropped)) === 'project-task-column-CLOSED', 'search + toggle: the Closed Task in the Closed lane');
    await page.getByTestId('project-tasks-search-input').fill('');

    // Toggle on: a full-width Closed lane under To Do / In Progress / Done, the row Offline and not openable.
    details.togglePressed = await closedToggleState(page, 'project-tasks-closed-toggle');
    assert(details.togglePressed.pressed === 'true' && details.togglePressed.title === 'Hide closed tasks', 'toggle pressed', details.togglePressed);
    const lanes = await laneBoxes(page, 'project-task-column-');
    details.lanes = lanes;
    assert(lanes.map((l) => l.id).join() === 'project-task-column-TODO,project-task-column-IN_PROGRESS,project-task-column-DONE,project-task-column-CLOSED', 'lane order: Closed after Done', lanes);
    const closedLane = lanes[3]; const openLanes = lanes.slice(0, 3);
    assert(openLanes.every((l) => Math.abs(l.top - openLanes[0].top) < 2) && closedLane.top >= Math.max(...openLanes.map((l) => l.bottom)) - 1
      && Math.abs(closedLane.width - closedLane.gridWidth) < 2, 'Closed lane is a full-width row beneath the three open lanes (1440 px)', lanes);
    const heading = await page.getByTestId('project-task-column-CLOSED').locator('h2').innerText();
    assert(/^Closed\s*1$/.test(heading.trim()), 'Closed lane heading names it in text with its count', { heading });
    details.closedRoot = await rootState(page, dropped);
    assert(details.closedRoot?.state === 'offline' && details.closedRoot.openable === 'false', 'closed worker shows Offline, not openable', details.closedRoot);
    await shot(page, 'pmu-017-board-closed-lane-shown');
    // Keyboard: Enter hides, Space shows.
    await page.getByTestId('project-tasks-closed-toggle').focus();
    await page.keyboard.press('Enter');
    await until('Enter hides the lane', async () => (await page.getByTestId('project-task-column-CLOSED').count()) === 0
      && (await closedToggleState(page, 'project-tasks-closed-toggle'))?.pressed === 'false', 5000);
    await page.keyboard.press('Space');
    await until('Space shows the lane', async () => (await page.getByTestId('project-task-column-CLOSED').count()) === 1, 5000);

    // The Task page: a muted "Closed" pill, unlike Done's.
    await row(page, dropped).getByTestId('project-task-row-link').click();
    const closedPill = await pillStyle(page.getByTestId('task-page-status'));
    await shot(page, 'pmu-017-task-page-closed');
    assert(await page.locator('[data-testid="task-page-status"] ~ select, select[data-testid*="status"], [data-testid*="status-picker"]').count() === 0, 'no status control on the Task page (AC-002)');
    await page.getByTestId('task-back-to-board').click();
    await row(page, finished).waitFor({ timeout: 30000 });
    // A new visit starts hidden.
    assert((await closedToggleState(page, 'project-tasks-closed-toggle'))?.pressed === 'false' && await page.getByTestId('project-task-column-CLOSED').count() === 0, 'every visit starts with Closed hidden');
    await row(page, finished).getByTestId('project-task-row-link').click();
    const donePill = await pillStyle(page.getByTestId('task-page-status'));
    details.pills = { closedPill, donePill };
    assert(closedPill.text === 'Closed' && donePill.text === 'Done' && closedPill.background !== donePill.background && closedPill.color !== donePill.color, 'Closed pill is labelled and styled apart from Done', details.pills);
    await goto(page, '/projects');
    details.cardClosed = await page.getByTestId(`project-card-${projectId}`).getByTestId('project-card-counts').innerText();
    assert(/\b1 open task\b/.test(details.cardClosed), 'card counts only TODO + IN_PROGRESS (Closed is not open)', details);

    // The agent reopens it: back in To Do live with the moved highlight; the toggle disappears; the worker stays Offline.
    await page.getByTestId(`project-card-${projectId}`).click();
    await row(page, finished).waitFor({ timeout: 30000 });
    input.send(callTool('create_or_update_task', { task_id: dropped, status: 'TODO' }));
    details.reopened = await until('reopened row back in To Do, highlighted, toggle gone', async () => (await columnOf(page, dropped)) === 'project-task-column-TODO'
      && (await row(page, dropped).getAttribute('data-live')) === 'moved' && (await closedToggleState(page, 'project-tasks-closed-toggle')) === null
      ? await rootState(page, dropped) : null, 30000, 50);
    assert(details.reopened?.state === 'offline' && details.reopened.openable === 'false', 'a reopen starts nothing (root stays Offline)', details.reopened);
    await shot(page, 'pmu-017-board-reopened');

    // Temp tasks: header count excludes Closed; Closed is in neither Open nor Done; toggle; page pill.
    const openTemps = async () => (await tempTasks()).filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length;
    input.send(callTool('delegate_task', { recipient_address: workerAddress, description: 'Collect the stale links.' }));
    const temp = await until('Temp task started', async () => (await tempTasks()).find((t) => t.description === 'Collect the stale links.' && t.root?.start === 'started'), 60000);
    await goto(page, '/projects');
    const linkCount = () => page.getByTestId('temp-tasks-link-count').innerText({ timeout: 1000 }).catch(() => '');
    const openBefore = await openTemps();
    await until('header counts the open Temp task', async () => (await linkCount()) === `${openBefore} open`, 15000);
    input.send(callTool('create_or_update_task', { task_id: temp.taskId, status: 'CLOSED' }));
    await until('Temp task CLOSED on the server', async () => (await tempTasks()).find((t) => t.taskId === temp.taskId)?.status === 'CLOSED', 30000);
    const openAfter = await openTemps();
    await until('header count drops live (Closed is not open)', async () => (await linkCount()) === (openAfter ? `${openAfter} open` : ''), 15000);
    details.tempCounts = { openBefore, openAfter };
    await page.getByTestId('temp-tasks-link').click();
    await page.getByTestId('temp-task-board').waitFor({ timeout: 30000 });
    await until('Temp Closed toggle', async () => /^Closed \(\d+\)$/.test((await closedToggleState(page, 'temp-tasks-closed-toggle'))?.text ?? ''), 15000);
    assert(await row(page, temp.taskId).count() === 0 && await page.getByTestId('temp-task-lane-closed').count() === 0, 'Closed Temp task hidden, in neither Open nor Done');
    details.tempToggle = await closedToggleState(page, 'temp-tasks-closed-toggle');
    assert(details.tempToggle.pressed === 'false' && details.tempToggle.nextTestId === 'temp-tasks-refresh', 'Temp toggle beside Refresh', details.tempToggle);
    await page.getByTestId('temp-tasks-closed-toggle').click();
    await until('Temp Closed lane shows the row', async () => (await columnOf(page, temp.taskId)) === 'temp-task-lane-closed', 10000);
    details.tempLanes = await laneBoxes(page, 'temp-task-lane-');
    assert(details.tempLanes.map((l) => l.id).join() === 'temp-task-lane-open,temp-task-lane-done,temp-task-lane-closed'
      && Math.abs(details.tempLanes[2].width - details.tempLanes[2].gridWidth) < 2, 'Temp Closed lane last and full width', details.tempLanes);
    await shot(page, 'pmu-017-temp-board-closed-lane');
    await row(page, temp.taskId).getByTestId('project-task-row-link').click();
    await page.getByTestId('temp-task-page').waitFor();
    details.tempPill = await pillStyle(page.getByTestId('temp-task-status'));
    assert(details.tempPill.text === 'Closed' && details.tempPill.background !== donePill.background, 'Temp page labels it Closed', details.tempPill);
    await shot(page, 'pmu-017-temp-page-closed');

    // Right-panel Projects tab beside the Manager's chat: the compact board follows the agent's close live.
    await goto(page, `/chat?id=${encodeURIComponent(root.rootId)}`);
    const panel = page.locator('[data-test="right-side-projects-panel"]');
    const tabButton = page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]');
    await tabButton.waitFor({ timeout: 60000 });
    if (await tabButton.getAttribute('aria-selected') !== 'true') await tabButton.click();
    await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
    await panel.locator(`[data-testid="project-task-row-${dropped}"]`).waitFor({ timeout: 30000 });
    assert(await closedToggleState(panel, 'project-tasks-closed-toggle') === null, 'panel: no toggle while nothing is Closed');
    input.send(callTool('create_or_update_task', { task_id: kept, status: 'CLOSED' }));
    details.panelToggle = await until('panel: row hidden and toggle appears live', async () => {
      const toggle = await closedToggleState(panel, 'project-tasks-closed-toggle');
      return (await panel.locator(`[data-testid="project-task-row-${kept}"]`).count()) === 0 && toggle?.text === 'Closed (1)' ? toggle : null;
    }, 30000, 50);
    await panel.getByTestId('project-tasks-closed-toggle').click();
    await panel.locator(`[data-testid="project-task-column-CLOSED"] [data-testid="project-task-row-${kept}"]`).waitFor({ timeout: 10000 });
    await shot(page, 'pmu-017-panel-closed-lane');
    await panel.locator(`[data-testid="project-task-row-${kept}"]`).getByTestId('project-task-row-link').click();
    await panel.getByTestId('projects-panel-task').waitFor();
    details.panelPill = await pillStyle(panel.getByTestId('projects-panel-task-status'));
    assert(details.panelPill.text === 'Closed', 'panel detail labels it Closed', details.panelPill);
    await shot(page, 'pmu-017-panel-task-detail');
    assertNoBrowserErrors(errors);
    return details;
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
  'PMU-013': ['Compact cards: ~10,000-word and multi-line descriptions render ≤2+2 lines on the Project board and Temp tasks at 1440 and 1024; short labels; full text on the Task pages; search beyond the visible lines', compactCards],
  'PMU-014': ['Compact-card edges: long Task with a context file and worker line, CJK hard cut, one unbroken 5,000-character token, 390 px; exactly 2 lines; short delete confirmation', compactCardEdges],
  'PMU-015': ['Projects tab in the right panel: first tab, live board beside the chat, worker opens in the center and the tab stays, card → detail → back, choice remembered after reload (projects-always-on AC-006..010)', projectsTab],
  'PMU-016': ['Projects tab in Team and Org conversations (worker opens, tab kept); constrained width: strip and drawer list Projects first', projectsTabOtherRootsAndNarrow],
  'PMU-017': ['Closed Tasks (task-closed-status): agent close hides the row behind "Closed (N)" beside Refresh, full-width Closed lane, keyboard, muted Closed pill vs Done, open counts, live reopen; Temp board/header/page; right-panel board and detail', closedTasksJourney],
};

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found; pass --browser-executable');
  await startStack();
  await ensureWorkspace();
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
