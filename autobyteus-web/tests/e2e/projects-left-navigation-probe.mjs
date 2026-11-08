#!/usr/bin/env node
// Projects mode in the left panel (projects-left-navigation, autobyteus-347; a Project lists exactly the runs started under
// it since projects-tree-one-place, autobyteus-353): real Nuxt dev frontend + built backend +
// fresh headless Chrome. Run from the repository root:
//   pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh dir> [--cases PLN-01,PLN-02,...]
//   Optional: --browser-executable <path>
// Prerequisites: installed workspace dependencies, a current `pnpm -C autobyteus-server-ts prebuild && build`
// (the probe runs autobyteus-server-ts/dist/app.js), and Chrome.
// Agents run on the AGY runtime with the repository's scripted CLI (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs,
// AGY_FAKE_CASE=linked_skills): a message containing `CALL_TOOL:{...}` makes that agent call the actual scoped MCP tool
// (real delegate_task / update_task / send_message_to). No provider inference, no mocked routes. Every run is started
// through the product's own New chat (typing and sending), except the seeded "existing" runs, created through the public
// GraphQL API as an earlier build would have.
// Cases (later cases use what earlier ones created; run them in order):
//   PLN-01 353 AC-001 (the user's case), 347 AC-001: a Workspaces run that handed out Tasks of 3 Projects is in no Project
//          (no Project has a run, so the Projects view shows its "No Project has a run yet" state: workspace-tree-vs-chooser
//          REQ-009); it stays in Workspaces with its delegated work; switching views keeps the open run; the view is
//          remembered on reload; no ORGS group in the Projects view.
//   PLN-02 347 AC-003/REQ-004/005/006: New chat, chip → Project P (P is not listed yet: it has no run) → choose the agent →
//          send → P appears with the run at once, folder, prompt.
// The view is chosen with the run section's header menu (workspace-tree-vs-chooser REQ-006); the stored choice is read from
// local storage (`autobyteus.leftPanel.runSectionMode.<node>`).
//   PLN-03 347 AC-015/AC-004: New chat chip: Project with two folders (first), no folder (temp), folder kept, "No project".
//   PLN-04 353 AC-003, 347 AC-005: a Team under a Project, listed once; "+" on the Project's agent group.
//   PLN-05 353 AC-002, 347 AC-006/AC-010: real delegation from the run under P (a P Team with Task line and members, P,
//          Q and Temp-task work): all nested under the run in P, live; the run is not listed under Q; board follows.
//   PLN-06 347 AC-008: DONE removes the rows live; reopen + the assigner's message brings them back.
//   PLN-07 353 REQ-001/DEC-003: with 6 newer runs under P, P lists the 6 newest only (the older run hosting open work is not
//          pinned); after 3 are archived it is listed again and opens with its delegated run.
//   PLN-08 353 AC-004 (reconnect): real backend restart with Projects mode shown: the tree stays; a Project created after it
//          is not listed without a run (workspace-tree-vs-chooser REQ-009) and is listed within one history poll once
//          another client starts a run under it, while the view stays open (autobyteus-388 AC-003); work dispatched after
//          the restart appears live; the current state after a reload.
//   PLN-09 353 AC-004: archive and delete a run in Projects mode (gone in both modes), Stop of an Agent and a Team run reads
//          stopped at once, group "Archive all" only touches the Project's runs, a deleted Project leaves the tree live.
//   PLN-10 347 AC-013/AC-016/AC-017: keyboard, zh-CN, narrow layout and strip, briefcase icons; reference screenshots.
//   PLN-11 388 AC-003: with the Projects view kept open, runs started and archived by another client (the API) list and
//          unlist their Project within one history poll: a new Project's only run; and a Project's run that is older than
//          the 6 newest runs of its agent in its folder. With the view hidden, no Project is read.
// The probe owns a private data root, free ports, the backend and Nuxt process groups and Chrome, and removes them in
// finally. It never uses the installed app or user data.
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
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/projects-left-navigation'));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
const ALL_CASES = ['PLN-01', 'PLN-02', 'PLN-03', 'PLN-04', 'PLN-05', 'PLN-06', 'PLN-07', 'PLN-08', 'PLN-09', 'PLN-10', 'PLN-11'];
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
/** The caller's environment without AutoByteus settings or provider credentials (keys never come from the environment). */
const callerEnv = () => Object.fromEntries(Object.entries(process.env)
  .filter(([k]) => !k.startsWith('AUTOBYTEUS_') && !/(_API_KEY|_TOKEN|_SECRET|_ACCESS_KEY)$/i.test(k) && !/^(ANTHROPIC|OPENAI|GEMINI|AWS|AZURE)_/i.test(k)));
const backendEnv = () => ({ APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') });
const startBackend = async (port) => {
  stack.backendStarts += 1;
  const env = { ...callerEnv(), ...backendEnv(),
    // A disposable HOME keeps the scripted actors' files out of the user's home.
    HOME: stack.home, ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', stack.dataRoot],
    serverDir, withNodeCredential(env), `backend-${stack.backendStarts}`);
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.dataRoot = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'projects-left-navigation-')));
  stack.home = path.join(stack.dataRoot, 'home');
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'home', 'p-folder', 'r-first', 'r-second', 'picked-folder']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendPort = backendPort;
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  await startBackend(backendPort);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...callerEnv(), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
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

// ---------------------------------------------------------------- public API (what the app's own screens do)
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const folder = (name) => path.join(stack.dataRoot, name);
const AGY = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
const runConfig = (workspaceRootPath) => ({ workspaceRootPath, llmModelIdentifier: AGY.llmModelIdentifier, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY.runtimeKind });
const s = { ids: {}, names: {}, projects: {}, tasks: {}, runs: {} };
const seed = async () => {
  const suffix = randomUUID().slice(0, 4);
  const agent = async (key, name, toolNames) => {
    s.names[key] = name;
    s.ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
      { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames, defaultLaunchConfig: AGY } })).createAgentDefinition.id;
  };
  await agent('manager', `Project Task Manager ${suffix}`, ['create_task', 'update_task']);
  await agent('writer', `Release Notes Writer ${suffix}`, []);
  await agent('checker', `Fact Checker ${suffix}`, []);
  s.names.squad = `Docs Review Team ${suffix}`;
  s.ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: s.names.squad, description: s.names.squad, instructions: 'Review.', coordinatorMemberName: 'reviewer', defaultLaunchConfig: AGY,
      nodes: [{ memberName: 'reviewer', ref: s.ids.writer, refScope: 'SHARED' }, { memberName: 'editor', ref: s.ids.checker, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const project = async (key, name, folders) => {
    s.projects[key] = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}',
      { input: { name, workspaces: folders.map((workspaceRootPath) => ({ workspaceRootPath, description: path.basename(workspaceRootPath) })) } })).createProject;
  };
  await project('P', `Prototype Launch ${suffix}`, [folder('p-folder')]);
  await project('Q', `Docs Site ${suffix}`, []);
  await project('R', `Website ${suffix}`, [folder('r-first'), folder('r-second')]);
  const task = async (key, projectKey, title) => {
    s.tasks[key] = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
      { input: { projectId: s.projects[projectKey].projectId, title, description: title } })).createProjectTask.taskId;
  };
  for (const [key, projectKey, title] of [['P1', 'P', 'Review the launch checklist'], ['P2', 'P', 'Write the release notes'],
    ['P3', 'P', 'Check the changelog'], ['P4', 'P', 'Old archived work'], ['P5', 'P', 'Work after the restart'],
    ['Q1', 'Q', 'Check the docs links'], ['Q2', 'Q', 'Follow-up docs work'], ['Q3', 'Q', 'Docs work from Workspaces'],
    ['R1', 'R', 'Website work from Workspaces']]) await task(key, projectKey, title);
  // A registered workspace for P's folder (Workspaces mode lists it as today).
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: folder('p-folder') } });
};
const projectRunsFile = (projectId) => path.join(stack.dataRoot, 'projects', projectId, 'project_runs.json');
const startedUnder = async (projectId) => JSON.parse(await fsp.readFile(projectRunsFile(projectId), 'utf8').catch(() => '{"runs":[]}')).runs.map((r) => r.root);
const metadataOf = async (runId) => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{workspaceRootPath llmModelIdentifier runtimeKind}}}', { id: runId })).getAgentRunResumeConfig.metadataConfig;
/** The composed prompt a run was started with (its AGY capsule's main agent file). */
const promptOf = async (runId) => {
  const walk = async (dir) => {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      if (entry.name === 'agy-project') {
        const manifest = JSON.parse(await fsp.readFile(path.join(full, 'manifest.json'), 'utf8').catch(() => '{}'));
        if (manifest.runId === runId) return { full, manifest };
      } else { const found = await walk(full); if (found) return found; }
    }
    return null;
  };
  const capsule = await walk(path.join(stack.dataRoot, 'memory'));
  if (!capsule) return null;
  const agents = path.join(capsule.full, '.agents', 'agents');
  const [name] = await fsp.readdir(agents);
  return { text: await fsp.readFile(path.join(agents, name, 'agent.md'), 'utf8'), workspacePath: capsule.manifest.workspacePath };
};
const projectSection = (projectKey) => `Project ${s.projects[projectKey].name} (Project ID ${s.projects[projectKey].projectId})`;
const projectRead = async (projectKey) => (await gql(`query($id:String!){projectRunHistory(projectId:$id){agentDefinitions{agentDefinitionId runs{runId}}
  teamDefinitions{runs{teamRunId}}}}`, { id: s.projects[projectKey].projectId })).projectRunHistory;
const workspaceRunIds = async () => (await gql('query{listWorkspaceRunHistory{workspaceRootPath agentDefinitions{runs{runId}} teamDefinitions{runs{teamRunId}}}}'))
  .listWorkspaceRunHistory.flatMap((g) => [...g.agentDefinitions.flatMap((d) => d.runs.map((r) => r.runId)), ...g.teamDefinitions.flatMap((d) => d.runs.map((r) => r.teamRunId))]);
const createAgentRun = async (extra = {}, workspace = folder('p-folder')) => {
  const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
    { input: { agentDefinitionId: s.ids.manager, ...runConfig(workspace), ...extra } })).createAgentRun;
  assert(r.success, r.message); return r.runId;
};
const isActive = async (runId) => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: runId })).getAgentRunResumeConfig.isActive;
/** Reopens a stopped run as the app does before sending to it. */
const restoreAgent = async (runId) => {
  if (await isActive(runId)) return;
  const r = (await gql('mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}', { id: runId })).restoreAgentRun;
  assert(r.success, r.message);
};
const teamIsActive = async (teamRunId) => (await gql('query{listWorkspaceRunHistory{teamDefinitions{runs{teamRunId isActive}}}}'))
  .listWorkspaceRunHistory.flatMap((g) => g.teamDefinitions.flatMap((d) => d.runs)).find((r) => r.teamRunId === teamRunId)?.isActive ?? false;
const restoreTeam = async (teamRunId) => {
  if (await teamIsActive(teamRunId)) return;
  const r = (await gql('mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}', { id: teamRunId })).restoreAgentTeamRun;
  assert(r.success, r.message);
};
const terminateAgent = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: runId });
const taskNodes = (tree) => {
  const found = [];
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    const startedAt = v.startedAt ?? v.started_at; const agentRunId = v.agentRunId ?? v.agent_run_id; const teamRunId = v.teamRunId ?? v.team_run_id;
    if (typeof startedAt === 'string' && (agentRunId || teamRunId)) found.push({ agentRunId: teamRunId ? undefined : agentRunId, teamRunId, address: v.address,
      members: (v.members ?? []).map((m) => ({ address: m.address, agentRunId: m.agentRunId ?? m.agent_run_id })).filter((m) => m.agentRunId) });
    Object.values(v).forEach(visit);
  };
  visit(tree); return found;
};
const storedTree = async (runId) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId })).agentRunCollaboration?.root_agent?.execution_tree;
const closedOf = async (runId) => ((await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId })).agentRunCollaboration?.root_agent?.closed_task_executions ?? [])
  .map((e) => e.teamRunId ?? e.agentRunId);
const conversationText = async (runId) => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
const sockets = [];
/** The run's own input channel (what its composer sends): a user message to the agent. */
const runInput = async (runId) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return { send: (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `e2e-${randomUUID()}`,
    dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } })), close: () => socket.close() };
};
/** One scripted tool call sent as a user message to `runId`; waits for its `CALLED:` result and returns it. */
const agentCalls = async (runId, toolName, args) => {
  const before = ((await conversationText(runId)).match(/CALLED:/g) ?? []).length;
  const input = await runInput(runId);
  try {
    input.send(callTool(toolName, args));
    let text = '';
    await until(`${toolName} result`, async () => ((text = await conversationText(runId)).match(/CALLED:/g) ?? []).length > before, 60000);
    return text.slice(text.lastIndexOf('CALLED:'), text.lastIndexOf('CALLED:') + 700);
  } finally { input.close(); }
};
const nodeOf = async (rootId, predicate, label) => until(label, async () => taskNodes(await storedTree(rootId)).find(predicate), 60000);

// ---------------------------------------------------------------- browser helpers
let browser;
const newPage = async ({ width = 1440, height = 900, locale = 'en-US' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, locale });
  await attachToBrowserContext(context);
  if (locale !== 'en-US') await context.addInitScript((l) => { try { localStorage.setItem('autobyteus.localization.preference-mode', l); } catch { /* ignore */ } }, locale);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // A cold Nuxt dev server may reload once for dependency optimization; those transient errors are not app errors.
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization|Failed to load resource|WebSocket connection to/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const T = (id) => `[data-test="${id}"]`;
const sectionOf = (page, projectKey) => page.locator(`section:has(> ${T('project-row')}[data-project-id="${s.projects[projectKey].projectId}"])`);
const runRowIn = (scope, runId) => scope.locator(`${T('workspace-agent-run-row')}[data-run-id="${runId}"]`);
const copyRowIn = (scope, agentRunId) => scope.locator(`${T('workspace-team-transient-execution-row')}[data-agent-run-id="${agentRunId}"]`);
const teamCopyRowIn = (scope, address) => scope.locator(`${T('workspace-team-transient-execution-row')}[data-transient-kind="task_team"][data-member-address="${address}"]`);
const centerText = (page) => page.locator(T('workspace-center-pane')).innerText().catch(() => '');
const gotoWorkspace = async (page) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator(T('run-section-view-menu')).waitFor({ timeout: 120000 });
};
/** The run section's stored view (`workspaces` when none is stored). */
const currentMode = (page) => page.evaluate(() => Object.entries(window.localStorage)
  .find(([key]) => key.startsWith('autobyteus.leftPanel.runSectionMode.'))?.[1] ?? 'workspaces');
const showMode = async (page, mode) => {
  if ((await currentMode(page)) !== mode) {
    await page.locator(T('run-section-view-menu')).click();
    await page.locator(T(`run-section-view-${mode}`)).click();
  }
  await until(`${mode} view`, async () => (await currentMode(page)) === mode);
  if (mode === 'projects') await until('Projects read', async () => (await page.locator(`${T('project-row')}, ${T('projects-tree-no-runs')}, ${T('projects-tree-empty')}`).count()) >= 1, 60000);
};
const openProject = async (page, projectKey) => {
  const section = sectionOf(page, projectKey);
  const disclosure = section.locator(T('project-row-disclosure'));
  if ((await disclosure.getAttribute('aria-expanded')) !== 'true') await disclosure.click();
  await until(`Project ${projectKey} open`, async () => (await disclosure.getAttribute('aria-expanded')) === 'true');
  return section;
};
const openAgentGroup = async (scope, definitionId) => {
  const group = scope.locator(`${T('workspace-agent-row')}[data-agent-definition-id="${definitionId}"]`).first();
  await group.waitFor({ timeout: 30000 });
  if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click();
  await until('agent group open', async () => (await group.getAttribute('aria-expanded')) === 'true');
  return group;
};
const listedRunIds = async (scope) => scope.locator(T('workspace-agent-run-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id')));
/** Types and sends the first message on the New chat start surface; returns the created Agent run id from the URL. */
const sendFirst = async (page, text) => {
  const input = page.locator(`${T('chat-composer')} textarea`).first();
  await input.click(); await input.fill(text);
  await page.locator(T('chat-primary-action')).first().click();
  await page.waitForURL((u) => /[?&]id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 });
  return new URL(page.url()).searchParams.get('id');
};
const chooseTarget = async (page, definitionId) => {
  await page.locator(T('run-target-switcher-trigger')).click();
  await page.locator(T(`run-target-switcher-option-${definitionId}`)).click();
  await until('target chosen', async () => (await page.locator(T('run-target-switcher-menu')).count()) === 0, 10000);
};
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]';
/** The user picks the AGY model in the draft's model menu (a target switch keeps the draft's earlier model, CR-004). */
const pickAgyModel = async (page) => {
  await page.locator(T('chat-model-trigger')).first().click();
  const list = page.locator(T(`chat-model-list-${AGY.runtimeKind}`));
  const row = page.locator(T(`chat-runtime-${AGY.runtimeKind}`));
  for (let attempt = 0; attempt < 6 && !(await list.isVisible().catch(() => false)); attempt += 1) {
    await row.hover().catch(() => {}); await sleep(400);
    if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await sleep(700); }
  }
  await list.locator(MODEL_ROW).first().waitFor({ timeout: 60000 });
  const rowBox = await row.boundingBox({ timeout: 1000 }).catch(() => null);
  const listBox = await list.boundingBox({ timeout: 1000 }).catch(() => null);
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 });
  await list.locator(T(`chat-model-option-${AGY.llmModelIdentifier}`)).click();
  await until('AGY model chosen', async () => (await page.locator(T('chat-model-menu')).count()) === 0 || !(await list.isVisible().catch(() => false)), 10000).catch(() => page.keyboard.press('Escape'));
};
const chipText = async (page) => (await page.locator(T('chat-workspace-trigger')).innerText()).trim().replace(/\s+/g, ' ');
const chooseChipProject = async (page, projectKey) => {
  await page.locator(T('chat-workspace-trigger')).click();
  await page.locator(T('chat-target-tab-projects')).click();
  await page.locator(projectKey ? T(`chat-project-option-${s.projects[projectKey].projectId}`) : T('chat-project-option-none')).click();
  await sleep(300);
};

// ---------------------------------------------------------------- cases
/**
 * 353 AC-001 (the user's case), 347 AC-001: a Workspaces run that handed out Tasks of 3 Projects is in no Project; each
 * shows the empty hint; it stays in Workspaces with its delegated work; switching modes keeps the open run; mode remembered.
 */
const existingRuns = async () => {
  const W = s.runs.W = await createAgentRun();
  for (const [taskKey, recipient] of [['P3', 'writer'], ['Q3', 'writer'], ['R1', 'checker']]) {
    const result = await agentCalls(W, 'delegate_task', { recipient_address: `/${segment(s.names[recipient])}`, task_id: s.tasks[taskKey] });
    assert(/"delegated":true/.test(result.replace(/\\"/g, '"')), `delegation of ${taskKey} failed`, result);
  }
  const wCopies = taskNodes(await storedTree(W)).map((n) => n.agentRunId).filter(Boolean);
  assert(wCopies.length === 3, 'W did not start its 3 copies', wCopies);
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    // Workspaces mode: the run and its three delegated runs, as today.
    const wsGroup = page.locator(`${T('workspace-agent-row')}[data-workspace-root="${folder('p-folder')}"][data-agent-definition-id="${s.ids.manager}"]`).first();
    if (!(await wsGroup.isVisible().catch(() => false))) await page.locator(T('workspace-row'), { hasText: 'p-folder' }).first().click();
    if ((await wsGroup.getAttribute('aria-expanded')) !== 'true') await wsGroup.click();
    const wRow = page.locator(`${T('workspace-agent-run-row')}[data-run-id="${W}"]`);
    await wRow.click();
    await until('W open', async () => new URL(page.url()).searchParams.get('id') === W, 30000);
    await until('W delegated rows in Workspaces', async () => {
      for (const id of wCopies) if (!(await page.locator(`${T('workspace-team-transient-execution-row')}[data-agent-run-id="${id}"]`).count())) return false;
      return true;
    }, 30000);
    await shot(page, 'PLN-01-workspaces-run-with-delegated-work');
    // Projects view: no Project has a run, so none is listed and the view says so (workspace-tree-vs-chooser REQ-009,
    // VIS-016); the run and its copies appear nowhere.
    await showMode(page, 'projects');
    const projectNames = await page.locator(`${T('project-row')} ${T('project-row-select')}`).allInnerTexts();
    assert(projectNames.length === 0, 'a Project without runs is listed', projectNames);
    const hints = { noRuns: (await page.locator(T('projects-tree-no-runs')).innerText().catch(() => '')).trim() };
    assert(hints.noRuns.includes('No Project has a run yet'), 'the Projects view does not show its "none with a run" state', hints);
    const tree = page.locator(T('projects-runs-tree'));
    const inProjects = { runRows: await tree.locator(`${T('workspace-agent-run-row')}[data-run-id="${W}"]`).count(),
      copyRows: await tree.locator(T('workspace-team-transient-execution-row')).count(),
      orgGroups: await tree.locator('[data-test^="agent-org-definition-"]').count() };
    assert(inProjects.runRows === 0 && inProjects.copyRows === 0 && inProjects.orgGroups === 0, 'Projects mode shows runs not started under a Project', inProjects);
    for (const key of ['P', 'Q', 'R']) assert((await projectRead(key)).agentDefinitions.length === 0, `projectRunHistory lists runs for ${key}`);
    await shot(page, 'PLN-01-projects-all-empty');
    // Switching modes keeps the open run; back in Workspaces it is marked.
    assert(new URL(page.url()).searchParams.get('id') === W, 'switching modes changed the open run');
    await showMode(page, 'workspaces');
    const marked = await page.locator(`${T('workspace-agent-run-row')}[aria-current="true"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id')));
    assert(marked.includes(W), 'the open run is not marked in Workspaces', marked);
    await showMode(page, 'projects');
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(T('run-section-view-menu')).waitFor({ timeout: 60000 });
    const remembered = (await page.locator(T('run-section-title')).innerText()).trim();
    assert(remembered === 'Projects', 'the Projects view is not remembered after reload', { remembered });
    assert(errors.length === 0, 'browser errors', errors);
    return { W, wCopies, projectNames, hints, inProjects, marked, remembered };
  } finally { await context.close(); }
};

/**
 * AC-003, REQ-004/005/006: New chat, chip → P → choose the agent → send → P is listed with the run at once; folder; prompt;
 * under its folder. P has no run before, so the Projects view does not list it (workspace-tree-vs-chooser REQ-009): the
 * first run of a Project starts from the chat chip.
 */
const startFromProjectPlus = async () => {
  const P = s.projects.P;
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    assert((await sectionOf(page, 'P').count()) === 0, 'P is listed before it has a run');
    await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
    await chooseTarget(page, s.ids.manager);
    await pickAgyModel(page);
    await chooseChipProject(page, 'P');
    const chip = await chipText(page);
    const chipAria = await page.locator(T('chat-workspace-trigger')).getAttribute('aria-label');
    assert(chip.includes(P.name), 'chip does not show the Project', { chip });
    await shot(page, 'PLN-02-start-surface-under-p');
    const before = await startedUnder(P.projectId);
    const sentAt = Date.now();
    const runId = await sendFirst(page, 'Reply OK.');
    // Listed under P at once: the left panel (still Projects mode) shows it without a reload.
    const pSection = sectionOf(page, 'P');
    await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    await until('run listed under P', async () => (await runRowIn(pSection, runId).count()) === 1, 15000);
    const listedMs = Date.now() - sentAt;
    const after = await startedUnder(P.projectId);
    assert(after.length === before.length + 1 && after.some((r) => r.kind === 'agent' && r.runId === runId), 'project_runs.json missing the run', after);
    const metadata = await metadataOf(runId);
    assert(metadata.workspaceRootPath === folder('p-folder'), 'run not in the Project folder', metadata);
    const prompt = await until('prompt written', () => promptOf(runId), 60000);
    assert(prompt.text.includes(`## Project\n\nYou work in the ${projectSection('P')}.`), 'prompt has no Project section', prompt.text.slice(0, 2000));
    assert(prompt.workspacePath === folder('p-folder'), 'AGY run folder differs', prompt.workspacePath);
    // After sending, the run view has no Project choice.
    const chipAfter = await page.locator(T('chat-workspace-trigger')).count();
    assert(chipAfter === 0, 'Project choice still offered after the first message', { chipAfter });
    await shot(page, 'PLN-02-listed-under-p');
    await showMode(page, 'workspaces');
    await until('listed in Workspaces under its folder', async () => (await page.locator(`${T('workspace-agent-run-row')}[data-run-id="${runId}"]`).count()) >= 1
      || (await page.locator(`${T('workspace-agent-row')}[data-workspace-root="${folder('p-folder')}"]`).count()) >= 1, 15000);
    const wsGroup = page.locator(`${T('workspace-agent-row')}[data-workspace-root="${folder('p-folder')}"][data-agent-definition-id="${s.ids.manager}"]`).first();
    if ((await wsGroup.getAttribute('aria-expanded')) !== 'true') await wsGroup.click();
    await until('Workspaces lists the run', async () => (await page.locator(`${T('workspace-agent-run-row')}[data-run-id="${runId}"]`).count()) === 1, 15000);
    await shot(page, 'PLN-02-workspaces-under-folder');
    assert(errors.length === 0, 'browser errors', errors);
    s.runs.A = runId;
    return { runId, chip, chipAria, listedMs, startedUnder: after, workspaceRootPath: metadata.workspaceRootPath,
      promptSection: prompt.text.slice(prompt.text.indexOf('## Project'), prompt.text.indexOf('## Project') + 240) };
  } finally { await context.close(); }
};

/** AC-015, AC-004: plain New chat chip: two folders (first preselected), no folder (temp), picked folder kept, "No project". */
const chipJourneys = async () => {
  const { page, errors, context } = await newPage();
  const out = {};
  const plainNewChat = async () => {
    await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
    await chooseTarget(page, s.ids.manager);
    await pickAgyModel(page);
  };
  try {
    // R: two folders → the first is preselected.
    await plainNewChat();
    out.chipBefore = await chipText(page);
    await chooseChipProject(page, 'R');
    out.chipR = await chipText(page);
    await shot(page, 'PLN-03-chip-r');
    const rRun = await sendFirst(page, 'Reply OK.');
    out.rFolder = (await metadataOf(rRun)).workspaceRootPath;
    assert(out.rFolder === folder('r-first'), 'R did not preselect its first folder', out);
    assert((await startedUnder(s.projects.R.projectId)).some((r) => r.runId === rRun), 'R run not recorded', out);
    // Q: no folder → the temp workspace; nothing created or linked.
    await plainNewChat();
    await chooseChipProject(page, 'Q');
    out.chipQ = await chipText(page);
    const qRun = await sendFirst(page, 'Reply OK.');
    out.qFolder = (await metadataOf(qRun)).workspaceRootPath;
    assert(out.qFolder.startsWith(folder('temp_workspace')), 'Q did not use the temp workspace', out);
    const qProject = (await gql('query($id:String!){project(projectId:$id){workspaces{workspaceRootPath}}}', { id: s.projects.Q.projectId })).project;
    assert((qProject.workspaces ?? []).length === 0, 'a folder was linked to Q', qProject);
    // A folder picked first is kept when R is chosen.
    await plainNewChat();
    await page.locator(T('chat-workspace-trigger')).click();
    await page.locator(T('chat-target-tab-workspaces')).click().catch(() => undefined);
    await page.locator(T('chat-workspace-open-folder')).click();
    const folderInput = page.locator(`${T('chat-workspace-folder-form')} input`).first();
    await folderInput.fill(folder('picked-folder')); await folderInput.press('Enter');
    await sleep(500);
    await chooseChipProject(page, 'R');
    out.chipPicked = await chipText(page);
    await shot(page, 'PLN-03-chip-folder-kept');
    const pickedRun = await sendFirst(page, 'Reply OK.');
    out.pickedFolder = (await metadataOf(pickedRun)).workspaceRootPath;
    assert(out.pickedFolder === folder('picked-folder'), 'the picked folder was not kept', out);
    assert((await startedUnder(s.projects.R.projectId)).some((r) => r.runId === pickedRun), 'picked-folder run not under R', out);
    // "No project" before sending: a plain run.
    await plainNewChat();
    await chooseChipProject(page, 'P');
    await chooseChipProject(page, null);
    out.chipNone = await chipText(page);
    const plainRun = await sendFirst(page, 'Reply OK.');
    for (const key of ['P', 'Q', 'R']) assert(!(await startedUnder(s.projects[key].projectId)).some((r) => r.runId === plainRun), `plain run recorded under ${key}`);
    const plainPrompt = await until('plain run prompt written', () => promptOf(plainRun), 60000);
    assert(!plainPrompt.text.includes('## Project'), 'plain run told a Project');
    const rPrompt = await until('R run prompt written', () => promptOf(rRun), 60000);
    assert(rPrompt.text.includes(`## Project\n\nYou work in the ${projectSection('R')}.`), 'R run not told its Project', rPrompt.text.slice(0, 1500));
    out.runtimeOfRuns = await Promise.all([rRun, qRun, pickedRun, plainRun].map(async (id) => (await metadataOf(id)).runtimeKind));
    assert(out.runtimeOfRuns.every((kind) => kind === AGY.runtimeKind), 'a run did not start on the scripted AGY runtime', out.runtimeOfRuns);
    // Listed under R in Projects mode at once (the two R runs).
    await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle' });
    await showMode(page, 'projects');
    const rSection = await openProject(page, 'R');
    await openAgentGroup(rSection, s.ids.manager);
    out.rListed = await listedRunIds(rSection);
    assert(out.rListed.includes(rRun) && out.rListed.includes(pickedRun) && !out.rListed.includes(plainRun), 'R listing wrong', out);
    await shot(page, 'PLN-03-r-listed');
    assert(errors.length === 0, 'browser errors', errors);
    Object.assign(out, { rRun, qRun, pickedRun, plainRun });
    s.runs.rRuns = [rRun, pickedRun];
    return out;
  } finally { await context.close(); }
};

/** AC-005: a Team started under P (appears after its re-read) and "+" on P's agent group (a second agent run). */
const teamAndGroupPlus = async () => {
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const section = await openProject(page, 'P');
    await section.locator(T('project-row')).hover();
    await section.locator(T('project-run-add')).click();
    await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
    await chooseTarget(page, s.ids.squad);
    await pickAgyModel(page);
    const chip = await chipText(page);
    const before = await startedUnder(s.projects.P.projectId);
    const sentAt = Date.now();
    const input = page.locator(`${T('chat-composer')} textarea`).first();
    await input.click(); await input.fill('Reply OK.');
    await page.locator(T('chat-primary-action')).first().click();
    const team = await until('Team recorded under P', async () => (await startedUnder(s.projects.P.projectId)).find((r) => r.kind === 'agent_team' && !before.some((b) => b.runId === r.runId)), 120000);
    const recordedMs = Date.now() - sentAt;
    const pSection = sectionOf(page, 'P');
    await until('Team row under P', async () => (await pSection.locator(T(`workspace-team-row-${team.runId}`)).count()) === 1
      || (await pSection.locator(`[data-test^="workspace-team-definition-row-"]`).count()) >= 1, 30000);
    const teamGroup = pSection.locator('[data-test^="workspace-team-definition-row-"]').first();
    if ((await pSection.locator(T(`workspace-team-row-${team.runId}`)).count()) === 0) await teamGroup.click();
    await until('Team run row under P', async () => (await pSection.locator(T(`workspace-team-row-${team.runId}`)).count()) === 1, 30000);
    const listedMs = Date.now() - sentAt;
    const teamFolder = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.runId })).getTeamRunResumeConfig.executionTree;
    const teamRuntime = new RegExp(`"runtime_?[kK]ind":"${AGY.runtimeKind}"`).test(JSON.stringify(teamFolder));
    assert(teamRuntime, 'Team did not start on the scripted AGY runtime', JSON.stringify(teamFolder).slice(0, 800));
    const teamRowsInProjects = await page.locator(`${T('projects-runs-tree')} ${T(`workspace-team-row-${team.runId}`)}`).count();
    assert(teamRowsInProjects === 1, 'the Team is listed more than once in Projects mode', { teamRowsInProjects });
    await shot(page, 'PLN-04-team-under-p');
    // "+" on P's agent group: another run of the manager under P.
    await gotoWorkspace(page);
    const section2 = await openProject(page, 'P');
    const group = await openAgentGroup(section2, s.ids.manager);
    const beforeRuns = await listedRunIds(section2);
    await group.hover();
    await section2.locator('button[title="New run with this agent"]').first().click();
    await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
    await pickAgyModel(page);
    const chipGroup = await chipText(page);
    const second = await sendFirst(page, 'Reply OK.');
    const s2 = sectionOf(page, 'P');
    await openAgentGroup(s2, s.ids.manager);
    await until('second run under P', async () => (await runRowIn(s2, second).count()) === 1, 15000);
    const secondFolder = (await metadataOf(second)).workspaceRootPath;
    assert(secondFolder === folder('p-folder'), 'group "+" run not in the Project folder', { secondFolder });
    assert(!beforeRuns.includes(second), 'second run not new');
    await shot(page, 'PLN-04-group-plus-second-run');
    assert(errors.length === 0, 'browser errors', errors);
    s.runs.team = team.runId; s.runs.second = second;
    return { chip, teamRunId: team.runId, recordedMs, listedMs, teamWorkspace: JSON.stringify(teamFolder).includes(folder('p-folder')), chipGroup, second, secondFolder };
  } finally { await context.close(); }
};

/**
 * 353 AC-002, 347 AC-006/AC-010: real delegation from the run under P: a P Team (Task line, members, opens), P, Q and
 * Temp-task work, all nested under the run in P, live; the run is not listed under Q; the board follows the Project.
 */
const liveDelegation = async () => {
  const A = s.runs.A; assert(A, 'PLN-05 needs PLN-02');
  const { page, errors, context } = await newPage();
  const out = {};
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const pSection = await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    await runRowIn(pSection, A).click();
    await sleep(800);
    // The user asks the manager, in its composer, to dispatch P1 to the Docs Review Team.
    const composer = page.locator(`${T('workspace-center-pane')} textarea`).first();
    const squadAddress = `/${segment(s.names.squad)}`;
    await composer.fill(callTool('delegate_task', { recipient_address: squadAddress, task_id: s.tasks.P1 }));
    const sentAt = Date.now();
    await composer.press('Enter');
    const teamRow = teamCopyRowIn(pSection, squadAddress);
    await teamRow.waitFor({ state: 'visible', timeout: 60000 });
    out.teamRowMs = Date.now() - sentAt;
    const squad = await nodeOf(A, (n) => n.teamRunId && n.address === squadAddress, 'squad copy');
    out.taskLine = (await teamRow.locator(T('workspace-task-worker-task-summary')).first().innerText().catch(() => '')).trim();
    assert(out.taskLine.includes('Review the launch checklist'), 'the P Team row has no Task line of its Task', out);
    if ((await teamRow.getAttribute('aria-expanded')) === 'false') await teamRow.locator(T('workspace-team-transient-disclosure')).click();
    const coordinator = squad.members.find((m) => m.address?.endsWith('/reviewer')) ?? squad.members[0];
    await until('team members visible', async () => (await copyRowIn(pSection, coordinator.agentRunId).count()) === 1, 60000);
    await shot(page, 'PLN-05-p-team-with-task-line');
    await copyRowIn(pSection, coordinator.agentRunId).click();
    await until('member conversation open', async () => /new task|Review the launch checklist/i.test(await centerText(page)), 30000);
    out.memberOpened = (await centerText(page)).slice(0, 300);
    await shot(page, 'PLN-05-member-open');
    // A Q Task, Temp-task work and a P Task (sent as user messages to the manager): all nested under A in P, live.
    const qResult = await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.checker)}`, task_id: s.tasks.Q1 });
    const tempResult = await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.writer)}`, description: 'Draft a short summary.' });
    const pAgent = await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.writer)}`, task_id: s.tasks.P2 });
    const runIdIn = (text) => /target_agent_run_id\\?":\\?"([^"\\]+)/.exec(text)?.[1];
    const qCopy = runIdIn(qResult); const tempCopy = runIdIn(tempResult); const wCopy = runIdIn(pAgent);
    assert(qCopy && tempCopy && wCopy, 'delegations failed', { qResult, tempResult, pAgent });
    await until('P shows the Q, Temp-task and P Agent copies under A', async () => {
      for (const id of [qCopy, tempCopy, wCopy]) if ((await copyRowIn(pSection, id).count()) !== 1) return false;
      return true;
    }, 30000);
    out.qTaskLineUnderP = (await copyRowIn(pSection, qCopy).locator(T('workspace-task-worker-task-summary')).first().innerText().catch(() => '')).trim();
    out.rowsOfAInProjectsMode = await page.locator(`${T('projects-runs-tree')} ${T('workspace-agent-run-row')}[data-run-id="${A}"]`).count();
    assert(out.rowsOfAInProjectsMode === 1, 'A is listed more than once in Projects mode', out);
    const qSection = await openProject(page, 'Q');
    out.aUnderQ = await runRowIn(qSection, A).count();
    out.copiesUnderQ = await qSection.locator(T('workspace-team-transient-execution-row')).count();
    assert(out.aUnderQ === 0 && out.copiesUnderQ === 0, 'A or its work listed under Q', out);
    await shot(page, 'PLN-05-all-work-under-p-none-under-q');
    // 347 AC-010: the Project name selects the board; a Task line shows its Task there.
    await pSection.locator(T('project-row-select')).click();
    const picker = page.locator(`${T('right-side-projects-panel')} [data-testid="projects-panel-picker-select"]`);
    await until('right board shows P', async () => (await picker.inputValue().catch(() => '')) === `project:${s.projects.P.projectId}`, 30000)
      .catch(async () => { await page.locator(`${T('right-side-tab-list')} [data-tab-name="projects"]`).click(); return until('right board shows P (tab opened)', async () => (await picker.inputValue()) === `project:${s.projects.P.projectId}`, 15000); });
    out.boardProject = await picker.inputValue();
    const summary = teamRow.locator(T('workspace-task-worker-task-summary')).first();
    out.locatedTaskId = await summary.getAttribute('data-task-id');
    await summary.click();
    await until('board shows the Task', async () => (await page.locator(`[data-testid="project-task-row-${out.locatedTaskId}"]:visible`).count()) >= 1, 30000);
    await shot(page, 'PLN-05-board-task-located');
    assert(errors.length === 0, 'browser errors', errors);
    Object.assign(s.runs, { squad, squadAddress, qCopy, tempCopy, wCopy });
    return { ...out, qCopy, tempCopy, wCopy, squad: squad.teamRunId };
  } finally { await context.close(); }
};

/** AC-008: P1 DONE removes the Team rows live; reopen + the assigner's message brings them back. */
const closureAndReopen = async () => {
  const A = s.runs.A; const squad = s.runs.squad; assert(squad, 'PLN-06 needs PLN-05');
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const pSection = await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    await runRowIn(pSection, A).click();
    const teamRow = teamCopyRowIn(pSection, s.runs.squadAddress);
    await teamRow.waitFor({ state: 'visible', timeout: 60000 });
    await agentCalls(A, 'update_task', { task_id: s.tasks.P1, status: 'DONE' });
    await until('Team rows left Projects mode', async () => (await teamRow.count()) === 0, 60000);
    assert((await runRowIn(pSection, A).count()) === 1, 'the host run left with its Task');
    await until('closed in the stored root', async () => (await closedOf(A)).includes(squad.teamRunId), 30000);
    const memberConversation = (await gql('query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}',
      { h: A, a: squad.members[0].address, r: squad.members[0].agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    assert(Array.isArray(memberConversation) && memberConversation.length > 0, 'closed member conversation not kept');
    await shot(page, 'PLN-06-after-done');
    await agentCalls(A, 'update_task', { task_id: s.tasks.P1, status: 'IN_PROGRESS' });
    // The assigner messages the Task Team through its coordinator (as the reactivation journeys do).
    const coordinator = squad.members.find((m) => m.address?.endsWith('reviewer')) ?? squad.members[0];
    const reactivated = await agentCalls(A, 'send_message_to', { target_agent_run_id: coordinator.agentRunId, content: 'Second round, please.' });
    assert(!/isError\\?":true|TASK_AGENT_RESOURCE_CLOSED/.test(reactivated), 'reactivation message refused', reactivated);
    await until('Team row back under P', async () => (await teamRow.count()) === 1, 60000);
    await shot(page, 'PLN-06-after-reopen');
    const archivedAny = (await workspaceRunIds()).includes(A);
    assert(archivedAny, 'host run archived');
    assert(errors.length === 0, 'browser errors', errors);
    return { closed: squad.teamRunId, memberConversationEntries: memberConversation.length };
  } finally { await context.close(); }
};

/**
 * 353 REQ-001/DEC-003: with 6 newer runs under P, P lists the 6 newest only; A (older, hosting P's open work) is not
 * pinned. After 3 of them are archived, A is listed again and opens with its delegated run.
 */
const capNoPinning = async () => {
  const A = s.runs.A; assert(A && s.runs.squad, 'PLN-07 needs PLN-02 and PLN-05');
  const newer = [];
  for (let i = 0; i < 6; i += 1) { await sleep(30); const id = await createAgentRun({ projectId: s.projects.P.projectId }); newer.push(id); await terminateAgent(id); }
  const out = {};
  {
    const { page, errors, context } = await newPage();
    try {
      await gotoWorkspace(page);
      await showMode(page, 'projects');
      const pSection = await openProject(page, 'P');
      await openAgentGroup(pSection, s.ids.manager);
      out.pListed = await listedRunIds(pSection);
      assert(out.pListed.length === 6 && newer.every((id) => out.pListed.includes(id)) && !out.pListed.includes(A), 'P does not list exactly the 6 newest', { pListed: out.pListed, newer, A });
      await shot(page, 'PLN-07-p-six-newest');
      assert(errors.length === 0, 'browser errors', errors);
    } finally { await context.close(); }
  }
  // Archive the 3 oldest of them: A is among the 6 newest again.
  for (const id of newer.slice(0, 3)) assert((await gql('mutation($id:String!){archiveStoredRun(runId:$id){success message}}', { id })).archiveStoredRun.success, 'archive failed');
  s.runs.newer = newer.slice(3);
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const pSection = await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    out.pListedAfterArchive = await listedRunIds(pSection);
    assert(out.pListedAfterArchive.includes(A) && !newer.slice(0, 3).some((id) => out.pListedAfterArchive.includes(id)), 'A not listed again after the archive', out);
    await runRowIn(pSection, A).click();
    await until('A opens', async () => /CALLED:/.test(await centerText(page)), 30000);
    const teamRow = teamCopyRowIn(pSection, s.runs.squadAddress);
    await teamRow.waitFor({ state: 'visible', timeout: 30000 });
    if ((await teamRow.getAttribute('aria-expanded')) === 'false') await teamRow.locator(T('workspace-team-transient-disclosure')).click();
    const member = s.runs.squad.members[0];
    await copyRowIn(pSection, member.agentRunId).click();
    await until('its delegated member opens', async () => /Review the launch checklist|Second round/i.test(await centerText(page)), 30000);
    await shot(page, 'PLN-07-a-listed-again-and-open');
    assert(errors.length === 0, 'browser errors', errors);
    return { ...out, newer, A };
  } finally { await context.close(); }
};

/**
 * AC-011: real backend restart while Projects mode is shown. Projects mode keeps the last good tree, re-reads after the
 * reconnect (a Project created after the restart appears without a reload), and shows the current state after a reload,
 * including work A dispatched after the restart. (The run's own stream in the page after a backend restart is the existing
 * run view's, shared with Workspaces mode; observed and recorded, FU-008.)
 */
const restartLive = async () => {
  const A = s.runs.A; assert(A, 'PLN-08 needs PLN-02');
  const { page, errors, context } = await newPage();
  const out = {};
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const pSection = await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    await runRowIn(pSection, A).click();
    await teamCopyRowIn(pSection, s.runs.squadAddress).waitFor({ state: 'visible', timeout: 60000 });
    out.restart = await restartBackend();
    // The last good tree stays through the restart.
    out.treeKept = (await runRowIn(pSection, A).count()) === 1 && (await teamCopyRowIn(pSection, s.runs.squadAddress).count()) === 1;
    assert(out.treeKept, 'tree lost across the restart');
    await shot(page, 'PLN-08-tree-kept-after-restart');
    // A Project is listed only while it has a run (workspace-tree-vs-chooser REQ-009): one created after the reconnect stays
    // unlisted across a poll (it is listed below, once it has a run).
    const late = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}', { input: { name: `After Restart ${randomUUID().slice(0, 4)}` } })).createProject;
    s.projects.L = late;
    const lateRow = page.locator(`${T('project-row')}[data-project-id="${late.projectId}"]`);
    await sleep(6000);
    out.lateProjectUnlistedWithoutRun = (await lateRow.count()) === 0;
    assert(out.lateProjectUnlistedWithoutRun, 'a Project without a run is listed');
    // A dispatches P5 after the restart (restored, as the app does for a stopped run).
    await restoreAgent(A);
    const p5 = await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.checker)}`, task_id: s.tasks.P5 });
    const copy = /target_agent_run_id\\?":\\?"([^"\\]+)/.exec(p5)?.[1];
    assert(copy, 'delegation after restart failed', p5);
    out.copy = copy;
    out.copyInStoredTree = taskNodes(await storedTree(A)).some((n) => n.agentRunId === copy);
    assert(out.copyInStoredTree, 'the copy is not in A\'s stored tree', out);
    out.liveInSamePage = await until('copy live in the same page', async () => (await copyRowIn(pSection, copy).count()) === 1, 15000).then(() => true, () => false);
    await shot(page, 'PLN-08-same-page-after-dispatch');
    // Its first run is started by another client (the API). The run section's 5 s history poll shows the new root run, and
    // the open Projects view reads its Projects again (autobyteus-388 AC-003): listed within one poll, with the view kept
    // open (no view switch, no reload).
    out.lateRun = await createAgentRun({ projectId: late.projectId });
    await terminateAgent(out.lateRun);
    const startedAt = Date.now();
    await until('Project with a run started elsewhere listed within one poll while the view stays open', async () => (await lateRow.count()) === 1, 12000);
    out.lateProjectListedMs = Date.now() - startedAt;
    out.lateProjectListed = true;
    await page.reload({ waitUntil: 'networkidle' });
    await showMode(page, 'projects');
    const reloaded = await openProject(page, 'P');
    await openAgentGroup(reloaded, s.ids.manager);
    await runRowIn(reloaded, A).click();
    await until('current state after reload', async () => (await copyRowIn(reloaded, copy).count()) === 1, 30000);
    await shot(page, 'PLN-08-current-after-reload');
    // Requests that hit the backend while it is down or still starting (refused, or answered before CORS is set up) are
    // the deliberate outage, not the app.
    const realErrors = errors.filter((e) => !/Failed to fetch|NetworkError|ECONNREFUSED|socket|WebSocket|ERR_CONNECTION|blocked by CORS policy/i.test(e));
    assert(realErrors.length === 0, 'browser errors', realErrors);
    out.toleratedNetworkErrors = errors.length - realErrors.length;
    return out;
  } finally { await context.close(); }
};

/** AC-012, REQ-014: archive in Projects mode; Stop on running runs; group Archive all scoped; deleted Project leaves live. */
const archiveAndDelete = async () => {
  const newer = s.runs.newer; assert(newer, 'PLN-09 needs PLN-07');
  // A stopped manager run in P's folder that is not under P: Archive all in P must not touch it.
  const outsider = await createAgentRun(); await terminateAgent(outsider);
  await restoreAgent(s.runs.A); // A is running while the group archive is tried (it blocks it).
  if (s.runs.team) await restoreTeam(s.runs.team); // A Team run under P, running, with no live context in the new window.
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    let pSection = await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    // Running runs show Stop, not Archive.
    const aRow = runRowIn(pSection, s.runs.A);
    const aButtons = await aRow.locator('button').evaluateAll((els) => els.map((e) => e.getAttribute('data-test') ?? e.getAttribute('title')));
    // Archive one stopped run from Projects mode.
    const target = newer[newer.length - 1];
    const row = runRowIn(pSection, target);
    await row.hover();
    await row.locator('button[title*="rchive"]').click();
    const confirm = page.locator('button', { hasText: /^Archive$/ }).last();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    await until('archived run gone from P', async () => (await runRowIn(pSection, target).count()) === 0, 30000);
    assert(!(await workspaceRunIds()).includes(target), 'archived run still in Workspaces');
    await shot(page, 'PLN-09-archived-in-projects');
    // Delete another stopped run permanently from Projects mode: gone in both modes without a reload.
    const deleted = newer[newer.length - 2];
    const delRow = runRowIn(pSection, deleted);
    await delRow.hover();
    await delRow.locator('button[title="Delete run permanently"]').click();
    await page.locator('button', { hasText: /^Delete$/ }).last().click();
    await until('deleted run gone from P', async () => (await runRowIn(pSection, deleted).count()) === 0, 30000);
    assert(!(await workspaceRunIds()).includes(deleted), 'deleted run still in Workspaces');
    await shot(page, 'PLN-09-deleted-in-projects');
    // Group "Archive all" under P: blocked while a listed run is running (UXJ-007), then archives only P's listed runs.
    const group = await openAgentGroup(pSection, s.ids.manager);
    await group.hover();
    await pSection.locator(T(`workspace-agent-group-archive-${s.ids.manager}`)).first().click();
    const blockedToast = await until('blocked toast', async () => (await page.getByText('Stop running runs first.').count()) > 0, 10000).then(() => true, () => false);
    assert(blockedToast, 'group archive not blocked while a run is running');
    // The user stops the running run with its Stop button in Projects mode. Observed: the server state, both modes.
    const stopDiag = { running: await pSection.locator(T('terminate-agent-run')).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id'))) };
    for (const id of stopDiag.running) {
      const button = pSection.locator(`${T('terminate-agent-run')}[data-run-id="${id}"]`);
      if (await button.count()) await button.click();
    }
    await until('server stopped the runs', async () => (await Promise.all(stopDiag.running.map(isActive))).every((active) => !active), 30000);
    stopDiag.serverActiveAfterStop = await Promise.all(stopDiag.running.map(isActive));
    stopDiag.projectsStopButtonsAfter5s = await until('Projects rows show stopped', async () => (await pSection.locator(T('terminate-agent-run')).count()) === 0, 5000)
      .then(() => 0, async () => pSection.locator(T('terminate-agent-run')).count());
    if (s.runs.team) {
      // The Team run's own Stop in Projects mode: the row reads stopped at once (CR-003 covers Team Stop too).
      const teamGroup = pSection.locator('[data-test^="workspace-team-definition-row-"]').first();
      const teamRow = pSection.locator(T(`workspace-team-row-${s.runs.team}`));
      if (!(await teamRow.count())) await teamGroup.click();
      await teamRow.waitFor({ timeout: 30000 });
      // The Stop button sits beside the row's main button, in their shared row container.
      const teamStop = teamRow.locator('xpath=..').locator('button[title="Terminate team"]');
      stopDiag.teamStopShownBefore = await teamStop.count();
      if (stopDiag.teamStopShownBefore) {
        await teamStop.click();
        await until('server stopped the Team', async () => !(await teamIsActive(s.runs.team)), 30000);
        stopDiag.teamStopShownAfter5s = await until('Team row reads stopped', async () => (await teamStop.count()) === 0, 5000).then(() => 0, async () => teamStop.count());
      }
    }
    await shot(page, 'PLN-09-after-stop-projects');
    await showMode(page, 'workspaces');
    const wsGroup = page.locator(`${T('workspace-agent-row')}[data-workspace-root="${folder('p-folder')}"][data-agent-definition-id="${s.ids.manager}"]`).first();
    if (!(await wsGroup.isVisible().catch(() => false))) await page.locator(T('workspace-row'), { hasText: 'p-folder' }).first().click().catch(() => undefined);
    if ((await wsGroup.getAttribute('aria-expanded').catch(() => null)) !== 'true') await wsGroup.click().catch(() => undefined);
    stopDiag.workspacesStopButtons = await page.locator(T('terminate-agent-run')).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id')));
    await shot(page, 'PLN-09-after-stop-workspaces');
    await showMode(page, 'projects');
    pSection = await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    stopDiag.projectsStopButtonsAfterModeSwitch = await pSection.locator(T('terminate-agent-run')).count();
    evidence.cases['PLN-09-stop-observation'] = stopDiag;
    if (stopDiag.projectsStopButtonsAfterModeSwitch > 0) {
      // Continue the remaining checks on a fresh read of the page.
      await page.reload({ waitUntil: 'networkidle' });
      await showMode(page, 'projects');
      pSection = await openProject(page, 'P');
      await openAgentGroup(pSection, s.ids.manager);
      stopDiag.projectsStopButtonsAfterReload = await pSection.locator(T('terminate-agent-run')).count();
    }
    await until('no running run under P', async () => (await pSection.locator(T('terminate-agent-run')).count()) === 0, 30000);
    const group2 = await openAgentGroup(pSection, s.ids.manager);
    await group2.hover();
    await pSection.locator(T(`workspace-agent-group-archive-${s.ids.manager}`)).first().click();
    const dialogText = (await page.locator('[role="dialog"], [role="alertdialog"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.locator('button', { hasText: /^Archive all$/ }).last().click();
    await until('P group archive done', async () => (await listedRunIds(pSection)).length === 0, 30000);
    const ws = await workspaceRunIds();
    assert(ws.includes(outsider), 'Archive all in P archived a run not under P');
    assert(!ws.includes(s.runs.A), 'Archive all left a P run in Workspaces');
    const remainingInP = await listedRunIds(pSection);
    await shot(page, 'PLN-09-group-archive-all');
    // Delete R (it has runs): it leaves Projects mode live; its runs stay in Workspaces.
    const rRuns = s.runs.rRuns ?? [];
    assert((await gql('mutation($id:String!){deleteProject(projectId:$id)}', { id: s.projects.R.projectId })).deleteProject, 'delete failed');
    await until('R left Projects mode', async () => (await sectionOf(page, 'R').count()) === 0, 30000);
    const wsAfter = await workspaceRunIds();
    assert(rRuns.every((id) => wsAfter.includes(id)), 'R runs lost from Workspaces', { rRuns });
    await shot(page, 'PLN-09-deleted-project');
    assert(errors.length === 0, 'browser errors', errors);
    assert(aButtons.includes('terminate-agent-run') && !aButtons.some((b) => /rchive/.test(b ?? '')), 'running run offers Archive instead of Stop', aButtons);
    const result = { stopDiag, aButtons, archived: target, deleted, blockedToast, dialogText, remainingInP, outsider, rRuns };
    // Checked last so the remaining REQ-014 checks still run: the stopped run must read stopped in Projects mode at once.
    assert(stopDiag.projectsStopButtonsAfter5s === 0, 'Projects mode still shows Stop on a run the user stopped there, while Workspaces mode shows it stopped (until the next re-read)', result);
    if (s.runs.team) assert(stopDiag.teamStopShownBefore === 1 && stopDiag.teamStopShownAfter5s === 0, 'the Team run did not read stopped in Projects mode after its Stop', result);
    return result;
  } finally { await context.close(); }
};

/** AC-013, AC-016, AC-017: keyboard, zh-CN, narrow layout, briefcase icons, reference screenshots. */
const accessibilityAndLooks = async () => {
  const out = {};
  {
    const { page, errors, context } = await newPage();
    try {
      await gotoWorkspace(page);
      // The View menu: ArrowDown opens it on the current view, ArrowDown moves to Projects, Enter chooses it.
      await page.locator(T('run-section-view-menu')).focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await until('Projects by keyboard', async () => (await currentMode(page)) === 'projects', 10000);
      out.keyboardSwitch = true;
      const pSelect = sectionOf(page, 'P').locator(T('project-row-select'));
      await pSelect.focus();
      await page.keyboard.press('Enter');
      out.keyboardExpanded = await sectionOf(page, 'P').locator(T('project-row-disclosure')).getAttribute('aria-expanded');
      await shot(page, 'PLN-10-keyboard-focus');
      out.briefcaseInTree = await sectionOf(page, 'P').locator('[data-icon="heroicons:briefcase"], svg').count();
      await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'networkidle' });
      await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
      await page.locator(T('chat-workspace-trigger')).click();
      await page.locator(T('chat-target-tab-projects')).click();
      await shot(page, 'PLN-10-chip-menu-projects-tab');
      await page.keyboard.press('Escape');
      await page.goto(`${stack.frontendUrl}/projects`, { waitUntil: 'networkidle' }).catch(() => undefined);
      await sleep(1500);
      await shot(page, 'PLN-10-projects-page');
      assert(errors.length === 0, 'browser errors', errors);
    } finally { await context.close(); }
  }
  {
    const { page, errors, context } = await newPage({ width: 600, height: 800 });
    try {
      await gotoWorkspace(page).catch(() => undefined);
      await sleep(1500);
      await shot(page, 'PLN-10-narrow-strip');
      const strip = page.locator('[data-nav-key="workspaces"]').first();
      out.stripLabel = await strip.getAttribute('aria-label').catch(() => null);
      if (await strip.isVisible().catch(() => false)) { await strip.click(); await sleep(800); }
      out.narrowMenuVisible = await page.locator(T('run-section-view-menu')).isVisible().catch(() => false);
      await shot(page, 'PLN-10-narrow-drawer');
      assert(errors.length === 0, 'browser errors', errors);
    } finally { await context.close(); }
  }
  {
    const { page, errors, context } = await newPage({ locale: 'zh-CN' });
    try {
      await gotoWorkspace(page);
      await page.locator(T('run-section-view-menu')).click();
      out.zhViews = (await page.locator('[role="menuitemradio"]').allInnerTexts()).map((t) => t.trim());
      await page.keyboard.press('Escape');
      await shot(page, 'PLN-10-zh-CN');
      assert(errors.length === 0, 'browser errors', errors);
    } finally { await context.close(); }
  }
  return out;
};

/**
 * 388 AC-003: runs started and removed by another client while the Projects view stays open. The open view re-reads its
 * Projects when the run history's 5 s poll shows a run added or removed; hidden, it reads none.
 */
const othersStartAndRemove = async () => {
  const out = {};
  const reads = [];
  const project = async (name, folders) => (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}',
    { input: { name, workspaces: folders.map((workspaceRootPath) => ({ workspaceRootPath, description: path.basename(workspaceRootPath) })) } })).createProject;
  const archive = async (id) => assert((await gql('mutation($id:String!){archiveStoredRun(runId:$id){success message}}', { id })).archiveStoredRun.success, `archive of ${id} failed`);
  const { page, errors, context } = await newPage();
  page.on('request', (req) => {
    if (!req.url().includes('/graphql') || req.method() !== 'POST') return;
    try { const body = JSON.parse(req.postData() ?? '{}'); if (body.operationName === 'GetProjectRunHistory') reads.push({ at: Date.now(), projectId: body.variables?.projectId }); } catch { /* not JSON */ }
  });
  const within = async (label, predicate) => { const t0 = Date.now(); await until(label, predicate, 12000); return Date.now() - t0; };
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    // A new Project whose only run another client starts, then archives.
    const N = await project(`Elsewhere ${randomUUID().slice(0, 4)}`, [folder('p-folder')]);
    const nRow = page.locator(`${T('project-row')}[data-project-id="${N.projectId}"]`);
    out.nRun = await createAgentRun({ projectId: N.projectId });
    await terminateAgent(out.nRun);
    out.nListedMs = await within('a run started elsewhere lists its Project within one poll', async () => (await nRow.count()) === 1);
    await archive(out.nRun);
    out.nUnlistedMs = await within('a run archived elsewhere unlists its Project within one poll', async () => (await nRow.count()) === 0);
    await shot(page, 'PLN-11-unlisted-after-archive-elsewhere');
    // Hidden: the Workspaces view is shown; a run started elsewhere reads no Project.
    await showMode(page, 'workspaces');
    await sleep(1500);
    const hiddenFrom = reads.length;
    out.hiddenRun = await createAgentRun({ projectId: N.projectId });
    await terminateAgent(out.hiddenRun);
    await sleep(11000); // two polls
    out.readsWhileHidden = reads.length - hiddenFrom;
    assert(out.readsWhileHidden === 0, 'Projects were read while the Projects view was hidden', reads.slice(hiddenFrom));
    await showMode(page, 'projects');
    await until('listed when the view is shown again', async () => (await nRow.count()) === 1, 15000);
    await archive(out.hiddenRun);
    // A Project run older than the 6 newest runs of its agent in its folder (the run section's Workspaces window).
    const mFolder = folder('m-folder');
    await fsp.mkdir(mFolder, { recursive: true });
    const M = await project(`Older Run ${randomUUID().slice(0, 4)}`, [mFolder]);
    const mRow = page.locator(`${T('project-row')}[data-project-id="${M.projectId}"]`);
    out.mRun = await createAgentRun({ projectId: M.projectId }, mFolder);
    await terminateAgent(out.mRun);
    out.mNewer = [];
    for (let i = 0; i < 6; i += 1) { await sleep(30); const id = await createAgentRun({}, mFolder); out.mNewer.push(id); await terminateAgent(id); }
    out.mListedMs = await within('the Project with the older run is listed', async () => (await mRow.count()) === 1);
    await sleep(6000); // settle on one poll after the newer runs
    const before = reads.length;
    await archive(out.mRun);
    out.mUnlistedMs = await until('an older run archived elsewhere unlists its Project within one poll', async () => (await mRow.count()) === 0, 12000)
      .then(() => true, () => false);
    out.readsAfterOlderArchive = reads.length - before;
    await shot(page, 'PLN-11-older-run-archived-elsewhere');
    assert(out.mUnlistedMs === true, 'a Project whose run is older than its folder\'s 6 newest stays listed after another client archives that run', out);
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { await context.close(); }
};

const CASES = {
  'PLN-01': ['353 AC-001 (user\'s case): a Workspaces run hosting Tasks of 3 Projects is in no Project; it stays in Workspaces with its work; modes keep the run; mode remembered', existingRuns],
  'PLN-02': ['347 AC-003: "+" on P → agent → send → listed under P at once; P folder; ## Project prompt; in Workspaces under its folder', startFromProjectPlus],
  'PLN-03': ['347 AC-015/AC-004: chip — first of two folders, temp for none, picked folder kept, "No project" plain', chipJourneys],
  'PLN-04': ['353 AC-003, 347 AC-005: Team under P listed once; "+" on P\'s agent group', teamAndGroupPlus],
  'PLN-05': ['353 AC-002, 347 AC-006/010: P Team with Task line and members, Q and Temp work all nested under the run in P live; not under Q; board', liveDelegation],
  'PLN-06': ['347 AC-008: DONE removes rows live; reopen + message brings them back', closureAndReopen],
  'PLN-07': ['353 REQ-001/DEC-003: 6 newest only, no pinning; listed again after archives and opens', capNoPinning],
  'PLN-08': ['353 AC-004 reconnect: real backend restart keeps the tree; a Project created after it is listed within one poll of a run started elsewhere, view kept open (388 AC-003); work dispatched after it live; current after reload', restartLive],
  'PLN-09': ['353 AC-004: archive and delete in Projects mode, Agent and Team Stop read stopped, group Archive all scoped, deleted Project leaves live', archiveAndDelete],
  'PLN-10': ['347 AC-013/016/017: keyboard, zh-CN, narrow, briefcase, reference screenshots', accessibilityAndLooks],
  'PLN-11': ['388 AC-003: runs started and archived elsewhere list and unlist their Project within one poll, view kept open (incl. a run older than its folder\'s 6 newest); hidden, no Project read', othersStartAndRemove],
};

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found; pass --browser-executable');
  await startStack();
  await seed();
  evidence.seed = { ids: s.ids, names: s.names, projects: s.projects, tasks: s.tasks };
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  // Warm the cold Nuxt dev server before asserting (dependency optimization reloads are a harness effect).
  { const { page, context } = await newPage(); await gotoWorkspace(page).catch(() => undefined); await sleep(3000); await context.close(); }
  for (const id of selectedCases) {
    const [description, fn] = CASES[id] ?? [];
    if (!fn) throw new Error(`Unknown case ${id}`);
    const startedAt = new Date().toISOString();
    try {
      const details = await fn();
      evidence.cases[id] = { result: 'Pass', description, startedAt, finishedAt: new Date().toISOString(), details };
    } catch (error) {
      result = 'Fail';
      evidence.cases[id] = { result: 'Fail', description, startedAt, finishedAt: new Date().toISOString(), message: error.message, details: error.details };
      evidence.failures.push({ id, message: error.message });
    }
    process.stdout.write(`${id}: ${evidence.cases[id].result}${evidence.cases[id].message ? ` — ${evidence.cases[id].message}` : ''}\n`);
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
  if (process.env.PLN_KEEP_DATA !== '1') {
    try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
    catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  } else evidence.cleanup.dataRootKept = stack.dataRoot;
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`Projects left navigation probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);
