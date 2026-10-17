// DSK-004 / DSK-005 (ticket-owned, temporary): an agent run in the isolated desktop instance, on the scripted AGY CLI
// configured only in the owned data root's server-data/.env (no provider calls). The Manager delegates a Project Task by
// its key and a description-only Temp task; the Workspaces tree and the right-panel Projects tab are checked like a user
// would see them; an agent status change clears a badge live.
// Usage: node dsk-agent.mjs <webDir> <controlEndpoint> <backendUrl> <dataRoot> <seeded.json> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const [webDir, controlEndpoint, backendUrl, dataRoot, seededPath, outDir] = process.argv.slice(2);
const req = createRequire(path.join(webDir, 'package.json'));
const { chromium } = req('playwright-core'); const WebSocket = req('ws');
const seeded = JSON.parse(await fs.readFile(seededPath, 'utf8'));
const ab = seeded.projects.find(p => p.name === 'AutoByteus');
const id = n => [...ab.tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[n - 1].taskId;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { steps: [], errors: [], screenshots: [] };
const gql = async (query, variables = {}) => { const r = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data; };
const until = async (label, fn, ms = 60000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(250); } throw new Error(`Timed out: ${label}${last ? ' — ' + last.message : ''}`); };
const assert = (ok, msg, detail) => { if (!ok) throw new Error(`${msg}: ${JSON.stringify(detail)}`); };
const step = async (name, fn) => { const s = { name, result: 'Fail' }; results.steps.push(s); try { s.observed = await fn(); s.result = 'Pass'; } catch (e) { s.error = e.stack || String(e); } finally { await fs.writeFile(path.join(outDir, 'dsk-004-005-agent.json'), JSON.stringify(results, null, 2)); } console.log(`[${s.result}] ${name}${s.error ? ': ' + s.error.split('\n')[0] : ''}`); return s.result === 'Pass'; };
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const segment = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const tasks = async () => (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey status dependsOnTaskIds root{kind ingressAgentRunId start}}}', { id: ab.projectId })).projectTasks;

const workspaceRoot = path.join(dataRoot, 'workspace');
const suffix = randomUUID().slice(0, 4);
const names = { manager: `Key Manager ${suffix}`, worker: `Key Worker ${suffix}` };
const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
let runId, socket, page, browser, worker, tempWorker;
const send = content => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `dsk-${randomUUID()}`, dedupe_key: `agent_run_input:dsk:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
const shot = async name => { const file = path.join(outDir, `${name}.png`); await page.screenshot({ path: file }); results.screenshots.push(file); };

const ok = await step('DSK-005a setup: scripted AGY Manager run; delegate_task by key in upper case and a Temp task', async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some(w => w.absolutePath === workspaceRoot)) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceRoot } });
  const manager = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_task', 'update_task']);
  await agent(names.worker, []);
  const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: manager, workspaceRootPath: workspaceRoot, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  assert(r.success, 'run created', r); runId = r.runId;
  socket = new WebSocket(`${backendUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await sleep(500);
  send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: 'AUTOBYTEUS-5' }));
  const root5 = await until('Task autobyteus-5 started', async () => { const t = (await tasks()).find(x => x.taskId === id(5)); return t?.root?.start === 'started' ? t.root : null; }, 90000);
  worker = root5.ingressAgentRunId;
  send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: 'Reply OK.\nA Temp task has no key.' }));
  const temp = await until('Temp task started', async () => (await gql('query{tasksWithoutProject{taskId description root{ingressAgentRunId start}}}')).tasksWithoutProject.find(t => t.description.startsWith('Reply OK.') && t.root?.start === 'started'), 90000);
  tempWorker = temp.root.ingressAgentRunId;
  const workerTasks = (await gql('query($a:[String!]!,$t:[String!]!){taskWorkerTasks(agentRunIds:$a,teamRunIds:$t){workerKind workerRunId task{taskId taskKey projectId description status}}}', { a: [worker, tempWorker], t: [] })).taskWorkerTasks;
  const byWorker = Object.fromEntries(workerTasks.map(w => [w.workerRunId, w.task]));
  assert(byWorker[worker]?.taskKey === 'autobyteus-5' && byWorker[tempWorker]?.taskKey === null, 'taskWorkerTasks answer carries taskKey (null for a Temp task)', workerTasks);
  return { runId, worker, tempWorker, workerTasks };
});
if (ok) {
  browser = await chromium.connectOverCDP(controlEndpoint);
  const context = browser.contexts()[0];
  page = await until('renderer', () => context.pages().find(p => p.url().includes('/renderer/index.html')));
  page.on('pageerror', e => results.errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(h => { location.hash = h; }, `#/chat?id=${encodeURIComponent(runId)}`);
  const ROW = '[data-test="workspace-team-transient-execution-row"]';
  await step('DSK-005b Workspaces tree: the delegated copy reads "<key> <summary>" (key medium); tooltip/name "Show Task in Projects: <key> <summary>"; the Temp copy has no key (VIS-012, AC-016, AC-007)', async () => {
    const rowOf = runId => page.locator(`${ROW}[data-agent-run-id="${runId}"]:visible`);
    const read = async runId => rowOf(runId).locator('[data-test="workspace-task-worker-task-summary"]').evaluate(e => ({ text: e.textContent, key: e.querySelector('[data-test="workspace-task-worker-task-key"]')?.textContent ?? null,
      keyWeight: e.querySelector('[data-test="workspace-task-worker-task-key"]') ? getComputedStyle(e.querySelector('[data-test="workspace-task-worker-task-key"]')).fontWeight : null, title: e.getAttribute('title'), aria: e.getAttribute('aria-label') }));
    const copy = await until('copy row summary', async () => (await rowOf(worker).count()) ? read(worker) : null, 60000);
    const temp = await until('temp row summary', async () => (await rowOf(tempWorker).count()) ? read(tempWorker) : null, 60000);
    assert(copy.key === 'autobyteus-5' && copy.keyWeight === '500' && copy.title === 'Show Task in Projects: autobyteus-5 Write the API reference' && copy.aria === copy.title, 'copy summary', copy);
    assert(temp.key === null && temp.title === 'Show Task in Projects: Reply OK.' && temp.aria === temp.title, 'Temp summary has no key', temp);
    const rowLabel = await rowOf(worker).getAttribute('aria-label');
    await rowOf(worker).screenshot({ path: path.join(outDir, 'dsk-005b-tree-copy-row.png') }); await rowOf(tempWorker).screenshot({ path: path.join(outDir, 'dsk-005b-tree-temp-row.png') });
    await shot('dsk-005b-tree-1440x900');
    return { copy, temp, rowLabel };
  });
  const panel = page.locator('[data-test="right-side-projects-panel"]');
  await step('DSK-004a Right-panel Projects tab: keys and badges on the compact board (VIS-010)', async () => {
    await page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]').click();
    await panel.getByTestId('projects-panel-picker-select').waitFor();
    await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${ab.projectId}`);
    const row = taskId => panel.locator(`[data-testid="project-task-row-${taskId}"]`);
    await row(id(5)).waitFor({ timeout: 30000 });
    const view = {};
    for (const n of [1, 3, 5, 6]) {
      view[n] = { key: await row(id(n)).getByTestId('project-task-row-key').getByTestId('task-key').getAttribute('data-key'),
        badge: (await row(id(n)).locator('[data-testid^="task-dependency-badge-"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim())))[0] ?? null }; // (fixed: index the result, not the Promise)
    }
    assert(view[5].key === 'autobyteus-5' && view[5].badge === 'Blocked by autobyteus-3' && view[6].badge === 'Dependency cancelled: autobyteus-4' && view[1].badge === null, 'panel board', view);
    await shot('dsk-004a-right-panel-board-1440x900'); return view;
  });
  await step('DSK-004b Tab Task view: key chip beside the status, Dependencies card; a dependency row opens that Task in the tab; Open in Projects links the key URL (VIS-011)', async () => {
    await panel.locator(`[data-testid="project-task-row-${id(5)}"]`).getByTestId('project-task-row-link').click();
    await panel.getByTestId('projects-panel-task').waitFor();
    const chip = await panel.getByTestId('task-key-chip').getByTestId('task-key').getAttribute('data-key');
    const deps = await panel.getByTestId('task-dependencies-depends-on').locator('button').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const req = await panel.getByTestId('task-dependencies-required-by').locator('button').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const openHref = await panel.getByTestId('projects-panel-task-open-page').getAttribute('href');
    await shot('dsk-004b-right-panel-task-1440x900');
    assert(chip === 'autobyteus-5' && deps.length === 2 && deps[0].startsWith('autobyteus-2') && deps[1].startsWith('autobyteus-3') && req[0]?.startsWith('autobyteus-7'), 'tab Task view', { chip, deps, req });
    assert(openHref?.endsWith(`/projects/${ab.projectId}/tasks/autobyteus-5`), 'Open in Projects key URL', openHref);
    await panel.getByTestId('task-dependencies-depends-on').getByTestId(`task-dependency-${id(3)}`).click();
    await until('tab shows autobyteus-3', async () => await panel.getByTestId('task-key-chip').getByTestId('task-key').getAttribute('data-key') === 'autobyteus-3');
    const centerHash = await page.evaluate(() => location.hash);
    assert(centerHash.startsWith('#/chat'), 'the chat stays in the center', centerHash);
    await panel.getByTestId('projects-panel-task-back').click();
    return { chip, deps, req, openHref, centerHash };
  });
  await step('DSK-004c Live: the Manager sets autobyteus-3 DONE by key; autobyteus-5\'s badge clears in the tab without Refresh (AC-011, AC-012)', async () => {
    const row5 = panel.locator(`[data-testid="project-task-row-${id(5)}"]`);
    let listRequests = 0; const count = r => { if (r.url().endsWith('/graphql') && r.postData()?.includes('projectTasks(')) listRequests++; }; page.on('request', count);
    try {
      send(callTool('update_task', { task_id: 'autobyteus-3', status: 'DONE' }));
      await until('badge cleared live', async () => (await row5.locator('[data-testid^="task-dependency-badge-"]').count()) === 0, 30000);
    } finally { page.off('request', count); }
    const t7badge = await panel.locator(`[data-testid="project-task-row-${(await tasks()).find(t => t.taskKey === 'autobyteus-7').taskId}"]`).locator('[data-testid^="task-dependency-badge-"]').innerText();
    await shot('dsk-004c-right-panel-badge-cleared-1440x900');
    assert(listRequests === 0 && /Blocked by\s*autobyteus-5/.test(t7badge), 'live, no list request; dependents of open Tasks still blocked', { listRequests, t7badge });
    return { listRequests, t7badge };
  });
  await step('DSK-005c Show Task in Projects from the tree summary locates autobyteus-5 in the tab (preserved locate)', async () => {
    await page.locator(`${ROW}[data-agent-run-id="${worker}"]:visible`).locator('[data-test="workspace-task-worker-task-summary"]').click();
    await until('located', async () => (await page.locator('[data-located="true"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid')))).includes(`project-task-row-${id(5)}`), 15000);
    await shot('dsk-005c-located-1440x900'); return true;
  });
}
try { socket?.close(); if (runId) results.terminate = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: runId })).terminateAgentRun; } catch (e) { results.terminateError = String(e); }
results.result = results.steps.every(s => s.result === 'Pass') && !results.errors.length ? 'Pass' : 'Fail';
await fs.writeFile(path.join(outDir, 'dsk-004-005-agent.json'), JSON.stringify(results, null, 2));
console.log('RESULT', results.result, 'pageErrors', results.errors.length, JSON.stringify(results.errors).slice(0, 500));
await browser?.close().catch(() => {});
