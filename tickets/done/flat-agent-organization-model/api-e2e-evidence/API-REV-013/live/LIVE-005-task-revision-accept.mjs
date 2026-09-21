import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out = new URL('./', import.meta.url);
const sidecar = new URL('./server-data/memory/agent_orgs/apirev8_613529cf063144d0a9e6cd6e385d58ba/agent_org_task_delegation_records.json', import.meta.url);
const taskId = 'task_520783d1cf8b44bf92db55a96fb87738';
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('127.0.0.1:3592'));
if (!page) throw new Error('open_tab page missing');
await page.setViewportSize({ width: 1502, height: 844 });
const errors = [];
page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
const getRecord = async () => JSON.parse(await fs.readFile(sidecar, 'utf8')).records.find((record) => record.taskId === taskId);
const pollRecord = async (predicate, timeoutMs = 180_000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const record = await getRecord();
    if (predicate(record)) return record;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`durable task poll timed out for ${taskId}`);
};
const snap = async (label, record) => ({
  label, at: new Date().toISOString(), record,
  page: await page.evaluate(() => ({
    url: location.href, body: document.body.innerText,
    selected: [...document.querySelectorAll('[aria-selected="true"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim() })),
    taskRows: [...document.querySelectorAll('[data-test*="task"]')].map((element) => ({ test: element.getAttribute('data-test'), text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500) })),
  })),
});
const send = async (prompt, marker) => {
  const textbox = page.getByRole('textbox', { name: 'Type a message...' });
  await textbox.fill(prompt);
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForFunction((expected) => (document.body.innerText.match(new RegExp(expected, 'g')) || []).length >= 2, marker, { timeout: 180_000 });
};
const expand = async (locator) => { if (await locator.count() && await locator.getAttribute('aria-expanded') === 'false') await locator.click(); };
await expand(page.getByRole('button', { name: 'workspace', exact: true }).first());
await expand(page.getByRole('button', { name: /APIREV8 组织 Ω/ }).first());
await expand(page.getByRole('treeitem', { name: /Return exactly APIREV8-ORG-DIRECT-LIVE-001/ }));
await expand(page.locator('[data-test^="agent-org-team-row-apirev8_team_"]').first());
await page.locator('[data-test^="agent-org-agent-row-aorg_e2e_lead_"]').first().click();
await page.waitForFunction(() => document.body.innerText.includes('APIREV13-ORG-MOUNTED-CONTINUE-001'), null, { timeout: 30_000 });

const initial = await getRecord();
if (initial.status !== 'awaiting_review' || initial.updates.at(-1)?.message !== 'APIREV13-TASK-INITIAL-001') throw new Error(`unexpected initial state: ${JSON.stringify(initial)}`);
await send(`Use review_task_result on task ${taskId} with decision request_revision and feedback: Submit exactly APIREV13-TASK-REVISED-001 using submit_task_result. After review_task_result succeeds, reply exactly APIREV13-TASK-REVISION-REQUESTED-001.`, 'APIREV13-TASK-REVISION-REQUESTED-001');
const revised = await pollRecord((record) => record.status === 'awaiting_review' && record.updates.at(-1)?.message === 'APIREV13-TASK-REVISED-001');
const revisionEvent = await snap('revised-awaiting-review', revised);
await fs.writeFile(new URL('LIVE-005-task-revised-checkpoint.json', out), `${JSON.stringify(revisionEvent, null, 2)}\n`);

await send(`Use review_task_result on task ${taskId} with decision accept. After the tool succeeds, reply exactly APIREV13-TASK-ACCEPTED-001.`, 'APIREV13-TASK-ACCEPTED-001');
const accepted = await pollRecord((record) => record.status === 'accepted' && record.updates.at(-1)?.decision === 'accept');
const acceptedEvent = await snap('accepted', accepted);
await page.screenshot({ path: new URL('screenshots/LIVE-005-task-accepted.png', out).pathname, fullPage: true });
const assertions = {
  sameTaskId: initial.taskId === revised.taskId && revised.taskId === accepted.taskId && accepted.taskId === taskId,
  revisionRecorded: revised.updates.some((update) => update.decision === 'request_revision') && revised.updates.at(-1)?.message === 'APIREV13-TASK-REVISED-001',
  acceptedRecorded: accepted.status === 'accepted' && accepted.updates.at(-1)?.decision === 'accept',
  browserRevisionAck: revisionEvent.page.body.includes('APIREV13-TASK-REVISION-REQUESTED-001'),
  browserAcceptedAck: acceptedEvent.page.body.includes('APIREV13-TASK-ACCEPTED-001'),
  noBrowserErrors: errors.length === 0,
};
await fs.writeFile(new URL('LIVE-005-task-revision-accept.json', out), `${JSON.stringify({ taskId, initial, revisionEvent, acceptedEvent, assertions, errors }, null, 2)}\n`);
console.log(JSON.stringify({ taskId, assertions, updateCount: accepted.updates.length, errors }, null, 2));
if (Object.values(assertions).some((value) => value !== true)) throw new Error(`assertion failure: ${JSON.stringify(assertions)}`);
await browser.close();
