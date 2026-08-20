import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.resolve(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const browserDir = path.join(scriptDir, 'browser');
const apiDir = path.join(scriptDir, 'api');
fs.mkdirSync(browserDir, { recursive: true }); fs.mkdirSync(apiDir, { recursive: true });
const webBase = 'http://127.0.0.1:31321';
const graphqlEndpoint = 'http://127.0.0.1:60321/graphql';
const workspacePath = path.join(scriptDir, 'workspace/nested-classroom-live');
const model = 'gpt-5.6-luna';
const timeoutMs = 720_000;
const startedAt = new Date().toISOString();
const evidence = { schemaVersion: 1, startedAt, model, workspacePath, scenarios: {}, consoleEvents: [], network: [], samples: [], result: 'Fail' };
const assert = (condition, message, details) => { if (!condition) { const error = new Error(message); error.details = details; throw error; } };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gql = async (query, variables = {}) => {
  const response = await fetch(graphqlEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const json = await response.json();
  if (!response.ok || json.errors?.length) throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  return json.data;
};
const historyQuery = `query { listWorkspaceRunHistory(limitPerAgent: 200) { workspaceRootPath workspaceName teamDefinitions { teamDefinitionId teamDefinitionName runs { teamRunId teamDefinitionId teamDefinitionName coordinatorAddress workspaceRootPath summary createdAt terminatedAt isActive rootTeam members { memberAddress displayName agentRunId status runtimeKind workspaceRootPath } } } } }`;
const taskQuery = `query($teamRunId:String!){ getTaskDelegationRecords(teamRunId:$teamRunId){ taskId delegatorAgentRunId recipientAddress targetAgentRunId targetTeamRunId status description createdAt referenceFiles{referenceId path type createdAt updatedAt} updates{kind submissionId reviewId interruptionId reviewedSubmissionId decision content createdAt referenceFiles{referenceId path type createdAt updatedAt}} } }`;
const messagesQuery = `query($teamRunId:String!){ getTeamCommunicationMessages(teamRunId:$teamRunId){ messageId senderAgentRunId receiverAgentRunId content messageType createdAt referenceFiles{referenceId path type createdAt updatedAt} } }`;
const resumeQuery = `query($teamRunId:String!){ getTeamRunResumeConfig(teamRunId:$teamRunId){teamRunId isActive executionTree} }`;
const nestedRuns = (history) => history.listWorkspaceRunHistory.flatMap((workspace) => workspace.teamDefinitions)
  .filter((team) => team.teamDefinitionId === 'nested-classroom-test').flatMap((team) => team.runs);
const taskRecords = async (teamRunId) => (await gql(taskQuery, { teamRunId })).getTaskDelegationRecords;
const teamMessages = async (teamRunId) => (await gql(messagesQuery, { teamRunId })).getTeamCommunicationMessages;
const scenario = async (id, fn) => { const start = Date.now(); try { const detail = await fn(); evidence.scenarios[id] = { result: 'Pass', durationMs: Date.now() - start, ...detail }; return detail; } catch (error) { evidence.scenarios[id] = { result: 'Fail', durationMs: Date.now() - start, message: error.message, details: error.details }; throw error; } };
const labels = async (entry) => entry.locator('[data-test="team-delegated-task-lifecycle-label"]').allInnerTexts();
const taskEntry = (page, marker) => page.locator('article').filter({ hasText: marker });
let effectiveWorkspacePath = workspacePath;
const openHistoryRun = async (page, teamRunId) => {
  await page.goto(`${webBase}/workspace`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const emptyRuns = page.locator('[data-test="workspace-empty-state-runs"]');
  if (await emptyRuns.count() && await emptyRuns.isVisible()) await emptyRuns.click({ force: true, noWaitAfter: true });
  const workspaceLabel = path.basename(effectiveWorkspacePath) === 'temp_workspace'
    ? 'Temp Workspace'
    : path.basename(effectiveWorkspacePath);
  const workspaceRow = page.locator('[data-test="workspace-row"]').filter({ hasText: workspaceLabel }).first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') await workspaceRow.locator('button').first().click({ force: true, noWaitAfter: true });
  const definition = page.locator('[data-test^="workspace-team-definition-row-"]').filter({ hasText: 'Nested Classroom Test Team' }).first();
  await definition.waitFor({ state: 'visible', timeout: 120000 });
  if ((await definition.getAttribute('aria-expanded')) !== 'true') await definition.click({ force: true, noWaitAfter: true });
  const row = page.locator(`[data-test="workspace-team-row-${teamRunId}"]`);
  await row.waitFor({ state: 'visible', timeout: 120000 });
  await row.click({ force: true, noWaitAfter: true });
  await page.locator('[data-test="team-delegated-tasks-header"]').waitFor({ state: 'visible', timeout: 120000 });
  return { workspaceRow, definition, row };
};

let browser; let context; let page; let teamRunId = null; let termination = null;
try {
  const beforeIds = new Set(nestedRuns(await gql(historyQuery)).map((run) => run.teamRunId));
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  context = await browser.newContext({ viewport: { width: 1800, height: 1200 }, locale: 'en-US' });
  page = await context.newPage(); page.setDefaultTimeout(120000);
  page.on('console', (message) => { if (['warning', 'error'].includes(message.type())) evidence.consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1500) }); });
  page.on('pageerror', (error) => evidence.consoleEvents.push({ type: 'pageerror', text: error.message }));
  page.on('response', (response) => {
    if (response.url().includes('/task-delegations/') && response.url().includes('/references/') && response.url().endsWith('/content')) {
      evidence.network.push({ at: new Date().toISOString(), method: response.request().method(), status: response.status(), url: response.url() });
    }
  });

  await scenario('API-TASK-LIVE-001-launch', async () => {
    await page.goto(`${webBase}/agent-teams?view=team-list`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('#team-search').waitFor({ state: 'visible', timeout: 120000 });
    await page.locator('#team-search').fill('Nested Classroom Test Team');
    const card = page.locator('div.group').filter({ hasText: 'Nested Classroom Test Team' }).first();
    await card.getByRole('button', { name: 'Run', exact: true }).click();
    await page.waitForFunction(() => location.pathname === '/workspace');
    await page.locator('#team-run-runtime-kind').waitFor({ state: 'visible' });
    await page.locator('#team-run-runtime-kind').selectOption('autobyteus');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Select a model', exact: true }).click();
    await page.getByText(model, { exact: true }).last().click();
    const newTab = page.getByRole('tab', { name: 'New', exact: true });
    if (await newTab.count()) await newTab.click();
    const workspaceInput = page.getByPlaceholder('/absolute/path/to/workspace');
    await workspaceInput.fill(workspacePath);
    const auto = page.locator('#team-auto-execute');
    if ((await auto.getAttribute('class'))?.includes('bg-gray')) await auto.click();
    await page.screenshot({ path: path.join(browserDir, 'launch-config.png'), fullPage: true });
    await page.getByRole('button', { name: 'Run Team', exact: true }).click();
    await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: 180000 });
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const fresh = nestedRuns(await gql(historyQuery)).filter((run) => !beforeIds.has(run.teamRunId));
      if (fresh.length) {
        const selectedRun = fresh.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).at(-1);
        teamRunId = selectedRun.teamRunId;
        effectiveWorkspacePath = selectedRun.workspaceRootPath;
        break;
      }
      await wait(300);
    }
    assert(teamRunId, 'Fresh nested classroom RootTeamRun was not discovered');
    return { teamRunId, runtime: 'autobyteus', model, autoExecuteTools: true, requestedWorkspacePath: workspacePath, effectiveWorkspacePath };
  });

  await scenario('API-TASK-LIVE-001-revision-cycle', async () => {
    const input = page.getByPlaceholder('Type a message...');
    await input.fill('LIVE_REVISION_CYCLE. Follow your deterministic finite lifecycle instructions exactly.');
    await input.press('Enter');
    const deadline = Date.now() + timeoutMs;
    const observedStatuses = new Set();
    let observedTaskUi = false; let observedTaskCoordinatorFocus = false; let observedAwaitingReview = false;
    let acceptedRecord = null;
    while (Date.now() < deadline) {
      await wait(400);
      const records = await taskRecords(teamRunId);
      const record = records.find((candidate) => candidate.description.includes('LIVE_REVISION_CYCLE'));
      if (record) observedStatuses.add(record.status);
      const entries = await page.locator('[data-test="team-delegated-task-team-entry"]').count();
      observedTaskUi ||= entries > 0;
      observedAwaitingReview ||= record?.status === 'awaiting_review';
      if (!observedTaskCoordinatorFocus) {
        const taskTeamRow = page.locator('[data-test="workspace-team-transient-execution-row"][data-member-address="/StudentStudyGroup"]').first();
        if (await taskTeamRow.count() && await taskTeamRow.isVisible().catch(() => false)) {
          await taskTeamRow.click({ force: true }).catch(() => undefined);
          const coordinatorRow = page.locator('[data-test="workspace-team-transient-execution-row"][data-member-address="/StudentStudyGroup/student_one"]').first();
          if (await coordinatorRow.count() && await coordinatorRow.isVisible().catch(() => false)) {
            await coordinatorRow.click({ force: true }).catch(() => undefined);
            await wait(250);
            observedTaskCoordinatorFocus = (await page.locator('[data-test="team-delegated-task-team-entry"]').count()) === 1;
            const teacherRow = page.locator(`[data-test="workspace-team-member-${teamRunId}-/Teacher"]`);
            if (await teacherRow.count()) await teacherRow.click({ force: true }).catch(() => undefined);
          }
        }
      }
      if (evidence.samples.length < 200 && (evidence.samples.length === 0 || evidence.samples.at(-1).status !== record?.status || records.length !== evidence.samples.at(-1).taskCount)) {
        evidence.samples.push({ at: new Date().toISOString(), taskCount: records.length, status: record?.status ?? null, updateKinds: record?.updates.map((u) => `${u.kind}:${u.decision ?? ''}`) ?? [], uiTaskEntries: entries });
      }
      if (record?.status === 'accepted' && record.updates.length === 4) { acceptedRecord = record; break; }
    }
    assert(acceptedRecord, 'Real nested classroom task did not reach accepted with four lifecycle updates', { observedStatuses: [...observedStatuses], records: await taskRecords(teamRunId) });
    const [submission1, revision, submission2, acceptance] = acceptedRecord.updates;
    assert([submission1.kind, revision.kind, submission2.kind, acceptance.kind].join('|') === 'submission|review|submission|review', 'Real update order diverged', acceptedRecord.updates);
    assert(submission1.content?.trim() === 'FIRST_SUBMISSION_NEEDS_REVISION', 'First result content diverged', submission1);
    assert(revision.decision === 'request_revision' && revision.content === 'Add final verification evidence.', 'Revision review linkage/copy diverged', revision);
    assert(submission2.content?.trim() === 'REVISED_SUBMISSION_ACCEPTABLE', 'Revised result content diverged', submission2);
    assert(acceptance.decision === 'accept' && acceptance.content === null, 'Acceptance did not preserve null-comment fallback input', acceptance);
    assert(acceptedRecord.referenceFiles.length === 1 && path.basename(acceptedRecord.referenceFiles[0].path) === 'assignment.md', 'Root reference missing');
    assert(submission1.referenceFiles.some((reference) => path.basename(reference.path) === 'result-v1.md'), 'First submission result reference missing');
    assert(revision.referenceFiles.some((reference) => path.basename(reference.path) === 'review.md'), 'Review reference missing');
    assert(submission2.referenceFiles.some((reference) => path.basename(reference.path) === 'result-v2.md'), 'Revised submission result reference missing');
    await page.locator(`[data-test="workspace-team-member-${teamRunId}-/Teacher"]`).click({ force: true }).catch(() => undefined);
    await page.locator('[data-test="team-delegated-tasks-header"]').waitFor();
    const entry = taskEntry(page, 'LIVE_REVISION_CYCLE');
    await entry.waitFor();
    const lifecycleLabels = await labels(entry);
    assert(lifecycleLabels.join('|') === 'Result submitted · Result 1|Revision requested · Result 1|Revised result submitted · Result 2|Result 2 accepted', 'Live browser lifecycle labels/order/ordinals diverged', lifecycleLabels);
    assert((await entry.locator('[data-test="team-delegated-task-status"]').innerText()).includes('Accepted'), 'Accepted status missing from live UI');
    const rows = entry.locator('[data-test="team-delegated-task-lifecycle-row"]');
    for (let index = 0; index < await rows.count(); index += 1) assert((await rows.nth(index).getAttribute('aria-label'))?.trim(), `Lifecycle row ${index} has no accessible name`);
    await rows.nth(3).click();
    assert((await page.locator('[data-test="delegated-task-update-body"]').innerText()).includes('Result accepted.'), 'Null-comment acceptance fallback not rendered');
    const taskSectionText = await page.locator('[data-test="team-delegated-tasks-section"]').innerText();
    assert(!taskSectionText.includes('Technical details') && !taskSectionText.includes(acceptedRecord.taskId), 'Technical details or task ID leaked into live Tasks section');
    assert(observedTaskUi, 'Live task Team entry was never observed');
    await page.screenshot({ path: path.join(browserDir, 'live-accepted-lifecycle.png'), fullPage: true });
    return { taskId: acceptedRecord.taskId, observedStatuses: [...observedStatuses], observedTaskUi, observedAwaitingReview, observedTaskCoordinatorFocus, updateKinds: acceptedRecord.updates.map((update) => `${update.kind}:${update.decision ?? ''}`), lifecycleLabels };
  });

  await scenario('API-TASK-LIVE-001-exact-reference-route', async () => {
    const record = (await taskRecords(teamRunId)).find((candidate) => candidate.description.includes('LIVE_REVISION_CYCLE'));
    const entry = taskEntry(page, 'LIVE_REVISION_CYCLE');
    const requestsBefore = evidence.network.length;
    const firstResultReference = record.updates[0].referenceFiles.find((reference) => path.basename(reference.path) === 'result-v1.md');
    const reviewReference = record.updates[1].referenceFiles.find((reference) => path.basename(reference.path) === 'review.md');
    assert(firstResultReference && reviewReference, 'Expected owner-scoped result/review references are absent', record.updates);
    const clickReference = async (locator, reference, expectedText) => {
      const responsePromise = page.waitForResponse((response) => response.url().includes(`/references/${reference.referenceId}/content`), { timeout: 120000 });
      await locator.click();
      const response = await responsePromise;
      assert(response.status() === 200, 'Reference content route did not return 200', { url: response.url(), status: response.status() });
      const viewer = page.locator('[data-test="team-reference-viewer-shell"]');
      await viewer.waitFor();
      assert((await viewer.innerText()).includes(expectedText), 'Reference viewer rendered wrong content', { expectedText, text: await viewer.innerText() });
      assert(response.url().includes(`/team-runs/${teamRunId}/task-delegations/${record.taskId}/references/${reference.referenceId}/content`), 'Reference route composed wrong owner/task identity', response.url());
    };
    await clickReference(entry.getByRole('button', { name: record.referenceFiles[0].path }), record.referenceFiles[0], 'Complete the two-stage classroom result');
    const viewer = page.locator('[data-test="team-reference-viewer-shell"]');
    assert(await viewer.getByTitle('Raw').count() === 1 && await viewer.getByTitle('Preview').count() === 1, 'Real viewer Raw/Preview controls missing');
    await viewer.locator('[data-test="team-reference-viewer-maximize-toggle"]').click(); await page.keyboard.press('Escape');
    await entry.locator('[data-test="team-delegated-task-summary-row"]').click();
    assert(await page.locator('[data-test="delegated-task-task-body"]').count() === 1, 'Root owner return failed');
    const updateRefs = entry.locator('[data-test="team-delegated-task-update-references"]');
    await clickReference(updateRefs.nth(0).getByRole('button', { name: firstResultReference.path }), firstResultReference, 'First result');
    const resultRefRequestCount = evidence.network.filter((item) => item.url.includes(`/references/${firstResultReference.referenceId}/content`)).length;
    await updateRefs.nth(0).getByRole('button', { name: firstResultReference.path }).click();
    const refreshDeadline = Date.now() + 10000;
    while (Date.now() < refreshDeadline && evidence.network.filter((item) => item.url.includes(`/references/${firstResultReference.referenceId}/content`)).length < resultRefRequestCount + 1) await wait(50);
    assert(evidence.network.filter((item) => item.url.includes(`/references/${firstResultReference.referenceId}/content`)).length === resultRefRequestCount + 1, 'Real reference reselection did not refresh');
    await entry.locator('[data-test="team-delegated-task-lifecycle-row"]').nth(0).click();
    assert((await page.locator('[data-test="delegated-task-update-body"]').innerText()).includes('FIRST_SUBMISSION_NEEDS_REVISION'), 'Submission owner return failed');
    await clickReference(updateRefs.nth(1).getByRole('button', { name: reviewReference.path }), reviewReference, 'initial result needs');
    await page.screenshot({ path: path.join(browserDir, 'live-review-reference.png'), fullPage: true });
    return { exactRequests: evidence.network.length - requestsBefore, referenceIds: [record.referenceFiles[0].referenceId, firstResultReference.referenceId, reviewReference.referenceId], maximizeEscapeRestore: true, reselectRefresh: true };
  });

  await scenario('API-TASK-MESSAGES-006-live-no-change', async () => {
    const deadline = Date.now() + 120000; let communications = [];
    while (Date.now() < deadline) { communications = await teamMessages(teamRunId); if (communications.some((message) => message.content === 'Ordinary classroom note after accepted task.')) break; await wait(500); }
    assert(communications.filter((message) => message.content === 'Ordinary classroom note after accepted task.').length === 1, 'Expected exactly one requested ordinary communication', communications);
    await page.locator('[data-test="team-messages-header"]').click();
    const messageRows = page.locator('[data-test="team-communication-message-row"]');
    assert(await messageRows.count() === communications.length, 'Messages UI/API count parity changed', { ui: await messageRows.count(), api: communications.length });
    const ordinaryRow = messageRows.filter({ hasText: 'Ordinary classroom note after accepted task.' });
    assert(await ordinaryRow.count() === 1, 'Requested ordinary Messages row missing');
    await ordinaryRow.click();
    assert((await page.locator('[data-test="team-communication-detail-pane"]').innerText()).includes('Ordinary classroom note after accepted task.'), 'Ordinary Messages detail missing');
    assert(!(await page.locator('[data-test="team-delegated-tasks-navigator"]').innerText()).includes('Ordinary classroom note after accepted task.'), 'Ordinary message leaked into task rows');
    await page.screenshot({ path: path.join(browserDir, 'live-messages-no-change.png'), fullPage: true });
    await page.locator('[data-test="team-delegated-tasks-header"]').click();
    return { communicationCount: communications.length, uiApiCountParity: true, ordinaryExactCount: 1, taskRowsRemainSeparate: true };
  });

  await scenario('API-TASK-INTERRUPT-002', async () => {
    const input = page.getByPlaceholder('Type a message...');
    await input.fill('LIVE_INTERRUPTION_HOLD. Create the held task exactly as instructed.'); await input.press('Enter');
    const deadline = Date.now() + 360000; let activeRecord = null;
    while (Date.now() < deadline) {
      const records = await taskRecords(teamRunId);
      activeRecord = records.find((candidate) => candidate.description.includes('LIVE_INTERRUPTION_HOLD'));
      if (activeRecord?.status === 'active') break;
      await wait(500);
    }
    assert(activeRecord?.status === 'active', 'Held nested task did not reach active state', await taskRecords(teamRunId));
    await page.locator('[data-test="team-delegated-tasks-header"]').click().catch(() => undefined);
    if ((await page.locator('[data-test="team-delegated-tasks-header"]').getAttribute('aria-expanded')) !== 'true') await page.locator('[data-test="team-delegated-tasks-header"]').click();
    await taskEntry(page, 'LIVE_INTERRUPTION_HOLD').waitFor({ timeout: 120000 });
    await page.screenshot({ path: path.join(browserDir, 'live-interruption-active.png'), fullPage: true });
    termination = (await gql(`mutation($teamRunId:String!){terminateAgentTeamRun(teamRunId:$teamRunId){success message}}`, { teamRunId })).terminateAgentTeamRun;
    assert(termination.success, 'RootTeamRun termination failed', termination);
    const interruptedDeadline = Date.now() + 120000; let interrupted = null;
    while (Date.now() < interruptedDeadline) { interrupted = (await taskRecords(teamRunId)).find((candidate) => candidate.taskId === activeRecord.taskId); if (interrupted?.status === 'interrupted') break; await wait(300); }
    assert(interrupted?.status === 'interrupted', 'Active task was not interrupted by root termination', interrupted);
    assert(interrupted.updates.at(-1)?.kind === 'interruption', 'Interruption update missing', interrupted.updates);
    await wait(1000); await page.screenshot({ path: path.join(browserDir, 'live-interruption-terminal.png'), fullPage: true });
    return { taskId: interrupted.taskId, statusBefore: 'active', statusAfter: interrupted.status, finalUpdateKind: interrupted.updates.at(-1).kind, termination };
  });

  await scenario('API-TASK-RESTORE-003-focus-i18n-no-tech', async () => {
    await context.close();
    context = await browser.newContext({ viewport: { width: 1800, height: 1200 }, locale: 'en-US' });
    page = await context.newPage(); page.setDefaultTimeout(120000);
    page.on('console', (message) => { if (['warning', 'error'].includes(message.type())) evidence.consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1500) }); });
    await openHistoryRun(page, teamRunId); await wait(2500);
    const entries = page.locator('[data-test="team-delegated-tasks-navigator"] article');
    assert(await entries.count() === 2, 'Fresh historical hydration did not restore exactly two tasks', await entries.allInnerTexts());
    const first = taskEntry(page, 'LIVE_REVISION_CYCLE'); const interrupted = taskEntry(page, 'LIVE_INTERRUPTION_HOLD');
    assert(await first.count() === 1 && await interrupted.count() === 1, 'Restored tasks missing or source order changed');
    assert((await entries.first().innerText()).includes('LIVE_REVISION_CYCLE'), 'Restored source order changed');
    assert((await labels(first)).join('|') === 'Result submitted · Result 1|Revision requested · Result 1|Revised result submitted · Result 2|Result 2 accepted', 'Restored revision lifecycle diverged');
    assert((await labels(interrupted)).join('|') === 'Task interrupted', 'Restored interruption lifecycle diverged');
    const studentRow = page.locator(`[data-test="workspace-team-member-${teamRunId}-/StudentStudyGroup"]`);
    if (await studentRow.count()) await studentRow.click({ force: true });
    const studentOne = page.locator(`[data-test="workspace-team-member-${teamRunId}-/StudentStudyGroup/student_one"]`);
    if (await studentOne.count()) {
      await studentOne.click({ force: true }); await wait(500);
      assert((await page.locator('[data-test="team-delegated-tasks-header"]').innerText()).includes('0 tasks'), 'Unrelated configured student focus leaked task rows');
    }
    await page.locator(`[data-test="workspace-team-member-${teamRunId}-/Teacher"]`).click({ force: true }); await wait(500);
    assert((await page.locator('[data-test="team-delegated-tasks-header"]').innerText()).includes('2 tasks'), 'Teacher focus did not restore both owned tasks');
    let body = await page.locator('body').innerText();
    assert(!body.includes('Technical details') && !body.includes('Raw routing metadata'), 'Technical-details disclosure returned after hydration');
    assert(!body.includes(teamRunId), 'Root TeamRun ID leaked into restored visible UI');
    await page.screenshot({ path: path.join(browserDir, 'restored-english-focus.png'), fullPage: true });

    await page.goto(`${webBase}/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-testid="settings-nav-language"]').click();
    await page.locator('[data-testid="settings-language-select"]').selectOption('zh-CN');
    await page.waitForFunction(() => localStorage.getItem('autobyteus.localization.preference-mode') === 'zh-CN');
    await openHistoryRun(page, teamRunId); await wait(1500);
    const chineseFirst = taskEntry(page, 'LIVE_REVISION_CYCLE');
    const chineseLabels = await labels(chineseFirst);
    assert(chineseLabels.join('|') === '已提交结果 · 结果 1|已请求修订 · 结果 1|已提交修订结果 · 结果 2|结果 2 已接受', 'Live restored Simplified Chinese labels diverged', chineseLabels);
    body = await page.locator('body').innerText();
    assert(!body.includes('Technical details') && !body.includes('技术详情'), 'Technical details visible in localized historical UI');
    assert(await page.locator('[data-test="delegated-task-detail-pane"] [data-test="team-delegated-task-lifecycle-list"]').count() === 0, 'Right pane duplicated lifecycle navigation after hydration');
    await page.screenshot({ path: path.join(browserDir, 'restored-chinese-no-technical-details.png'), fullPage: true });
    const resume = (await gql(resumeQuery, { teamRunId })).getTeamRunResumeConfig;
    assert(resume.isActive === false, 'Terminated historical run reported active', resume);
    return { restoredTasks: 2, restoredLifecycleRows: 5, teacherTasks: 2, unrelatedStudentTasks: 0, chineseLabels, technicalDetailsAbsent: true, historyIsActive: resume.isActive };
  });

  const records = await taskRecords(teamRunId); const communications = await teamMessages(teamRunId);
  fs.writeFileSync(path.join(apiDir, 'final-task-records.json'), `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(path.join(apiDir, 'final-team-communications.json'), `${JSON.stringify(communications, null, 2)}\n`);
  fs.writeFileSync(path.join(apiDir, 'final-resume-config.json'), `${JSON.stringify((await gql(resumeQuery, { teamRunId })).getTeamRunResumeConfig, null, 2)}\n`);
  evidence.result = 'Pass';
} catch (error) {
  evidence.failure = { message: error.message, details: error.details, stack: error.stack };
  if (page) { try { await page.screenshot({ path: path.join(browserDir, 'failure.png'), fullPage: true }); } catch {} }
  process.exitCode = 1;
} finally {
  if (teamRunId && !termination?.success) {
    try { termination = (await gql(`mutation($teamRunId:String!){terminateAgentTeamRun(teamRunId:$teamRunId){success message}}`, { teamRunId })).terminateAgentTeamRun; }
    catch (error) { termination = { success: false, message: error.message }; }
  }
  evidence.teamRunId = teamRunId; evidence.termination = termination; evidence.completedAt = new Date().toISOString();
  try { await context?.close(); evidence.browserContextCleanup = 'closed'; } catch {}
  try { await browser?.close(); evidence.browserCleanup = 'closed'; } catch {}
  fs.writeFileSync(path.join(scriptDir, 'result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ result: evidence.result, teamRunId, scenarios: evidence.scenarios, termination, failure: evidence.failure }, null, 2));
}
