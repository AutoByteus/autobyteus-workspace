import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out = new URL('./', import.meta.url);
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('127.0.0.1:3592'));
if (!page) throw new Error('open_tab page missing');
await page.setViewportSize({ width: 1502, height: 844 });
const events = [];
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
const checkpoint = async (label) => {
  const event = await page.evaluate((currentLabel) => ({
    label: currentLabel, at: new Date().toISOString(), url: location.href, body: document.body.innerText,
    selected: [...document.querySelectorAll('[aria-selected="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
    taskRows: [...document.querySelectorAll('[data-test*="task"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500) })),
  }), label);
  events.push(event);
  await fs.writeFile(new URL('LIVE-005-org-conversations-task.partial.json', out), `${JSON.stringify({ events, errors }, null, 2)}\n`);
  return event;
};
const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };
const send = async (prompt, marker) => {
  const textbox = page.getByRole('textbox', { name: 'Type a message...' });
  await textbox.fill(prompt);
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForFunction((expected) => (document.body.innerText.match(new RegExp(expected, 'g')) || []).length >= 2, marker, { timeout: 180_000 });
};
await expand(page.getByRole('button', { name: 'workspace', exact: true }).first());
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await expand(page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }));

const concierge = page.locator('[data-test^="agent-org-agent-row-aorg_e2e_concierge_"]').first();
await concierge.click();
await page.waitForFunction(() => document.body.innerText.includes('APIREV8-ORG-DIRECT-LIVE-001'), null, { timeout: 30_000 });
await send('Return exactly APIREV13-ORG-DIRECT-CONTINUE-001 on the first line and a five-word acknowledgment on the second line.', 'APIREV13-ORG-DIRECT-CONTINUE-001');
const direct = await checkpoint('direct-continuation');
await page.screenshot({ path: new URL('screenshots/LIVE-005-org-direct-continuation.png', out).pathname, fullPage: true });

const mountedTeam = page.locator('[data-test^="agent-org-team-row-apirev8_team_"]').first();
await expand(mountedTeam);
const lead = page.locator('[data-test^="agent-org-agent-row-aorg_e2e_lead_"]').first();
await lead.click();
await page.waitForFunction(() => document.body.innerText.includes('APIREV10-ORG-TEAM-RESUMED-002'), null, { timeout: 30_000 });
await send('Return exactly APIREV13-ORG-MOUNTED-CONTINUE-001 on the first line and a five-word acknowledgment on the second line.', 'APIREV13-ORG-MOUNTED-CONTINUE-001');
const mounted = await checkpoint('mounted-continuation');

await send('Use delegate_task to assign a fresh formal task to exact recipient /apirev8_team/aorg_e2e_analyst. The task description must be: First call submit_task_result with exactly APIREV13-TASK-INITIAL-001. If a revision request arrives, call submit_task_result again with exactly APIREV13-TASK-REVISED-001. Never review this task. After delegate_task succeeds, reply exactly APIREV13-TASK-DELEGATED-001.', 'APIREV13-TASK-DELEGATED-001');
await page.waitForFunction(() => document.body.innerText.includes('APIREV13-TASK-INITIAL-001'), null, { timeout: 180_000 });
const initial = await checkpoint('task-initial-awaiting-review');
const taskIds = [...initial.body.matchAll(/task_[a-zA-Z0-9]+/g)].map((match) => match[0]);
const taskId = taskIds.at(-1);
if (!taskId) throw new Error('new task id not found');

const visibleTaskRows = page.getByText('Task: aorg e2e analyst', { exact: true });
if (await visibleTaskRows.count()) {
  await visibleTaskRows.last().click();
  await page.waitForTimeout(800);
}
const taskMonitor = await checkpoint('task-monitor-retained-initial');
await lead.click();
await page.waitForFunction(() => document.body.innerText.includes('APIREV13-TASK-INITIAL-001'), null, { timeout: 30_000 });
await send(`Use review_task_result on task ${taskId} with decision request_revision and feedback: Submit exactly APIREV13-TASK-REVISED-001 using submit_task_result. After review_task_result succeeds, reply exactly APIREV13-TASK-REVISION-REQUESTED-001.`, 'APIREV13-TASK-REVISION-REQUESTED-001');
await page.waitForFunction(() => document.body.innerText.includes('APIREV13-TASK-REVISED-001'), null, { timeout: 180_000 });
const revised = await checkpoint('task-revised-awaiting-review');
await send(`Use review_task_result on task ${taskId} with decision accept. After the tool succeeds, reply exactly APIREV13-TASK-ACCEPTED-001.`, 'APIREV13-TASK-ACCEPTED-001');
const accepted = await checkpoint('task-accepted');
await page.screenshot({ path: new URL('screenshots/LIVE-005-task-accepted.png', out).pathname, fullPage: true });

const assertions = {
  directRestoredAndContinued: direct.body.includes('APIREV8-ORG-DIRECT-LIVE-001') && (direct.body.match(/APIREV13-ORG-DIRECT-CONTINUE-001/g) || []).length >= 2,
  mountedRestoredAndContinued: mounted.body.includes('APIREV10-ORG-TEAM-RESUMED-002') && (mounted.body.match(/APIREV13-ORG-MOUNTED-CONTINUE-001/g) || []).length >= 2,
  taskInitialSubmitted: initial.body.includes('APIREV13-TASK-INITIAL-001') && initial.body.includes(taskId),
  taskMonitorSelected: taskMonitor.body.includes('APIREV13-TASK-INITIAL-001'),
  taskRevisedSameId: revised.body.includes(taskId) && revised.body.includes('APIREV13-TASK-REVISED-001'),
  taskAccepted: accepted.body.includes(taskId) && accepted.body.includes('APIREV13-TASK-ACCEPTED-001'),
  noBrowserErrors: errors.length === 0,
};
await fs.writeFile(new URL('LIVE-005-org-conversations-task.json', out), `${JSON.stringify({ taskId, events, assertions, errors }, null, 2)}\n`);
console.log(JSON.stringify({ taskId, assertions, errors }, null, 2));
if (Object.values(assertions).some((value) => value !== true)) throw new Error(`assertion failure: ${JSON.stringify(assertions)}`);
await browser.close();
