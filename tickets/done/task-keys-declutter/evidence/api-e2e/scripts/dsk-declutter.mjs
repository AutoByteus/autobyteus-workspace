// DSK-D1..D4 (ticket-owned, temporary): AC-005 on an isolated desktop instance of this worktree's build, driven over
// its CDP control endpoint (attach-only; playwright-core from autobyteus-web). Data is created through the instance's
// public GraphQL and a scripted AGY Manager (ANTIGRAVITY_CLI_COMMAND set only in the owned root's server-data/.env).
// Usage: node dsk-declutter.mjs <webDir> <controlEndpoint> <backendUrl> <dataRoot> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const [webDir, controlEndpoint, backendUrl, dataRoot, outDir] = process.argv.slice(2);
const req = createRequire(path.join(webDir, 'package.json'));
const { chromium } = req('playwright-core'); const WebSocket = req('ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { steps: [], errors: [], screenshots: [] };
const save = () => fs.writeFile(path.join(outDir, 'dsk-declutter.json'), JSON.stringify(results, null, 2));
const gql = async (query, variables = {}) => { const r = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data; };
const until = async (label, fn, ms = 60000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(250); } throw new Error(`Timed out: ${label}${last ? ' — ' + last.message : ''}`); };
const assert = (ok, msg, detail) => { if (!ok) throw new Error(`${msg}: ${JSON.stringify(detail)}`); };
const step = async (name, fn) => { const s = { name, result: 'Fail' }; results.steps.push(s); try { s.observed = await fn(); s.result = 'Pass'; } catch (e) { s.error = e.stack || String(e); } finally { await save(); } console.log(`[${s.result}] ${name}${s.error ? ': ' + s.error.split('\n')[0] : ''}`); return s.result === 'Pass'; };
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const segment = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Data: Project "AutoByteus" with A, B (depends on A: blocked) and C, created as a user / agent would.
const projectId = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'AutoByteus' } })).createProject.projectId;
const mk = async (description, dependsOnTaskIds) => (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey description}}', { i: { projectId, description, ...(dependsOnTaskIds ? { dependsOnTaskIds } : {}) } })).createProjectTask;
const A = await mk('Design the board schema'); const B = await mk('Build the API on the schema', [A.taskId]); const C = await mk('Write the release notes');
results.tasks = { A, B, C };

let page, browser, socket, runId, worker, tempWorker;
const workspaceRoot = path.join(dataRoot, 'workspace');
await step('setup: scripted AGY Manager delegates B by key and a Temp task', async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some(w => w.absolutePath === workspaceRoot)) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceRoot } });
  const suffix = randomUUID().slice(0, 4);
  const def = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const manager = await def(`Declutter Manager ${suffix}`, ['list_projects', 'list_project_tasks', 'create_task', 'update_task']);
  const workerName = `Declutter Worker ${suffix}`; await def(workerName, []);
  const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: manager, workspaceRootPath: workspaceRoot, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  assert(r.success, 'run created', r); runId = r.runId;
  socket = new WebSocket(`${backendUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`);
  await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); }); await sleep(500);
  const send = content => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `dsk-${randomUUID()}`, dedupe_key: `agent_run_input:dsk:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
  send(callTool('delegate_task', { recipient_address: `/${segment(workerName)}`, task_id: B.taskKey }));
  const root = await until('B delegated and started', async () => { const t = (await gql('query($id:String!){projectTasks(projectId:$id){taskId root{ingressAgentRunId start}}}', { id: projectId })).projectTasks.find(x => x.taskId === B.taskId); return t?.root?.start === 'started' ? t.root : null; }, 90000);
  worker = root.ingressAgentRunId;
  send(callTool('delegate_task', { recipient_address: `/${segment(workerName)}`, description: 'Reply OK.\nA Temp task.' }));
  const temp = await until('Temp task started', async () => (await gql('query{tasksWithoutProject{description root{ingressAgentRunId start}}}')).tasksWithoutProject.find(t => t.description.startsWith('Reply OK.') && t.root?.start === 'started'), 90000);
  tempWorker = temp.root.ingressAgentRunId;
  return { runId, worker, tempWorker };
});

browser = await chromium.connectOverCDP(controlEndpoint);
const context = browser.contexts()[0];
page = await until('renderer', () => context.pages().find(p => p.url().includes('/renderer/index.html')));
page.on('pageerror', e => results.errors.push(e.message));
await page.setViewportSize({ width: 1440, height: 900 });
const go = async h => { await page.evaluate(h => { location.hash = h; }, h); await sleep(400); };
const shot = async name => { const file = path.join(outDir, `${name}.png`); await page.screenshot({ path: file }); results.screenshots.push(file); };
const cardFacts = scope => scope.locator('[data-testid^="project-task-row-project_task_"]').evaluateAll(es => es.map(e => ({
  id: e.dataset.testid.replace('project-task-row-', ''),
  keyLines: e.querySelectorAll('[data-testid="project-task-row-key"]').length,
  firstText: (e.querySelector('[data-testid="project-task-row-link"]')?.innerText ?? '').trim().split('\n')[0],
  badge: e.querySelector('[data-testid^="task-dependency-badge-"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
  badgeKeyTitle: e.querySelector('[data-testid^="task-dependency-badge-"] [data-testid="task-key"]')?.getAttribute('title') ?? null })));
const checkCards = (cards, where) => {
  assert(cards.length === 3, `${where}: three cards`, cards);
  for (const c of cards) assert(c.keyLines === 0, `${where}: no key line`, c);
  const byId = Object.fromEntries(cards.map(c => [c.id, c]));
  assert(byId[A.taskId].firstText === 'Design the board schema' && byId[C.taskId].firstText === 'Write the release notes', `${where}: cards start with the summary`, cards);
  assert(byId[B.taskId].firstText === 'Build the API on the schema' && byId[B.taskId].badge === `Blocked by ${A.taskKey}` && byId[B.taskId].badgeKeyTitle === A.taskKey, `${where}: badge keeps its key`, byId[B.taskId]);
  return cards;
};

await step('DSK-D1 Projects page board 1440×900: no key line on any card; cards start with the summary; "Blocked by <key>" kept (AC-001)', async () => {
  await go(`#/projects/${projectId}`); await page.getByTestId('project-task-columns').waitFor({ timeout: 30000 }); await sleep(500);
  const cards = checkCards(await cardFacts(page), 'page');
  await shot('dsk-d1-board-page-1440x900'); return cards;
});
await step('DSK-D4 Task page: key chip with copy, Depends on / Required by rows by key; picker options by key (AC-003)', async () => {
  await page.locator(`[data-testid="project-task-row-${B.taskId}"]`).getByTestId('project-task-row-link').click();
  await page.getByTestId('task-key-chip').waitFor();
  const chip = await page.getByTestId('task-key-chip').getByTestId('task-key').getAttribute('data-key');
  const deps = await page.getByTestId('task-dependencies-depends-on').locator('[data-testid^="task-dependency-project_task_"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  const hash = await page.evaluate(() => location.hash);
  assert(chip === B.taskKey && deps[0]?.startsWith(A.taskKey) && hash.endsWith(`/tasks/${B.taskKey}`), 'chip, rows and key URL', { chip, deps, hash });
  await shot('dsk-d4-task-page-1440x900');
  await go(`#/projects/${projectId}/tasks/${C.taskKey}/edit`); await page.getByTestId('task-dependency-input').click();
  const options = await until('picker options', async () => { const o = await page.getByTestId('task-dependency-options').getByRole('option').evaluateAll(es => es.map(e => e.querySelector('[data-testid="task-key"]')?.getAttribute('data-key'))); return o.length ? o : null; });
  assert(JSON.stringify(options) === JSON.stringify([B.taskKey, A.taskKey]), 'picker lists keys, newest first', options);
  await shot('dsk-d4-picker-1440x900');
  await page.getByTestId('task-dependency-input').press('Escape'); await page.getByTestId('task-page-cancel').click();
  return { chip, deps, hash, options };
});
await step('DSK-D3 Workspaces tree: Project Task copy and Temp copy show the summary only; title / name "Show Task in Projects: <summary>" (AC-002)', async () => {
  await go(`#/chat?id=${encodeURIComponent(runId)}`);
  const ROW = '[data-test="workspace-team-transient-execution-row"]';
  const read = id => page.locator(`${ROW}[data-agent-run-id="${id}"]:visible [data-test="workspace-task-worker-task-summary"]`).evaluate(e => ({ text: e.textContent, keySpans: e.querySelectorAll('[data-test="workspace-task-worker-task-key"]').length, title: e.getAttribute('title'), aria: e.getAttribute('aria-label') }));
  const copy = await until('copy summary', () => read(worker)); const temp = await until('temp summary', () => read(tempWorker));
  assert(copy.text === 'Build the API on the schema' && copy.keySpans === 0 && copy.title === 'Show Task in Projects: Build the API on the schema' && copy.aria === copy.title && !copy.text.includes(B.taskKey), 'Project Task copy summary', copy);
  assert(temp.text === 'Reply OK.' && temp.keySpans === 0 && temp.title === 'Show Task in Projects: Reply OK.' && temp.aria === temp.title, 'Temp copy summary', temp);
  await page.locator(`${ROW}[data-agent-run-id="${worker}"]:visible`).screenshot({ path: path.join(outDir, 'dsk-d3-tree-project-copy-row.png') });
  await page.locator(`${ROW}[data-agent-run-id="${tempWorker}"]:visible`).screenshot({ path: path.join(outDir, 'dsk-d3-tree-temp-copy-row.png') });
  await shot('dsk-d3-tree-1440x900');
  // The locate action still works without the key in the answer (AC-004).
  await page.locator(`${ROW}[data-agent-run-id="${worker}"]:visible [data-test="workspace-task-worker-task-summary"]`).click();
  await until('located in the tab', async () => (await page.locator('[data-located="true"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid')))).includes(`project-task-row-${B.taskId}`), 15000);
  await shot('dsk-d3-located-1440x900');
  return { copy, temp };
});
await step('DSK-D2 Right-panel tab board: no key lines, badge with key; tab Task view keeps the chip and dependency rows (AC-001, AC-003)', async () => {
  const panel = page.locator('[data-test="right-side-projects-panel"]');
  await page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]').click();
  await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
  await panel.locator(`[data-testid="project-task-row-${A.taskId}"]`).waitFor({ timeout: 30000 });
  const cards = checkCards(await cardFacts(panel), 'tab');
  await shot('dsk-d2-tab-board-1440x900');
  await panel.locator(`[data-testid="project-task-row-${B.taskId}"]`).getByTestId('project-task-row-link').click();
  await panel.getByTestId('projects-panel-task').waitFor();
  const chip = await panel.getByTestId('task-key-chip').getByTestId('task-key').getAttribute('data-key');
  const deps = await panel.getByTestId('task-dependencies-depends-on').locator('button').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  assert(chip === B.taskKey && deps[0]?.startsWith(A.taskKey), 'tab Task view keeps keys', { chip, deps });
  await shot('dsk-d2-tab-task-view-1440x900');
  await panel.getByTestId('projects-panel-task-back').click();
  return { cards, chip, deps };
});
await step('G1 live GraphQL on the instance: taskWorkerTasks answers without taskKey; selecting taskKey is a schema error (AC-004)', async () => {
  const answer = (await gql('query($a:[String!]!,$t:[String!]!){taskWorkerTasks(agentRunIds:$a,teamRunIds:$t){workerKind workerRunId task{taskId projectId description status}}}', { a: [worker, tempWorker], t: [] })).taskWorkerTasks;
  const byWorker = Object.fromEntries(answer.map(a => [a.workerRunId, a.task]));
  assert(byWorker[worker]?.taskId === B.taskId && byWorker[tempWorker]?.projectId === null, 'answers', answer);
  const fields = (await gql('{__type(name:"TaskWorkerTaskView"){fields{name}}}')).__type.fields.map(f => f.name).sort();
  let rejected = null; try { await gql('query($a:[String!]!){taskWorkerTasks(agentRunIds:$a,teamRunIds:[]){task{taskKey}}}', { a: [worker] }); } catch (e) { rejected = e.message.slice(0, 200); }
  assert(JSON.stringify(fields) === JSON.stringify(['description', 'projectId', 'status', 'taskId']) && rejected && /taskKey/.test(rejected), 'schema', { fields, rejected });
  return { answer, fields, rejected };
});
try { socket?.close(); results.terminate = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: runId })).terminateAgentRun; } catch (e) { results.terminateError = String(e); }
results.result = results.steps.every(s => s.result === 'Pass') && !results.errors.length ? 'Pass' : 'Fail';
await save(); console.log('RESULT', results.result, 'pageErrors', results.errors.length, JSON.stringify(results.errors).slice(0, 300));
await browser.close().catch(() => {});
