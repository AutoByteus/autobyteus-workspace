import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/autobyteus-web/node_modules/playwright-core/index.mjs';

const UI = 'http://127.0.0.1:3107';
const API = 'http://localhost:8006/graphql';
const ROOT = '/home/autobyteus/workspace/autobyteus-workspace';
const EVIDENCE = '/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/probes/api-e2e';
const logLines = [];
const network = [];
const consoleErrors = [];
let teamRunId = null;
let workspaceId = null;
let browser;

function log(label, data = '') {
  const line = `${new Date().toISOString()} ${label}${data === '' ? '' : ` ${typeof data === 'string' ? data : JSON.stringify(data)}`}`;
  logLines.push(line);
  console.log(line);
}

async function gql(operationName, query, variables = {}) {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operationName, query, variables }),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: response.status, body };
}

const WORKSPACES = `query GetAllWorkspaces { workspaces { workspaceId name displayName workspaceRootPath absolutePath kind isTemp config } }`;
const HISTORY = `query ListWorkspaceRunHistory($limitPerAgent: Int = 100) {
  listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
    workspaceRootPath workspaceName
    teamDefinitions { teamDefinitionId teamDefinitionName runs {
      teamRunId teamDefinitionId teamDefinitionName coordinatorAddress workspaceRootPath
      summary createdAt terminatedAt isActive
      members { memberAddress displayName agentRunId status runtimeKind workspaceRootPath }
    } }
  }
}`;
const TERMINATE = `mutation TerminateAgentTeamRun($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success message } }`;
const DELETE = `mutation DeleteStoredTeamRun($teamRunId: String!) { deleteStoredTeamRun(teamRunId: $teamRunId) { success message } }`;
const REMOVE = `mutation RemoveWorkspace($input: RemoveWorkspaceInput!) { removeWorkspace(input: $input) { success message workspaceId workspaceRootPath } }`;

function allTeamRuns(historyResponse) {
  const groups = historyResponse?.body?.data?.listWorkspaceRunHistory ?? [];
  return groups.flatMap(group => (group.teamDefinitions ?? []).flatMap(definition =>
    (definition.runs ?? []).map(run => ({ ...run, groupWorkspaceRootPath: group.workspaceRootPath, workspaceName: group.workspaceName }))
  ));
}

async function writeJson(name, value) {
  await fs.writeFile(`${EVIDENCE}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
}

async function chooseSoftwareTeam(page) {
  await page.goto(`${UI}/agent-teams`, { waitUntil: 'networkidle', timeout: 60_000 });
  const card = page.locator('div.group').filter({ hasText: 'Software Engineering Team' });
  assert.ok(await card.count(), 'Software Engineering Team card must exist');
  await card.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace', { timeout: 30_000 });
  await page.waitForTimeout(2_500);
  await page.locator('#team-run-runtime-kind').waitFor({ state: 'visible', timeout: 30_000 });
}

async function chooseModel(page, label) {
  const trigger = page.getByRole('button', { name: /Select a model|OpenAI \/ GPT-/ }).first();
  await trigger.click();
  const search = page.getByPlaceholder('Search models...');
  await search.fill(label);
  const option = page.locator('li').filter({ hasText: label }).first();
  await option.waitFor({ state: 'visible', timeout: 20_000 });
  await option.click();
}

async function configureSettingsAfterPath(page) {
  const newTab = page.getByRole('tab', { name: 'New', exact: true });
  await newTab.click();
  const pathInput = page.locator('input[placeholder="/absolute/path/to/workspace"]');
  await pathInput.fill(ROOT);
  assert.equal(await newTab.getAttribute('aria-selected'), 'true');
  assert.equal(await pathInput.inputValue(), ROOT);

  await page.locator('#team-run-runtime-kind').selectOption('codex_app_server');
  await page.waitForTimeout(700);
  await chooseModel(page, 'GPT-5.6-Sol');
  await page.locator('#team-run-reasoning_effort').selectOption('medium');
  await page.locator('#team-run-service_tier').selectOption('fast');
  await page.locator('#team-auto-execute').click();

  const overrideToggle = page.locator('[data-test="team-member-overrides-toggle"]');
  await overrideToggle.click();
  assert.equal(await overrideToggle.getAttribute('aria-expanded'), 'true');
  const memberAuto = page.locator('#override-auto--solution_designer');
  await memberAuto.check();
  await memberAuto.uncheck();
  assert.equal(await memberAuto.isChecked(), false);
  await page.locator('[data-test="team-member-overrides-count"]').waitFor({ state: 'visible' });

  assert.equal(await newTab.getAttribute('aria-selected'), 'true', 'New must remain visibly selected after all Team edits');
  assert.equal(await pathInput.inputValue(), ROOT, 'New path must remain exact after all Team edits');
  assert.equal(await page.locator('#team-run-runtime-kind').inputValue(), 'codex_app_server');
  assert.equal(await page.locator('#team-run-reasoning_effort').inputValue(), 'medium');
  assert.equal(await page.locator('#team-run-service_tier').inputValue(), 'fast');
  assert.match(await page.getByRole('button', { name: /OpenAI \/ GPT-5\.6-Sol/ }).innerText(), /GPT-5\.6-Sol/);
  assert.ok((await page.locator('#team-auto-execute').getAttribute('class'))?.includes('bg-blue-600'), 'global auto-approve must be on');
  const runButton = page.getByRole('button', { name: 'Run Team', exact: true });
  assert.equal(await runButton.isDisabled(), false, 'Run Team must be enabled for the exact valid New config');
  return { pathInput, newTab, runButton };
}

async function configureSettingsBeforePathAndCheckControls(page) {
  await page.locator('#team-run-runtime-kind').selectOption('codex_app_server');
  await page.waitForTimeout(700);
  await chooseModel(page, 'GPT-5.6-Sol');
  await page.locator('#team-run-reasoning_effort').selectOption('high');
  await page.locator('#team-run-service_tier').selectOption('fast');
  await page.locator('#team-auto-execute').click();

  const newTab = page.getByRole('tab', { name: 'New', exact: true });
  await newTab.click();
  const pathInput = page.locator('input[placeholder="/absolute/path/to/workspace"]');
  await pathInput.fill(ROOT);
  assert.equal(await newTab.getAttribute('aria-selected'), 'true');
  assert.equal(await pathInput.inputValue(), ROOT);
  assert.equal(await page.getByRole('button', { name: 'Run Team', exact: true }).isDisabled(), false, 'control ordering must be launch-ready');

  await pathInput.fill('');
  const runButton = page.getByRole('button', { name: 'Run Team', exact: true });
  assert.equal(await runButton.isDisabled(), true, 'empty New path must block launch');
  const issue = page.locator('[data-test="team-run-blocking-issue"]');
  await issue.waitFor({ state: 'visible' });
  assert.match(await issue.innerText(), /Enter a workspace path to run this team/i);
  assert.equal(await newTab.getAttribute('aria-selected'), 'true', 'empty failure must not switch to Existing');

  const existingTab = page.getByRole('tab', { name: 'Existing', exact: true });
  await existingTab.click();
  assert.equal(await existingTab.getAttribute('aria-selected'), 'true', 'explicit Existing must change visible mode');
  const body = await page.locator('body').innerText();
  assert.match(body, /Temp Workspace/);
  assert.equal(await runButton.isDisabled(), false, 'explicit Temp Existing selection remains launch-ready');
}

try {
  const baselineWorkspaces = await gql('GetAllWorkspaces', WORKSPACES);
  const baselineHistory = await gql('ListWorkspaceRunHistory', HISTORY, { limitPerAgent: 100 });
  await writeJson('12-baseline-workspaces-from-probe.json', baselineWorkspaces);
  await writeJson('13-baseline-history-from-probe.json', baselineHistory);
  const baselineIds = new Set(allTeamRuns(baselineHistory).map(run => run.teamRunId));
  assert.equal((baselineWorkspaces.body.data?.workspaces ?? []).some(ws => ws.workspaceRootPath === ROOT), false, 'target root must not be pre-registered');
  assert.equal(allTeamRuns(baselineHistory).some(run => run.workspaceRootPath === ROOT), false, 'target root must have no baseline Team history');
  log('baseline', { workspaces: baselineWorkspaces.body.data?.workspaces?.length, teamRuns: baselineIds.size });

  browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1050 } });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({ source: 'console', text: message.text() });
  });
  page.on('pageerror', error => consoleErrors.push({ source: 'pageerror', text: error.message }));
  page.on('response', async response => {
    const request = response.request();
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    let requestBody = {};
    try { requestBody = request.postDataJSON(); } catch { requestBody = { raw: request.postData() }; }
    let responseBody;
    try { responseBody = await response.json(); } catch { responseBody = { unavailable: true, statusText: response.statusText() }; }
    network.push({
      at: new Date().toISOString(), url: request.url(), status: response.status(),
      operationName: requestBody.operationName ?? null, variables: requestBody.variables ?? null,
      query: requestBody.query ?? null, response: responseBody,
    });
  });

  await chooseSoftwareTeam(page);
  log('entered exact Software Engineering Team draft');
  const { pathInput, newTab, runButton } = await configureSettingsAfterPath(page);
  log('configured-after-path', {
    mode: await newTab.getAttribute('aria-selected'), path: await pathInput.inputValue(),
    runtime: await page.locator('#team-run-runtime-kind').inputValue(),
    reasoning: await page.locator('#team-run-reasoning_effort').inputValue(),
    tier: await page.locator('#team-run-service_tier').inputValue(),
    memberOverride: await page.locator('[data-test="team-member-overrides-count"]').innerText(),
  });
  await page.screenshot({ path: `${EVIDENCE}/14-prelaunch-exact-config.png`, fullPage: true });

  const launchNetworkStart = network.length;
  await runButton.click();
  await page.waitForFunction(() => {
    const state = globalThis.__unused;
    return true;
  });
  const launchDeadline = Date.now() + 180_000;
  while (Date.now() < launchDeadline) {
    const launchOps = network.slice(launchNetworkStart);
    const createWorkspace = launchOps.filter(entry => entry.operationName === 'CreateWorkspace');
    const createTeam = launchOps.filter(entry => entry.operationName === 'CreateAgentTeamRun');
    if (createWorkspace.length >= 1 && createTeam.length >= 1) break;
    await page.waitForTimeout(500);
  }
  const launchOps = network.slice(launchNetworkStart);
  const createWorkspaceOps = launchOps.filter(entry => entry.operationName === 'CreateWorkspace');
  const createTeamOps = launchOps.filter(entry => entry.operationName === 'CreateAgentTeamRun');
  assert.equal(createWorkspaceOps.length, 1, 'exact launch must issue exactly one CreateWorkspace');
  assert.equal(createTeamOps.length, 1, 'exact launch must issue exactly one CreateAgentTeamRun');
  assert.equal(createWorkspaceOps[0].variables?.input?.rootPath, ROOT);
  workspaceId = createWorkspaceOps[0].response?.data?.createWorkspace?.workspaceId ?? null;
  teamRunId = createTeamOps[0].response?.data?.createAgentTeamRun?.teamRunId ?? null;
  assert.ok(workspaceId && workspaceId !== 'temp_ws_default', 'CreateWorkspace must return a non-Temp canonical workspace ID');
  assert.ok(teamRunId && !baselineIds.has(teamRunId), 'CreateAgentTeamRun must return one new TeamRun ID');
  assert.equal(createTeamOps[0].response?.data?.createAgentTeamRun?.success, true);
  const memberConfigs = createTeamOps[0].variables?.input?.memberConfigs ?? [];
  assert.equal(memberConfigs.length, 6, 'Software Engineering Team must launch six leaf members');
  assert.ok(memberConfigs.every(config => config.workspaceId === workspaceId), 'every member must use canonical requested workspace ID');
  assert.ok(memberConfigs.every(config => config.runtimeKind === 'codex_app_server'), 'every member must use Codex runtime');
  assert.ok(memberConfigs.every(config => config.llmModelIdentifier === 'gpt-5.6-sol'), 'every member must use GPT-5.6-Sol');
  const solutionDesignerConfig = memberConfigs.find(config => config.memberAddress === '/solution_designer');
  assert.ok(solutionDesignerConfig, 'solution_designer config must exist');
  assert.equal(solutionDesignerConfig.autoExecuteTools, false, 'representative member override must survive launch');
  assert.ok(memberConfigs.filter(config => config.memberAddress !== '/solution_designer').every(config => config.autoExecuteTools === true), 'global auto-approve must survive for non-overridden members');
  log('launch-graphql-pass', { workspaceId, teamRunId, createWorkspaceCount: 1, createTeamCount: 1, memberCount: memberConfigs.length });

  await page.waitForTimeout(5_000);
  const historyAfterLaunch = await gql('ListWorkspaceRunHistory', HISTORY, { limitPerAgent: 100 });
  await writeJson('16-history-after-launch.json', historyAfterLaunch);
  const createdRun = allTeamRuns(historyAfterLaunch).find(run => run.teamRunId === teamRunId);
  assert.ok(createdRun, 'new TeamRun must appear in persisted history');
  assert.equal(createdRun.workspaceRootPath, ROOT);
  assert.equal(createdRun.groupWorkspaceRootPath, ROOT);
  assert.ok(createdRun.members.every(member => member.workspaceRootPath === ROOT), 'all persisted members must use requested root');
  assert.ok(createdRun.members.every(member => member.runtimeKind === 'CODEX'), 'all persisted members must use Codex runtime');

  const bodyAfterLaunch = await page.locator('body').innerText();
  await fs.writeFile(`${EVIDENCE}/17-body-after-launch.txt`, bodyAfterLaunch);
  assert.match(bodyAfterLaunch, /autobyteus-workspace/, 'workspace tree must visibly reveal requested workspace');
  assert.match(bodyAfterLaunch, /Software Engineering Team/, 'workspace tree/view must visibly reveal Team');
  await page.screenshot({ path: `${EVIDENCE}/18-postlaunch-tree.png`, fullPage: true });
  log('history-and-visible-tree-pass', { root: createdRun.workspaceRootPath, members: createdRun.members.length });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(8_000);
  const bodyAfterReload = await page.locator('body').innerText();
  await fs.writeFile(`${EVIDENCE}/19-body-after-reload.txt`, bodyAfterReload);
  assert.match(bodyAfterReload, /autobyteus-workspace/, 'requested workspace must remain visible after reload');
  const reloadedWorkspaceRow = page.locator('[data-test="workspace-row"]').filter({ has: page.locator(`[data-workspace-root="${ROOT}"]`) });
  const targetWorkspaceRow = page.locator(`[data-test="workspace-row"][data-workspace-root="${ROOT}"]`);
  await targetWorkspaceRow.waitFor({ state: 'visible', timeout: 30_000 });
  await targetWorkspaceRow.locator('button').first().click();
  const teamDefinitionRow = page.locator('[data-test^="workspace-team-definition-row-"]').filter({ hasText: 'Software Engineering Team' });
  await teamDefinitionRow.waitFor({ state: 'visible', timeout: 30_000 });
  await teamDefinitionRow.click();
  const exactTeamRow = page.locator(`[data-test="workspace-team-row-${teamRunId}"]`);
  await exactTeamRow.waitFor({ state: 'visible', timeout: 30_000 });
  assert.match(await teamDefinitionRow.innerText(), /Software Engineering Team/, 'Team definition must remain visible after reload and workspace expansion');
  const historyAfterReload = await gql('ListWorkspaceRunHistory', HISTORY, { limitPerAgent: 100 });
  await writeJson('20-history-after-reload.json', historyAfterReload);
  const reloadedRun = allTeamRuns(historyAfterReload).find(run => run.teamRunId === teamRunId);
  assert.ok(reloadedRun, 'Team must remain in history after reload');
  assert.equal(reloadedRun.workspaceRootPath, ROOT);
  await page.screenshot({ path: `${EVIDENCE}/21-postreload-tree.png`, fullPage: true });
  log('reload-persistence-pass', { teamRunId, root: reloadedRun.workspaceRootPath });

  await chooseSoftwareTeam(page);
  const opCountBeforeControl = network.length;
  await configureSettingsBeforePathAndCheckControls(page);
  await page.screenshot({ path: `${EVIDENCE}/22-control-empty-existing.png`, fullPage: true });
  const controlOps = network.slice(opCountBeforeControl);
  assert.equal(controlOps.filter(entry => entry.operationName === 'CreateWorkspace').length, 0, 'prelaunch control/empty checks must not register a workspace');
  assert.equal(controlOps.filter(entry => entry.operationName === 'CreateAgentTeamRun').length, 0, 'prelaunch control/empty checks must not launch a Team');
  log('control-empty-existing-pass', { createWorkspaceCount: 0, createTeamCount: 0 });

  assert.deepEqual(consoleErrors, [], 'browser console/page errors must be empty');
  await writeJson('23-graphql-network.json', network);
  await writeJson('24-browser-errors.json', consoleErrors);
  log('browser-pass', { consoleErrors: consoleErrors.length });
} catch (error) {
  log('PROBE-FAIL', { name: error?.name, message: error?.message, stack: error?.stack });
  throw error;
} finally {
  const cleanup = [];
  if (teamRunId) {
    const termination = await gql('TerminateAgentTeamRun', TERMINATE, { teamRunId });
    cleanup.push({ action: 'terminate', teamRunId, result: termination });
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const history = await gql('ListWorkspaceRunHistory', HISTORY, { limitPerAgent: 100 });
      const run = allTeamRuns(history).find(candidate => candidate.teamRunId === teamRunId);
      if (!run || !run.isActive) break;
      await new Promise(resolve => setTimeout(resolve, 1_000));
    }
    const deletion = await gql('DeleteStoredTeamRun', DELETE, { teamRunId });
    cleanup.push({ action: 'delete-history', teamRunId, result: deletion });
  }
  if (workspaceId) {
    const removal = await gql('RemoveWorkspace', REMOVE, { input: { workspaceId } });
    cleanup.push({ action: 'remove-workspace-registration', workspaceId, result: removal });
  }
  const postWorkspaces = await gql('GetAllWorkspaces', WORKSPACES);
  const postHistory = await gql('ListWorkspaceRunHistory', HISTORY, { limitPerAgent: 100 });
  cleanup.push({ action: 'post-cleanup-verification', targetWorkspacePresent: (postWorkspaces.body.data?.workspaces ?? []).some(ws => ws.workspaceRootPath === ROOT), targetTeamPresent: teamRunId ? allTeamRuns(postHistory).some(run => run.teamRunId === teamRunId) : false });
  await writeJson('25-cleanup.json', cleanup);
  await writeJson('26-post-cleanup-workspaces.json', postWorkspaces);
  await writeJson('27-post-cleanup-history.json', postHistory);
  await writeJson('23-graphql-network.json', network);
  await writeJson('24-browser-errors.json', consoleErrors);
  await fs.writeFile(`${EVIDENCE}/28-live-browser.log`, `${logLines.join('\n')}\n`);
  if (browser) await browser.close();
  log('cleanup-complete', cleanup.at(-1));
}
