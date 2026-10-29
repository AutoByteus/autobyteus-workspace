#!/usr/bin/env node
// API-08 (task-comments, ticket-owned temporary probe; not a package script).
// The comment thread while the user watches: the Task page and the right panel's Projects tab (Task view) of the Manager's
// running conversation. Comments come from the Manager's own update_task add_comment, from the tab's add box and from the
// Task page's add box; every open view updates live, oldest first, with number, time and full text. The board's search finds
// a Task by a word that is only in a comment (DEC-025). The Manager runs on the scripted AGY CLI (no provider).
// Stack (probe-owned): autobyteus-server-ts/dist/app.js (this worktree's build) with
// ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs (AGY_FAKE_CASE=linked_skills) + `nuxi dev` + headless Chrome,
// own data root under the OS temp dir, free ports; all removed in finally. Never the installed app or user data.
// Run from the worktree root:
//   node tickets/in-progress/task-comments/evidence/API-08-probe/comments-live-probe.mjs --output-dir <fresh absolute dir>
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

const evidence = { probe: 'API-08 comments-live-probe', startedAt: new Date().toISOString(), commit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), cases: {}, cleanup: {}, browserErrors: [] };
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
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'comments-live-probe-'));
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
  { const warm = await newPage(); await warm.goto(`${stack.frontendUrl}/projects`, { waitUntil: 'networkidle', timeout: 180000 }); await sleep(4000); await warm.reload({ waitUntil: 'networkidle' }); await warm.close(); }

  const workspace = path.join(stack.dataRoot, 'workspace');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });
  const suffix = randomUUID().slice(0, 4);
  const names = { manager: `Project Task Manager ${suffix}` };
  const managerDef = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name: names.manager, role: 'assistant', description: names.manager, instructions: 'Follow the request.', toolNames: ['list_projects', 'list_project_tasks', 'create_project', 'update_project', 'create_task', 'update_task'] } })).createAgentDefinition.id;
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

  // Seed: the user creates the Tasks (GraphQL, as the app does); the Manager comments with its own tool.
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: 'AutoByteus' } })).createProject.projectId;
  const create = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}', { input: { projectId, description } })).createProjectTask;
  const T = await create('Release notes for 1.5.6\nCollect the changes since 1.5.5.');
  const other = await create('Fix the sidebar collapse state');
  const third = await create('Plan the onboarding redesign');
  assert(JSON.stringify(await managerCalls(callTool('update_task', { task_id: T.taskKey, add_comment: 'Dispatched with this direction: keep it short.' }))) === JSON.stringify({ task: { projectId, taskId: T.taskKey, status: 'TODO', dependsOn: [], partOf: null } }), 'ack has no comment field');
  await managerCalls(callTool('update_task', { task_id: T.taskKey.toUpperCase(), add_comment: 'User decided: mention the quokka mascot.\nSecond line of the same comment.' }));
  evidence.seed = { projectId, keys: { T: T.taskKey, other: other.taskKey, third: third.taskKey } };

  /** The thread as rendered inside `scope`: each comment's testid, meta line ("#n · time"), machine time and full text. */
  const thread = (page, scope) => page.$$eval(`${scope} li[data-testid^="task-comment-"]`, (els) => els.map((el) => ({ id: el.getAttribute('data-testid'),
    meta: el.querySelector('[data-testid="task-comment-meta"]')?.innerText.replace(/\s+/g, ' ').trim(), datetime: el.querySelector('time')?.getAttribute('datetime'),
    text: el.querySelector('[data-testid="task-comment-text"]')?.innerText })));

  // The Task page.
  const pageView = await newPage();
  await pageView.goto(`${stack.frontendUrl}/projects/${projectId}/tasks/${T.taskKey}`, { waitUntil: 'networkidle' });
  await pageView.getByTestId('task-comments').waitFor({ timeout: 60000 });
  // The tab in the Manager's conversation, showing the same Task.
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
  const tabCard = (taskId) => tab.locator('[data-testid="projects-panel-board"]').getByTestId(`project-task-row-${taskId}`);
  // Empty state first (a Task without comments), then back to the board and the commented Task.
  await tabCard(other.taskId).getByTestId('project-task-row-link').click();
  await tab.getByTestId('projects-panel-task').waitFor({ timeout: 30000 });
  const emptyState = await text(tab.getByTestId('task-comments-none'));
  await tab.getByTestId('projects-panel-task-back').click();
  await tabCard(T.taskId).getByTestId('project-task-row-link').click();
  await tab.getByTestId('projects-panel-task').waitFor({ timeout: 30000 });
  await tab.getByTestId('task-comments').waitFor();

  const pageScope = '[data-testid="project-task-page"]', tabScope = '[data-testid="projects-panel-task"]';
  const before = { page: await thread(pageView, pageScope), tab: await thread(tab, tabScope), emptyState,
    order: await pageView.$$eval('[data-testid="task-page-reading-surface"] ~ section', (els) => els.map((e) => e.getAttribute('data-testid'))) };
  assert(before.page.length === 2 && before.page[0].text === 'Dispatched with this direction: keep it short.' && before.page[1].text === 'User decided: mention the quokka mascot.\nSecond line of the same comment.', 'page thread before', before);
  assert(before.page[0].meta.startsWith('#1 ·') && before.page[1].meta.startsWith('#2 ·') && before.page.every((c) => /^\d{4}-\d{2}-\d{2}T/.test(c.datetime)), 'numbers and times', before);
  assert(JSON.stringify(before.tab.map((c) => c.text)) === JSON.stringify(before.page.map((c) => c.text)), 'tab thread equals page', before);
  assert(emptyState === 'No comments yet.', 'empty state', before);
  for (const [p, n] of [[pageView, 'page'], [tab, 'tab']]) await shot(p, `API-08-${n}-before`);

  // Add from the tab: blank cannot be posted; a posted comment clears the box and arrives live in the Task page.
  const tabInput = tab.locator(tabScope).getByTestId('task-comment-input'), tabAdd = tab.locator(tabScope).getByTestId('task-comment-add');
  await tabInput.fill('   ');
  const blankDisabled = await tabAdd.isDisabled();
  await tabInput.fill('Added from the tab: the copy is approved.');
  await tabAdd.click();
  await until('tab shows #3', async () => (await thread(tab, tabScope)).length === 3, 15000);
  const tabBoxCleared = (await tabInput.inputValue()) === '';
  await until('Task page shows #3 live', async () => (await thread(pageView, pageScope)).length === 3, 15000);
  // Add from the Task page: arrives live in the tab.
  await pageView.locator(pageScope).getByTestId('task-comment-input').fill('Added from the Task page.');
  await pageView.locator(pageScope).getByTestId('task-comment-add').click();
  await until('tab shows #4 live', async () => (await thread(tab, tabScope)).length === 4, 15000);
  // The Manager's comment arrives live in both.
  await managerCalls(callTool('update_task', { task_id: T.taskKey, add_comment: 'Agent: draft is ready for review.' }));
  await until('both show #5 live', async () => (await thread(tab, tabScope)).length === 5 && (await thread(pageView, pageScope)).length === 5, 20000);
  const after = { page: await thread(pageView, pageScope), tab: await thread(tab, tabScope), blankDisabled, tabBoxCleared,
 };
  assert(blankDisabled === true && tabBoxCleared, 'blank disabled, box cleared', after);
  assert(JSON.stringify(after.page.map((c) => c.id)) === JSON.stringify(['task-comment-1', 'task-comment-2', 'task-comment-3', 'task-comment-4', 'task-comment-5']), 'ids in order', after);
  assert(JSON.stringify(after.tab.map((c) => c.text)) === JSON.stringify(after.page.map((c) => c.text)), 'tab equals page after', after);
  const stored = (await gql('query($id:String!){projectTasks(projectId:$id){taskId description comments{id text}}}', { id: projectId })).projectTasks.find((t) => t.taskId === T.taskId);
  assert(stored.description === 'Release notes for 1.5.6\nCollect the changes since 1.5.5.' && stored.comments.map((c) => c.id).join() === '1,2,3,4,5', 'stored thread, description unchanged', stored);
  for (const [p, n] of [[pageView, 'page'], [tab, 'tab']]) await shot(p, `API-08-${n}-after`);

  // The board's search finds the Task by a word only in a comment; clearing restores the board.
  const board = await newPage();
  await board.goto(`${stack.frontendUrl}/projects/${projectId}`, { waitUntil: 'networkidle' });
  await board.getByTestId(`project-task-row-${T.taskId}`).waitFor({ timeout: 60000 });
  const cards = () => board.$$eval('[data-testid^="project-task-row-project_task_"]', (els) => els.map((e) => e.getAttribute('data-testid').replace('project-task-row-', '')));
  const all = await cards();
  await board.getByTestId('project-tasks-search-input').fill('quokka');
  await until('search shows only the commented Task', async () => { const c = await cards(); return c.length === 1 && c[0] === T.taskId; }, 30000);
  const searched = await cards();
  await shot(board, 'API-08-board-search-quokka');
  await board.getByTestId('project-tasks-search-input').fill('');
  await until('board restored', async () => (await cards()).length === all.length, 30000);
  evidence.cases['API-08'] = { result: 'Pass', before, after, stored, boardSearch: { all, searched, restored: (await cards()).length } };
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
