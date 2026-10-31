// API-05 (projects-left-navigation AC-014): the integrated journey in an isolated desktop instance of the worktree build.
// Usage: node API-05-desktop-journey.mjs <controlPort> <backendUrl> <dataRoot> <outDir>
// The instance's server runs the scripted AGY CLI (server-data/.env: ANTIGRAVITY_CLI_COMMAND=<worktree fixture>,
// AGY_FAKE_CASE=linked_skills): a message containing `CALL_TOOL:{...}` makes the agent call the real tool. No provider.
// Seed (definitions, a Project with one linked folder, one saved Task) goes through the instance's public GraphQL API.
// Journey: Projects mode → "+" on the Project → choose the manager and the AGY model → send → listed under the Project →
// it dispatches the saved Task to a Team with real delegate_task (typed in its composer) → follow and open the worker →
// DONE (typed in its composer) → the rows leave → back to Workspaces: the run under its folder, still open.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const [controlPort, backendUrl, dataRoot, outDir] = process.argv.slice(2);
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
fs.mkdirSync(outDir, { recursive: true });
const log = [];
const note = (k, v) => { const line = `${new Date().toISOString()} ${k}: ${JSON.stringify(v)}`; log.push(line); console.log(line); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const T = (id) => `[data-test="${id}"]`;
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const AGY = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
const serverData = path.join(dataRoot, 'server-data');
const projectFolder = path.join(dataRoot, 'launch-repo');
fs.mkdirSync(projectFolder, { recursive: true });

// ---- seed (public API)
const suffix = randomUUID().slice(0, 4);
const names = { manager: `Project Task Manager ${suffix}`, writer: `Release Notes Writer ${suffix}`, checker: `Fact Checker ${suffix}`, squad: `Docs Review Team ${suffix}`, project: `Prototype Launch ${suffix}` };
const agentDef = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
  { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames, defaultLaunchConfig: AGY } })).createAgentDefinition.id;
const ids = { manager: await agentDef(names.manager, ['create_task', 'update_task']), writer: await agentDef(names.writer, []), checker: await agentDef(names.checker, []) };
ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
  { input: { name: names.squad, description: names.squad, instructions: 'Review.', coordinatorMemberName: 'reviewer', defaultLaunchConfig: AGY,
    nodes: [{ memberName: 'reviewer', ref: ids.writer, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.checker, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
const project = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}',
  { input: { name: names.project, workspaces: [{ workspaceRootPath: projectFolder, description: 'repo' }] } })).createProject;
const taskId = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}',
  { input: { projectId: project.projectId, title: 'Review the launch checklist', description: 'Review the launch checklist' } })).createProjectTask.taskId;
note('seed', { ids, project, taskId });
const runtimes = await gql('query{availableAgentRuntimes{runtimeKind available detail}}').catch((e) => ({ error: String(e).slice(0, 300) }));
note('runtimes (AGY must be the scripted CLI)', runtimes);

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools')) ;
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const shot = async (name) => { await sleep(300); await page.screenshot({ path: path.join(outDir, `API-05-${name}.png`) }); note('shot', name); };
note('window', { url: page.url(), title: await page.title() });
const startedUnder = () => JSON.parse(fs.existsSync(path.join(serverData, 'projects', project.projectId, 'project_runs.json'))
  ? fs.readFileSync(path.join(serverData, 'projects', project.projectId, 'project_runs.json'), 'utf8') : '{"runs":[]}').runs.map((r) => r.root);
const promptOf = (runId) => {
  const walk = (dir) => {
    for (const entry of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === 'agy-project') {
        const manifest = JSON.parse(fs.readFileSync(path.join(full, 'manifest.json'), 'utf8'));
        if (manifest.runId === runId) { const agents = path.join(full, '.agents', 'agents'); return { text: fs.readFileSync(path.join(agents, fs.readdirSync(agents)[0], 'agent.md'), 'utf8'), workspacePath: manifest.workspacePath }; }
      } else { const found = walk(full); if (found) return found; }
    }
    return null;
  };
  return walk(path.join(serverData, 'memory'));
};

let result = 'Pass';
try {
  // Fresh definitions and Projects: reload the window once (as reopening the app would).
  await page.reload({ waitUntil: 'load' });
  await page.locator(T('run-section-switch')).waitFor({ timeout: 120000 });
  await shot('01-workspaces-mode');
  await page.locator(T('run-section-tab-projects')).click();
  const section = page.locator(`section:has(> ${T('project-row')}[data-project-id="${project.projectId}"])`);
  await section.waitFor({ timeout: 60000 });
  await shot('02-projects-mode');
  // "+" on the Project → New chat under it; choose the manager and the AGY model.
  await section.locator(T('project-row')).hover();
  await section.locator(T('project-run-add')).click();
  await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
  await page.locator(T('run-target-switcher-trigger')).click();
  await page.locator(T(`run-target-switcher-option-${ids.manager}`)).click();
  await page.locator(T('chat-model-trigger')).first().click();
  const list = page.locator(T(`chat-model-list-${AGY.runtimeKind}`));
  const row = page.locator(T(`chat-runtime-${AGY.runtimeKind}`));
  for (let i = 0; i < 6 && !(await list.isVisible().catch(() => false)); i += 1) { await row.hover().catch(() => {}); await sleep(400); if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await sleep(700); } }
  const rowBox = await row.boundingBox(); const listBox = await list.boundingBox();
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 });
  await list.locator(T(`chat-model-option-${AGY.llmModelIdentifier}`)).click();
  await sleep(500);
  const chip = (await page.locator(T('chat-workspace-trigger')).innerText()).trim();
  note('start surface chip', chip);
  if (!chip.includes(names.project)) throw new Error(`chip does not show the Project: ${chip}`);
  await shot('03-start-under-project');
  const before = startedUnder().length;
  const input = page.locator(`${T('chat-composer')} textarea`).first();
  await input.click(); await input.fill('Reply OK.');
  await page.locator(T('chat-primary-action')).first().click();
  const root = await until('run recorded under the Project', () => startedUnder()[before], 120000);
  const runId = root.runId;
  note('started under the Project', root);
  const pSection = page.locator(`section:has(> ${T('project-row')}[data-project-id="${project.projectId}"])`);
  const group = pSection.locator(`${T('workspace-agent-row')}[data-agent-definition-id="${ids.manager}"]`).first();
  await group.waitFor({ timeout: 30000 });
  if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click();
  const runRow = pSection.locator(`${T('workspace-agent-run-row')}[data-run-id="${runId}"]`);
  await until('run listed under the Project', async () => (await runRow.count()) === 1, 30000);
  const metadata = (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{workspaceRootPath runtimeKind}}}', { id: runId })).getAgentRunResumeConfig.metadataConfig;
  note('run folder and runtime', metadata);
  if (fs.realpathSync(metadata.workspaceRootPath) !== fs.realpathSync(projectFolder)) throw new Error('run not in the Project folder');
  const prompt = await until('prompt written', () => promptOf(runId), 60000);
  const section1 = prompt.text.slice(prompt.text.indexOf('## Project'), prompt.text.indexOf('## Project') + 230);
  note('## Project section', section1);
  if (!section1.includes(`You work in the Project ${names.project} (Project ID ${project.projectId}).`)) throw new Error('no Project section');
  await shot('04-run-listed-under-project');
  // It dispatches the saved Task to the Team with real delegate_task (typed in its composer).
  await until('reply shown', async () => /OK/.test(await page.locator(T('workspace-center-pane')).innerText().catch(() => '')), 60000);
  const composer = page.locator(`${T('workspace-center-pane')} textarea`).first();
  await composer.fill(callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, task_id: taskId }));
  await composer.press('Enter');
  const teamRow = pSection.locator(`${T('workspace-team-transient-execution-row')}[data-transient-kind="task_team"][data-member-address="/${segment(names.squad)}"]`);
  await teamRow.waitFor({ state: 'visible', timeout: 60000 });
  const taskLine = (await teamRow.locator(T('workspace-task-worker-task-summary')).first().innerText()).trim();
  note('Team row with Task line', taskLine);
  if ((await teamRow.getAttribute('aria-expanded')) === 'false') await teamRow.locator(T('workspace-team-transient-disclosure')).click();
  // The Team's coordinator, by the run id delegate_task returned (from the manager's stored conversation).
  const conversation = JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection.conversation);
  const memberId = /target_team_coordinator_agent_run_id\\*":\\*"([a-z0-9_]+)/.exec(conversation)?.[1];
  if (!memberId) throw new Error('no coordinator run id in the delegate_task result');
  const member = pSection.locator(`${T('workspace-team-transient-execution-row')}[data-agent-run-id="${memberId}"]`);
  await member.waitFor({ state: 'visible', timeout: 60000 });
  await shot('05-team-dispatched');
  await member.click();
  await until('worker conversation open', async () => /new task from/i.test(await page.locator(T('workspace-center-pane')).innerText()), 30000);
  note('opened worker', memberId);
  await shot('06-worker-open');
  // DONE (typed in the manager's composer): the Team rows leave live; the run stays.
  await runRow.click();
  await sleep(800);
  await composer.fill(callTool('update_task', { task_id: taskId, status: 'DONE' }));
  await composer.press('Enter');
  await until('Team rows left', async () => (await teamRow.count()) === 0, 60000);
  if ((await runRow.count()) !== 1) throw new Error('the run left with its Task');
  await shot('07-after-done');
  // Back to Workspaces: the same run under its folder, still open.
  await page.locator(T('run-section-tab-workspaces')).click();
  await sleep(800);
  const wsRow = page.locator(`${T('workspace-agent-run-row')}[data-run-id="${runId}"]`);
  await until('run in Workspaces mode', async () => (await wsRow.count()) === 1, 15000).catch(async () => {
    await page.locator(T('workspace-row'), { hasText: path.basename(projectFolder) }).first().click().catch(() => undefined);
    const wsGroup = page.locator(`${T('workspace-agent-row')}[data-agent-definition-id="${ids.manager}"]`).first();
    if ((await wsGroup.getAttribute('aria-expanded')) !== 'true') await wsGroup.click();
    await until('run in Workspaces mode (expanded)', async () => (await wsRow.count()) === 1, 15000);
  });
  note('Workspaces mode: run marked open', await wsRow.getAttribute('aria-current'));
  await shot('08-back-to-workspaces');
  note('page errors', errors);
  if (errors.length) throw new Error('browser errors');
} catch (error) {
  result = 'Fail';
  note('FAILED', String(error.message ?? error));
  await shot('99-failure').catch(() => undefined);
} finally {
  note('result', result);
  fs.writeFileSync(path.join(outDir, 'API-05-desktop-journey.log'), `# API-05 desktop journey (isolated instance of the worktree build)\n# node API-05-desktop-journey.mjs ${controlPort} ${backendUrl} ${dataRoot} <out>\n${log.join('\n')}\n`);
  // Disconnect only: the instance is stopped with `isolated-app stop`.
  process.exit(result === 'Pass' ? 0 : 1);
}
