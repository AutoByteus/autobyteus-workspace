#!/usr/bin/env node
// DSK-001 (temporary, API/E2E-owned): the collapsed-strip Workspaces journey in an isolated desktop instance of this
// worktree's packaged build. Attaches to the instance's CDP control port (as browser-automation attach-only does), seeds
// owned data through the instance's own GraphQL/WebSocket, and drives the real window like a user.
// Usage: node dsk-001.mjs <controlEndpoint> <backendUrl> <workspaceDir> <outputDir>
// The instance must run the scripted AGY CLI (ANTIGRAVITY_CLI_COMMAND in its own data-root .env); the real agy is not on its PATH.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const webDir = '/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/autobyteus-web';
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const [controlEndpoint, backendUrl, workspaceDir, outputDir] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, fn, ms = 30000, every = 150) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (c, m, d) => { if (!c) { const e = new Error(m); e.details = d; throw e; } };
const gql = async (query, variables = {}) => {
  const r = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (!r.ok || b.errors?.length) throw new Error(JSON.stringify(b.errors ?? b)); return b.data;
};
const segment = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const slug = (n) => segment(n).replace(/_/g, '-');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const evidence = { startedAt: new Date().toISOString(), controlEndpoint, backendUrl, cases: {}, errors: [] };
const save = () => fs.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

// ---------------------------------------------------------------- owned data (same shapes as the PMU probe)
const config = () => ({ workspaceRootPath: workspaceDir, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });
const s = `Dsk ${randomUUID().slice(0, 4)}`;
const names = { manager: `Manager ${s}`, worker: `Release Notes Writer ${s}`, helper: `Fact Checker ${s}`, squad: `Docs Review Team ${s}`, team: `Delivery Team ${s}`, org: `Delivery Org ${s}` };
const ids = {};
const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
  { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
const team = async (name, coordinatorMemberName, nodes) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
  { input: { name, description: name, instructions: 'Deliver.', coordinatorMemberName, nodes } })).createAgentTeamDefinition.id;
const projectTasks = async (projectId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId root{kind recipientAddress ingressAgentRunId teamRunId start hostRoot{kind runId}}}}', { id: projectId })).projectTasks;
const rootOf = async (projectId, taskId) => (await projectTasks(projectId)).find((t) => t.taskId === taskId)?.root ?? null;
const sockets = [];
const managerInput = async (root) => {
  const route = root.kind === 'agent' ? `agent/${root.rootId}` : root.kind === 'team' ? `agent-team/${root.rootId}` : `agent-org/${root.rootId}`;
  const socket = new WebSocket(`${backendUrl.replace(/^http/, 'ws')}/ws/${route}`); sockets.push(socket);
  await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
  return (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: root.kind === 'org'
    ? { root_subject_kind: 'agent_org', root_run_id: root.rootId, target_agent_run_id: root.managerRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: root.managerRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
};

// ---------------------------------------------------------------- window helpers
const shellNav = (page) => page.evaluate(() => {
  const strip = document.querySelector('[data-test="workspace-left-navigation-strip"]');
  const ws = document.querySelector('[data-test="workspace-left-strip-workspaces"]');
  return { strip: Boolean(strip), activation: strip?.getAttribute('data-strip-activation') ?? null,
    workspacesLit: ws ? ws.getAttribute('aria-current') === 'location' && ws.classList.contains('bg-gray-100') : null,
    workspacesIcon: ws?.querySelector('svg') ? true : false, workspacesLabel: ws?.getAttribute('aria-label') ?? null,
    stripChatLit: strip?.querySelector('[data-nav-key="chat"]')?.classList.contains('bg-gray-100') ?? null,
    focus: document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName ?? null, hash: location.hash };
});
const revealed = (page) => page.evaluate(() => {
  const sc = [...document.querySelectorAll('[data-test="workspace-history-tree-scroll"]')].filter((e) => e.getBoundingClientRect().height > 0).at(-1);
  const rows = sc ? sc.querySelectorAll('[aria-current="true"], [aria-selected="true"]') : [];
  const row = rows[rows.length - 1]; if (!sc || !row) return null;
  const b = sc.getBoundingClientRect(); const r = row.getBoundingClientRect();
  return { agentRunId: row.getAttribute('data-agent-run-id') ?? row.getAttribute('data-run-id'), test: row.getAttribute('data-test'),
    visible: r.height > 0 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5, scrollTop: Math.round(sc.scrollTop), focused: document.activeElement === row, selectedRows: rows.length };
});
const selection = (page) => page.evaluate(() => {
  const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$pinia;
  return { hash: location.hash, subject: JSON.stringify(pinia?._s.get('agentSelection')?.subject ?? null),
    focusedRunId: pinia?._s.get('agentTeamContexts')?.focusedMemberContext?.state?.runId ?? null };
});
const centerText = (page) => page.locator('[data-test="workspace-center-pane"]').innerText().catch(() => '');
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const push = (page, to) => page.evaluate((p) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(p), to);

let browser;
try {
  await fs.mkdir(outputDir, { recursive: true });
  // Seed.
  ids.manager = await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task']);
  ids.worker = await agent(names.worker, []); ids.helper = await agent(names.helper, []);
  ids.squad = await team(names.squad, 'reviewer', [{ memberName: 'reviewer', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.helper, refScope: 'SHARED' }]);
  ids.team = await team(names.team, 'manager', [{ memberName: 'manager', ref: ids.manager, refScope: 'SHARED' }, { memberName: 'worker', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'helper', ref: ids.helper, refScope: 'SHARED' }]);
  ids.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
    { input: { name: names.org, description: 'Org root', instructions: 'Deliver.', handoffs: [], members: ['manager', 'worker', 'helper']
      .map((m) => ({ memberName: m, ref: ids[m], refType: 'AGENT', refScope: 'SHARED' })) } })).createAgentOrgDefinition.id;
  await fs.mkdir(workspaceDir, { recursive: true });
  const listed = (await gql('query{workspaces{absolutePath}}')).workspaces ?? [];
  if (!listed.some((w) => w.absolutePath === workspaceDir)) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceDir } });
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Desktop Strip ${s}` } })).createProject.projectId;
  const createTask = async (d) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId, description: d } })).createProjectTask.taskId;
  const agentRun = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
  assert(agentRun.success, agentRun.message);
  const agentRoot = { kind: 'agent', rootId: agentRun.runId, managerRunId: agentRun.runId };
  const teamRun = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
    { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config() }], memberConfigs: ['manager', 'worker', 'helper'].map((m) => ({ memberAddress: `/${m}`, agentDefinitionId: ids[m], ...config() })) } })).createAgentTeamRun;
  assert(teamRun.success, teamRun.message);
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRun.teamRunId })).getTeamRunResumeConfig.executionTree;
  const teamRoot = { kind: 'team', rootId: teamRun.teamRunId, managerRunId: tree.root_team.members.find((m) => m.address === '/manager').agent_run_id };
  const orgRun = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
    { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(orgRun.success, orgRun.message);
  const orgTree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRun.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgRoot = { kind: 'org', rootId: orgRun.agentOrgRunId, managerRunId: orgTree.rootOrg.members.find((m) => m.address === '/manager').agentRunId };
  const orgTask = await createTask('Desktop journey hosted by the org run');
  const agentTask = await createTask('Desktop journey hosted by the agent run');
  const teamTask = await createTask('Desktop journey hosted by the team run');
  (await managerInput(agentRoot))(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: agentTask }));
  (await managerInput(teamRoot))(callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, task_id: teamTask }));
  (await managerInput(orgRoot))(callTool('delegate_task', { recipient_address: '/worker', task_id: orgTask }));
  const agentWorker = await until('agent-hosted worker started', async () => { const r = await rootOf(projectId, agentTask); return r?.start === 'started' ? r : null; }, 90000);
  const teamWorker = await until('team-hosted worker started', async () => { const r = await rootOf(projectId, teamTask); return r?.start === 'started' ? r : null; }, 90000);
  const orgWorker = await until('org-hosted worker started', async () => { const r = await rootOf(projectId, orgTask); return r?.start === 'started' ? r : null; }, 90000);
  evidence.seed = { names, ids, projectId, agentTask, teamTask, orgTask, agentRoot, teamRoot, orgRoot, agentWorker, teamWorker, orgWorker };
  await save();

  // Attach to the instance window.
  browser = await chromium.connectOverCDP(controlEndpoint);
  const page = browser.contexts().flatMap((c) => c.pages()).find((p) => /renderer\/index\.html/.test(p.url()));
  assert(page, 'instance window not found', browser.contexts().flatMap((c) => c.pages()).map((p) => p.url()));
  page.on('pageerror', (e) => evidence.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') evidence.errors.push(m.text().slice(0, 300)); });
  evidence.window = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, ua: navigator.userAgent.slice(0, 120), url: location.href }));

  const journey = async (kind, worker, openHost) => {
    await openHost();
    const tabs = page.locator('[data-test="right-side-tab-list"]:visible [data-tab-name]');
    await tabs.first().waitFor({ timeout: 60000 });
    await page.locator('[data-test="app-left-panel-collapse"]').click();
    await page.locator('[data-test="workspace-left-strip-workspaces"]').waitFor({ timeout: 15000 });
    await sleep(250);
    const afterCollapse = await shellNav(page);
    assert(afterCollapse.activation === 'redock-panel' && afterCollapse.focus === 'workspace-left-strip-workspaces', `${kind}: wide window, focus on Workspaces after collapse`, afterCollapse);
    if (await tabs.first().getAttribute('aria-selected') !== 'true') await tabs.first().click();
    const panel = page.locator('[data-test="right-side-projects-panel"]');
    await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
    const taskId = kind === 'agent' ? agentTask : kind === 'team' ? teamTask : orgTask;
    const line = panel.locator(`[data-testid="project-task-row-${taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`);
    await line.waitFor({ timeout: 60000 }); await line.click();
    await until(`${kind}: worker in the center`, async () => /Task delegator address/.test(await centerText(page)), 30000);
    const before = await until(`${kind}: Workspaces lit`, async () => { const n = await shellNav(page); return n.workspacesLit ? n : null; }, 15000);
    assert(before.stripChatLit === false, `${kind}: Chat not lit on an open run`, before);
    const sel = await until(`${kind}: route settled`, async () => { const a = await selection(page); await sleep(750); const b = await selection(page); return JSON.stringify(a) === JSON.stringify(b) ? b : null; }, 15000);
    await shot(page, `dsk-001-${kind}-collapsed-worker-open`);
    await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
    await page.locator('[data-test="app-left-panel-run-history"]').waitFor({ timeout: 15000 });
    const row = await until(`${kind}: worker row revealed`, async () => { const r = await revealed(page); return r?.visible && r.agentRunId === worker.ingressAgentRunId ? r : null; }, 15000);
    await sleep(500);
    const settled = await revealed(page); const selAfter = await selection(page);
    assert(JSON.stringify(selAfter) === JSON.stringify(sel), `${kind}: Workspaces changed the route or selection`, { sel, selAfter });
    assert(settled.visible && settled.focused && settled.selectedRows === 1, `${kind}: row visible, focused, only selected row`, settled);
    assert(/Task delegator address/.test(await centerText(page)) && await tabs.first().getAttribute('aria-selected') === 'true', `${kind}: center and Projects tab unchanged`);
    await shot(page, `dsk-001-${kind}-workspaces-revealed`);
    return { afterCollapse, before, sel, row, settled };
  };

  const expandWorkspace = async () => {
    await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
    const ws = page.locator('[data-test="workspace-row"]', { hasText: new RegExp(`^\\s*${path.basename(workspaceDir)}\\s*$`) }).first();
    if (await ws.getAttribute('aria-expanded') === 'false') await ws.click();
  };
  // The desktop window must be large enough for both docked panels (the right Projects tab must be docked to open a worker
  // from a Task card). The default 1200×768 shows the right panel as a strip; the run resizes the OS window first
  // (osascript on this instance's PID, recorded in the report).
  evidence.windowSize = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert(evidence.windowSize.width >= 1400, 'resize the instance window to at least 1400 px wide first', evidence.windowSize);
  // Start from a fresh renderer load on New chat (an app reload); the docked panel is shown when the app starts.
  await page.evaluate(() => { location.hash = '#/chat'; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-composer"] textarea').first().waitFor({ timeout: 60000 });
  await sleep(1000);
  if (await page.locator('[data-test="workspace-left-strip-workspaces"]').isVisible().catch(() => false)) await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
  evidence.cases.agent = await journey('agent', agentWorker, async () => {
    await expandWorkspace();
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).first().click();
    await page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${agentRoot.rootId}"]`).click();
  });
  await save();
  evidence.cases.team = await journey('team', teamWorker, async () => {
    // The previous journey left the panel docked (revealed by Workspaces).
    if (await page.locator('[data-test="workspace-left-strip-workspaces"]').isVisible().catch(() => false)) await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
    await page.locator('[data-test="app-left-panel-run-history"]').waitFor({ timeout: 15000 });
    await expandWorkspace();
    await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
    await expandWorkspace();
  if (!(await page.locator(`[data-test="workspace-team-row-${teamRoot.rootId}"]`).isVisible().catch(() => false))) await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
  await page.locator(`[data-test="workspace-team-row-${teamRoot.rootId}"]`).click();
  });
  await save();
  evidence.cases.org = await journey('org', orgWorker, async () => {
    if (await page.locator('[data-test="workspace-left-strip-workspaces"]').isVisible().catch(() => false)) await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
    await page.locator('[data-test="app-left-panel-run-history"]').waitFor({ timeout: 15000 });
    await expandWorkspace();
    await page.locator(`[data-test="agent-org-definition-${slug(names.org)}"]`).click();
    await page.locator(`[data-test="agent-org-run-open-${orgRoot.rootId}"]`).click();
  });
  await save();
  // Back to the Team-hosted worker (Task card) so a Team selection is in the store, as in PMU-018 step G.
  {
    const tabs = page.locator('[data-test="right-side-tab-list"]:visible [data-tab-name]');
    if (await tabs.first().getAttribute('aria-selected') !== 'true') await tabs.first().click();
    const panel = page.locator('[data-test="right-side-projects-panel"]');
    await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
    await panel.locator(`[data-testid="project-task-row-${teamTask}"] [data-testid^="project-task-root-"][data-openable="true"]`).click();
  }
  await until('team run shown again', async () => (await selection(page)).subject.includes(teamRoot.rootId), 30000);
  // New chat: Chat lit, Workspaces not; Workspaces shows the panel, keeps the draft text, selects nothing.
  await page.locator('[data-test="app-left-panel-chat"]').click();
  const input = page.locator('[data-test="chat-composer"] textarea').first();
  await input.waitFor({ timeout: 60000 });
  await page.locator('[data-test="app-left-panel-collapse"]').click();
  await page.locator('[data-test="workspace-left-strip-workspaces"]').waitFor({ timeout: 15000 });
  await input.click(); await input.type('Desktop draft text', { delay: 5 });
  const onNew = await shellNav(page);
  assert(onNew.stripChatLit === true && onNew.workspacesLit === false && onNew.workspacesLabel === 'Workspaces' && onNew.workspacesIcon, 'New chat: Chat lit, Workspaces not; Workspaces icon and label', onNew);
  const newSel = await selection(page);
  await page.locator('[data-test="workspace-left-strip-workspaces"]').click();
  await page.locator('[data-test="app-left-panel-run-history"]').waitFor({ timeout: 15000 });
  await sleep(800);
  const newAfter = { sel: await selection(page), text: await input.inputValue(), row: await revealed(page),
    focus: await page.evaluate(() => document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName ?? null) };
  // REQ-006/REQ-009: off a run, Workspaces only shows the panel; a row still marked by the earlier Team selection
  // (pre-existing highlight) is neither scrolled to nor focused, and focus stays on the Workspaces section.
  assert(newAfter.text === 'Desktop draft text' && JSON.stringify(newAfter.sel) === JSON.stringify(newSel)
    && newAfter.focus === 'app-left-panel-run-history' && (!newAfter.row || (newAfter.row.focused === false && newAfter.row.scrollTop === 0)),
    'New chat: draft, route and selection kept; focus on the Workspaces section; no row scrolled to or focused', { newSel, newAfter });
  await shot(page, 'dsk-001-new-chat-workspaces');
  evidence.cases.newChat = { onNew, newSel, newAfter };
  assert(evidence.errors.length === 0, 'renderer errors', evidence.errors);
  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail'; evidence.failure = { message: error.message, details: error.details };
} finally {
  for (const s of sockets) s.terminate();
  // Detach only (process exit drops the CDP connection); the instance is stopped with `isolated-app stop <instanceId>`.
  evidence.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(`DSK-001: ${evidence.result}\n`);
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}
