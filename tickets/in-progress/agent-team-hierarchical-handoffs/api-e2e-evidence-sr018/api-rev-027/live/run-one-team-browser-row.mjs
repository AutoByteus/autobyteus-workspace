import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const [runtime = 'autobyteus', model = 'gpt-5.6-luna', slug = 'autobyteus'] = process.argv.slice(2);
const base = 'http://127.0.0.1:31227';
const gqlEndpoint = 'http://127.0.0.1:60227/graphql';
const outDir = new URL('./browser/', import.meta.url).pathname;
const upper = slug.toUpperCase();
const expectedReply = `CLASSROOM_REPLY_${upper}`;
const expectedPeer = `TASK_PEER_${upper}`;
const expectedResult = `NESTED_CLASSROOM_OK_${upper}`;
const expectedComplete = `LIVE_ROW_COMPLETE_${upper}`;
const referencePath = new URL(`./${slug}-reference.txt`, import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(referencePath, `REFERENCE_CONTENT_${upper}\n`);

const historyQuery = `
  query ListLiveRows {
    listWorkspaceRunHistory(limitPerAgent: 200) {
      workspaceRootPath
      teamDefinitions {
        teamDefinitionId teamDefinitionName
        runs {
          teamRunId teamDefinitionId teamDefinitionName coordinatorAddress
          createdAt terminatedAt isActive rootTeam
          members { memberAddress displayName agentRunId status runtimeKind workspaceRootPath }
        }
      }
    }
  }
`;
const taskQuery = `
  query LiveTaskRecords($teamRunId: String!) {
    getTaskDelegationRecords(teamRunId: $teamRunId) {
      taskId status receiverTargetKind content createdAt
      senderAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
      receiverAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
      referenceFiles { referenceId path type createdAt updatedAt }
      taskRun {
        startedAt
        address { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
      }
      updates {
        kind submissionId reviewId reviewedSubmissionId decision content createdAt
        senderAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
        receiverAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
        referenceFiles { referenceId path type createdAt updatedAt }
      }
    }
  }
`;
const communicationQuery = `
  query LiveTeamMessages($teamRunId: String!) {
    getTeamCommunicationMessages(teamRunId: $teamRunId) {
      messageId content messageType createdAt
      senderAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
      receiverAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
      referenceFiles { referenceId path type createdAt updatedAt }
    }
  }
`;
const resumeQuery = `
  query LiveResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive metadata }
  }
`;

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

function nestedRuns(history) {
  return history.listWorkspaceRunHistory
    .flatMap((workspace) => workspace.teamDefinitions)
    .filter((team) => team.teamDefinitionId === 'nested-classroom-test')
    .flatMap((team) => team.runs)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

async function expandTeamPanels(page) {
  const taskHeader = page.locator('[data-test="team-delegated-tasks-header"]:visible');
  const taskBody = page.locator('[data-test="team-delegated-tasks-body"]:visible');
  if (await taskHeader.count() && await taskBody.count() === 0) {
    await taskHeader.first().click();
  }
  await page.waitForTimeout(180);
}

async function uiSnapshot(page) {
  await expandTeamPanels(page);
  return {
    taskHeader: await page.locator('[data-test="team-delegated-tasks-header"]:visible').allInnerTexts(),
    taskEntries: await page.locator('[data-test="team-delegated-task-summary-row"]:visible').count(),
    taskTeamEntries: await page.locator('[data-test="team-delegated-task-team-entry"]:visible').count(),
    transientRows: await page.locator('[data-test="workspace-team-transient-execution-row"]:visible').count(),
    transientTexts: await page.locator('[data-test="workspace-team-transient-execution-row"]:visible').allInnerTexts(),
    taskDetails: await page.locator('[data-test="delegated-task-task-body"]:visible').allInnerTexts(),
    messageRows: await page.locator('[data-test="team-communication-message-row"]:visible').allInnerTexts(),
    messageMarkdown: await page.locator('[data-test="team-communication-message-markdown"]:visible').allInnerTexts(),
    referenceRows: await page.locator('[data-test="team-communication-reference-row"]:visible').allInnerTexts(),
    syntheticInterAgentCount: await page.locator('[data-testid="inter-agent-inline"]').count(),
    body: await page.locator('body').innerText(),
  };
}

const beforeRuns = nestedRuns(await gql(historyQuery));
const beforeIds = new Set(beforeRuns.map((run) => run.teamRunId));
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1800, height: 1200 } });
const page = await context.newPage();
const consoleEvents = [];
const graphqlResponseSummaries = [];
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) {
    consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) });
  }
});
page.on('response', async (response) => {
  if (response.url() !== gqlEndpoint) return;
  try {
    const text = await response.text();
    if (/(?:TaskDelegation|AgentTeamRun|RunHistory|TeamCommunication|Handoff)/i.test(text)) {
      graphqlResponseSummaries.push({
        at: new Date().toISOString(), status: response.status(),
        containsTaskDelegation: /TaskDelegation|task_\d+/i.test(text),
        containsTeamCommunication: /TeamCommunication|messageId/i.test(text),
        containsError: /"errors"\s*:/.test(text),
      });
    }
  } catch {
    // Direct GraphQL reads below are authoritative.
  }
});

const startedAt = new Date().toISOString();
let rootRun = null;
let rootTeamRunId = null;
let termination = null;
let rowResult = null;
let fatalError = null;

try {
  await page.goto(`${base}/agent-teams?view=team-list`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.screenshot({ path: `${outDir}/${slug}-team-list.png`, fullPage: true });
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace**', { timeout: 120000 });

  await page.locator('#team-run-runtime-kind').selectOption(runtime);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  const modelSearch = page.getByPlaceholder('Search models...');
  await modelSearch.fill(model);
  const modelOption = page.locator('li').filter({ hasText: new RegExp(model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
  await modelOption.click();
  if (runtime === 'codex_app_server') {
    await page.locator('#team-run-reasoning_effort').selectOption('medium');
  }
  const effectiveLaunchForm = {
    runtimeKind: await page.locator('#team-run-runtime-kind').inputValue(),
    model,
    reasoningEffort: await page.locator('#team-run-reasoning_effort').count()
      ? await page.locator('#team-run-reasoning_effort').inputValue() : null,
  };
  if (effectiveLaunchForm.runtimeKind !== runtime) {
    throw new Error(`RUNTIME_SELECTION_MISMATCH:${JSON.stringify(effectiveLaunchForm)}`);
  }
  if (runtime === 'codex_app_server' && effectiveLaunchForm.reasoningEffort !== 'medium') {
    throw new Error(`CODEX_REASONING_SELECTION_MISMATCH:${JSON.stringify(effectiveLaunchForm)}`);
  }

  const autoApprove = page.locator('#team-auto-execute');
  if ((await autoApprove.getAttribute('class'))?.includes('bg-gray')) await autoApprove.click();
  await page.screenshot({ path: `${outDir}/${slug}-launch-config.png`, fullPage: true });
  await page.getByRole('button', { name: 'Run Team', exact: true }).click();
  await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: 180000 });

  const prompt = [
    `First call get_handoff_rules for your current /Teacher address and follow the returned guidance.`,
    `Then use send_message_to to send an ordinary message to ./StudentStudyGroup with reference_files:["${referencePath}"] asking its coordinator to reply to /Teacher with exactly ${expectedReply}. Wait for that reply.`,
    `Then delegate exactly one task to ./StudentStudyGroup. The task must require student_one to send exactly ${expectedPeer} to ./student_two using send_message_to, wait for the peer reply, and submit exactly ${expectedResult} with submit_task_result.`,
    `Accept that exact result with review_task_result. Do not delegate another task. After acceptance, reply with exactly ${expectedComplete}.`,
  ].join(' ');
  const input = page.getByPlaceholder('Type a message...');
  await input.fill(prompt);
  await input.press('Enter');

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidates = nestedRuns(await gql(historyQuery)).filter((run) => !beforeIds.has(run.teamRunId));
    if (candidates.length) {
      rootRun = candidates.at(-1);
      rootTeamRunId = rootRun.teamRunId;
      break;
    }
    await page.waitForTimeout(500);
  }
  if (!rootTeamRunId) throw new Error('FRESH_ROOT_TEAM_RUN_NOT_DISCOVERED');

  const samples = [];
  const observedStatuses = new Set();
  let observedTaskSummary = false;
  let observedTaskTeamSummary = false;
  let observedTransientTaskExecution = false;
  let observedActiveTaskUi = false;
  let observedAwaitingReviewUi = false;
  let observedAcceptedTaskUi = false;
  let observedSelectedDetail = false;
  let observedTeamCommunicationUi = false;
  let observedReferenceUi = false;
  let activeScreenshot = false;
  let awaitingScreenshot = false;
  let acceptedScreenshot = false;
  let finalTaskRecords = [];
  let finalCommunications = [];

  for (let iteration = 0; iteration < 900; iteration += 1) {
    await page.waitForTimeout(400);
    for (const label of ['Approve', 'Allow', 'Accept']) {
      const buttons = page.getByRole('button', { name: label, exact: true });
      for (let index = 0; index < await buttons.count(); index += 1) {
        try { if (await buttons.nth(index).isVisible()) await buttons.nth(index).click(); } catch {}
      }
    }

    const snapshot = await uiSnapshot(page);
    const taskData = await gql(taskQuery, { teamRunId: rootTeamRunId });
    finalTaskRecords = taskData.getTaskDelegationRecords;
    const record = finalTaskRecords[0] ?? null;
    const status = record?.status ?? 'none';
    observedStatuses.add(status);
    const hasSubmission = record?.updates?.some((update) => update.kind === 'submission') === true;
    const hasAcceptedReview = record?.updates?.some(
      (update) => update.kind === 'review' && String(update.decision).toLowerCase() === 'accept',
    ) === true;
    const isActive = Boolean(record) && !hasSubmission && !hasAcceptedReview;
    const isAwaitingReview = Boolean(record) && hasSubmission && !hasAcceptedReview;
    const isAccepted = status === 'accepted' && hasAcceptedReview;

    observedTaskSummary ||= snapshot.taskEntries > 0;
    observedTaskTeamSummary ||= snapshot.taskTeamEntries > 0;
    observedTransientTaskExecution ||= snapshot.transientRows > 0;
    observedActiveTaskUi ||= isActive && snapshot.taskEntries > 0 && (snapshot.taskTeamEntries > 0 || snapshot.transientRows > 0);
    observedAwaitingReviewUi ||= isAwaitingReview && snapshot.taskEntries > 0 && (snapshot.taskTeamEntries > 0 || snapshot.transientRows > 0);
    observedAcceptedTaskUi ||= isAccepted && snapshot.taskEntries > 0;
    observedTeamCommunicationUi ||= [...snapshot.messageRows, ...snapshot.messageMarkdown].some((text) =>
      text.includes(expectedReply) || text.includes(expectedPeer) || text.includes(expectedResult));
    observedReferenceUi ||= snapshot.referenceRows.some((text) => text.includes(`${slug}-reference.txt`));

    if (snapshot.taskEntries > 0 && !observedSelectedDetail) {
      await page.locator('[data-test="team-delegated-task-summary-row"]:visible').first().click();
      observedSelectedDetail = await page.locator('[data-test="delegated-task-task-body"]:visible').count() > 0;
    }
    if (isActive && snapshot.taskEntries > 0 && !activeScreenshot) {
      await page.screenshot({ path: `${outDir}/${slug}-task-active.png`, fullPage: true }); activeScreenshot = true;
    }
    if (isAwaitingReview && snapshot.taskEntries > 0 && !awaitingScreenshot) {
      await page.screenshot({ path: `${outDir}/${slug}-task-awaiting-review.png`, fullPage: true }); awaitingScreenshot = true;
    }
    if (isAccepted && snapshot.taskEntries > 0 && !acceptedScreenshot) {
      await page.screenshot({ path: `${outDir}/${slug}-task-accepted.png`, fullPage: true }); acceptedScreenshot = true;
    }
    if (iteration % 10 === 0) {
      samples.push({ elapsedMs: (iteration + 1) * 400, ...snapshot, taskStatus: status, hasSubmission, hasAcceptedReview });
    }
    if (iteration % 5 === 0 || isAccepted) {
      finalCommunications = (await gql(communicationQuery, { teamRunId: rootTeamRunId })).getTeamCommunicationMessages;
    }
    const persistentReply = finalCommunications.some((message) =>
      message.content.includes(expectedReply) && message.receiverAddress.memberAddress === '/Teacher');
    const taskPeer = finalCommunications.some((message) =>
      message.content.includes(expectedPeer) && message.senderAddress.taskTeamRunIds.length > 0 &&
      message.receiverAddress.memberAddress === '/StudentStudyGroup/student_two');
    const taskPeerReply = finalCommunications.some((message) =>
      message.senderAddress.memberAddress === '/StudentStudyGroup/student_two' &&
      message.receiverAddress.memberAddress === '/StudentStudyGroup/student_one' &&
      message.senderAddress.taskTeamRunIds.length > 0);
    const submissionExact = record?.updates?.some(
      (update) => update.kind === 'submission' && update.content.trim() === expectedResult) === true;
    const referenceExact = finalCommunications.some((message) =>
      message.referenceFiles.some((reference) => reference.path === referencePath));

    if (isAccepted && submissionExact && persistentReply && taskPeer && taskPeerReply && referenceExact &&
      snapshot.body.includes(expectedComplete) && observedTaskSummary && observedTaskTeamSummary &&
      observedTransientTaskExecution && observedActiveTaskUi && observedAwaitingReviewUi &&
      observedAcceptedTaskUi && observedSelectedDetail && observedTeamCommunicationUi && observedReferenceUi) {
      await page.waitForTimeout(1500);
      break;
    }
  }

  finalTaskRecords = (await gql(taskQuery, { teamRunId: rootTeamRunId })).getTaskDelegationRecords;
  finalCommunications = (await gql(communicationQuery, { teamRunId: rootTeamRunId })).getTeamCommunicationMessages;
  const resumeConfig = (await gql(resumeQuery, { teamRunId: rootTeamRunId })).getTeamRunResumeConfig;
  const beforeRefresh = await uiSnapshot(page);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1200);
  const workspaceRow = page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') await workspaceRow.locator('button').first().click();
  const teamDefinitionRow = page.locator('[data-test^="workspace-team-definition-row-"]')
    .filter({ hasText: 'Nested Classroom Test Team' }).first();
  await teamDefinitionRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await teamDefinitionRow.getAttribute('aria-expanded')) !== 'true') await teamDefinitionRow.click();
  const restoredTeamRow = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await restoredTeamRow.waitFor({ state: 'visible', timeout: 120000 });
  await restoredTeamRow.click();
  await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForTimeout(3000);
  const afterRefresh = await uiSnapshot(page);
  if (afterRefresh.taskEntries > 0 && afterRefresh.taskDetails.length === 0) {
    await page.locator('[data-test="team-delegated-task-summary-row"]:visible').first().click();
    await page.waitForTimeout(250);
    afterRefresh.taskDetails = await page.locator('[data-test="delegated-task-task-body"]:visible').allInnerTexts();
  }
  await page.screenshot({ path: `${outDir}/${slug}-post-refresh.png`, fullPage: true });

  const record = finalTaskRecords[0] ?? null;
  const persistentReply = finalCommunications.filter((message) =>
    message.content.includes(expectedReply) &&
    message.senderAddress.memberAddress === '/StudentStudyGroup/student_one' &&
    message.senderAddress.taskTeamRunIds.length === 0 &&
    message.receiverAddress.memberAddress === '/Teacher');
  const taskPeer = finalCommunications.filter((message) =>
    message.content.includes(expectedPeer) &&
    message.senderAddress.memberAddress === '/StudentStudyGroup/student_one' &&
    message.receiverAddress.memberAddress === '/StudentStudyGroup/student_two' &&
    message.senderAddress.taskTeamRunIds.length > 0 &&
    JSON.stringify(message.senderAddress.taskTeamRunIds) === JSON.stringify(message.receiverAddress.taskTeamRunIds));
  const taskPeerReply = finalCommunications.filter((message) =>
    message.senderAddress.memberAddress === '/StudentStudyGroup/student_two' &&
    message.receiverAddress.memberAddress === '/StudentStudyGroup/student_one' &&
    message.senderAddress.taskTeamRunIds.length > 0 &&
    JSON.stringify(message.senderAddress.taskTeamRunIds) === JSON.stringify(message.receiverAddress.taskTeamRunIds));
  const exactSubmission = record?.updates?.filter(
    (update) => update.kind === 'submission' && update.content.trim() === expectedResult) ?? [];
  const acceptedReviews = record?.updates?.filter(
    (update) => update.kind === 'review' && String(update.decision).toLowerCase() === 'accept') ?? [];
  const referenceMessages = finalCommunications.filter((message) =>
    message.referenceFiles.some((reference) => reference.path === referencePath));
  const rootedMembers = new Set(rootRun.members.map((member) => member.memberAddress));
  const taskAddress = record?.taskRun?.address ?? null;
  const allVisibleText = [
    ...beforeRefresh.messageRows, ...beforeRefresh.messageMarkdown,
    ...afterRefresh.messageRows, ...afterRefresh.messageMarkdown,
  ];
  const resultConditions = {
    freshRootTeamRun: !beforeIds.has(rootTeamRunId),
    rootedTopology: ['/Teacher', '/StudentStudyGroup/student_one', '/StudentStudyGroup/student_two']
      .every((address) => rootedMembers.has(address)),
    exactTaskAddress: Boolean(taskAddress && taskAddress.rootTeamRunId === rootTeamRunId &&
      taskAddress.memberAddress === '/StudentStudyGroup' && taskAddress.taskTeamRunIds.length === 1 &&
      taskAddress.taskAgentRunId === null),
    exactOneDelegatedTask: finalTaskRecords.length === 1,
    acceptedStatus: record?.status === 'accepted',
    exactOneSubmission: exactSubmission.length === 1,
    acceptedReview: acceptedReviews.length === 1,
    exactOnePersistentReply: persistentReply.length === 1,
    taskPeerDelivered: taskPeer.length === 1,
    taskPeerReplyDelivered: taskPeerReply.length >= 1,
    referenceDelivered: referenceMessages.length >= 1,
    observedTaskSummary, observedTaskTeamSummary, observedTransientTaskExecution,
    observedActiveTaskUi, observedAwaitingReviewUi, observedAcceptedTaskUi,
    observedSelectedDetail, observedTeamCommunicationUi, observedReferenceUi,
    taskDetailVisible: [...beforeRefresh.taskDetails, ...afterRefresh.taskDetails]
      .some((detail) => detail.includes(expectedPeer) && detail.includes(expectedResult)),
    teamCommunicationVisible: allVisibleText.some((text) =>
      text.includes(expectedReply) || text.includes(expectedPeer) || text.includes(expectedResult)),
    noSyntheticInterAgentInline: beforeRefresh.syntheticInterAgentCount === 0 && afterRefresh.syntheticInterAgentCount === 0,
    noSerializedAddressLeak: allVisibleText.every((text) => !text.includes('{"rootTeamRunId"')),
    completionMarkerVisible: afterRefresh.body.includes(expectedComplete),
    refreshRetainedTaskCount: afterRefresh.taskEntries === 1,
    refreshRetainedTaskTeamSummary: afterRefresh.taskTeamEntries === 1,
    terminalTransientCleanup: afterRefresh.transientRows === 0,
    effectiveRuntimeMatches: effectiveLaunchForm.runtimeKind === runtime,
    effectiveCodexReasoningMatches: runtime !== 'codex_app_server' || effectiveLaunchForm.reasoningEffort === 'medium',
    noBrowserConsoleErrors: consoleEvents.filter((event) => event.type === 'error').length === 0,
  };
  const passed = Object.values(resultConditions).every(Boolean);
  rowResult = {
    schemaVersion: 2, slug, runtime, model, startedAt, completedAt: new Date().toISOString(), passed,
    resultConditions, effectiveLaunchForm, rootRun, resumeConfig, finalTaskRecords, finalCommunications,
    observedStatuses: [...observedStatuses], beforeRefresh, afterRefresh, samples,
    consoleEvents, graphqlResponseSummaries, referencePath,
  };
} catch (error) {
  fatalError = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  rowResult = {
    schemaVersion: 2, slug, runtime, model, startedAt, completedAt: new Date().toISOString(),
    passed: false, fatalError, rootRun, consoleEvents, graphqlResponseSummaries,
  };
  try { await page.screenshot({ path: `${outDir}/${slug}-failure.png`, fullPage: true }); } catch {}
} finally {
  if (rootTeamRunId) {
    try {
      termination = (await gql(
        `mutation TerminateLiveRow($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) { success message }
        }`, { teamRunId: rootTeamRunId },
      )).terminateAgentTeamRun;
    } catch (error) {
      termination = { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
  rowResult = { ...rowResult, termination };
  fs.writeFileSync(`${outDir}/${slug}-browser-row.json`, `${JSON.stringify(rowResult, null, 2)}\n`);
  console.log(JSON.stringify({
    slug, runtime, model, passed: rowResult.passed, rootTeamRunId,
    resultConditions: rowResult.resultConditions, observedStatuses: rowResult.observedStatuses,
    termination, fatalError,
  }, null, 2));
  await browser.close();
}

if (!rowResult.passed || !termination?.success) process.exitCode = 2;
