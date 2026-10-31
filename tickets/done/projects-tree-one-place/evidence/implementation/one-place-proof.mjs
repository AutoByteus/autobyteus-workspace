#!/usr/bin/env node
// Ticket-owned in-app proof for projects-tree-one-place (autobyteus-353), implementation stage. Not durable test code.
// Real Nuxt dev frontend + built backend (autobyteus-server-ts/dist/app.js) + fresh headless Chrome, on a private data
// root and free ports; the stack is removed in finally. It never uses the installed app or user data.
// Agents run on the AGY runtime with the repository's scripted CLI (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs,
// AGY_FAKE_CASE=linked_skills): a message containing `CALL_TOOL:{...}` makes the agent call the real delegate_task.
// Run from the worktree root (after `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build`):
//   node tickets/in-progress/projects-tree-one-place/evidence/implementation/one-place-proof.mjs --output-dir <fresh dir>
// Cases:
//   AC-001: the user's case — a Project Task Manager run started in a workspace hands out Tasks of 3 Projects; no run is
//           started under a Project. Every Project shows "No runs yet"; the run and its delegated work are in Workspaces.
//   AC-002: "+" on P → the manager → send; it delegates a Task of P and a Task of Q. Listed once, under P, with both
//           delegated runs nested; Q and R show "No runs yet".
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const webDir = path.join(rootDir, 'autobyteus-web');
const serverDir = path.join(rootDir, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const argOf = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const outputDir = path.resolve(argOf('output-dir') ?? path.join(os.tmpdir(), `one-place-proof-${Date.now()}`));
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .find((c) => fs.existsSync(c));

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
/** The caller's environment without AutoByteus settings or provider credentials. */
const callerEnv = () => Object.fromEntries(Object.entries(process.env)
  .filter(([k]) => !k.startsWith('AUTOBYTEUS_') && !/(_API_KEY|_TOKEN|_SECRET|_ACCESS_KEY)$/i.test(k) && !/^(ANTHROPIC|OPENAI|GEMINI|AWS|AZURE)_/i.test(k)));
const backendEnv = () => ({ APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') });
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first');
  stack.dataRoot = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'projects-tree-one-place-')));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'home', 'superrepo', 'p-folder']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot],
    serverDir, { ...callerEnv(), ...backendEnv(), HOME: path.join(stack.dataRoot, 'home'),
      ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' }, 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...callerEnv(), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};

// ---------------------------------------------------------------- public API
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const folder = (name) => path.join(stack.dataRoot, name);
const AGY = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
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
  const project = async (key, name, folders) => {
    s.projects[key] = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}',
      { input: { name, workspaces: folders.map((workspaceRootPath) => ({ workspaceRootPath, description: path.basename(workspaceRootPath) })) } })).createProject;
  };
  await project('P', `Prototype Launch ${suffix}`, [folder('p-folder')]);
  await project('Q', `Docs Site ${suffix}`, []);
  await project('R', `Website ${suffix}`, []);
  for (const [key, projectKey, title] of [['P1', 'P', 'Review the launch checklist'], ['Q1', 'Q', 'Check the docs links'],
    ['R1', 'R', 'Website copy'], ['P2', 'P', 'Write the release notes'], ['Q2', 'Q', 'Follow-up docs work']]) {
    s.tasks[key] = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
      { input: { projectId: s.projects[projectKey].projectId, title, description: title } })).createProjectTask.taskId;
  }
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: folder('superrepo') } });
};
const projectRead = async (key) => (await gql(`query($id:String!){projectRunHistory(projectId:$id){projectId agentDefinitions{agentDefinitionId runs{runId}}
  teamDefinitions{runs{teamRunId}}}}`, { id: s.projects[key].projectId })).projectRunHistory;
const listedIn = (read) => [...read.agentDefinitions.flatMap((d) => d.runs.map((r) => r.runId)), ...read.teamDefinitions.flatMap((d) => d.runs.map((r) => r.teamRunId))];
const startedUnder = async (projectId) => JSON.parse(await fsp.readFile(path.join(stack.dataRoot, 'projects', projectId, 'project_runs.json'), 'utf8')
  .catch(() => '{"runs":[]}')).runs.map((r) => r.root);
const conversationText = async (runId) => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
const sockets = [];
const agentCalls = async (runId, toolName, args) => {
  const before = ((await conversationText(runId)).match(/CALLED:/g) ?? []).length;
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  try {
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `proof-${randomUUID()}`,
      dedupe_key: `agent_run_input:proof:${randomUUID()}`, content: callTool(toolName, args), context_file_paths: [], image_urls: [] } }));
    let text = '';
    await until(`${toolName} result`, async () => ((text = await conversationText(runId)).match(/CALLED:/g) ?? []).length > before, 60000);
    return text.slice(text.lastIndexOf('CALLED:'), text.lastIndexOf('CALLED:') + 700);
  } finally { socket.close(); }
};
const delegatedRunIdIn = (text) => /target_agent_run_id\\?":\\?"([^"\\]+)/.exec(text)?.[1];

// ---------------------------------------------------------------- browser
let browser;
const newPage = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization|Failed to load resource|WebSocket connection to/.test(m.text())) errors.push(m.text()); });
  return { context, page, errors };
};
/** Lets the chevron rotation (transition-transform) settle so a shot does not catch a half-turned disclosure. */
const shot = async (page, name) => { await sleep(500); await page.screenshot({ path: path.join(outputDir, `${name}.png`) }); };
const T = (id) => `[data-test="${id}"]`;
const sectionOf = (page, key) => page.locator(`section:has(> ${T('project-row')}[data-project-id="${s.projects[key].projectId}"])`);
const runRowIn = (scope, runId) => scope.locator(`${T('workspace-agent-run-row')}[data-run-id="${runId}"]`);
const projectSections = (page) => page.locator(`section:has(> ${T('project-row')})`);
const copyRowIn = (scope, agentRunId) => scope.locator(`${T('workspace-team-transient-execution-row')}[data-agent-run-id="${agentRunId}"]`);
const gotoWorkspace = async (page) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator(T('run-section-switch')).waitFor({ timeout: 120000 });
};
const showMode = async (page, mode) => {
  const tab = page.locator(T(`run-section-tab-${mode}`));
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await until(`${mode} mode`, async () => (await tab.getAttribute('aria-selected')) === 'true');
  if (mode === 'projects') await until('Projects listed', async () => (await page.locator(T('project-row')).count()) >= 3, 60000);
};
const openProject = async (page, key) => {
  const section = sectionOf(page, key);
  const disclosure = section.locator(T('project-row-disclosure'));
  if ((await disclosure.getAttribute('aria-expanded')) !== 'true') await disclosure.click();
  await until(`Project ${key} open`, async () => (await disclosure.getAttribute('aria-expanded')) === 'true');
  return section;
};
const openAgentGroup = async (scope, definitionId) => {
  const group = scope.locator(`${T('workspace-agent-row')}[data-agent-definition-id="${definitionId}"]`).first();
  await group.waitFor({ timeout: 30000 });
  if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click();
  await until('agent group open', async () => (await group.getAttribute('aria-expanded')) === 'true');
  return group;
};
/** What a Project's section shows when open: the hint text (if any) and every run row id. */
const projectShows = async (page, key) => {
  const section = await openProject(page, key);
  const hint = section.locator(T('project-no-runs'));
  return { hint: (await hint.count()) ? (await hint.innerText()).trim() : null,
    runRows: await section.locator(T('workspace-agent-run-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-run-id'))) };
};
const NO_RUNS = 'No runs yet. Use + to run an agent or team for this Project.';
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]';
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

// ---------------------------------------------------------------- cases
/** AC-001: the user's case. */
const usersCase = async () => {
  const W = s.runs.W = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
    { input: { agentDefinitionId: s.ids.manager, workspaceRootPath: folder('superrepo'), llmModelIdentifier: AGY.llmModelIdentifier,
      llmConfig: null, autoExecuteTools: true, runtimeKind: AGY.runtimeKind } })).createAgentRun.runId;
  assert(W, 'workspace run not created');
  const delegated = {};
  for (const [taskKey, recipient] of [['P1', 'writer'], ['Q1', 'checker'], ['R1', 'writer']]) {
    const result = await agentCalls(W, 'delegate_task', { recipient_address: `/${segment(s.names[recipient])}`, task_id: s.tasks[taskKey] });
    delegated[taskKey] = delegatedRunIdIn(result);
    assert(delegated[taskKey], `delegation of ${taskKey} failed`, result);
  }
  const reads = {}; const files = {};
  for (const key of ['P', 'Q', 'R']) {
    reads[key] = listedIn(await projectRead(key)); files[key] = await startedUnder(s.projects[key].projectId);
    assert(reads[key].length === 0, `projectRunHistory of ${key} lists runs`, reads[key]);
  }
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const shows = {};
    for (const key of ['P', 'Q', 'R']) {
      shows[key] = await projectShows(page, key);
      assert(shows[key].hint === NO_RUNS && shows[key].runRows.length === 0, `Project ${key} does not show "No runs yet"`, shows[key]);
    }
    assert((await runRowIn(projectSections(page), W).count()) === 0, 'W listed in Projects mode');
    await shot(page, 'AC-001-projects-all-no-runs-yet');
    // Workspaces mode: W under its folder with its three delegated runs, as today.
    await showMode(page, 'workspaces');
    const wsRow = page.locator(`${T('workspace-row')}[data-workspace-root="${folder('superrepo')}"]`).first();
    await wsRow.waitFor({ timeout: 30000 });
    if ((await wsRow.getAttribute('aria-expanded')) !== 'true') await wsRow.locator('button[aria-expanded]').first().click();
    await until('workspace open', async () => (await wsRow.getAttribute('aria-expanded')) === 'true');
    const wsGroup = page.locator(`${T('workspace-agent-row')}[data-workspace-root="${folder('superrepo')}"][data-agent-definition-id="${s.ids.manager}"]`).first();
    await wsGroup.waitFor({ timeout: 30000 });
    if ((await wsGroup.getAttribute('aria-expanded')) !== 'true') await wsGroup.click();
    await until('W in Workspaces', async () => (await runRowIn(page, W).count()) === 1, 30000);
    await runRowIn(page, W).click();
    await until('W delegated rows in Workspaces', async () => (await Promise.all(Object.values(delegated).map((id) => copyRowIn(page, id).count()))).every((n) => n === 1), 60000);
    await shot(page, 'AC-001-workspaces-run-with-delegated-work');
    // Back to Projects: still empty after the run was opened.
    await showMode(page, 'projects');
    const after = {};
    for (const key of ['P', 'Q', 'R']) after[key] = await projectShows(page, key);
    assert(Object.values(after).every((v) => v.hint === NO_RUNS && v.runRows.length === 0), 'a Project lists runs after opening W', after);
    assert(errors.length === 0, 'browser errors', errors);
    return { W, delegated, projectRunHistory: reads, projectRunsJson: files, projectsMode: shows, projectsModeAfterOpeningW: after };
  } finally { await context.close(); }
};

/** AC-002: start under P with "+", delegate a Task of P and a Task of Q. */
const startedUnderP = async () => {
  const { page, errors, context } = await newPage();
  try {
    await gotoWorkspace(page);
    await showMode(page, 'projects');
    const pSection = sectionOf(page, 'P');
    await pSection.locator(T('project-row')).hover();
    await pSection.locator(T('project-run-add')).click();
    await page.waitForURL('**/chat**', { timeout: 30000 });
    await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
    await page.locator(T('run-target-switcher-trigger')).click();
    await page.locator(T(`run-target-switcher-option-${s.ids.manager}`)).click();
    await until('target chosen', async () => (await page.locator(T('run-target-switcher-menu')).count()) === 0, 10000);
    await pickAgyModel(page);
    const input = page.locator(`${T('chat-composer')} textarea`).first();
    await input.click(); await input.fill('Reply OK.');
    await page.locator(T('chat-primary-action')).first().click();
    await page.waitForURL((u) => /[?&]id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 120000 });
    const A = s.runs.A = new URL(page.url()).searchParams.get('id');
    const pStarted = await startedUnder(s.projects.P.projectId);
    assert(pStarted.some((r) => r.kind === 'agent' && r.runId === A), 'project_runs.json of P misses the run', pStarted);
    // The user, in the run's composer, asks the manager to hand out a Task of P and a Task of Q.
    const pResult = await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.writer)}`, task_id: s.tasks.P2 });
    const qResult = await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.checker)}`, task_id: s.tasks.Q2 });
    const pCopy = delegatedRunIdIn(pResult); const qCopy = delegatedRunIdIn(qResult);
    assert(pCopy && qCopy, 'delegations failed', { pResult, qResult });
    const reads = { P: listedIn(await projectRead('P')), Q: listedIn(await projectRead('Q')), R: listedIn(await projectRead('R')) };
    assert(reads.P.length === 1 && reads.P[0] === A && reads.Q.length === 0 && reads.R.length === 0, 'projectRunHistory not one place', reads);
    // Live: the tree already in this page (Projects mode) without a reload.
    await openProject(page, 'P');
    await openAgentGroup(pSection, s.ids.manager);
    await until('A listed under P', async () => (await runRowIn(pSection, A).count()) === 1, 30000);
    await runRowIn(pSection, A).click();
    await until('both delegated runs nested under A in P', async () => (await copyRowIn(pSection, pCopy).count()) === 1 && (await copyRowIn(pSection, qCopy).count()) === 1, 60000);
    const nested = await pSection.locator(`${T('workspace-agent-run-task-tree')}[data-run-id="${A}"] ${T('workspace-team-transient-execution-row')}`)
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-agent-run-id')));
    const qShows = await projectShows(page, 'Q'); const rShows = await projectShows(page, 'R');
    assert(qShows.hint === NO_RUNS && qShows.runRows.length === 0, 'Q does not show "No runs yet"', qShows);
    assert(rShows.hint === NO_RUNS && rShows.runRows.length === 0, 'R does not show "No runs yet"', rShows);
    const everywhere = await runRowIn(projectSections(page), A).count();
    assert(everywhere === 1, 'A listed more than once in Projects mode', { everywhere });
    await shot(page, 'AC-002-listed-once-under-p-with-p-and-q-work');
    // A fresh page shows the same.
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(T('run-section-switch')).waitFor({ timeout: 60000 });
    await showMode(page, 'projects');
    const pAfter = await projectShows(page, 'P');
    assert(pAfter.hint === null, 'P shows the hint after reload', pAfter);
    await openAgentGroup(sectionOf(page, 'P'), s.ids.manager);
    await until('A under P after reload', async () => (await runRowIn(sectionOf(page, 'P'), A).count()) === 1, 30000);
    const qAfter = await projectShows(page, 'Q');
    assert(qAfter.hint === NO_RUNS && qAfter.runRows.length === 0, 'Q after reload', qAfter);
    await shot(page, 'AC-002-after-reload');
    assert(errors.length === 0, 'browser errors', errors);
    return { A, projectRunsJsonP: pStarted, pCopy, qCopy, projectRunHistory: reads, nestedUnderAInP: nested, qShows, rShows,
      rowsOfAInProjectsMode: everywhere, qAfterReload: qAfter };
  } finally { await context.close(); }
};

const CASES = { 'AC-001': ['the user\'s case: workspace run handing out Tasks of 3 Projects; every Project "No runs yet"', usersCase],
  'AC-002': ['"+" on P; delegates P and Q Tasks; listed once under P with both nested; Q "No runs yet"', startedUnderP] };

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found');
  await startStack();
  await seed();
  evidence.seed = { ids: s.ids, names: s.names, projects: s.projects, tasks: s.tasks };
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  { const { page, context } = await newPage(); await gotoWorkspace(page).catch(() => undefined); await sleep(3000); await context.close(); }
  for (const [id, [description, fn]] of Object.entries(CASES)) {
    const startedAt = new Date().toISOString();
    try {
      evidence.cases[id] = { result: 'Pass', description, startedAt, finishedAt: new Date().toISOString(), details: await fn() };
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
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`projects-tree-one-place proof: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);
