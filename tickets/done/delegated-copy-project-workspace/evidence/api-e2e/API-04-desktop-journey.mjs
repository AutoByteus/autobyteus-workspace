// API-04 (delegated-copy-project-workspace, autobyteus-97 AC-009): the packaged desktop app of the worktree build, isolated
// instance, driven over its CDP control port. Ticket-owned automation (not durable test code).
// Usage: node API-04-desktop-journey.mjs <controlPort> <backendUrl> <dataRoot> <outDir>
// The instance's server runs the scripted AGY CLI (server-data/.env: ANTIGRAVITY_CLI_COMMAND=<worktree fixture>,
// AGY_FAKE_CASE=linked_skills): a message with `CALL_TOOL:{...}` makes the agent call the real tool. No provider inference.
// Seed through the instance's public GraphQL: definitions; Project O linked to folder G, Project P linked to folder F (each with
// a sentinel file); two saved Tasks of P. Journey, as a user:
//   Projects mode → "+" on O → the manager + the AGY model → send → the manager runs in G, listed under O;
//   typed in its composer: delegate P's Task to an Agent and P's other Task to a Team;
//   Projects mode: both copies nested under the manager in O; focusing the Agent copy shows F in Files and `pwd` = F in Terminal;
//     focusing a Team member shows F in Files and `pwd` = F; P shows "No runs yet";
//   Workspaces mode: the copies stay under the manager in G's section; focusing the Agent copy shows F.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const [controlPort, backendUrl, dataRoot, outDir] = process.argv.slice(2);
const require = createRequire(new URL('../../../../../autobyteus-web/package.json', import.meta.url));
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
const G = path.join(fs.realpathSync(dataRoot), 'manager-folder');
const F = path.join(fs.realpathSync(dataRoot), 'project-folder');
for (const [dir, sentinel] of [[G, 'sentinel-manager.txt'], [F, 'sentinel-project.txt']]) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, sentinel), sentinel); }

// ---- seed (public API)
const suffix = randomUUID().slice(0, 4);
const names = { manager: `Project Task Manager ${suffix}`, writer: `Agent Package Creator ${suffix}`, checker: `Fact Checker ${suffix}`, squad: `Scouting Team ${suffix}` };
const agentDef = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
  { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames, defaultLaunchConfig: AGY } })).createAgentDefinition.id;
const ids = { manager: await agentDef(names.manager, ['create_task', 'update_task']), writer: await agentDef(names.writer, []), checker: await agentDef(names.checker, []) };
ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
  { input: { name: names.squad, description: names.squad, instructions: 'Scout.', coordinatorMemberName: 'lead', defaultLaunchConfig: AGY,
    nodes: [{ memberName: 'lead', ref: ids.writer, refScope: 'SHARED' }, { memberName: 'researcher', ref: ids.checker, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
const project = async (name, folder) => (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}',
  { input: { name, workspaces: [{ workspaceRootPath: folder, description: 'repo' }] } })).createProject;
const O = await project(`AutoByteus ${suffix}`, G);
const P = await project(`AutoByteus Agents ${suffix}`, F);
const task = async (title) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
  { input: { projectId: P.projectId, title, description: title } })).createProjectTask.taskId;
const tasks = { agent: await task('Package the release-notes agent'), team: await task('Scout the market') };
note('seed', { ids, O, P, tasks, G, F });
note('AGY catalog (must be the scripted CLI)', (await gql('query{providerModelCatalogSnapshots(runtimeKind:"antigravity_cli"){llmModels{modelIdentifier name}}}')).providerModelCatalogSnapshots);

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools'));
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const shot = async (name) => { await sleep(500); await page.screenshot({ path: path.join(outDir, `API-04-${name}.png`) }); note('shot', name); };
const startedUnder = (projectId) => JSON.parse(fs.existsSync(path.join(serverData, 'projects', projectId, 'project_runs.json'))
  ? fs.readFileSync(path.join(serverData, 'projects', projectId, 'project_runs.json'), 'utf8') : '{"runs":[]}').runs.map((r) => r.root);
const section = (projectId) => page.locator(`section:has(> ${T('project-row')}[data-project-id="${projectId}"])`);
const openProject = async (projectId) => { const d = section(projectId).locator(T('project-row-disclosure')); if ((await d.getAttribute('aria-expanded')) !== 'true') await d.click(); return section(projectId); };
const openGroup = async (scope) => { const g = scope.locator(`${T('workspace-agent-row')}[data-agent-definition-id="${ids.manager}"]`).first(); await g.waitFor({ timeout: 30000 }); if ((await g.getAttribute('aria-expanded')) !== 'true') await g.click(); };
const runRow = (scope, id) => scope.locator(`${T('workspace-agent-run-row')}[data-run-id="${id}"]`);
const copyRow = (scope, id) => scope.locator(`${T('workspace-team-transient-execution-row')}[data-agent-run-id="${id}"]`);
/** Opens a right-side tool: from its tab when the panel is open, else from the collapsed strip (as in a narrow window). */
const rightTab = (name) => ({ click: async () => {
  const tab = page.locator(`${T('right-side-tab-list')} [role="tab"]`).filter({ hasText: name }).first();
  if (await tab.isVisible().catch(() => false)) return tab.click();
  await page.locator(`${T('workspace-right-tool-strip')} button[data-tab-name="${name.toLowerCase()}"]`).first().click();
} });
const filesShow = async (sentinel, absent) => {
  await rightTab('Files').click();
  const files = page.locator(T('right-side-files-panel')).filter({ visible: true });
  await until(`Files shows ${sentinel}`, async () => (await files.getByText(sentinel).count()) > 0, 30000);
  if (absent && (await files.getByText(absent).count()) > 0) throw new Error(`Files still shows ${absent}`);
};
const terminalPwd = async (expected) => {
  await rightTab('Terminal').click();
  // The visible terminal (docked panel, or the overlay a collapsed right side opens).
  const xterm = page.locator('.xterm').filter({ visible: true }).last();
  await xterm.waitFor({ timeout: 30000 });
  await sleep(1500);
  await xterm.click();
  await page.keyboard.type('pwd\n');
  return until(`Terminal pwd ${expected}`, async () => { const text = (await xterm.locator('.xterm-rows').first().innerText()).replace(/\s+/g, ''); return text.includes(`${expected}$pwd${expected}`) ? text.slice(-160) : null; }, 20000);
};
const conversation = async (runId) => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection.conversation);
const treeOf = async (runId) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: runId })).agentRunCollaboration?.root_agent?.execution_tree;

let result = 'Pass';
try {
  await page.reload({ waitUntil: 'load' });
  await page.locator(T('run-section-switch')).waitFor({ timeout: 120000 });
  await page.locator(T('run-section-tab-projects')).click();
  await section(O.projectId).waitFor({ timeout: 60000 });
  // "+" on O → the manager, the AGY model → send.
  await section(O.projectId).locator(T('project-row')).hover();
  await section(O.projectId).locator(T('project-run-add')).click();
  await page.locator(T('chat-new')).waitFor({ timeout: 60000 });
  await page.locator(T('run-target-switcher-trigger')).click();
  await page.locator(T(`run-target-switcher-option-${ids.manager}`)).click();
  await page.locator(T('chat-model-trigger')).first().click();
  const list = page.locator(T(`chat-model-list-${AGY.runtimeKind}`)); const row = page.locator(T(`chat-runtime-${AGY.runtimeKind}`));
  for (let i = 0; i < 6 && !(await list.isVisible().catch(() => false)); i += 1) { await row.hover().catch(() => {}); await sleep(400); if (!(await list.isVisible().catch(() => false))) { await row.click().catch(() => {}); await sleep(700); } }
  const rowBox = await row.boundingBox(); const listBox = await list.boundingBox();
  if (rowBox && listBox && listBox.x > rowBox.x) await page.mouse.move(listBox.x + 12, Math.min(Math.max(rowBox.y + rowBox.height / 2, listBox.y + 6), listBox.y + listBox.height - 6), { steps: 5 });
  await list.locator(T(`chat-model-option-${AGY.llmModelIdentifier}`)).click();
  await sleep(500);
  const input = page.locator(`${T('chat-composer')} textarea`).first();
  await input.click(); await input.fill('Reply OK.');
  await page.locator(T('chat-primary-action')).first().click();
  const A = (await until('manager recorded under O', () => startedUnder(O.projectId)[0], 120000)).runId;
  const managerFolder = (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{workspaceRootPath}}}', { id: A })).getAgentRunResumeConfig.metadataConfig.workspaceRootPath;
  note('manager', { A, managerFolder });
  if (fs.realpathSync(managerFolder) !== G) throw new Error('manager not in G');
  await until('manager replied', async () => /OK/.test(await page.locator(T('workspace-center-pane')).innerText().catch(() => '')), 60000);
  // Typed in the manager's composer: an Agent copy and a Team copy of P's Tasks.
  const composer = page.locator(`${T('workspace-center-pane')} textarea`).first();
  for (const [taskId, recipient] of [[tasks.agent, names.writer], [tasks.team, names.squad]]) {
    const before = (await conversation(A)).split('CALLED:').length;
    await composer.fill(callTool('delegate_task', { recipient_address: `/${segment(recipient)}`, task_id: taskId }));
    // The run's composer: its Send button (a key press right after the fill can land before the box is ready).
    await page.locator(`${T('workspace-center-pane')} button[aria-label="Send message"]`).first().click();
    await until('delegation result', async () => (await conversation(A)).split('CALLED:').length > before, 60000);
  }
  const text = await conversation(A);
  const agentCopy = /target_agent_run_id\\*":\\*"([a-z0-9_]+)/.exec(text)?.[1];
  const coordinator = /target_team_coordinator_agent_run_id\\*":\\*"([a-z0-9_]+)/.exec(text)?.[1];
  const teamRunId = /target_team_run_id\\*":\\*"([a-z0-9_]+)/.exec(text)?.[1];
  if (!agentCopy || !coordinator || !teamRunId) throw new Error(`delegations failed: ${text.slice(-600)}`);
  const recorded = JSON.stringify(await treeOf(A));
  note('copies', { agentCopy, teamRunId, coordinator, treeMentionsF: recorded.includes(F), treeMentionsG: recorded.includes(G) });

  // Projects mode: nested under the manager in O; focus shows F.
  const oSection = await openProject(O.projectId);
  await openGroup(oSection);
  await runRow(oSection, A).click();
  await copyRow(oSection, agentCopy).waitFor({ timeout: 60000 });
  await copyRow(oSection, agentCopy).click();
  await filesShow('sentinel-project.txt', 'sentinel-manager.txt');
  await shot('01-projects-agent-copy-files');
  note('agent copy terminal', await terminalPwd(F));
  await shot('02-projects-agent-copy-terminal');
  const teamRow = oSection.locator(`${T('workspace-team-transient-execution-row')}[data-transient-kind="task_team"]`).first();
  await teamRow.waitFor({ timeout: 60000 });
  if ((await teamRow.getAttribute('aria-expanded')) === 'false') await teamRow.locator(T('workspace-team-transient-disclosure')).click();
  await copyRow(oSection, coordinator).waitFor({ timeout: 60000 });
  await copyRow(oSection, coordinator).click();
  await filesShow('sentinel-project.txt', 'sentinel-manager.txt');
  await shot('03-projects-team-member-files');
  note('team member terminal', await terminalPwd(F));
  await shot('04-projects-team-member-terminal');
  const pSection = await openProject(P.projectId);
  const pState = { runRows: await pSection.locator(T('workspace-agent-run-row')).count(), hint: (await pSection.locator(T('project-no-runs')).innerText().catch(() => '')).trim() };
  note('P (the Task\'s Project)', pState);
  if (pState.runRows !== 0 || !pState.hint.startsWith('No runs yet')) throw new Error('P lists a run');

  // Workspaces mode: under the manager in G's section; focus shows F.
  await page.locator(T('run-section-tab-workspaces')).click();
  await sleep(800);
  const wsRow = page.locator(`${T('workspace-row')}[data-workspace-root="${G}"]`).first();
  if (await wsRow.count()) { if ((await wsRow.getAttribute('aria-expanded')) === 'false') await wsRow.locator('button[aria-expanded]').first().click().catch(() => wsRow.click()); }
  const managerTree = page.locator(`${T('workspace-agent-run-task-tree')}[data-run-id="${A}"]`);
  if (!(await managerTree.count())) { await openGroup(page); await runRow(page, A).first().click(); }
  await copyRow(managerTree, agentCopy).waitFor({ timeout: 60000 });
  await copyRow(managerTree, agentCopy).click();
  await filesShow('sentinel-project.txt', 'sentinel-manager.txt');
  await shot('05-workspaces-agent-copy-files');
  // Control: focusing the manager itself shows G (the panels follow the focused agent, not a fixed folder).
  await page.locator(`${T('workspace-agent-run-row')}[data-run-id="${A}"]`).first().click();
  await filesShow('sentinel-manager.txt', 'sentinel-project.txt');
  note('manager terminal', await terminalPwd(G));
  await shot('06-workspaces-manager-focused');
  const workspaceRows = await page.locator(T('workspace-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-workspace-root')));
  note('Workspaces rows', { workspaceRows, newRowForProjectFolder: workspaceRows.includes(F) });
  note('page errors', errors);
  if (errors.length) throw new Error('browser errors');
} catch (error) {
  result = 'Fail';
  note('FAILED', String(error.message ?? error));
  await shot('99-failure').catch(() => undefined);
} finally {
  note('result', result);
  fs.writeFileSync(path.join(outDir, 'API-04-desktop-journey.log'), `# API-04 desktop journey (isolated instance of the worktree build)\n# node API-04-desktop-journey.mjs ${controlPort} ${backendUrl} ${dataRoot} <out>\n${log.join('\n')}\n`);
  process.exit(result === 'Pass' ? 0 : 1);
}
