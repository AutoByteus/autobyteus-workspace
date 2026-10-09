#!/usr/bin/env node
// Task closure in the Workspaces tree: real Nuxt dev frontend + built backend + fresh headless Chrome.
// Run from the repository root: pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh dir>
//   Optional: --browser-executable <path> --ledger <initialized absolute path> --cases BR-001,BR-002,...
// Prerequisites: installed workspace dependencies, a current `pnpm -C autobyteus-server-ts prebuild && build`
// (the probe runs autobyteus-server-ts/dist/app.js), and Chrome.
// The Manager and its workers run on the AGY runtime with the repository's scripted CLI
// (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs, AGY_FAKE_CASE=linked_skills): a message containing
// `CALL_TOOL:{...}` makes that agent call the actual scoped MCP tool. No provider inference, no mocked routes.
// BR-008..BR-011 cover reactivation (reactivate-done-task-runs): after DONE the agent reopens the Task and its
// run-ID message brings the worker (or a Task Team via its coordinator) back into the tree, live, after reload and
// across real backend restarts. BR-011 needs BR-008..BR-010 in the same run.
// BR-012..BR-016 cover follow-up Tasks to an existing copy (delegate-to-existing-copy): `delegate_task` with the copy's
// target_team_run_id / target_agent_run_id brings its row back live (tree and board), a repeated close of the earlier Task
// never removes it, real backend restarts keep the assignment (BR-015), and damaged Task data detected at load refuses the
// assignment until the file is restored (BR-016). BR-015 and BR-016 need BR-012..BR-014 in the same run.
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
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/task-closure-tree'));
const ledger = getArg('ledger');
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
const ALL_CASES = ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005', 'BR-006', 'BR-007', 'BR-008', 'BR-009', 'BR-010', 'BR-011',
  'BR-012', 'BR-013', 'BR-014', 'BR-015', 'BR-016'];
const selectedCases = (getArg('cases') ?? ALL_CASES.join(',')).split(',').map((c) => c.trim()).filter(Boolean);
const SELECTED_BG = 'rgb(238, 242, 255)';

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

const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [] };
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
const backendEnv = () => {
  const keys = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
    AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') };
  return keys;
};
const startBackend = async (port) => {
  stack.backendStarts += 1;
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', stack.dataRoot],
    serverDir, env, `backend-${stack.backendStarts}`);
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'task-closure-tree-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendPort = backendPort;
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  await startBackend(backendPort);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};
/** Real backend restart: the same entry, port and data root. */
const restartBackend = async () => {
  const before = stack.backend.pid;
  await stopGroup(stack.backend);
  await startBackend(stack.backendPort);
  return { before, after: stack.backend.pid, starts: stack.backendStarts };
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
const createDefinitions = async (label) => {
  const s = `${label} ${randomUUID().slice(0, 4)}`;
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: `Manager ${s}`, worker: `Release Notes Writer ${s}`, helper: `Fact Checker ${s}`, assistant: `Researcher ${s}`,
    squad: `Docs Review Team ${s}`, team: `Delivery Team ${s}`, org: `Delivery Org ${s}` };
  const ids = {};
  ids.manager = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task']);
  ids.worker = await agent(names.worker, []); ids.helper = await agent(names.helper, []); ids.assistant = await agent(names.assistant, []);
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
const ensureWorkspace = async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some((w) => w.absolutePath === workspace())) {
    await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace() } });
  }
};
const createProject = async (label) => {
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}',
    { input: { name: `Prototype Launch ${label} ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const task = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
    { input: { projectId, description } })).createProjectTask.taskId;
  return { projectId, task };
};
const taskStatus = async (projectId, taskId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId status}}', { id: projectId }))
  .projectTasks.find((t) => t.taskId === taskId)?.status;
/** Task execution nodes of a stored tree (camelCase Agent/Org trees, snake_case Team tree). */
const taskNodes = (tree) => {
  const found = [];
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    const startedAt = v.startedAt ?? v.started_at; const agentRunId = v.agentRunId ?? v.agent_run_id; const teamRunId = v.teamRunId ?? v.team_run_id;
    if (typeof startedAt === 'string' && (agentRunId || teamRunId)) found.push({ agentRunId: teamRunId ? undefined : agentRunId, teamRunId, address: v.address,
      delegatorAgentRunId: v.delegatorAgentRunId ?? v.delegator_agent_run_id, members: (v.members ?? []).map((m) => m.agentRunId ?? m.agent_run_id).filter(Boolean) });
    Object.values(v).forEach(visit);
  };
  visit(tree); return found;
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
const terminate = async (root) => Object.values(await gql(root.kind === 'agent' ? 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}'
  : root.kind === 'team' ? 'mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}'
    : 'mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: root.rootId }))[0];
const sockets = [];
/** The Manager's input channel (what its composer sends). Used for the Manager's own steps. */
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

/** A root with Task A (Agent + delegated helper + brought-in researcher), Task B (a Team), and non-Task work. */
const setupRoot = async (kind, label, { withB = true, withPlain = true } = {}) => {
  const { ids, names } = await createDefinitions(label);
  const { projectId, task } = await createProject(label);
  const at = (member, catalogName) => (kind === 'agent' ? `/${segment(catalogName)}` : `/${member}`);
  const taskA = await task(callTool('delegate_task', { recipient_address: at('helper', names.helper),
    description: callTool('send_message_to', { recipient_address: `/${segment(names.assistant)}`, content: 'Collect the changelog links.' }) }));
  const taskB = await task('Review the docs site.');
  const root = await createRoot(kind, ids);
  const input = await managerInput(root);
  const count = async () => taskNodes(await storedTree(root)).length;
  input.send(callTool('delegate_task', { recipient_address: at('worker', names.worker), task_id: taskA }));
  await until('Task A runs', async () => (await count()) >= 3, 60000);
  const aNodes = taskNodes(await storedTree(root));
  if (withB) { input.send(callTool('delegate_task', { recipient_address: kind === 'org' ? '/squad' : `/${segment(names.squad)}`, task_id: taskB })); await until('Task B', async () => (await count()) >= 4, 60000); }
  if (withPlain) { input.send(callTool('delegate_task', { recipient_address: at('worker', names.worker), description: 'Draft a short summary.' }));
    await until('non-Task run', async () => (await count()) >= aNodes.length + (withB ? 2 : 1), 60000); }
  const all = taskNodes(await storedTree(root));
  const key = (n) => n.teamRunId ?? n.agentRunId;
  const bNode = all.find((n) => n.teamRunId && !aNodes.some((a) => key(a) === key(n)));
  const plainNode = all.find((n) => !n.teamRunId && !aNodes.some((a) => key(a) === key(n)));
  return { ids, names, projectId, taskA, taskB, root, input, at,
    aRefs: aNodes.map((n) => (n.teamRunId ? { teamRunId: n.teamRunId } : { agentRunId: n.agentRunId })),
    aAssigned: aNodes.find((n) => n.delegatorAgentRunId === root.managerRunId),
    bRef: bNode ? { teamRunId: bNode.teamRunId } : null, bMembers: bNode?.members ?? [], plainRef: plainNode ? { agentRunId: plainNode.agentRunId } : null };
};

// ---------------------------------------------------------------- browser helpers
let browser;
const newPage = async ({ reducedMotion = 'no-preference', initScript } = {}) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion, locale: 'en-US' });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // A cold Nuxt dev server may reload once for dependency optimization; those transient errors are not app errors.
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
/** Opens a root's run in the Workspaces tree. `requireTaskTree: false` when an Agent run may have no task rows (no tree). */
const openRoot = async (page, root, names, { requireTaskTree = true } = {}) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 2, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
  if (root.kind === 'agent') {
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]');
    await until('agent run row', async () => (await runRow.count()) === 1, 30000);
    await runRow.click();
    if (requireTaskTree) await until('agent task tree', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 1, 30000);
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
const rowSelector = (kind, ref) => {
  if (kind === 'org') return ref.teamRunId ? `[data-test="agent-org-task-team-row-${ref.teamRunId}"]` : `[data-test="agent-org-task-agent-row-${ref.agentRunId}"]`;
  // Transient rows expose no node Team run ID; each probe root has exactly one task Team.
  return ref.teamRunId ? '[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]'
    : `[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${ref.agentRunId}"]`;
};
/** Per-frame sampler: effective opacity, height, aria-hidden/inert, tree-row classes, focused element. One at a time. */
const startSampler = (page, selectors) => page.evaluate((sels) => {
  window.__samples = []; const t0 = performance.now(); const gen = (window.__samplerGen = (window.__samplerGen ?? 0) + 1);
  const tick = () => {
    if (window.__samplerGen !== gen) return;
    window.__samples.push({ t: Math.round(performance.now() - t0), active: document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName,
      rows: sels.map((s) => { const e = document.querySelector(s); if (!e) return null;
        let op = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
        return { op: Math.round(op * 1000) / 1000, h: Math.round(e.getBoundingClientRect().height * 10) / 10,
          hidden: e.closest('[aria-hidden="true"]') ? 'true' : null, inert: !!e.closest('[inert]'),
          cls: [...e.classList].filter((c) => c.startsWith('tree-row')).join(' ') }; }) });
    if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, selectors);
const analyzeLeave = (frames) => {
  const firstHidden = frames.find((f) => f.rows.some((r) => r && r.hidden === 'true'));
  const gone = frames.find((f) => f.rows.every((r) => r === null));
  return { firstHiddenAt: firstHidden?.t ?? null, goneAt: gone?.t ?? null, leaveMs: firstHidden && gone ? gone.t - firstHidden.t : null,
    midOpacityFrames: frames.filter((f) => f.rows.some((r) => r && r.op > 0.05 && r.op < 0.95)).length,
    hiddenAndInertAtOnce: !!firstHidden && firstHidden.rows.every((r) => r === null || (r.hidden === 'true' && r.inert)),
    moveClassAtLeaveStart: firstHidden ? firstHidden.rows.map((r) => !!r && r.cls.includes('tree-row-move')) : null,
    activeAtFirstHidden: firstHidden?.active ?? null };
};
const goneAll = (page, selectors) => async () => { for (const sel of selectors) if (await page.locator(sel).count()) return false; return true; };
const runs = {};

// ---------------------------------------------------------------- journeys
/** AC-001/002/005/006/008/009/010: live DONE with the closed worker's conversation open and focused. */
const liveDone = async (kind, label) => {
  const s = await setupRoot(kind, label);
  const { page, errors, context } = await newPage();
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const aSel = s.aRefs.map((ref) => rowSelector(kind, ref));
    for (const sel of aSel) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
    if (kind === 'org' && (await page.locator(rowSelector(kind, s.bRef)).getAttribute('aria-expanded')) === 'false') await page.locator(rowSelector(kind, s.bRef)).click();
    s.input.send(callTool('send_message_to', { target_agent_run_id: s.aAssigned.agentRunId, content: 'Status of the release notes?' }));
    const worker = page.locator(rowSelector(kind, { agentRunId: s.aAssigned.agentRunId }));
    await worker.click();
    await until('worker conversation open', async () => /Task delegator address/.test(await page.locator('[data-test="workspace-center-pane"]').innerText()), 30000);
    await worker.focus();
    await shot(page, `${kind}-live-before`);
    await startSampler(page, aSel);
    const sentAt = Date.now();
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'DONE' }));
    await until('Task A rows gone', goneAll(page, aSel), 60000);
    const latencyMs = Date.now() - sentAt;
    await sleep(500);
    const leave = analyzeLeave(await page.evaluate(() => window.__samples));
    assert(leave.hiddenAndInertAtOnce, 'leaving rows not aria-hidden + inert at once', leave);
    assert(leave.midOpacityFrames >= 3, 'leaving rows did not fade/collapse (AC-010)', leave);
    assert(leave.leaveMs !== null && leave.leaveMs >= 150 && leave.leaveMs <= 450, 'leave duration outside ~200 ms', leave);
    for (const sel of [s.bRef && rowSelector(kind, s.bRef), rowSelector(kind, s.plainRef)].filter(Boolean)) assert(await page.locator(sel).count() === 1, `non-closed row left: ${sel}`);
    const active = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
    assert(active === await runRow.getAttribute('data-test'), 'focus did not move to the root run row', { active, leave });
    const center = await page.locator('[data-test="workspace-center-pane"]').innerText();
    assert(!/Task delegator address/.test(center), 'main view still shows the closed worker conversation');
    const managerRow = kind === 'team' ? page.locator(`[data-test="workspace-team-member-${s.root.rootId}-/manager"]`)
      : kind === 'org' ? page.locator(`[data-test="agent-org-agent-row-${s.root.managerRunId}"]`) : null;
    const selection = managerRow ? await managerRow.getAttribute('aria-selected') : await runRow.evaluate((e) => getComputedStyle(e).backgroundColor);
    assert(selection === (managerRow ? 'true' : SELECTED_BG), 'selection did not return to the root (Manager)', { selection });
    await shot(page, `${kind}-live-after`);
    // The root's communication tab is "Team" for Agent and Team roots and "Org" for Agent Org roots.
    await page.locator('[data-test="right-side-tab-list"]').getByText(kind === 'org' ? 'Org' : 'Team', { exact: true }).click();
    await until('Team tab message kept', async () => /Status of the release notes\?/.test(await page.locator('[data-test="workspace-right-panel"]').innerText()), 10000);
    await shot(page, `${kind}-team-tab-after`);
    // Reopen + delegate again: the new run appears; the closed ones stay hidden (AC-006).
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'IN_PROGRESS' }));
    await until('reopened', async () => (await taskStatus(s.projectId, s.taskA)) === 'IN_PROGRESS', 30000);
    const before = taskNodes(await storedTree(s.root)).map((n) => n.agentRunId ?? n.teamRunId);
    s.input.send(callTool('delegate_task', { recipient_address: s.at('worker', s.names.worker), task_id: s.taskA }));
    const fresh = await until('redelegated run', async () => taskNodes(await storedTree(s.root)).find((n) => !before.includes(n.agentRunId ?? n.teamRunId)), 60000);
    await page.locator(rowSelector(kind, { agentRunId: fresh.agentRunId })).waitFor({ state: 'visible', timeout: 30000 });
    for (const sel of aSel) assert(await page.locator(sel).count() === 0, `closed row reappeared: ${sel}`);
    // The user asks the Manager, in the real composer, to close Task B: its Team row and members leave (AC-002).
    const bSel = rowSelector(kind, s.bRef);
    const bRow = page.locator(bSel);
    if ((await bRow.getAttribute('aria-expanded')) === 'false') await (kind === 'org' ? bRow : bRow.locator('[data-test="workspace-team-transient-disclosure"]')).click();
    const memberSel = s.bMembers.map((id) => rowSelector(kind, { agentRunId: id }));
    await until('Task B members visible', async () => { for (const sel of memberSel) if (!(await page.locator(sel).count())) return false; return true; }, 30000);
    await (managerRow ?? runRow).click();
    await sleep(800);
    const composer = page.locator('[data-test="workspace-center-pane"] textarea').first();
    await composer.fill(callTool('create_or_update_task', { task_id: s.taskB, status: 'DONE' }));
    await startSampler(page, [bSel, ...memberSel]);
    await composer.press('Enter');
    await until('Task B Team and members gone', goneAll(page, [bSel, ...memberSel]), 60000);
    await sleep(400);
    const bLeave = analyzeLeave(await page.evaluate(() => window.__samples));
    assert(bLeave.hiddenAndInertAtOnce && bLeave.midOpacityFrames >= 3, 'Task Team rows did not leave with motion', bLeave);
    assert((await taskStatus(s.projectId, s.taskB)) === 'DONE', 'Task B not DONE through the composer');
    assert(await page.locator(rowSelector(kind, s.plainRef)).count() === 1, 'non-Task row left with Task B');
    await shot(page, `${kind}-task-team-closed-via-composer`);
    assert(errors.length === 0, 'browser errors', errors);
    runs[kind] = { root: s.root, names: s.names, aRefs: s.aRefs, bRef: s.bRef, bMembers: s.bMembers, plainRef: s.plainRef, redelegated: { agentRunId: fresh.agentRunId } };
    return { root: s.root, latencyMs, leave, bLeave, selection, active };
  } finally { s.input.close(); await context.close(); }
};
/** AC-010 reduced motion: removed without a fade; focus still moves to the run row. */
const reducedMotion = async (kind, label) => {
  const s = await setupRoot(kind, label, { withB: false });
  const { page, errors, context } = await newPage({ reducedMotion: 'reduce' });
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const aSel = s.aRefs.map((ref) => rowSelector(kind, ref));
    for (const sel of aSel) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
    await page.locator(aSel[0]).focus();
    await startSampler(page, aSel);
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'DONE' }));
    await until('rows gone', goneAll(page, aSel), 60000);
    await sleep(300);
    const leave = analyzeLeave(await page.evaluate(() => window.__samples));
    assert(leave.midOpacityFrames === 0 && leave.leaveMs !== null && leave.leaveMs <= 80, 'reduced motion did not remove rows at once', leave);
    const active = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
    assert(active === await runRow.getAttribute('data-test'), 'focus not on the run row', { active });
    assert(await page.locator(rowSelector(kind, s.plainRef)).count() === 1, 'non-Task row missing');
    await shot(page, `${kind}-reduced-motion-after`);
    assert(errors.length === 0, 'browser errors', errors);
    return { root: s.root, leave, active };
  } finally { s.input.close(); await context.close(); }
};
/** CR-001: the last task rows under a standalone Agent run fade out; the empty tree then disappears. */
const lastRows = async () => {
  const s = await setupRoot('agent', 'LastRows', { withB: false, withPlain: false });
  const { page, errors, context } = await newPage();
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const aSel = s.aRefs.map((ref) => rowSelector('agent', ref));
    for (const sel of aSel) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
    await page.locator(aSel[1]).focus();
    await page.evaluate(() => { window.__tree = []; const t0 = performance.now(); const tick = () => {
      window.__tree.push({ t: Math.round(performance.now() - t0), tree: !!document.querySelector('[data-test="workspace-agent-run-task-tree"]'),
        rows: document.querySelectorAll('[data-test="workspace-team-transient-execution-row"]').length });
      if (performance.now() - t0 < 4000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await startSampler(page, aSel);
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'DONE' }));
    await until('tree removed', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 0, 60000);
    await sleep(300);
    const leave = analyzeLeave(await page.evaluate(() => window.__samples));
    const tree = await page.evaluate(() => window.__tree);
    assert(leave.hiddenAndInertAtOnce && leave.midOpacityFrames >= 3, 'last rows did not fade', leave);
    assert(tree.filter((f) => leave.firstHiddenAt !== null && f.t >= leave.firstHiddenAt && f.rows > 0).every((f) => f.tree), 'tree unmounted while rows were leaving');
    const active = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
    assert(active === await runRow.getAttribute('data-test'), 'focus not moved to the run row', { active });
    await shot(page, 'agent-last-rows-after');
    assert(errors.length === 0, 'browser errors', errors);
    return { root: s.root, leave, active };
  } finally { s.input.close(); await context.close(); }
};
/** Records any closed row that appears at any time, from document start. */
const watchClosed = (ids) => `(() => { const ids = ${JSON.stringify(ids)}; window.__closedSeen = [];
  const check = () => { for (const id of ids) if (document.querySelector('[data-agent-run-id="' + id + '"], [data-test$="-row-' + id + '"]')) window.__closedSeen.push(id);
    if (document.querySelector('[data-transient-kind="task_team"]')) window.__closedSeen.push('task_team-row'); };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true }); })();`;
const closedIdsOf = (r) => [...r.aRefs.map((x) => x.agentRunId ?? x.teamRunId), r.bRef?.teamRunId, ...r.bMembers].filter(Boolean);
/** AC-004 + AC-010: after reload, and after a real backend restart + reload, closed rows never render. */
const reloadAndRestart = async () => {
  const kinds = ['agent', 'team', 'org'].filter((k) => runs[k]);
  assert(kinds.length === 3, 'BR-005 needs BR-001..BR-003 in the same run');
  const check = async (label) => {
    const out = {};
    for (const kind of kinds) {
      const r = runs[kind];
      const { page, errors, context } = await newPage({ initScript: watchClosed(closedIdsOf(r)) });
      try {
        await openRoot(page, r.root, r.names);
        await page.locator(rowSelector(kind, r.plainRef)).waitFor({ state: 'visible', timeout: 30000 });
        await page.locator(rowSelector(kind, r.redelegated)).waitFor({ state: 'visible', timeout: 30000 });
        await sleep(1500);
        const seen = await page.evaluate(() => window.__closedSeen);
        assert(seen.length === 0, `${kind}: closed rows rendered (${label})`, { seen });
        await shot(page, `${kind}-${label}`);
        assert(errors.length === 0, `${kind}: browser errors`, errors);
        out[kind] = { closedIds: closedIdsOf(r).length, seen };
      } finally { await context.close(); }
    }
    return out;
  };
  const reload = await check('reload');
  const restart = await restartBackend();
  assert(restart.before !== restart.after, 'backend did not restart');
  return { reload, restart, afterRestart: await check('restart-reload') };
};
/** SP-3: a stopped Org run expanded from the history list before its context hydrates renders no closed rows. */
const orgHistoryFirstRender = async () => {
  const r = runs.org; assert(r, 'BR-007 needs BR-003 in the same run');
  const t = await terminate(r.root);
  const item = (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){is_active closed_task_executions}}', { id: r.root.rootId })).getAgentOrgRootHistory;
  assert(item.is_active === false, 'Org root still active', { t, item });
  const { page, errors, context } = await newPage({ initScript: watchClosed(closedIdsOf(r)) });
  try {
    await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
    await page.locator(`[data-test="agent-org-definition-${slug(r.names.org)}"]`).click();
    await page.locator(`[data-test="agent-org-run-disclosure-${r.root.rootId}"]`).click(); // disclosure only: no context hydration
    await page.locator(rowSelector('org', r.plainRef)).waitFor({ state: 'visible', timeout: 30000 });
    await sleep(1500);
    const seen = await page.evaluate(() => window.__closedSeen);
    assert(seen.length === 0, 'closed Org rows rendered from the history list', { seen });
    await shot(page, 'org-history-first-render');
    assert(errors.length === 0, 'browser errors', errors);
    return { closedIds: closedIdsOf(r).length, seen, historyItemClosed: item.closed_task_executions };
  } finally { await context.close(); }
};

// ---------------------------------------------------------------- reactivation (reactivate-done-task-runs)
const reactivated = {};
/** The members of one task Team node of a stored tree, with their addresses. */
const teamMembersOf = (tree, teamRunId) => {
  let found = [];
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    if ((v.teamRunId ?? v.team_run_id) === teamRunId && Array.isArray(v.members)) {
      found = v.members.map((m) => ({ address: m.address, agentRunId: m.agentRunId ?? m.agent_run_id })).filter((m) => m.agentRunId);
    }
    Object.values(v).forEach(visit);
  };
  visit(tree); return found;
};
/** Records any of the given run rows that render at any time, from document start. */
const watchRows = (ids) => `(() => { const ids = ${JSON.stringify(ids)}; window.__rowsSeen = [];
  const check = () => { for (const id of ids) if (document.querySelector('[data-agent-run-id="' + id + '"], [data-test$="-row-' + id + '"]')) window.__rowsSeen.push(id); };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true }); })();`;
/** What the app does before a send to a stopped root (after a restart): the root's restore mutation. */
const restoreRoot = async (root) => {
  const r = Object.values(await gql(root.kind === 'agent' ? 'mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}'
    : root.kind === 'team' ? 'mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}'
      : 'mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}', { id: root.rootId }))[0];
  assert(r.success, `restore ${root.kind} root failed: ${r.message}`);
};
const centerText = (page) => page.locator('[data-test="workspace-center-pane"]').innerText();
/** The rendered status of one member row: an Org row's `data-status`, else the colour of its status dot. */
const memberRowStatus = async (page, kind, agentRunId) => {
  const row = page.locator(rowSelector(kind, { agentRunId })).first();
  if (kind === 'org') return row.getAttribute('data-status');
  const dot = await row.locator('[data-test="workspace-transient-status-dot"]').getAttribute('class');
  const byClass = [['gray', 'offline'], ['green', 'idle'], ['blue', 'running'], ['amber', 'initializing'], ['red', 'error']];
  return byClass.find(([colour]) => (dot ?? '').includes(`-${colour}-`))?.[1] ?? `unknown(${dot})`;
};
const expandTaskTeam = async (page, kind, teamRef) => {
  const row = page.locator(rowSelector(kind, teamRef));
  if ((await row.getAttribute('aria-expanded')) === 'false') await (kind === 'org' ? row : row.locator('[data-test="workspace-team-transient-disclosure"]')).click();
};
/**
 * AC-004/AC-002/AC-005 (+ AC-015, AC-014 in the tree): after DONE, a message while still DONE and a status change
 * alone show nothing; the assigner's message brings the worker row back live, then the Task Team copy via its
 * coordinator. The helpers stay hidden; the worker's conversation continues; a fresh page load keeps both rows.
 */
const liveReactivation = async (kind, label) => {
  const s = await setupRoot(kind, label, { withPlain: false });
  const { page, errors, context } = await newPage();
  try {
    await openRoot(page, s.root, s.names);
    const worker = { agentRunId: s.aAssigned.agentRunId };
    const helperRefs = s.aRefs.filter((r) => r.agentRunId !== worker.agentRunId);
    const workerSel = rowSelector(kind, worker);
    const helperSel = helperRefs.map((r) => rowSelector(kind, r));
    const teamSel = rowSelector(kind, s.bRef);
    for (const sel of [workerSel, ...helperSel, teamSel]) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
    // A delegated Task Team starts only its coordinator (delegated-team-member-lazy-activation AC-001, REQ-003): its row
    // renders Idle once it has answered, and the member no work has reached renders Offline (gray).
    await expandTaskTeam(page, kind, s.bRef);
    const lazyMembers = teamMembersOf(await storedTree(s.root), s.bRef.teamRunId);
    const lazyCoordinator = lazyMembers.find((m) => /\/reviewer$/.test(m.address));
    const lazyMember = lazyMembers.find((m) => /\/editor$/.test(m.address));
    assert(lazyCoordinator?.agentRunId && lazyMember?.agentRunId, 'task Team members not found', { members: lazyMembers });
    for (const m of [lazyCoordinator, lazyMember]) await page.locator(rowSelector(kind, { agentRunId: m.agentRunId })).waitFor({ state: 'visible', timeout: 30000 });
    await until('task Team coordinator Idle, unused member Offline', async () => (await memberRowStatus(page, kind, lazyCoordinator.agentRunId)) === 'idle'
      && (await memberRowStatus(page, kind, lazyMember.agentRunId)) === 'offline', 30000);
    await sleep(1500);
    const lazyStatuses = { coordinator: await memberRowStatus(page, kind, lazyCoordinator.agentRunId), unused: await memberRowStatus(page, kind, lazyMember.agentRunId) };
    assert(lazyStatuses.coordinator === 'idle' && lazyStatuses.unused === 'offline', 'task Team member statuses', lazyStatuses);
    await shot(page, `${kind}-task-team-lazy-members`);
    s.input.send(callTool('send_message_to', { target_agent_run_id: worker.agentRunId, content: 'Status of the release notes? PRE-DONE-7731' }));
    await sleep(2500); // The scripted worker answers at once; its conversation is asserted after the reactivation.
    // DONE: the Task A rows leave.
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'DONE' }));
    await until('Task A rows gone', goneAll(page, [workerSel, ...helperSel]), 60000);
    // Still DONE: the assigner's message is refused and nothing reappears (AC-015).
    s.input.send(callTool('send_message_to', { target_agent_run_id: worker.agentRunId, content: 'Too early?' }));
    await sleep(2000);
    assert(await page.locator(workerSel).count() === 0, 'worker row reappeared while the Task was DONE');
    // The agent reopens the Task: a status change alone shows nothing (AC-014).
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'IN_PROGRESS' }));
    await until('Task A reopened', async () => (await taskStatus(s.projectId, s.taskA)) === 'IN_PROGRESS', 30000);
    await sleep(1500);
    assert(await page.locator(workerSel).count() === 0, 'worker row reappeared on a status change alone');
    // The assigner's run-ID message: the worker row returns live, without reload; the helpers stay hidden.
    const sentAt = Date.now();
    s.input.send(callTool('send_message_to', { target_agent_run_id: worker.agentRunId, content: 'Second round for the release notes. POST-REOPEN-9902' }));
    await page.locator(workerSel).waitFor({ state: 'visible', timeout: 60000 });
    const reappearMs = Date.now() - sentAt;
    await sleep(1500);
    for (const sel of helperSel) assert(await page.locator(sel).count() === 0, `helper row reappeared: ${sel}`);
    assert((await taskStatus(s.projectId, s.taskA)) === 'IN_PROGRESS', 'Task status changed by the software');
    await shot(page, `${kind}-reactivated-live`);
    // The reactivated worker's conversation continues: the earlier exchange and the new message.
    await page.locator(workerSel).click();
    await until('reactivated conversation', async () => { const t = await centerText(page); return t.includes('PRE-DONE-7731') && t.includes('POST-REOPEN-9902'); }, 30000);
    const text = await centerText(page);
    assert(text.indexOf('PRE-DONE-7731') < text.indexOf('POST-REOPEN-9902'), 'earlier conversation not before the new message');
    await shot(page, `${kind}-reactivated-conversation`);
    // The Task Team copy (AC-002): DONE, reopen, then the coordinator's run ID brings back the Team and its members.
    const tree = await storedTree(s.root);
    const members = teamMembersOf(tree, s.bRef.teamRunId);
    const coordinator = members.find((m) => /\/reviewer$/.test(m.address));
    assert(coordinator, 'task Team coordinator not found', { members });
    s.input.send(callTool('create_or_update_task', { task_id: s.taskB, status: 'DONE' }));
    await until('Task B Team row gone', goneAll(page, [teamSel]), 60000);
    s.input.send(callTool('create_or_update_task', { task_id: s.taskB, status: 'IN_PROGRESS' }));
    await until('Task B reopened', async () => (await taskStatus(s.projectId, s.taskB)) === 'IN_PROGRESS', 30000);
    s.input.send(callTool('send_message_to', { target_agent_run_id: coordinator.agentRunId, content: 'Docs review, second round. TEAM-REOPEN-5150' }));
    await page.locator(teamSel).waitFor({ state: 'visible', timeout: 60000 });
    await expandTaskTeam(page, kind, s.bRef);
    for (const m of members) await page.locator(rowSelector(kind, { agentRunId: m.agentRunId })).waitFor({ state: 'visible', timeout: 30000 });
    assert(JSON.stringify(teamMembersOf(await storedTree(s.root), s.bRef.teamRunId).map((m) => m.agentRunId).sort()) === JSON.stringify(members.map((m) => m.agentRunId).sort()),
      'task Team members changed');
    await shot(page, `${kind}-team-reactivated-live`);
    assert(errors.length === 0, 'browser errors', errors);
    // A fresh page load keeps the reactivated rows; the helpers never render.
    const fresh = await newPage({ initScript: watchRows(helperRefs.map((r) => r.agentRunId)) });
    try {
      await openRoot(fresh.page, s.root, s.names);
      await fresh.page.locator(workerSel).waitFor({ state: 'visible', timeout: 30000 });
      await fresh.page.locator(teamSel).waitFor({ state: 'visible', timeout: 30000 });
      await sleep(1500);
      const seen = await fresh.page.evaluate(() => window.__rowsSeen);
      assert(seen.length === 0, 'helper rows rendered after reload', { seen });
      await shot(fresh.page, `${kind}-reactivated-after-reload`);
      assert(fresh.errors.length === 0, 'browser errors after reload', fresh.errors);
    } finally { await fresh.context.close(); }
    reactivated[kind] = { root: s.root, names: s.names, projectId: s.projectId, taskA: s.taskA, taskB: s.taskB, worker, helperRefs,
      teamRef: s.bRef, coordinator: coordinator.agentRunId, members: members.map((m) => m.agentRunId) };
    return { root: s.root, worker, helperRefs, teamRef: s.bRef, coordinator: coordinator.agentRunId, reappearMs, lazyStatuses };
  } finally { s.input.close(); await context.close(); }
};
/**
 * AC-004 restart + AC-010 + AC-011: after a real backend restart the reactivated rows are still listed and the
 * helpers never render; then DONE closes the worker again, the backend restarts once more (no in-memory runtime
 * authority exists), and the agent's reopen + run-ID message reactivates the worker live with its conversation.
 */
const reactivationAcrossRestart = async () => {
  const kinds = ['agent', 'team', 'org'].filter((k) => reactivated[k]);
  assert(kinds.length === 3, 'BR-011 needs BR-008..BR-010 in the same run');
  const visibleAfter = async (label) => {
    const out = {};
    for (const kind of kinds) {
      const r = reactivated[kind];
      const { page, errors, context } = await newPage({ initScript: watchRows(r.helperRefs.map((x) => x.agentRunId)) });
      try {
        await openRoot(page, r.root, r.names);
        await page.locator(rowSelector(kind, r.worker)).waitFor({ state: 'visible', timeout: 30000 });
        await page.locator(rowSelector(kind, r.teamRef)).waitFor({ state: 'visible', timeout: 30000 });
        await sleep(1500);
        const seen = await page.evaluate(() => window.__rowsSeen);
        assert(seen.length === 0, `${kind}: helper rows rendered (${label})`, { seen });
        await shot(page, `${kind}-reactivated-${label}`);
        assert(errors.length === 0, `${kind}: browser errors (${label})`, errors);
        out[kind] = { workerVisible: true, teamVisible: true, helpersSeen: seen };
      } finally { await context.close(); }
    }
    return out;
  };
  const firstRestart = await restartBackend();
  assert(firstRestart.before !== firstRestart.after, 'backend did not restart');
  const afterRestart = await visibleAfter('after-restart');
  // DONE again through each Manager (its root is restored by the message), then a second real restart.
  for (const kind of kinds) {
    const r = reactivated[kind];
    await restoreRoot(r.root);
    const input = await managerInput(r.root);
    try {
      input.send(callTool('create_or_update_task', { task_id: r.taskA, status: 'DONE' }));
      await until(`${kind}: Task A DONE again`, async () => (await taskStatus(r.projectId, r.taskA)) === 'DONE', 60000);
    } finally { input.close(); }
  }
  const secondRestart = await restartBackend();
  assert(secondRestart.before !== secondRestart.after, 'backend did not restart');
  const afterSecond = {};
  for (const kind of kinds) {
    const r = reactivated[kind];
    const { page, errors, context } = await newPage();
    await restoreRoot(r.root);
    const input = await managerInput(r.root);
    try {
      await openRoot(page, r.root, r.names);
      await sleep(1500);
      assert(await page.locator(rowSelector(kind, r.worker)).count() === 0, `${kind}: closed worker listed after restart`);
      input.send(callTool('create_or_update_task', { task_id: r.taskA, status: 'IN_PROGRESS' }));
      await until(`${kind}: Task A reopened after restart`, async () => (await taskStatus(r.projectId, r.taskA)) === 'IN_PROGRESS', 60000);
      input.send(callTool('send_message_to', { target_agent_run_id: r.worker.agentRunId, content: 'After the restart. POST-RESTART-4242' }));
      await page.locator(rowSelector(kind, r.worker)).waitFor({ state: 'visible', timeout: 90000 });
      await page.locator(rowSelector(kind, r.worker)).click();
      await until(`${kind}: conversation after restart`, async () => { const t = await centerText(page);
        return t.includes('PRE-DONE-7731') && t.includes('POST-REOPEN-9902') && t.includes('POST-RESTART-4242'); }, 60000);
      for (const ref of r.helperRefs) assert(await page.locator(rowSelector(kind, ref)).count() === 0, `${kind}: helper row listed after restart`);
      await shot(page, `${kind}-reactivated-after-second-restart`);
      assert(errors.length === 0, `${kind}: browser errors after the second restart`, errors);
      afterSecond[kind] = { reactivated: true, status: await taskStatus(r.projectId, r.taskA) };
    } finally { input.close(); await context.close(); }
  }
  return { firstRestart, afterRestart, secondRestart, afterSecond };
};

// ---------------------------------------------------------------- follow-up Task to an existing copy (delegate-to-existing-copy)
const assignedCopies = {};
/** The board's root line of one Task on its Project page: its state (`offline` when closed, else the live status) and name. */
const boardRoot = async (page, taskId) => {
  const row = page.locator(`[data-testid="project-task-row-${taskId}"]`);
  const line = row.locator('[data-testid^="project-task-root-"][data-openable]');
  if (!(await line.count())) return null;
  return { state: (await line.getAttribute('data-testid')).replace('project-task-root-', ''),
    name: (await row.locator('[data-testid="project-task-root-name"]').innerText()).trim() };
};
const LIVE = ['idle', 'running'];
const graphqlRoot = async (projectId, taskId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId status root { kind teamRunId ingressAgentRunId closed status start }}}',
  { id: projectId })).projectTasks.find((t) => t.taskId === taskId);
/** Records whether any of the given rows is ever absent while the page is watched (a row that must never leave). */
const watchPresence = (page, selectors) => page.evaluate((sels) => {
  window.__absent = [];
  const check = () => { for (const s of sels) if (!document.querySelector(s)) window.__absent.push(s); };
  window.__presenceObserver?.disconnect();
  window.__presenceObserver = new MutationObserver(check);
  window.__presenceObserver.observe(document, { subtree: true, childList: true, attributes: true });
  check();
}, selectors);
/** The Manager's own conversation of a standalone Agent root (the scripted actor replies `CALLED:<tool result>`). */
const managerConversation = async (root) => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: root.rootId })).getRunProjection?.conversation ?? []);
/**
 * REQ-008 / AC-002 / AC-003 / AC-004 / AC-005 in the tree and on the board. The Task Team copy finishes Task B (its row
 * leaves), then the Manager gives it follow-up Task B2 by its team run ID: the row comes back live without reload, the
 * conversation continues, B2's board root is that copy and B's root stays closed; DONE of B again never removes the row;
 * DONE of B2 does. The Agent copy does the same with its agent run ID (A → A2); its helpers stay hidden.
 */
const existingCopyAssignment = async (kind, label) => {
  const s = await setupRoot(kind, label, { withPlain: false });
  const { page, errors, context } = await newPage();
  const board = await newPage();
  try {
    await openRoot(page, s.root, s.names);
    const task = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
      { input: { projectId: s.projectId, description } })).createProjectTask.taskId;
    const taskB2 = await task('Tidy the docs-site review wording you proposed.');
    const taskA2 = await task('Follow up on the release-notes draft.');
    const teamSel = rowSelector(kind, s.bRef);
    const worker = { agentRunId: s.aAssigned.agentRunId };
    const workerSel = rowSelector(kind, worker);
    const helperSel = s.aRefs.filter((r) => r.agentRunId !== worker.agentRunId).map((r) => rowSelector(kind, r));
    for (const sel of [teamSel, workerSel, ...helperSel]) await page.locator(sel).waitFor({ state: 'visible', timeout: 30000 });
    const members = teamMembersOf(await storedTree(s.root), s.bRef.teamRunId);
    const coordinator = members.find((m) => /\/reviewer$/.test(m.address));
    assert(coordinator, 'task Team coordinator not found', { members });
    s.input.send(callTool('send_message_to', { target_agent_run_id: coordinator.agentRunId, content: 'Docs review notes. PRE-B-6610' }));
    s.input.send(callTool('send_message_to', { target_agent_run_id: worker.agentRunId, content: 'Release notes draft. PRE-A-6620' }));
    await sleep(2500);
    // Task B DONE: the Task Team row leaves.
    s.input.send(callTool('create_or_update_task', { task_id: s.taskB, status: 'DONE' }));
    await until('Task B Team row gone', goneAll(page, [teamSel]), 60000);
    // The follow-up Task to the same Team copy: the row returns live, without reload.
    const sentAt = Date.now();
    s.input.send(callTool('delegate_task', { target_team_run_id: s.bRef.teamRunId, task_id: taskB2 }));
    await page.locator(teamSel).waitFor({ state: 'visible', timeout: 60000 });
    const reappearMs = Date.now() - sentAt;
    await expandTaskTeam(page, kind, s.bRef);
    for (const m of members) await page.locator(rowSelector(kind, { agentRunId: m.agentRunId })).waitFor({ state: 'visible', timeout: 30000 });
    await until('coordinator row live', async () => LIVE.includes(await memberRowStatus(page, kind, coordinator.agentRunId)), 30000);
    assert(JSON.stringify(teamMembersOf(await storedTree(s.root), s.bRef.teamRunId).map((m) => m.agentRunId).sort()) === JSON.stringify(members.map((m) => m.agentRunId).sort()),
      'task Team members changed');
    await shot(page, `${kind}-existing-copy-team-back`);
    // The board: B2's root is the reused copy, live; B is DONE with that copy closed.
    await board.page.goto(`${stack.frontendUrl}/projects/${s.projectId}`, { waitUntil: 'networkidle', timeout: 120000 });
    let b2Root; let bRoot;
    await until('board: B2 root live, B root closed', async () => { b2Root = await boardRoot(board.page, taskB2); bRoot = await boardRoot(board.page, s.taskB);
      return LIVE.includes(b2Root?.state) && bRoot?.state === 'offline'; }, 30000).catch((e) => { throw Object.assign(e, { details: { b2Root, bRoot } }); });
    assert(b2Root.name === bRoot.name, 'B2 root is not the same copy as B', { b2Root, bRoot });
    const g = await graphqlRoot(s.projectId, taskB2);
    assert(g.root.teamRunId === s.bRef.teamRunId && g.root.ingressAgentRunId === coordinator.agentRunId && g.root.closed === false, 'B2 GraphQL root', g);
    await shot(board.page, `${kind}-existing-copy-board`);
    // AC-004: DONE of B again (and CANCELLED) never removes the row or closes B2's root.
    await watchPresence(page, [teamSel]);
    for (const status of ['DONE', 'CANCELLED', 'DONE']) {
      s.input.send(callTool('create_or_update_task', { task_id: s.taskB, status }));
      await until(`Task B ${status}`, async () => (await taskStatus(s.projectId, s.taskB)) === status, 30000);
      await sleep(1500);
    }
    const absent = await page.evaluate(() => window.__absent);
    assert(absent.length === 0, 'Team copy row left on a repeated close of its earlier Task', { absent });
    assert(LIVE.includes((await boardRoot(board.page, taskB2))?.state), 'B2 board root no longer live after a repeated close of B');
    // The conversation continues: the earlier exchange, then the new Task from the Manager.
    await page.locator(rowSelector(kind, { agentRunId: coordinator.agentRunId })).click();
    await until('continued coordinator conversation', async () => { const t = await centerText(page); return t.includes('PRE-B-6610') && t.includes(`New Task assigned to you: ${taskB2}`); }, 30000);
    const text = await centerText(page);
    assert(text.indexOf('PRE-B-6610') < text.indexOf(`New Task assigned to you: ${taskB2}`), 'earlier conversation not before the new Task');
    await shot(page, `${kind}-existing-copy-conversation`);
    // A fresh page load keeps the row.
    const fresh = await newPage();
    try {
      await openRoot(fresh.page, s.root, s.names);
      await fresh.page.locator(teamSel).waitFor({ state: 'visible', timeout: 30000 });
      assert(fresh.errors.length === 0, 'browser errors after reload', fresh.errors);
    } finally { await fresh.context.close(); }
    // AC-005: DONE of B2 closes the copy: the row leaves and B2's root goes offline.
    s.input.send(callTool('create_or_update_task', { task_id: taskB2, status: 'DONE' }));
    await until('Team row gone at B2 DONE', goneAll(page, [teamSel]), 60000);
    await until('B2 board root offline', async () => (await boardRoot(board.page, taskB2))?.state === 'offline', 30000);
    // AC-003: the Agent copy. A DONE removes the worker and its helpers; A2 by its agent run ID brings back only the worker.
    s.input.send(callTool('create_or_update_task', { task_id: s.taskA, status: 'DONE' }));
    await until('Task A rows gone', goneAll(page, [workerSel, ...helperSel]), 60000);
    s.input.send(callTool('delegate_task', { target_agent_run_id: worker.agentRunId, task_id: taskA2 }));
    await page.locator(workerSel).waitFor({ state: 'visible', timeout: 60000 });
    await sleep(1500);
    for (const sel of helperSel) assert(await page.locator(sel).count() === 0, `helper row reappeared: ${sel}`);
    await until('board: A2 root live', async () => LIVE.includes((await boardRoot(board.page, taskA2))?.state), 30000);
    await page.locator(workerSel).click();
    await until('continued worker conversation', async () => { const t = await centerText(page); return t.includes('PRE-A-6620') && t.includes(`New Task assigned to you: ${taskA2}`); }, 30000);
    await shot(page, `${kind}-existing-copy-agent-back`);
    s.input.send(callTool('create_or_update_task', { task_id: taskA2, status: 'DONE' }));
    await until('worker row gone at A2 DONE', goneAll(page, [workerSel]), 60000);
    assert(errors.length === 0 && board.errors.length === 0, 'browser errors', [...errors, ...board.errors]);
    assignedCopies[kind] = { root: s.root, names: s.names, projectId: s.projectId, teamRef: s.bRef, coordinator: coordinator.agentRunId,
      coordinatorAddress: coordinator.address, members: members.map((m) => m.agentRunId), worker, taskB: s.taskB, taskB2, taskA2 };
    return { root: s.root, teamRef: s.bRef, coordinator: coordinator.agentRunId, taskB2, taskA2, reappearMs, b2Root, bRoot };
  } finally { s.input.close(); await context.close(); await board.context.close(); }
};
/**
 * AC-011 (+ REQ-008, REQ-013): after a real backend restart, the Manager gives the stopped Team copy a new Task by its team
 * run ID: the row comes back live and the conversation continues. After a second restart the assignment and the row persist
 * and the board's root is still that copy.
 */
const existingCopyAcrossRestart = async () => {
  const kinds = ['agent', 'team', 'org'].filter((k) => assignedCopies[k]);
  assert(kinds.length === 3, 'BR-015 needs BR-012..BR-014 in the same run');
  const firstRestart = await restartBackend();
  assert(firstRestart.before !== firstRestart.after, 'backend did not restart');
  const out = {};
  for (const kind of kinds) {
    const r = assignedCopies[kind];
    const taskB3 = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
      { input: { projectId: r.projectId, description: 'After the restart: one more docs-site pass.' } })).createProjectTask.taskId;
    r.taskB3 = taskB3;
    const { page, errors, context } = await newPage();
    await restoreRoot(r.root);
    const input = await managerInput(r.root);
    try {
      // Every Task copy of this root is closed now: an Agent run shows no task tree until the copy is assigned again.
      await openRoot(page, r.root, r.names, { requireTaskTree: false });
      await sleep(1500);
      assert(await page.locator(rowSelector(kind, r.teamRef)).count() === 0, `${kind}: closed Team copy listed after restart`);
      input.send(callTool('delegate_task', { target_team_run_id: r.teamRef.teamRunId, task_id: taskB3 }));
      await page.locator(rowSelector(kind, r.teamRef)).waitFor({ state: 'visible', timeout: 90000 });
      await expandTaskTeam(page, kind, r.teamRef);
      await page.locator(rowSelector(kind, { agentRunId: r.coordinator })).click();
      await until(`${kind}: conversation continues after restart`, async () => { const t = await centerText(page);
        return t.includes('PRE-B-6610') && t.includes(`New Task assigned to you: ${r.taskB2}`) && t.includes(`New Task assigned to you: ${taskB3}`); }, 90000);
      // The entry is committed `starting`, the work delivered, then marked `started`: the message can show first.
      let g;
      await until(`${kind}: B3 root started`, async () => (g = await graphqlRoot(r.projectId, taskB3))?.root?.start === 'started', 30000)
        .catch((e) => { throw Object.assign(e, { details: g }); });
      assert(g.root.teamRunId === r.teamRef.teamRunId && g.root.closed === false, `${kind}: B3 root`, g);
      await shot(page, `${kind}-existing-copy-after-restart`);
      assert(errors.length === 0, `${kind}: browser errors after restart`, errors);
      out[kind] = { taskB3, root: g.root };
    } finally { input.close(); await context.close(); }
  }
  const secondRestart = await restartBackend();
  assert(secondRestart.before !== secondRestart.after, 'backend did not restart');
  for (const kind of kinds) {
    const r = assignedCopies[kind];
    const { page, errors, context } = await newPage();
    try {
      await openRoot(page, r.root, r.names);
      await page.locator(rowSelector(kind, r.teamRef)).waitFor({ state: 'visible', timeout: 30000 });
      const g = await graphqlRoot(r.projectId, r.taskB3);
      assert(g.root.teamRunId === r.teamRef.teamRunId && g.root.closed === false, `${kind}: B3 assignment lost after restart`, g);
      await page.goto(`${stack.frontendUrl}/projects/${r.projectId}`, { waitUntil: 'networkidle', timeout: 120000 });
      // The root is not restored yet, so the open copy reads Offline (its host is inactive); it is still B3's root.
      let b3; let b2;
      await until(`${kind}: board after second restart`, async () => { b3 = await boardRoot(page, r.taskB3); b2 = await boardRoot(page, r.taskB2); return b3 && b2; }, 30000);
      assert(b3.name === b2.name, `${kind}: B3 board root is not the same copy`, { b3, b2 });
      await shot(page, `${kind}-existing-copy-board-after-second-restart`);
      assert(errors.length === 0, `${kind}: browser errors after the second restart`, errors);
      out[kind] = { ...out[kind], afterSecondRestart: { root: g.root, board: { b3, b2 } } };
    } finally { await context.close(); }
  }
  return { firstRestart, secondRestart, ...out };
};
/**
 * AC-013 / REQ-005 (damaged Task data, detected when the backend loads): one Task's assignment file is unreadable. The
 * Manager's list_project_tasks marks only that Task assignments-unavailable; giving a copy a follow-up Task is refused and
 * changes nothing. After the file is restored and the backend restarts, the same follow-up is accepted.
 */
const damagedTaskData = async () => {
  const r = assignedCopies.agent; assert(r, 'BR-016 needs BR-012 in the same run');
  const file = path.join(stack.dataRoot, 'projects', encodeURIComponent(r.projectId), 'tasks', encodeURIComponent(r.taskB), 'agent_run_resources.json');
  const original = await fsp.readFile(file, 'utf8');
  const taskA3 = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
    { input: { projectId: r.projectId, description: 'A third pass on the release notes.' } })).createProjectTask.taskId;
  const a3Dir = path.join(stack.dataRoot, 'projects', encodeURIComponent(r.projectId), 'tasks', encodeURIComponent(taskA3));
  await stopGroup(stack.backend);
  await fsp.writeFile(file, '{"agentRunResources": [ {"broken": ');
  await startBackend(stack.backendPort);
  await restoreRoot(r.root);
  let input = await managerInput(r.root);
  let conversation = '';
  try {
    input.send(callTool('list_project_tasks', { project_id: r.projectId }));
    await until('list with a damaged Task', async () => (conversation = await managerConversation(r.root)).includes('assignmentsUnavailable'), 60000);
    const before = conversation.length;
    input.send(callTool('delegate_task', { target_agent_run_id: r.worker.agentRunId, task_id: taskA3 }));
    await until('refusal while Task data is unreadable', async () => /could not be read/.test((conversation = await managerConversation(r.root)).slice(before)), 60000);
    assert(!(await fsp.readdir(a3Dir)).includes('agent_run_resources.json'), 'a refused assignment wrote Task data');
    assert((await fsp.readFile(file, 'utf8')) === '{"agentRunResources": [ {"broken": ', 'damaged file was rewritten');
  } finally { input.close(); }
  const refusal = conversation.slice(conversation.lastIndexOf('CALLED:')).slice(0, 600);
  await stopGroup(stack.backend);
  await fsp.writeFile(file, original);
  await startBackend(stack.backendPort);
  await restoreRoot(r.root);
  input = await managerInput(r.root);
  try {
    input.send(callTool('delegate_task', { target_agent_run_id: r.worker.agentRunId, task_id: taskA3 }));
    await until('accepted after the file is restored', async () => (await graphqlRoot(r.projectId, taskA3))?.root?.start === 'started', 90000);
    const g = await graphqlRoot(r.projectId, taskA3);
    assert(g.root.ingressAgentRunId === r.worker.agentRunId && g.root.closed === false, 'A3 root after recovery', g);
    return { damagedTask: r.taskB, refusal, recovered: g.root };
  } finally { input.close(); }
};

const CASES = {
  'BR-001': ['Agent root live DONE: rows fade, fallback to the run row, focus, Team tab, reopen, Task Team via composer', () => liveDone('agent', 'BrAgent')],
  'BR-002': ['Agent Team root live DONE (same journey; fallback to the delegating Manager)', () => liveDone('team', 'BrTeam')],
  'BR-003': ['Agent Org root live DONE (same journey; fallback to the delegating Manager)', () => liveDone('org', 'BrOrg')],
  'BR-004': ['Reduced motion (Agent and Team trees): removed at once; focus to the run row', async () => ({ agent: await reducedMotion('agent', 'RmAgent'), team: await reducedMotion('team', 'RmTeam') })],
  'BR-005': ['Reload, then real backend restart + reload: closed rows never render', reloadAndRestart],
  'BR-006': ['CR-001: the last task rows under an Agent run fade; the empty tree then disappears', lastRows],
  'BR-007': ['SP-3: stopped Org run expanded from history before hydration renders no closed rows', orgHistoryFirstRender],
  'BR-008': ['Agent root reactivation: refused while DONE, status alone shows nothing, worker and Task Team rows return live, helpers stay hidden, reload', () => liveReactivation('agent', 'RaAgent')],
  'BR-009': ['Agent Team root reactivation (same journey)', () => liveReactivation('team', 'RaTeam')],
  'BR-010': ['Agent Org root reactivation (same journey)', () => liveReactivation('org', 'RaOrg')],
  'BR-011': ['Real backend restart: reactivated rows stay; DONE, restart, reopen and message reactivate the worker again', reactivationAcrossRestart],
  'BR-012': ['Agent root follow-up Task to an existing copy: Team and Agent copy rows return live, board roots, repeated close of the earlier Task keeps them', () => existingCopyAssignment('agent', 'ExAgent')],
  'BR-013': ['Agent Team root follow-up Task to an existing copy (same journey)', () => existingCopyAssignment('team', 'ExTeam')],
  'BR-014': ['Agent Org root follow-up Task to an existing copy (same journey)', () => existingCopyAssignment('org', 'ExOrg')],
  'BR-015': ['Real backend restart: a stopped copy takes a follow-up Task live with its conversation; the assignment and row persist across another restart', existingCopyAcrossRestart],
  'BR-016': ['Damaged Task data at load: assignments unavailable, follow-up refused and nothing written; accepted after restore and restart', damagedTaskData],
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
    try {
      const details = await fn();
      evidence.cases[id] = { result: 'Pass', description, details };
    } catch (error) {
      result = 'Fail';
      evidence.cases[id] = { result: 'Fail', description, message: error.message, details: error.details };
      evidence.failures.push({ id, message: error.message });
    }
    if (ledger) await fsp.appendFile(ledger, `\n- ${id}: ${evidence.cases[id].result} — ${description}${evidence.cases[id].message ? ` (${evidence.cases[id].message})` : ''}. Evidence: ${evidencePath}\n`);
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
process.stdout.write(`Task closure tree probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);
