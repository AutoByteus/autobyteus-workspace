import fs from 'node:fs/promises';
import WebSocket from '../../../../../../autobyteus-server-ts/node_modules/ws/wrapper.mjs';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';

const out = new URL('./', import.meta.url);
const serverPort = 8596;
const rendererPort = 3596;
const taskMarker = 'APIREV15-MOUNTED-TASK-TEAM-READY-001';
const description = `As the new task Team coordinator, remain active for this status validation. Do not call submit_task_result until a later user message explicitly requests settlement. Reply exactly ${taskMarker} and wait.`;
const readJson = async (url, fallback) => {
  try { return JSON.parse(await fs.readFile(url, 'utf8')); } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (read, predicate, label, attempts = 300, delay = 500) => {
  for (let index = 0; index < attempts; index += 1) {
    const value = await read();
    if (predicate(value)) return value;
    await pause(delay);
  }
  throw new Error(`Timed out waiting for ${label}.`);
};
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

const currentUrl = new URL(page.url());
const orgRunId = currentUrl.searchParams.get('orgRunId');
if (!orgRunId) throw new Error(`Active AgentOrg URL is missing orgRunId: ${page.url()}`);
const root = new URL(`../runtime/server-data/memory/agent_orgs/${orgRunId}/`, out);
const treePath = new URL('agent_org_run_execution_tree.json', root);
const taskPath = new URL('agent_org_task_delegation_records.json', root);
const beforeTree = await readJson(treePath, null);
if (!beforeTree) throw new Error(`Execution tree does not exist for ${orgRunId}.`);
const researchTeam = beforeTree.rootOrg.members.find((member) => member.address === '/research-team');
const lead = researchTeam?.members.find((member) => member.address === '/research-team/lead');
if (!researchTeam || !lead) throw new Error('Mounted research Team/lead identity is missing.');
const beforeTasks = await readJson(taskPath, { records: [] });

const teamRow = page.locator(`[data-test="agent-org-team-row-${researchTeam.teamRunId}"]`);
if (await teamRow.getAttribute('aria-expanded') === 'false') await teamRow.click();
await page.locator(`[data-test="agent-org-agent-row-${lead.agentRunId}"]`).click();
await page.waitForTimeout(250);
const prompt = `Call delegate_task exactly once with recipient_address \`/support-team\` and description \`${description}\`. Use the field name description. Do not send an ordinary message. After the successful tool result, reply exactly APIREV15-MOUNTED-TASK-TEAM-DELEGATED-001.`;
await page.locator('textarea[placeholder="Type a message..."]').fill(prompt);
await page.locator('button[title="Send message"]').click();

const afterTasks = await waitFor(
  () => readJson(taskPath, { records: [] }),
  (value) => value.records.length === beforeTasks.records.length + 1,
  'one durable delegated Team task',
);
const task = afterTasks.records.at(-1);
const afterTree = await waitFor(
  () => readJson(treePath, null),
  (value) => JSON.stringify(value).includes(task.taskId) && Boolean(task.taskExecution?.teamRunId),
  'task Team materialization in the durable execution tree',
);
const readyEvidence = await waitFor(async () => {
  const matches = [];
  const traceFiles = await walkFiles(root, 'raw_traces_active.jsonl');
  for (const file of traceFiles) {
    const text = await fs.readFile(file, 'utf8');
    if (text.includes(taskMarker)) matches.push(file.pathname);
  }
  return matches;
}, (matches) => matches.length > 0, 'real task Team coordinator ready marker');

await page.waitForTimeout(1_500);
const beforeReselect = await page.evaluate(({ orgRunId, taskId, taskMarker }) => ({
  at: new Date().toISOString(),
  url: location.href,
  body: document.body.innerText.slice(-18_000),
  rootMatches: (document.body.innerText.match(new RegExp(orgRunId, 'g')) || []).length,
  taskIdMatches: (document.body.innerText.match(new RegExp(taskId, 'g')) || []).length,
  markerMatches: (document.body.innerText.match(new RegExp(taskMarker, 'g')) || []).length,
  taskHeader: document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent,
  selected: [...document.querySelectorAll('[data-test^="agent-org-agent-row-"]')]
    .filter((row) => row.classList.contains('is-selected'))
    .map((row) => row.getAttribute('data-test')),
  notices: [...document.querySelectorAll('[role="alert"]')].map((node) => node.textContent),
  scroll: { width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth },
}), { orgRunId, taskId: task.taskId, taskMarker });
await page.screenshot({ path: new URL('screenshots/LIVE-001-mounted-task-team-active.png', out).pathname, fullPage: false });

const rawSnapshot = await readSnapshot(orgRunId);
const snapshotPayload = rawSnapshot.terminal.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'
  ? rawSnapshot.terminal.payload
  : null;
const statuses = snapshotPayload?.root_org?.agent_statuses ?? [];
const statusPairs = statuses.map((status) => `${status.member_address}|${status.agent_run_id}`);
const statusRunIds = statuses.map((status) => status.agent_run_id);

await page.locator('button').filter({ hasText: 'Temp Workspace' }).first().click();
await page.waitForTimeout(500);
await page.locator('button').filter({ hasText: 'New - AORG E2E Mixed Org' }).first().click({ noWaitAfter: true });
await page.waitForURL((url) => url.searchParams.get('orgRunId') === orgRunId && url.searchParams.get('mode') === 'active');
await page.waitForTimeout(2_000);
const afterReselect = await page.evaluate(({ orgRunId, taskId }) => ({
  at: new Date().toISOString(),
  url: location.href,
  body: document.body.innerText.slice(-18_000),
  taskIdMatches: (document.body.innerText.match(new RegExp(taskId, 'g')) || []).length,
  taskHeader: document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent,
  statusDots: [...document.querySelectorAll('[data-test="team-aggregate-status-dot"]')].map((dot) => ({
    status: dot.getAttribute('data-status'),
    label: dot.getAttribute('aria-label'),
  })),
  notices: [...document.querySelectorAll('[role="alert"]')].map((node) => node.textContent),
  scroll: { width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth },
}), { orgRunId, taskId: task.taskId });
await page.screenshot({ path: new URL('screenshots/LIVE-001-mounted-task-team-reselected.png', out).pathname, fullPage: false });

const durableTreeText = JSON.stringify(afterTree);
const assertions = {
  exactRoot: orgRunId === beforeTree.rootOrg.orgRunId && afterReselect.url.includes(orgRunId),
  oneTaskCreated: afterTasks.records.length === beforeTasks.records.length + 1,
  exactDelegator: task.delegatorAgentRunId === lead.agentRunId && task.delegatorAddress === '/research-team/lead',
  exactRecipient: task.recipientAddress === '/support-team',
  taskTeamMaterialized: Boolean(task.taskExecution?.teamRunId) && durableTreeText.includes(task.taskExecution.teamRunId),
  taskStillActive: task.status === 'active' && task.settledAt == null,
  realCoordinatorReady: readyEvidence.length > 0,
  snapshotAvailable: rawSnapshot.terminal.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT',
  completeCurrentRoot: snapshotPayload?.root_run_id === orgRunId && snapshotPayload?.root_org?.is_active === true,
  uniqueStatusPairs: statusPairs.length > 0 && new Set(statusPairs).size === statusPairs.length,
  uniqueAgentRunStatuses: statusRunIds.length > 0 && new Set(statusRunIds).size === statusRunIds.length,
  taskTeamInSnapshot: JSON.stringify(snapshotPayload).includes(task.taskExecution.teamRunId),
  taskVisibleBeforeReselect: beforeReselect.taskHeader?.includes(`${afterTasks.records.length} task`),
  taskVisibleAfterReselect: afterReselect.taskHeader?.includes(`${afterTasks.records.length} task`),
  selectedLeadStayedExact: beforeReselect.selected.length === 1 && beforeReselect.selected[0].endsWith(lead.agentRunId),
  noRecoveryNoticeBeforeReselect: beforeReselect.notices.length === 0,
  noRecoveryNoticeAfterReselect: afterReselect.notices.length === 0,
  desktopNoOverflow: beforeReselect.scroll.width === beforeReselect.scroll.client && afterReselect.scroll.width === afterReselect.scroll.client,
  noNetworkFailures: networkFailures.length === 0,
  noPageErrors: pageErrors.length === 0,
};
const result = {
  at: new Date().toISOString(), orgRunId, researchTeam, lead, prompt,
  beforeTaskCount: beforeTasks.records.length, afterTaskCount: afterTasks.records.length,
  task, readyEvidence, rawSnapshot, statuses, beforeReselect, afterReselect,
  networkFailures, pageErrors, assertions,
};
await fs.writeFile(new URL('LIVE-001-mounted-task-team.json', out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ orgRunId, taskId: task.taskId, taskExecution: task.taskExecution, statusCount: statuses.length, assertions, networkFailures, pageErrors }, null, 2));
await browser.close();
if (Object.values(assertions).some((value) => value !== true)) process.exit(2);
