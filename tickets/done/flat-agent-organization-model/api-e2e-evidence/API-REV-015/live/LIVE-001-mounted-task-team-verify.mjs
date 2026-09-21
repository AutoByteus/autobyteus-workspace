import fs from 'node:fs/promises';
import WebSocket from '../../../../../../autobyteus-server-ts/node_modules/ws/wrapper.mjs';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';

const out = new URL('./', import.meta.url);
const serverPort = 8596;
const rendererPort = 3596;
const taskMarker = 'APIREV15-MOUNTED-TASK-TEAM-READY-001';
const walkFiles = async (root, basename, found = []) => {
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, root);
    if (entry.isDirectory()) await walkFiles(child, basename, found);
    else if (entry.name === basename) found.push(child);
  }
  return found;
};
const readSnapshot = (orgRunId) => new Promise((resolve, reject) => {
  const messages = [];
  const socket = new WebSocket(`ws://127.0.0.1:${serverPort}/ws/agent-org/${encodeURIComponent(orgRunId)}`);
  const timer = setTimeout(() => {
    socket.terminate();
    reject(new Error('Timed out waiting for AgentOrg snapshot.'));
  }, 30_000);
  socket.on('message', (data) => {
    const message = JSON.parse(String(data));
    messages.push({ at: new Date().toISOString(), ...message });
    if (message.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT' || message.type === 'AGENT_ORG_STREAM_UNAVAILABLE') {
      clearTimeout(timer);
      socket.close(1000);
      resolve({ messages, terminal: message });
    }
  });
  socket.once('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
});

const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes(`127.0.0.1:${rendererPort}`));
if (!page) throw new Error('Actual open_tab page was not found.');
page.setDefaultTimeout(15_000);
const pageErrors = [];
const networkFailures = [];
page.on('pageerror', (error) => pageErrors.push({ type: 'pageerror', message: error.message }));
page.on('response', (response) => {
  if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
    networkFailures.push({ status: response.status(), url: response.url(), method: response.request().method() });
  }
});

const orgRunId = new URL(page.url()).searchParams.get('orgRunId');
if (!orgRunId) throw new Error(`Active AgentOrg URL is missing orgRunId: ${page.url()}`);
const root = new URL(`../runtime/server-data/memory/agent_orgs/${orgRunId}/`, out);
const tree = JSON.parse(await fs.readFile(new URL('agent_org_run_execution_tree.json', root), 'utf8'));
const tasks = JSON.parse(await fs.readFile(new URL('agent_org_task_delegation_records.json', root), 'utf8'));
const task = tasks.records.find((record) => record.description.includes(taskMarker));
if (!task?.taskExecution?.teamRunId) throw new Error('Expected active task Team record is missing.');
const researchTeam = tree.rootOrg.members.find((member) => member.address === '/research-team');
const lead = researchTeam?.members.find((member) => member.address === '/research-team/lead');
if (!researchTeam || !lead) throw new Error('Mounted configured delegator identity is missing.');
const traceFiles = await walkFiles(root, 'raw_traces_active.jsonl');
const readyAssistantTraces = [];
for (const file of traceFiles) {
  const lines = (await fs.readFile(file, 'utf8')).trim().split('\n').filter(Boolean);
  for (const line of lines) {
    const trace = JSON.parse(line);
    if (trace.trace_type === 'assistant' && trace.content?.trim() === taskMarker) {
      readyAssistantTraces.push({ file: file.pathname, trace });
    }
  }
}

const browserSnapshot = async () => page.evaluate(({ taskId }) => ({
  at: new Date().toISOString(),
  url: location.href,
  body: document.body.innerText.slice(-18_000),
  taskIdMatches: (document.body.innerText.match(new RegExp(taskId, 'g')) || []).length,
  taskHeader: document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent,
  taskTeamRows: [...document.querySelectorAll('[role="treeitem"]')]
    .filter((row) => row.textContent?.includes('Task: support team'))
    .map((row) => ({ text: row.textContent, expanded: row.getAttribute('aria-expanded'), selected: row.getAttribute('aria-selected') })),
  selected: [...document.querySelectorAll('[data-test^="agent-org-agent-row-"]')]
    .filter((row) => row.classList.contains('is-selected'))
    .map((row) => row.getAttribute('data-test')),
  statusDots: [...document.querySelectorAll('[data-test="team-aggregate-status-dot"]')].map((dot) => ({
    status: dot.getAttribute('data-status'), label: dot.getAttribute('aria-label'),
  })),
  alerts: [...document.querySelectorAll('[role="alert"]')].map((node) => node.textContent),
  scroll: { width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth },
}), { taskId: task.taskId });

const beforeReselect = await browserSnapshot();
await page.screenshot({ path: new URL('screenshots/LIVE-001-mounted-task-team-active.png', out).pathname, fullPage: false });
const rawSnapshot = await readSnapshot(orgRunId);
const snapshotPayload = rawSnapshot.terminal.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'
  ? rawSnapshot.terminal.payload
  : null;
const statuses = snapshotPayload?.root_org?.agent_statuses ?? [];
const statusPairs = statuses.map((status) => `${status.member_address}|${status.agent_run_id}`);
const statusRunIds = statuses.map((status) => status.agent_run_id);

await page.getByText('Agent Teams', { exact: true }).click({ noWaitAfter: true });
await page.waitForURL((url) => url.pathname.includes('/agent-teams'));
await page.waitForTimeout(500);
const tempWorkspace = page.locator('button').filter({ hasText: 'Temp Workspace' }).first();
if (await tempWorkspace.getAttribute('aria-expanded') === 'false') await tempWorkspace.click();
await page.waitForTimeout(500);
await page.locator('button[role="treeitem"]').filter({ hasText: 'Call delegate_task exactly once' }).first().click({ noWaitAfter: true });
await page.waitForURL((url) => url.searchParams.get('orgRunId') === orgRunId && url.searchParams.get('mode') === 'active');
await page.waitForTimeout(2_000);
const afterReselect = await browserSnapshot();
await page.screenshot({ path: new URL('screenshots/LIVE-001-mounted-task-team-reselected.png', out).pathname, fullPage: false });

const expectedConfiguredAgentRunIds = [
  tree.rootOrg.members.find((member) => member.address === '/concierge')?.agentRunId,
  ...tree.rootOrg.members.filter((member) => member.teamRunId).flatMap((team) => team.members.map((member) => member.agentRunId)),
].filter(Boolean);
const taskTeamNodePresent = JSON.stringify(tree).includes(task.taskExecution.teamRunId);
const assertions = {
  exactRoot: tree.rootOrg.orgRunId === orgRunId && afterReselect.url.includes(orgRunId),
  exactDelegator: task.delegatorAgentRunId === lead.agentRunId,
  exactRecipient: task.recipientAddress === '/support-team',
  oneCurrentTask: tasks.records.filter((record) => record.description.includes(taskMarker)).length === 1,
  taskTeamMaterialized: taskTeamNodePresent,
  taskStillActive: task.status === 'active' && task.settledAt == null,
  realCoordinatorReadyExactlyOnce: readyAssistantTraces.length === 1,
  snapshotAvailable: rawSnapshot.terminal.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT',
  completeCurrentRoot: snapshotPayload?.root_run_id === orgRunId && snapshotPayload?.root_org?.is_active === true,
  allConfiguredStatusesPresent: expectedConfiguredAgentRunIds.every((runId) => statusRunIds.includes(runId)),
  uniqueStatusPairs: statusPairs.length > 0 && new Set(statusPairs).size === statusPairs.length,
  uniqueAgentRunStatuses: statusRunIds.length > 0 && new Set(statusRunIds).size === statusRunIds.length,
  taskTeamInSnapshot: JSON.stringify(snapshotPayload).includes(task.taskExecution.teamRunId),
  taskVisibleBeforeReselect: beforeReselect.taskHeader?.includes('1 task') && beforeReselect.taskTeamRows.length === 1,
  taskVisibleAfterReselect: afterReselect.taskHeader?.includes('1 task') && afterReselect.taskTeamRows.length === 1,
  noRecoveryNoticeBeforeReselect: beforeReselect.alerts.length === 0,
  noRecoveryNoticeAfterReselect: afterReselect.alerts.length === 0,
  desktopNoOverflow: beforeReselect.scroll.width === beforeReselect.scroll.client && afterReselect.scroll.width === afterReselect.scroll.client,
  noNetworkFailures: networkFailures.length === 0,
  noPageErrors: pageErrors.length === 0,
};
const result = {
  at: new Date().toISOString(), orgRunId, task, researchTeam, lead,
  readyAssistantTraces, rawSnapshot, statuses, expectedConfiguredAgentRunIds,
  beforeReselect, afterReselect, networkFailures, pageErrors, assertions,
};
await fs.writeFile(new URL('LIVE-001-mounted-task-team.json', out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ orgRunId, taskId: task.taskId, taskExecution: task.taskExecution, statusCount: statuses.length, statusPairs, assertions, networkFailures, pageErrors }, null, 2));
await browser.close();
if (Object.values(assertions).some((value) => value !== true)) process.exit(2);
