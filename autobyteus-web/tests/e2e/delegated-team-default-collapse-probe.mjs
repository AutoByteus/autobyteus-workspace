#!/usr/bin/env node
// REQ-B1 / AC-001..006: standalone delegated Teams collapsed by default.
// pnpm -C autobyteus-web test:e2e:delegated-team-default-collapse --output-dir <fresh dir>
// Prereqs: pnpm install, server prebuild/build and nuxt prepare; Chromium/playwright-core.
// No opt-in provider gate: only repository scripted AGY calls real scoped MCP tools (no inference).
// Owns backend/DB/free ports/Nuxt/Chrome; real HTTP and Projects/package-definition/collaboration WS,
// no fixture routes. --ledger-file <absolute initialized ledger> persists each B-* immediately.
// --baseline measures the pinned OLD policy (49 initial rows), not an approved regression pass.
// --desktop-instance <isolated-app start JSON> attaches only to the caller-owned current build;
// probe restarts that owned instance after seeding; outer session owns start/final restart/stop. Never pass a user's instance.
// Cold = fresh page/Pinia after Nuxt optimizer warmup, NOT cold OS cache or cold app launch.
// Warm = same-page host reselection. Times observe commit/rows/selected child in page performance clock.
// Evidence dir must be new; source pins and environment limits accompany evidence.json.
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
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/delegated-team-default-collapse'));
const ledger = getArg('ledger-file');
const baseline = process.argv.includes('--baseline');
const desktopFile = getArg('desktop-instance');
const desktop = desktopFile ? JSON.parse(fs.readFileSync(desktopFile, 'utf8')) : null;
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
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
const backendEnv = () => {
  const keys = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
    AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') };
  return keys;
};
const startBackend = async (port) => {
  stack.backendStarts += 1;
  const env = { ...Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'SHELL'].filter(k => process.env[k]).map(k => [k, process.env[k]])), ...backendEnv(), HOME: stack.privateHome,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', stack.dataRoot],
    serverDir, env, `backend-${stack.backendStarts}`);
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.privateHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'delegated-team-home-'));
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'delegated-team-collapse-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendPort = backendPort;
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  await startBackend(backendPort);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'SHELL'].filter(k => process.env[k]).map(k => [k, process.env[k]])), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  assert(response.ok && !body.errors?.length, 'GraphQL failed', body);
  return body.data;
};
const config = () => ({ workspaceRootPath: path.join(stack.dataRoot, 'workspace'), llmModelIdentifier: 'gemini-3.8-flash-low', runtimeKind: 'antigravity_cli', autoExecuteTools: true, llmConfig: null });
const sockets = [];
const inputFor = async (id) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${id}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: id, message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
};
const childProjection = async (host, address, run) => (await gql('query($host:String!,$address:String!,$run:String!){agentRunCollaborationMemberProjection(hostRunId:$host,memberAddress:$address,agentRunId:$run){conversation}}', { host, address, run })).agentRunCollaborationMemberProjection.conversation;
const viewFor = async (id) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id })).agentRunCollaboration.root_agent;
const projection = async (id) => (await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id })).getRunProjection.conversation;
const tasksFor = async (id) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId description status root {kind teamRunId ingressAgentRunId hostRoot{kind runId} start status closed}}}', { id })).projectTasks;
const terminate = async (id) => {
  const r = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun;
  assert(r.success, r.message);
};
let setup;
const seed = async () => {
  const agent = async (name, tools) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: tools } })).createAgentDefinition.id;
  const names = ['Solution Designer', 'Architecture Reviewer', 'Implementation Engineer', 'Code Reviewer', 'API E2E Engineer', 'Delivery Engineer'];
  const ids = [];
  for (const name of names) ids.push(await agent(name, []));
  const managerId = await agent('Project Task Manager Probe', ['list_projects', 'list_project_tasks', 'create_task', 'update_task']);
  const createTeam = async (name) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
    name, description: name, instructions: 'Do the assigned task.', coordinatorMemberName: 'solution_designer',
    nodes: names.map((n, i) => ({ memberName: segment(n), ref: ids[i], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id;
  const teamId = await createTeam('Software Engineering Team Probe');
  const lateTeamId = await createTeam('Late Engineering Team Probe');
  const workspaceRoot = config().workspaceRootPath;
  await fsp.mkdir(workspaceRoot, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceRoot } });
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: 'Collapse Regression Project' } })).createProject.projectId;
  const task = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId, description } })).createProjectTask.taskId;
  const host = async () => {
    const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: managerId, ...config() } })).createAgentRun;
    assert(r.success, r.message); return r.runId;
  };
  const hostId = await host(), otherHostId = await host();
  const send = await inputFor(hostId), sendOther = await inputFor(otherHostId);
  const taskIds = [];
  for (let i = 0; i < 7; i++) {
    console.log(`Seeding representative Task ${i + 1}/7`);
    const taskId = await task(`Engineering Task ${i + 1}\nPreserve this exact task and conversation.`); taskIds.push(taskId);
    send(callTool('delegate_task', { recipient_address: '/software_engineering_team_probe', task_id: taskId }));
    await until(`Task ${i + 1} assigned`, async () => (await tasksFor(projectId)).find(t => t.taskId === taskId)?.root?.start === 'started', 90000);
  }
  const otherTaskId = await task('Other host same address');
  sendOther(callTool('delegate_task', { recipient_address: '/software_engineering_team_probe', task_id: otherTaskId }));
  await until('other host task assigned', async () => (await tasksFor(projectId)).find(t => t.taskId === otherTaskId)?.root?.start === 'started', 90000);
  const initial = await viewFor(hostId);
  const teams = initial.execution_tree.taskExecutions.filter(t => t.teamRunId);
  assert(teams.length === 7, 'Representative workload must be seven six-member Teams', teams);
  assert(teams.every(t => t.members.length === 6), 'Expected six members per Team');
  for (const copy of [2, 3]) {
    const member = teams[copy].members[2];
    send(callTool('send_message_to', { target_agent_run_id: member.agentRunId, content: `Persisted marker for copy ${copy}` }));
    await until(`copy ${copy} conversation persisted`, async () => JSON.stringify(await childProjection(hostId, member.address, member.agentRunId)).includes(`Persisted marker for copy ${copy}`), 60000);
  }
  await terminate(hostId); await terminate(otherHostId);
  for (const socket of sockets) socket.close();
  return { hostId, otherHostId, projectId, managerId, teamId, lateTeamId, taskIds, otherTaskId, teams, task, initial };
};

const rowBase = '[data-test="workspace-team-transient-execution-row"]:not([aria-hidden="true"])';
const treeOf = (page, id = setup.hostId) => page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${id}"]`);
const teamsOf = (page, id = setup.hostId) => treeOf(page, id).locator(`${rowBase}[data-node-kind="agent_team"]`);
const rowsOf = (page, id = setup.hostId) => treeOf(page, id).locator(rowBase);
const teamRow = (page, team) => teamsOf(page).filter({ has: page.locator(`[data-test="workspace-task-worker-task-summary"][data-task-id="${team.taskId}"]`) });
const memberRow = (page, id) => treeOf(page).locator(`${rowBase}[data-agent-run-id="${id}"]`);
const storeState = async (page) => page.evaluate((id) => {
  const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s;
  const c = stores.get('agentRunCollaboration'), target = stores.get('activeContext')?.activeWorkspaceTarget;
  return { selected: stores.get('agentSelection')?.selectedRunId, child: c?.selectedChild(id), target: target?.agentRunId ?? target?.context.state.runId,
    conversationId: target?.context.state.conversation.id, messageCount: target?.context.state.conversation.messages.length,
    error: c?.errors[id], phase: c?.contextFor(id)?.phase,
    teams: c?.contextFor(id) ? [...c.contextFor(id).index.teams.keys()].map(t => ({ id: t, expanded: c.isTaskTeamExpanded(id, t) })) : [],
    children: c?.contextFor(id)?.listAgentContextEntries().map(e => ({ id: e.agentRunId, status: e.context.state.currentStatus, messageCount: e.context.state.conversation.messages.length })),
    rows: c?.taskRows(id).length };
}, setup.hostId);
const untilRows = (page, n) => until(`${n} actionable rows`, async () => (await rowsOf(page).count()) === n, 60000);
const push = async (page, to) => {
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$router), null, { timeout: 60000 });
  return page.evaluate(to => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), to);
};
let browser, page, context, ownedBrowser = false;
const errors = [], requests = [], commands = [], frames = [], failedRequests = [];
const observe = async () => {
  page.__inflight = new Set();
  page.on('request', r => { if (r.url().endsWith('/graphql')) page.__inflight.add(r); });
  for (const event of ['requestfinished', 'requestfailed']) page.on(event, r => page.__inflight.delete(r));
  page.on('requestfailed', r => { let operation; try { operation = r.postDataJSON()?.operationName; } catch {} failedRequests.push({ url: r.url(), operation, failure: r.failure(), at: Date.now() }); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (r.url().endsWith('/graphql')) { try { requests.push({ at: Date.now(), ...r.postDataJSON() }); } catch { /* not GraphQL JSON */ } } });
  page.on('websocket', ws => {
    ws.on('framesent', f => { try { commands.push({ url: ws.url(), ...JSON.parse(String(f.payload)) }); } catch { /* protocol frame */ } });
    ws.on('framereceived', f => { try { const v = JSON.parse(String(f.payload)); frames.push({ url: ws.url(), type: v.type, kind: v.payload?.event?.kind }); } catch { /* protocol frame */ } });
  });
  const recordSockets = () => {
    if (window.__probeSockets) return;
    const Original = window.WebSocket;
    window.__probeSockets = [];
    window.WebSocket = class extends Original { constructor(...args) { super(...args); window.__probeSockets.push(this); } };
  };
  await page.addInitScript(recordSockets);
  await page.evaluate(recordSockets);
};
const shot = name => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const runCase = async (id, description, fn) => {
  try { const details = await fn(); evidence.cases[id] = { result: 'Pass', description, details }; await save(); if (ledger) await fsp.appendFile(ledger, `\n- ${id} Pass: ${description}. ${evidencePath}\n`); return details; }
  catch (e) { evidence.cases[id] = { result: 'Fail', description, message: e.message, details: e.details }; await save(); if (ledger) await fsp.appendFile(ledger, `\n- ${id} Fail: ${e.message}. ${evidencePath}\n`); throw e; }
};
const quiet = async () => {
  let since = Date.now();
  await until('GraphQL quiet before full navigation', () => {
    if (page.__inflight?.size) since = Date.now();
    return Date.now() - since >= 750;
  }, 60000);
};
const prepareTree = async () => {
  await quiet();
  if (desktop) {
    // Desktop cold/restart cases enter through the actual shell lifecycle. A file-renderer
    // reload keeps its network/process state and is not the user's application restart.
    await browser.close();
    const receipt = JSON.parse(execFileSync('pnpm', ['--silent', 'isolated-app', 'restart', desktop.instanceId], { cwd: path.dirname(webDir), env: process.env, encoding: 'utf8' }));
    assert(receipt.ok, 'Owned application restart failed', receipt);
    evidence.desktopRestarts ??= []; evidence.desktopRestarts.push(receipt.result); await save();
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${desktop.controlPort}`);
    context = browser.contexts()[0]; page = context.pages().find(p => /renderer\/index\.html/.test(p.url()));
    assert(page, 'Restarted worktree renderer missing'); await observe();
    await push(page, '/workspace');
  } else await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  const workspace = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first();
  await workspace.waitFor({ timeout: 60000 });
  if (await workspace.getAttribute('aria-expanded') !== 'true') await workspace.locator('button').first().click();
  const agent = page.locator('[data-test="workspace-agent-row"]', { hasText: 'Project Task Manager Probe' });
  await agent.waitFor({ timeout: 60000 });
  if (await agent.getAttribute('aria-expanded') !== 'true') await agent.click();
  await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${setup.hostId}"]`).waitFor({ timeout: 60000 });
};
const runRow = () => page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${setup.hostId}"]`);
const timedSelection = async (label) => {
  const requestStart = requests.length;
  await page.evaluate(id => {
    const p = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    const begin = event => {
      if (!event.target.closest(`[data-test="workspace-agent-run-row"][data-run-id="${id}"]`)) return;
      document.removeEventListener('click', begin, true);
      window.__timing = { start: performance.now(), host: null, rows: null, rowsPreloaded: !!p._s.get('agentRunCollaboration')?.contextFor(id), member: null };
      const tick = () => {
        const t = window.__timing, c = p._s.get('agentRunCollaboration'), target = p._s.get('activeContext')?.activeWorkspaceTarget;
        if (t.host === null && p._s.get('agentSelection')?.selectedRunId === id && target?.context.state.runId === id) t.host = performance.now() - t.start;
        if (t.rows === null && c?.contextFor(id) && document.querySelector(`[data-run-id="${id}"][data-test="workspace-agent-run-task-tree"] [role="treeitem"]`)) t.rows = performance.now() - t.start;
        if (t.host === null || t.rows === null) requestAnimationFrame(tick);
      }; requestAnimationFrame(tick);
    }; document.addEventListener('click', begin, true);
  }, setup.hostId);
  await runRow().click();
  await page.waitForFunction(() => window.__timing.host !== null && window.__timing.rows !== null, { timeout: 60000 });
  const task = (await tasksFor(setup.projectId)).find(t => t.taskId === setup.taskIds[2]);
  const team = teamRow(page, task);
  if (await team.getAttribute('aria-expanded') === 'false') await team.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const node = setup.teams.find(t => t.teamRunId === task.root.teamRunId), member = node.members[2].agentRunId;
  await page.evaluate(member => {
    const begin = event => {
      if (!event.target.closest(`[data-agent-run-id="${member}"]`)) return;
      document.removeEventListener('click', begin, true);
      const start = performance.now();
      const tick = () => {
        const target = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('activeContext')?.activeWorkspaceTarget;
        if (target?.agentRunId === member && target.context.state.conversation.id === member) window.__timing.member = performance.now() - start;
        else requestAnimationFrame(tick);
      }; requestAnimationFrame(tick);
    }; document.addEventListener('click', begin, true);
  }, member);
  await memberRow(page, member).click();
  await page.waitForFunction(() => window.__timing.member !== null);
  const timing = await page.evaluate(() => window.__timing);
  const summary = { label, ...timing, rowReadyMs: timing.rows, initialRows: baseline ? 49 : 7, selectedMember: member, visibleRowsAfterMemberSelection: await rowsOf(page).count(), requests: requests.slice(requestStart).reduce((m, r) => ({ ...m, [r.operationName]: (m[r.operationName] || 0) + 1 }), {}) };
  evidence.timings ??= []; evidence.timings.push(summary);
  if (!baseline) await team.locator('[data-test="workspace-team-transient-disclosure"]').click();
  await runRow().click();
  return summary;
};

await fsp.mkdir(path.dirname(outputDir), { recursive: true });
assert(!fs.existsSync(outputDir), `Use a fresh output directory: ${outputDir}`);
await fsp.mkdir(outputDir);
try {
  if (desktop) {
    assert(desktop.ownsDataRoot && desktop.executablePath.startsWith(path.join(webDir, 'electron-dist') + path.sep), 'Desktop mode accepts only caller-owned current worktree isolated builds');
    stack.backendUrl = `http://127.0.0.1:${desktop.serverPort}`; stack.dataRoot = desktop.dataRoot; }
  else await startStack();
  setup = await seed();
  if (desktop) {
    // Populate through public APIs, then exercise actual startup with EXISTING Tasks, not a renderer
    // receiving fast setup events while cold HTTP reads are still in flight. No browser-route mocks.
    const restarted = JSON.parse(execFileSync('pnpm', ['--silent', 'isolated-app', 'restart', desktop.instanceId], { cwd: path.dirname(webDir), env: process.env, encoding: 'utf8' }));
    assert(restarted.ok, 'Owned startup restart failed', restarted);
    evidence.startupRestart = { before: desktop.pid, ...restarted.result };
    assert(restarted.result.instanceId === desktop.instanceId && restarted.result.controlPort === desktop.controlPort && restarted.result.serverPort === desktop.serverPort, 'Restart changed owned identity/ports');
  }
  evidence.setup = { ...setup, task: undefined }; evidence.mode = desktop ? 'isolated-electron' : 'real-stack-browser';
  evidence.policy = baseline ? 'pinned-old-baseline' : 'changed';
  evidence.platform = `${process.platform}-${process.arch}`; evidence.node = process.version;
  if (desktop) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${desktop.controlPort}`);
    context = browser.contexts()[0]; page = context.pages().find(p => /renderer\/index\.html/.test(p.url())); assert(page, 'Isolated renderer not found');
  } else {
    browser = await chromium.launch({ headless: true, executablePath, args: process.getuid?.() === 0 ? ['--no-sandbox'] : [] }); ownedBrowser = true;
    context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US' }); page = await context.newPage();
    // Nuxt optimization warmup outside asserted cases. Never filter errors in asserted journeys.
    await page.goto(`${stack.frontendUrl}/workspace`, { timeout: 120000 }); await sleep(3500);
  }
  await observe(); evidence.browser = browser.version();
  await runCase('B-001', 'Fresh stored manager: seven collapsed Teams, 42 child identities (details load when opened)', async () => {
    await prepareTree(); await runRow().click(); await untilRows(page, baseline ? 49 : 7);
    await until('host selection committed', async () => { const s = await storeState(page); return s.selected === setup.hostId && s.target === setup.hostId; }, 60000);
    const state = await storeState(page); assert(!state.error, 'Collaboration error', state);
    assert(state.teams.length === 7 && state.teams.every(t => t.expanded === baseline), 'Unexpected fresh disclosure', state);
    await until('seven real Task summaries ready', async () => (await treeOf(page).locator('[data-test="workspace-task-worker-task-summary"]').count()) === 7, 60000);
    await shot('initial'); return state;
  });
  // Start performance from a fresh page/store; all source/data fixed and dependency optimization already settled.
  await runCase('P-001', 'Cold frontend-store and warm reselection three-stage readiness', async () => {
    const samples = [];
    for (let repeat = 1; repeat <= 3; repeat++) {
      const coldReadsStart = requests.length;
      await prepareTree();
      const cold = await timedSelection(`cold-frontend-store-${repeat}`);
      const coldReadsEnd = requests.length;
      const warm = await timedSelection(`warm-reselection-${repeat}`);
      cold.roleRevealRequests = requests.slice(coldReadsStart, coldReadsEnd).filter(r => r.operationName === 'GetAgentRunCollaborationMemberProjection' && r.variables.hostRunId === setup.hostId).length;
      cold.roleRevealArtifactReads = requests.slice(coldReadsStart, coldReadsEnd).filter(r => r.operationName === 'GetAgentRunCollaborationMemberFileChanges' && r.variables.hostRunId === setup.hostId).length;
      samples.push({ cold, warm });
      await save();
    }
    return { samples, limits: 'Capture-phase trusted click → per-frame host/rows/target observer; collaboration may preload at role reveal, rowsPreloaded reported. Cold is fresh frontend store, not OS cache or full app launch. No user latency claim.' };
  });
  if (!baseline) {
    const task = (await tasksFor(setup.projectId)).find(t => t.taskId === setup.taskIds[2]);
    const node = setup.teams.find(t => t.teamRunId === task.root.teamRunId), member = node.members[2].agentRunId;
    await runCase('B-002', 'Independent disclosure button, exact copy/member, body and Enter/Space coordinator', async () => {
      const team = teamRow(page, task), before = await storeState(page);
      await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await untilRows(page, 13);
      assert((await storeState(page)).child === before.child, 'Disclosure button selected a conversation');
      // The copy's stored conversation loads when it is opened.
      await memberRow(page, member).click(); await until('member conversation/composer', async () => { const s = await storeState(page); return s.conversationId === member && s.messageCount > 0; });
      const centerText = await page.locator('[data-test="workspace-center-pane"]').innerText();
      assert(centerText.includes('Persisted marker for copy 2') && !centerText.includes('Persisted marker for copy 3'), 'Wrong same-address copy conversation', centerText);
      assert(await page.locator('textarea').first().getAttribute('placeholder') !== null, 'Actual composer unavailable');
      await page.locator('textarea').first().fill('Unsent exact-copy draft');
      await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await untilRows(page, 7);
      assert((await storeState(page)).target === member, 'Collapse lost selected conversation');
      await team.click(); await untilRows(page, 13);
      assert((await storeState(page)).target === task.root.ingressAgentRunId, 'Body did not select coordinator');
      await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await untilRows(page, 7);
      await team.focus(); await page.keyboard.press('Enter'); await untilRows(page, 13);
      assert((await storeState(page)).target === task.root.ingressAgentRunId, 'Enter did not select exact coordinator');
      await page.keyboard.press('Space'); await untilRows(page, 7);
      await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await memberRow(page, member).click();
      assert(await page.locator('textarea').first().inputValue() === 'Unsent exact-copy draft', 'Copy draft lost');
      await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await shot('member'); return storeState(page);
    });
    await runCase('B-003', 'Host reselection preserves manual choices; second same-address host isolated; fresh page restart resets', async () => {
      await teamRow(page, task).locator('[data-test="workspace-team-transient-disclosure"]').click(); await untilRows(page, 13);
      await runRow().click(); assert((await storeState(page)).child === null, 'Host reselection not host'); await untilRows(page, 13);
      const other = await page.evaluate(id => {
        const c = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('agentRunCollaboration');
        return c.taskRows(id).length;
      }, setup.otherHostId);
      assert(other === 1, 'Disclosure leaked to same-address other host', { other });
      await prepareTree(); await runRow().click(); await untilRows(page, 7); return storeState(page);
    });
    await runCase('B-004', 'Actual Project Task-root click reveals only requested Team and selects its coordinator', async () => {
      await push(page, `/projects/${setup.projectId}`);
      const root = page.locator(`[data-testid="project-task-row-${task.taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`);
      await root.click(); await untilRows(page, 13);
      const state = await storeState(page); assert(state.target === task.root.ingressAgentRunId, 'Task-root selected wrong copy', state);
      assert(state.teams.filter(t => t.expanded).length === 1 && state.teams.find(t => t.id === task.root.teamRunId)?.expanded, 'Task-root revealed siblings', state);
      await shot('task-root'); return state;
    });
    await runCase('B-006', 'Disclosure writes no persistent data or stop/cancel commands; Tasks/conversations unchanged', async () => {
      const beforeTasks = await tasksFor(setup.projectId), beforeConversation = await projection(setup.hostId);
      const beforeChild = await childProjection(setup.hostId, node.members[2].address, member);
      const reads = requests.length, sent = commands.length;
      const team = teamRow(page, task); await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await untilRows(page, 7);
      await team.locator('[data-test="workspace-team-transient-disclosure"]').click(); await untilRows(page, 13);
      await memberRow(page, member).click(); await runRow().click(); await sleep(500);
      assert(JSON.stringify(await tasksFor(setup.projectId)) === JSON.stringify(beforeTasks), 'Task state changed from disclosure');
      assert(JSON.stringify(await projection(setup.hostId)) === JSON.stringify(beforeConversation), 'Host conversation persisted a presentation change');
      assert(JSON.stringify(await childProjection(setup.hostId, node.members[2].address, member)) === JSON.stringify(beforeChild), 'Member conversation changed from disclosure');
      const mutations = requests.slice(reads).filter(r => /\bmutation\b/.test(r.query));
      assert(mutations.length === 0 && commands.length === sent, 'Disclosure sent a mutation/stream command', { mutations, commands: commands.slice(sent) });
      return { mutations: 0, streamCommands: 0, tasks: beforeTasks.map(t => ({ id: t.taskId, status: t.status })), conversationEntries: beforeConversation.length };
    });
    await runCase('B-005', 'Real live Task checkpoint, a late delegated Team, reconnect and closure preserve choices/status/conversation', async () => {
      const send = await inputFor(setup.hostId);
      send('Continue managing these Tasks.');
      await runRow().click();
      await until('active collaboration snapshot', async () => (await storeState(page)).phase === 'live', 60000);
      const lateTask = await setup.task('New live Engineering Task');
      send(callTool('delegate_task', { recipient_address: '/software_engineering_team_probe', task_id: lateTask }));
      await until('new Task assigned', async () => (await tasksFor(setup.projectId)).find(t => t.taskId === lateTask)?.root?.start === 'started', 90000);
      await untilRows(page, 14);
      assert((await storeState(page)).teams.filter(t => t.expanded).length === 1, 'New task opened or old choice lost');
      // collaboration-model-contract: a Team is added to the run by delegating it (messaging never brings anyone in).
      send(callTool('delegate_task', { recipient_address: '/late_engineering_team_probe', description: 'Join this collaboration.' }));
      await until('new hosted Team appears', async () => (await teamsOf(page).count()) === 9, 60000);
      const beforeReconnect = await storeState(page);
      await page.evaluate(id => window.__probeSockets.filter(s => s.url.includes(`/agent-collaboration/${id}`)).forEach(s => s.close()), setup.hostId);
      await until('normal reconnect snapshot', async () => (await storeState(page)).phase === 'live' && frames.filter(f => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT').length >= 3, 60000);
      assert((await storeState(page)).teams.filter(t => t.expanded).length === 1, 'Reconnect changed disclosure');
      await memberRow(page, member).click();
      send(callTool('send_message_to', { target_agent_run_id: member, content: 'Live exact-copy continuity marker' }));
      await until('live exact member message/status', async () => {
        const state = await storeState(page);
        const text = await page.locator('[data-test="workspace-center-pane"]').innerText();
        return state.target === member && ['idle', 'running'].includes(state.children?.find(c => c.id === member)?.status) && text.includes('Live exact-copy continuity marker');
      }, 60000);
      const liveMember = await storeState(page);
      send(callTool('update_task', { task_id: task.taskId, status: 'DONE' }));
      await until('closed Task absent and host target restored', async () => (await teamsOf(page).count()) === 8 && (await storeState(page)).child === null, 60000);
      assert((await tasksFor(setup.projectId)).find(t => t.taskId === task.taskId).status === 'DONE', 'Real Task not closed');
      assert(frames.filter(f => f.kind === 'task_execution_started').length >= 2 && frames.some(f => f.kind === 'task_executions_closed'), 'Missing production WS lifecycle events', frames);
      await shot('live-closure'); return { beforeReconnect, liveMember, afterClosure: await storeState(page), events: frames.filter(f => f.kind) };
    });
  }
  assert(errors.length === 0, 'Browser errors fail probe', errors);
  evidence.result = baseline ? 'Baseline Observed' : 'Pass';
} catch (e) {
  evidence.result = 'Fail'; evidence.failures.push({ message: e.message, details: e.details, stack: e.stack }); process.exitCode = 1;
  if (page) { evidence.failureState = await storeState(page).catch(e => ({ error: e.message })); await shot('failure').catch(() => {}); evidence.failureDom = (await page.locator('body').innerText().catch(() => '')).slice(0, 12000); }
} finally {
  evidence.failedRequests = failedRequests; evidence.errors = errors; evidence.requests = requests; evidence.commands = commands; evidence.frames = frames;
  for (const socket of sockets) socket.close();
  if (setup) { await terminate(setup.hostId).catch(() => {}); await terminate(setup.otherHostId).catch(() => {}); }
  if (ownedBrowser) { await browser?.close(); evidence.cleanup.browserClosed = true; }
  else if (browser) { await browser.close(); evidence.cleanup.cdpDetached = true; }
  if (!desktop) {
    evidence.cleanup.frontend = await stopGroup(stack.frontend); evidence.cleanup.backend = await stopGroup(stack.backend);
    if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true });
    if (stack.privateHome) await fsp.rm(stack.privateHome, { recursive: true, force: true });
    evidence.cleanup.dataRootRemoved = !fs.existsSync(stack.dataRoot);
    const closed = url => new Promise(resolve => {
      const socket = net.createConnection({ host: '127.0.0.1', port: Number(new URL(url).port) });
      socket.once('error', () => { socket.destroy(); resolve(true); });
      socket.once('connect', () => { socket.destroy(); resolve(false); });
    });
    evidence.cleanup.backendPortClosed = stack.backendUrl ? await closed(stack.backendUrl) : true;
    evidence.cleanup.frontendPortClosed = stack.frontendUrl ? await closed(stack.frontendUrl) : true;
    if (!evidence.cleanup.dataRootRemoved || !evidence.cleanup.backendPortClosed || !evidence.cleanup.frontendPortClosed) {
      evidence.result = 'Fail'; evidence.failures.push({ message: 'Owned stack cleanup incomplete', cleanup: evidence.cleanup }); process.exitCode = 1;
    }
  } else evidence.cleanup.lifecycle = 'Outer isolated session owns canonical stop and auto-data-root removal';
  await save();
}
console.log(JSON.stringify({ result: evidence.result, cases: Object.keys(evidence.cases), errors, cleanup: evidence.cleanup, evidencePath }));
