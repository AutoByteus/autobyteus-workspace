#!/usr/bin/env node
// Temporary API/E2E check (delegated-copy-task-locator), not durable coverage: the packaged desktop app of this
// worktree build, started with `pnpm --silent isolated-app start --build`, driven over its control port.
// The instance's own server uses the repository's scripted AGY CLI (set in the instance's own data-root `.env`),
// so copies come from the real `delegate_task` tool without model calls.
// Usage (repo root): node <this file> <evidence dir> (reads <evidence dir>/start.json)
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const repo = process.cwd();
const require = createRequire(path.join(repo, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const out = path.resolve(process.argv[2]);
const start = JSON.parse(await fs.readFile(path.join(out, 'start.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, fn, ms = 60000, every = 200) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const gql = async (query, variables = {}) => {
  const r = await fetch(start.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (!r.ok || b.errors?.length) throw new Error(JSON.stringify(b.errors ?? b)); return b.data;
};
const segment = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const result = { startedAt: new Date().toISOString(), instanceId: start.instanceId, checks: {} };

try {
  const workspace = path.join(start.dataRoot, 'desk-workspace');
  await fs.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });
  const suffix = randomUUID().slice(0, 4);
  const agent = async (name, toolNames = []) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: `Desk Manager ${suffix}`, worker: `Desk Writer ${suffix}` };
  const managerId = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_or_update_task']);
  await agent(names.worker);
  const projectA = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Desk Desktop ${suffix}` } })).createProject.projectId;
  const taskId = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId: projectA, description: 'Ship the desktop summary check\nmore detail' } })).createProjectTask.taskId;
  const projectB = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Desk Other ${suffix}` } })).createProject.projectId;
  await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId: projectB, description: 'Other work' } });
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: managerId,
    workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const socket = new WebSocket(`${start.backendUrl.replace(/^http/, 'ws')}/ws/agent/${run.runId}`);
  await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: run.runId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
    content: callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: taskId }), context_file_paths: [], image_urls: [] } }));
  const root = await until('worker started', async () => (await gql('query($id:String!){projectTasks(projectId:$id){taskId root{ingressAgentRunId start}}}', { id: projectA }))
    .projectTasks.find((t) => t.taskId === taskId && t.root?.start === 'started')?.root, 90000);
  socket.close();
  result.setup = { runId: run.runId, workerRunId: root.ingressAgentRunId, projectA, projectB, taskId };

  const browser = await chromium.connectOverCDP(start.controlEndpoint);
  const page = await until('app window', async () => browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools')), 30000);
  result.appUrl = page.url();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Open the Manager run as a user does: Workspaces → workspace → Agent → run.
  await page.reload({ waitUntil: 'load' });
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) > 0, 60000);
  const agentRow = page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager });
  if (!(await agentRow.count())) await page.locator('[data-test="workspace-row"]', { hasText: 'desk-workspace' }).first().click();
  await agentRow.click();
  const runRow = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${run.runId}"]`);
  await runRow.waitFor({ timeout: 30000 });
  await runRow.click();
  const summary = page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${root.ingressAgentRunId}"] [data-test="workspace-task-worker-task-summary"]`);
  await summary.waitFor({ timeout: 30000 });
  result.checks.summary = { text: await summary.innerText(), title: await summary.getAttribute('title'),
    style: await summary.evaluate((e) => ({ fontSize: getComputedStyle(e).fontSize, color: getComputedStyle(e).color })),
    rowHeight: await summary.evaluate((e) => Math.round(e.closest('[data-test="workspace-team-transient-execution-row"]').getBoundingClientRect().height)) };
  await page.screenshot({ path: path.join(out, 'D1-desktop-summary.png') });
  // The right panel starts collapsed to its strip at this window size: the summary must reveal Projects itself.
  // The newer Project (B) is the Projects tab's default choice, so landing on A is the locate's switch.
  result.checks.before = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], projectsPanel: Boolean(document.querySelector('[data-test="right-side-projects-panel"]')) }));
  await summary.click();
  result.checks.located = await until('located', async () => page.evaluate((id) => {
    const card = document.querySelector(`[data-testid="project-task-row-${id}"]`);
    const focused = document.activeElement?.closest('div[data-testid^="project-task-row-"]')?.getAttribute('data-testid');
    return card?.getAttribute('data-located') === 'true' && focused === `project-task-row-${id}`
      ? { picker: [...document.querySelectorAll('[data-testid="projects-panel-picker-select"]')].find((e) => e.getBoundingClientRect().height > 0)?.value,
        drawer: Boolean(document.querySelector('[data-test="workspace-right-tool-drawer"]')), docked: Boolean(document.querySelector('[data-test="workspace-right-panel"]')),
        background: getComputedStyle(card).backgroundColor } : null;
  }, taskId), 20000, 50);
  await sleep(500);
  await page.screenshot({ path: path.join(out, 'D2-desktop-located.png') });
  result.checks.pickerSwitched = result.checks.located.picker === `project:${projectA}`;
  result.pageErrors = errors;
  await browser.close();
  result.result = result.checks.summary.text === 'Ship the desktop summary check' && result.checks.pickerSwitched && errors.length === 0 ? 'Pass' : 'Fail';
} catch (error) {
  result.result = 'Fail'; result.error = String(error.stack ?? error);
}
await fs.writeFile(path.join(out, 'desktop-result.json'), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${result.result}\n`);
process.exit(result.result === 'Pass' ? 0 : 1);
