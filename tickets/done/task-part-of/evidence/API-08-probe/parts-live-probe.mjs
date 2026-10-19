#!/usr/bin/env node
// API-08 (task-part-of, ticket-owned temporary probe; not a package script).
// A parent's CANCELLED by the Manager's own update_task, while the user watches: the board (page), the parent's Task page,
// the part's Task page and the right panel's Projects tab (parent Task view) update live, without Refresh. One part has a
// really running task agent (scripted AGY CLI), which stops. Also checks the tab's compact Parts / Part of cards.
// Stack (probe-owned): autobyteus-server-ts/dist/app.js (this worktree's build) with
// ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs (AGY_FAKE_CASE=linked_skills) + `nuxi dev` + headless Chrome,
// own data root under the OS temp dir, free ports; all removed in finally. Never the installed app or user data.
// Run from the worktree root:
//   node tickets/in-progress/task-part-of/evidence/API-08-probe/parts-live-probe.mjs --output-dir <fresh absolute dir>
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.cwd();
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const outputDir = path.resolve(arg('output-dir') ?? '');
if (!arg('output-dir') || fs.existsSync(outputDir)) throw new Error('Pass a fresh --output-dir');
fs.mkdirSync(outputDir, { recursive: true });
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(`${message}${details === undefined ? '' : ` ${JSON.stringify(details)}`}`); throw e; } };
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const liveAgyCwds = () => spawnSync('pgrep', ['-f', 'agy-failure-cli'], { encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean)
  .map((pid) => spawnSync('lsof', ['-a', '-d', 'cwd', '-p', pid, '-Fn'], { encoding: 'utf8' }).stdout);

const evidence = { probe: 'API-08 parts-live-probe', startedAt: new Date().toISOString(), commit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), cases: {}, cleanup: {}, browserErrors: [] };
const save = () => fsp.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

// ------------------------------------------------------------ owned stack
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 15000).catch(async () => { process.kill(-child.pid, 'SIGKILL'); await until('killed', () => exited(child), 5000); });
  return { pid: child.pid, status: 'terminated' };
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
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'parts-live-probe-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot], serverDir, env, 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const sockets = [];

// ------------------------------------------------------------ probe
let browser; const pages = [];
const newPage = async (width = 1440, height = 1000) => {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('pageerror', (e) => evidence.browserErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') evidence.browserErrors.push(m.text()); });
  pages.push(context); return page;
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
const text = async (locator) => (await locator.innerText()).replace(/\s+/g, ' ').trim();

try {
  await startStack();
  browser = await chromium.launch({ executablePath: chrome, headless: true });
  // Warm the cold Nuxt dev server (dependency optimization reloads) before any assertion.
  { const warm = await newPage(); await warm.goto(`${stack.frontendUrl}/projects`, { waitUntil: 'networkidle', timeout: 180000 }); await sleep(4000); await warm.reload({ waitUntil: 'networkidle' }); await warm.close(); }

  const workspace = path.join(stack.dataRoot, 'workspace');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });
  const suffix = randomUUID().slice(0, 4);
  const names = { manager: `Project Task Manager ${suffix}`, worker: `Relay Builder ${suffix}` };
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const managerDef = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_project', 'update_project', 'create_task', 'update_task']);
  await agent(names.worker, []);
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: managerDef,
    workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  assert(run.success, run.message);
  const rootId = run.runId;
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${rootId}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  const conversation = async () => (await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: rootId })).getRunProjection?.conversation ?? [];
  const strings = (v) => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
  const called = (conv) => conv.flatMap((entry) => { const s = strings(entry).find((x) => x.includes('CALLED:')); return s ? [s.slice(s.indexOf('CALLED:') + 7)] : []; });
  const managerCalls = async (content) => {
    const before = called(await conversation()).length;
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: rootId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
    const results = await until(`Manager result for ${content.slice(0, 80)}`, async () => { const r = called(await conversation()); return r.length > before ? r : null; }, 60000);
    const raw = JSON.parse(results[before]);
    return raw.structuredContent ?? JSON.parse(raw.content?.find((p) => p.type === 'text')?.text ?? '{}');
  };

  // Seed: the user creates the bigger Task and its parts in the app's way (GraphQL), the Manager sets the statuses.
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: 'AutoByteus' } })).createProject.projectId;
  const create = async (description, partOfTaskId) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}',
    { input: { projectId, description, ...(partOfTaskId ? { partOfTaskId } : {}) } })).createProjectTask;
  const P = await create('Cross-node collaboration\nLet agents on different nodes delegate to each other.');
  const A = await create('Build the relay service', P.taskId);
  const B = await create('Design the node handshake', P.taskId);
  const C = await create('Write the protocol docs', P.taskId);
  const D = await create('Retire the old bridge', P.taskId);
  const plain = await create('Release notes for 1.5.6');
  await managerCalls(callTool('update_task', { task_id: C.taskKey, status: 'DONE' }));
  await managerCalls(callTool('update_task', { task_id: D.taskKey, status: 'CANCELLED' }));
  await managerCalls(callTool('update_task', { task_id: P.taskKey, status: 'IN_PROGRESS' }));
  // A: delegated to a live task agent and In Progress.
  const delegated = await managerCalls(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: A.taskKey }));
  assert(delegated.delegated === true && delegated.target_agent_run_id, 'delegated', delegated);
  const worker = delegated.target_agent_run_id;
  await managerCalls(callTool('update_task', { task_id: A.taskKey, status: 'IN_PROGRESS' }));
  await until('worker process live', () => liveAgyCwds().some((cwd) => cwd.includes(worker)), 60000);
  evidence.seed = { projectId, keys: { P: P.taskKey, A: A.taskKey, B: B.taskKey, C: C.taskKey, D: D.taskKey, plain: plain.taskKey }, worker };

  // Open the four views the user watches.
  const board = await newPage();
  await board.goto(`${stack.frontendUrl}/projects/${projectId}`, { waitUntil: 'networkidle' });
  await board.getByTestId(`project-task-row-${P.taskId}`).waitFor({ timeout: 60000 });
  const parentPage = await newPage();
  await parentPage.goto(`${stack.frontendUrl}/projects/${projectId}/tasks/${P.taskKey}`, { waitUntil: 'networkidle' });
  await parentPage.getByTestId('task-parts').waitFor({ timeout: 60000 });
  const partPage = await newPage();
  await partPage.goto(`${stack.frontendUrl}/projects/${projectId}/tasks/${A.taskKey}`, { waitUntil: 'networkidle' });
  await partPage.getByTestId('task-part-of').waitFor({ timeout: 60000 });
  // The right panel's Projects tab in the Manager's conversation, showing the parent's Task view.
  const tab = await newPage();
  await tab.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await until('workspace rows', async () => (await tab.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  await tab.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
  await tab.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
  await tab.locator('[data-test="workspace-agent-run-row"]').first().click();
  await tab.locator('[data-test="right-side-tab-list"]').waitFor({ timeout: 30000 });
  await tab.locator('[data-test="right-side-tab-list"]').getByText('Projects', { exact: true }).click();
  await tab.getByTestId('projects-panel').waitFor({ timeout: 30000 });
  await tab.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
  await tab.locator('[data-testid="projects-panel-board"]').getByTestId(`project-task-row-${P.taskId}`).waitFor({ timeout: 30000 });
  const tabBoardCard = await text(tab.locator('[data-testid="projects-panel-board"]').getByTestId(`project-task-row-${P.taskId}`));
  await shot(tab, 'API-08-tab-board-before');
  await tab.locator('[data-testid="projects-panel-board"]').getByTestId(`project-task-row-${P.taskId}`).getByTestId('project-task-row-link').click();
  await tab.getByTestId('projects-panel-task').waitFor({ timeout: 30000 });

  // Before: progress counts and the close hint everywhere.
  const cardRelations = async (taskId) => {
    const card = board.getByTestId(`project-task-row-${taskId}`);
    if (!(await card.count())) return null;
    const rel = card.getByTestId('project-task-row-relations');
    return (await rel.count()) ? text(rel) : '';
  };
  const laneOf = async (taskId) => board.evaluate((id) => document.querySelector(`[data-testid="project-task-row-${id}"]`)?.closest('[data-testid^="project-task-column-"]')?.getAttribute('data-testid') ?? null, taskId);
  const partRows = async (page) => page.$$eval('[data-testid="task-parts"] li', (els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()));
  const before = {
    boardParent: await cardRelations(P.taskId), boardPartLine: await cardRelations(A.taskId), lanes: { P: await laneOf(P.taskId), A: await laneOf(A.taskId), B: await laneOf(B.taskId) },
    parentSummary: await text(parentPage.getByTestId('task-parts-summary')), parentRows: await partRows(parentPage), hint: await parentPage.getByTestId('task-parts-close-hint').isVisible(),
    partRow: await text(partPage.locator('[data-testid="task-part-of"] li')),
    tabBoardCard, tabSummary: await text(tab.getByTestId('task-parts-summary')), tabRows: await partRows(tab), tabNewPart: await tab.getByTestId('task-parts-new').count(),
  };
  assert(before.boardParent.includes('1 of 3 done'), 'board pill before', before);
  assert(before.parentSummary === '1 of 3 done · 1 cancelled', 'parent summary before', before);
  assert(before.hint === true, 'close hint before', before);
  assert(before.partRow.startsWith(P.taskKey) && before.partRow.includes('In Progress'), 'part row before', before);
  assert(before.tabSummary === '1 of 3 done · 1 cancelled' && before.tabNewPart === 0 && before.tabRows.length === 4, 'tab parent before', before);
  for (const [page, name] of [[board, 'board'], [parentPage, 'parent-page'], [partPage, 'part-page'], [tab, 'tab-parent']]) await shot(page, `API-08-${name}-before`);
  const requestsBefore = { board: 0 };
  board.on('request', (r) => { if (r.url().includes('/graphql')) requestsBefore.board += 1; });

  // The Manager cancels the bigger Task through its own tool. No page is reloaded.
  const cancelled = await managerCalls(callTool('update_task', { task_id: P.taskKey, status: 'CANCELLED' }));
  assert(JSON.stringify(cancelled.task?.closedParts) === JSON.stringify([A.taskKey, B.taskKey]), 'closedParts', cancelled);
  await until('worker process stopped', () => liveAgyCwds().every((cwd) => !cwd.includes(worker)), 60000);

  // After, live: board lanes and pill, parent page rows and summary, part page parent status, tab Task view.
  await until('board: parent and open parts left the open lanes', async () => (await laneOf(P.taskId)) === null && (await laneOf(A.taskId)) === null && (await laneOf(B.taskId)) === null, 30000);
  await until('parent page: parts Cancelled, summary 1 of 1 done · 3 cancelled', async () => (await text(parentPage.getByTestId('task-parts-summary'))) === '1 of 1 done · 3 cancelled', 30000);
  await until('part page: parent shown Cancelled', async () => (await text(partPage.locator('[data-testid="task-part-of"] li'))).includes('Cancelled'), 30000);
  await until('tab: parent Task view updated', async () => (await text(tab.getByTestId('task-parts-summary'))) === '1 of 1 done · 3 cancelled', 30000);
  // The Cancelled toggle shows them in the Cancelled lane, in the usual flat board.
  await board.getByTestId('project-tasks-cancelled-toggle').click();
  await until('Cancelled lane shows the parent and its parts', async () => (await laneOf(P.taskId)) === 'project-task-column-CANCELLED' && (await laneOf(A.taskId)) === 'project-task-column-CANCELLED', 15000);
  const after = {
    lanes: { P: await laneOf(P.taskId), A: await laneOf(A.taskId), B: await laneOf(B.taskId), C: await laneOf(C.taskId), D: await laneOf(D.taskId), plain: await laneOf(plain.taskId) },
    boardParentInCancelledLane: await cardRelations(P.taskId), boardPartLine: await cardRelations(A.taskId),
    parentSummary: await text(parentPage.getByTestId('task-parts-summary')), parentRows: await partRows(parentPage), hint: await parentPage.getByTestId('task-parts-close-hint').count(),
    partRow: await text(partPage.locator('[data-testid="task-part-of"] li')),
    tabSummary: await text(tab.getByTestId('task-parts-summary')), tabRows: await partRows(tab), tabStatus: await text(tab.getByTestId('projects-panel-task-status')),
    boardGraphqlRequestsDuringCascade: requestsBefore.board,
  };
  assert(after.lanes.C === 'project-task-column-DONE' && after.lanes.plain === 'project-task-column-TODO', 'other cards stay in their lanes', after);
  assert(after.parentRows.filter((r) => r.includes('Cancelled')).length === 3 && after.parentRows.some((r) => r.startsWith(C.taskKey) && r.includes('Done')), 'parent rows after', after);
  assert(after.hint === 0, 'no close hint on a Cancelled parent', after);
  assert(after.tabStatus.includes('Cancelled'), 'tab status', after);
  // Open a part from the tab's Parts card: the compact Part of card opens the parent again inside the tab.
  await tab.getByTestId(`task-part-row-${A.taskId}`).click();
  await tab.getByTestId('task-part-of').waitFor({ timeout: 15000 });
  after.tabPartOfRow = await text(tab.locator('[data-testid="task-part-of"] li'));
  assert(after.tabPartOfRow.startsWith(P.taskKey) && after.tabPartOfRow.includes('Cancelled'), 'tab part view', after);
  for (const [page, name] of [[board, 'board'], [parentPage, 'parent-page'], [partPage, 'part-page'], [tab, 'tab-part']]) await shot(page, `API-08-${name}-after`);
  evidence.cases['API-08'] = { result: 'Pass', before, cancelled, after };
  assert(evidence.browserErrors.length === 0, 'browser errors', evidence.browserErrors);
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: rootId });
} catch (error) {
  evidence.cases['API-08'] = { ...(evidence.cases['API-08'] ?? {}), result: 'Fail', error: String(error.stack ?? error) };
  for (const [i, context] of pages.entries()) for (const p of context.pages()) await p.screenshot({ path: path.join(outputDir, `failure-${i}.png`), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  for (const s of sockets) s.terminate();
  for (const context of pages) await context.close().catch(() => {});
  await browser?.close().catch(() => {});
  evidence.cleanup.frontend = await stopGroup(stack.frontend).catch((e) => String(e));
  evidence.cleanup.backend = await stopGroup(stack.backend).catch((e) => String(e));
  if (stack.dataRoot) { await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !fs.existsSync(stack.dataRoot); }
  evidence.cleanup.liveAgyOfThisRun = liveAgyCwds().filter((cwd) => stack.dataRoot && cwd.includes(stack.dataRoot)).length;
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ result: evidence.cases['API-08']?.result, error: evidence.cases['API-08']?.error?.split('\n')[0], cleanup: evidence.cleanup }, null, 1));
}
