import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const [runtime = 'autobyteus', model = 'gpt-5.6-luna', slug = 'autobyteus'] = process.argv.slice(2);
const base = 'http://127.0.0.1:31122';
const gqlEndpoint = 'http://127.0.0.1:60122/graphql';
const outDir = new URL('./browser/', import.meta.url).pathname;
const upper = slug.toUpperCase();
const expectedReply = `CLASSROOM_REPLY_${upper}`;
const expectedPeer = `TASK_PEER_${upper}`;
const expectedResult = `NESTED_CLASSROOM_OK_${upper}`;
const expectedComplete = `LIVE_ROW_COMPLETE_${upper}`;
fs.mkdirSync(outDir, { recursive: true });

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
      taskRun {
        startedAt
        address { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
      }
      updates {
        kind submissionId reviewId reviewedSubmissionId decision content createdAt
        senderAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
        receiverAddress { rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId }
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
    method: 'POST',
    headers: { 'content-type': 'application/json' },
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
        at: new Date().toISOString(),
        status: response.status(),
        containsTaskDelegation: /TaskDelegation|task_\d+/i.test(text),
        containsTeamCommunication: /TeamCommunication|messageId/i.test(text),
        containsError: /"errors"\s*:/.test(text),
      });
    }
  } catch {
    // Response bodies can already be consumed during navigation; the direct queries below are authoritative.
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
  await page.getByText(model, { exact: true }).last().click();
  if (runtime === 'codex_app_server') {
    await page.locator('#team-run-reasoning_effort').selectOption('medium');
  }
  const effectiveLaunchForm = {
    runtimeKind: await page.locator('#team-run-runtime-kind').inputValue(),
    model,
    reasoningEffort: await page.locator('#team-run-reasoning_effort').count()
      ? await page.locator('#team-run-reasoning_effort').inputValue()
      : null,
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
    `Then use send_message_to to send an ordinary message to ./StudentStudyGroup asking its coordinator to reply to /Teacher with exactly ${expectedReply}. Wait for that reply.`,
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
  let activeScreenshot = false;
  let awaitingScreenshot = false;
  let acceptedScreenshot = false;
  let finalTaskRecords = [];
  let finalCommunications = [];

  for (let iteration = 0; iteration < 750; iteration += 1) {
    await page.waitForTimeout(400);
    for (const label of ['Approve', 'Allow', 'Accept']) {
      const buttons = page.getByRole('button', { name: label, exact: true });
      for (let index = 0; index < await buttons.count(); index += 1) {
        try {
          if (await buttons.nth(index).isVisible()) await buttons.nth(index).click();
        } catch {
          // The stream may replace an approval button between discovery and click.
        }
      }
    }

    const body = await page.locator('body').innerText();
    const taskHeader = await page.locator('[data-test="team-delegated-tasks-header"]').allInnerTexts();
    const taskSummaryRows = page.locator('[data-test="team-delegated-task-summary-row"]');
    const taskEntries = await taskSummaryRows.count();
    const taskTeamEntries = await page.locator('[data-test="team-delegated-task-team-entry"]').count();
    const transientRows = page.locator('[data-test="workspace-team-transient-execution-row"]');
    const transientCount = await transientRows.count();
    const interAgent = await page.locator('[data-testid="inter-agent-inline"]').allInnerTexts();
    const taskDetails = await page.locator('[data-test="delegated-task-task-body"]').allInnerTexts();

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

    observedTaskSummary ||= taskEntries > 0;
    observedTaskTeamSummary ||= taskTeamEntries > 0;
    observedTransientTaskExecution ||= transientCount > 0;
    observedActiveTaskUi ||= isActive && taskEntries > 0 && (taskTeamEntries > 0 || transientCount > 0);
    observedAwaitingReviewUi ||= isAwaitingReview && taskEntries > 0 && (taskTeamEntries > 0 || transientCount > 0);
    observedAcceptedTaskUi ||= isAccepted && taskEntries > 0;

    if (taskEntries > 0 && !observedSelectedDetail) {
      const taskBody = page.locator('[data-test="team-delegated-tasks-body"]');
      const header = page.locator('[data-test="team-delegated-tasks-header"]');
      if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
      await taskSummaryRows.first().click();
      observedSelectedDetail = await page.locator('[data-test="delegated-task-task-body"]').count() > 0;
    }

    if (isActive && taskEntries > 0 && !activeScreenshot) {
      await page.screenshot({ path: `${outDir}/${slug}-task-active.png`, fullPage: true });
      activeScreenshot = true;
    }
    if (isAwaitingReview && taskEntries > 0 && !awaitingScreenshot) {
      await page.screenshot({ path: `${outDir}/${slug}-task-awaiting-review.png`, fullPage: true });
      awaitingScreenshot = true;
    }
    if (isAccepted && taskEntries > 0 && !acceptedScreenshot) {
      await page.screenshot({ path: `${outDir}/${slug}-task-accepted.png`, fullPage: true });
      acceptedScreenshot = true;
    }

    if (iteration % 5 === 0) {
      samples.push({
        elapsedMs: (iteration + 1) * 400,
        taskHeader,
        taskEntries,
        taskTeamEntries,
        transientCount,
        transientTexts: (await transientRows.allInnerTexts()).slice(0, 10),
        taskDetails: taskDetails.slice(0, 3),
        interAgent: interAgent.slice(-5),
        taskStatus: status,
        hasSubmission,
        hasAcceptedReview,
        hasReply: body.includes(expectedReply),
        hasPeer: body.includes(expectedPeer),
        hasResult: body.includes(expectedResult),
        hasComplete: body.includes(expectedComplete),
      });
    }

    if (iteration % 5 === 0 || isAccepted) {
      finalCommunications = (await gql(communicationQuery, { teamRunId: rootTeamRunId })).getTeamCommunicationMessages;
    }

    const persistentReply = finalCommunications.some((message) =>
      message.content.includes(expectedReply) &&
      message.senderAddress.memberAddress === '/StudentStudyGroup/student_one' &&
      message.senderAddress.taskTeamRunIds.length === 0 &&
      message.receiverAddress.memberAddress === '/Teacher' &&
      message.receiverAddress.taskTeamRunIds.length === 0
    );
    const taskPeer = finalCommunications.some((message) =>
      message.content.includes(expectedPeer) &&
      message.senderAddress.memberAddress === '/StudentStudyGroup/student_one' &&
      message.receiverAddress.memberAddress === '/StudentStudyGroup/student_two' &&
      message.senderAddress.taskTeamRunIds.length > 0 &&
      JSON.stringify(message.senderAddress.taskTeamRunIds) === JSON.stringify(message.receiverAddress.taskTeamRunIds)
    );
    const taskPeerReply = finalCommunications.some((message) =>
      message.senderAddress.memberAddress === '/StudentStudyGroup/student_two' &&
      message.receiverAddress.memberAddress === '/StudentStudyGroup/student_one' &&
      message.senderAddress.taskTeamRunIds.length > 0 &&
      JSON.stringify(message.senderAddress.taskTeamRunIds) === JSON.stringify(message.receiverAddress.taskTeamRunIds)
    );
    const submissionExact = record?.updates?.some(
      (update) => update.kind === 'submission' && update.content.trim() === expectedResult,
    ) === true;

    if (
      isAccepted && submissionExact && persistentReply && taskPeer && taskPeerReply &&
      body.includes(expectedComplete) &&
      observedTaskSummary && observedTaskTeamSummary && observedTransientTaskExecution &&
      observedActiveTaskUi && observedAwaitingReviewUi && observedAcceptedTaskUi && observedSelectedDetail
    ) {
      await page.waitForTimeout(1800);
      break;
    }
  }

  finalTaskRecords = (await gql(taskQuery, { teamRunId: rootTeamRunId })).getTaskDelegationRecords;
  finalCommunications = (await gql(communicationQuery, { teamRunId: rootTeamRunId })).getTeamCommunicationMessages;
  const resumeConfig = (await gql(resumeQuery, { teamRunId: rootTeamRunId })).getTeamRunResumeConfig;
  const beforeRefresh = {
    taskHeader: await page.locator('[data-test="team-delegated-tasks-header"]').allInnerTexts(),
    taskEntries: await page.locator('[data-test="team-delegated-task-summary-row"]').count(),
    taskTeamEntries: await page.locator('[data-test="team-delegated-task-team-entry"]').count(),
    transientRows: await page.locator('[data-test="workspace-team-transient-execution-row"]').count(),
    taskDetails: await page.locator('[data-test="delegated-task-task-body"]').allInnerTexts(),
    interAgent: await page.locator('[data-testid="inter-agent-inline"]').allInnerTexts(),
  };

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1200);
  const workspaceRow = page.locator('[data-test="workspace-row"]').first();
  await workspaceRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await workspaceRow.getAttribute('aria-expanded')) !== 'true') {
    await workspaceRow.locator('button').first().click();
  }
  const teamDefinitionRow = page
    .locator('[data-test^="workspace-team-definition-row-"]')
    .filter({ hasText: 'Nested Classroom Test Team' })
    .first();
  await teamDefinitionRow.waitFor({ state: 'visible', timeout: 120000 });
  if ((await teamDefinitionRow.getAttribute('aria-expanded')) !== 'true') {
    await teamDefinitionRow.click();
  }
  const restoredTeamRow = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await restoredTeamRow.waitFor({ state: 'visible', timeout: 120000 });
  await restoredTeamRow.click();
  await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForTimeout(2500);
  const afterRefresh = {
    taskHeader: await page.locator('[data-test="team-delegated-tasks-header"]').allInnerTexts(),
    taskEntries: await page.locator('[data-test="team-delegated-task-summary-row"]').count(),
    taskTeamEntries: await page.locator('[data-test="team-delegated-task-team-entry"]').count(),
    transientRows: await page.locator('[data-test="workspace-team-transient-execution-row"]').count(),
    taskDetails: await page.locator('[data-test="delegated-task-task-body"]').allInnerTexts(),
    interAgent: await page.locator('[data-testid="inter-agent-inline"]').allInnerTexts(),
  };
  await page.screenshot({ path: `${outDir}/${slug}-post-refresh.png`, fullPage: true });

  const record = finalTaskRecords[0] ?? null;
  const persistentReply = finalCommunications.filter((message) =>
    message.content.includes(expectedReply) &&
    message.senderAddress.memberAddress === '/StudentStudyGroup/student_one' &&
    message.senderAddress.taskTeamRunIds.length === 0 &&
    message.receiverAddress.memberAddress === '/Teacher' &&
    message.receiverAddress.taskTeamRunIds.length === 0
  );
  const taskPeer = finalCommunications.filter((message) =>
    message.content.includes(expectedPeer) &&
    message.senderAddress.memberAddress === '/StudentStudyGroup/student_one' &&
    message.receiverAddress.memberAddress === '/StudentStudyGroup/student_two' &&
    message.senderAddress.taskTeamRunIds.length > 0 &&
    JSON.stringify(message.senderAddress.taskTeamRunIds) === JSON.stringify(message.receiverAddress.taskTeamRunIds)
  );
  const taskPeerReply = finalCommunications.filter((message) =>
    message.senderAddress.memberAddress === '/StudentStudyGroup/student_two' &&
    message.receiverAddress.memberAddress === '/StudentStudyGroup/student_one' &&
    message.senderAddress.taskTeamRunIds.length > 0 &&
    JSON.stringify(message.senderAddress.taskTeamRunIds) === JSON.stringify(message.receiverAddress.taskTeamRunIds)
  );
  const exactSubmission = record?.updates?.filter(
    (update) => update.kind === 'submission' && update.content.trim() === expectedResult,
  ) ?? [];
  const acceptedReviews = record?.updates?.filter(
    (update) => update.kind === 'review' && String(update.decision).toLowerCase() === 'accept',
  ) ?? [];
  const humanSenderVisible = [...beforeRefresh.interAgent, ...afterRefresh.interAgent]
    .some((text) => /From\s+(?:Student One|student_one):/i.test(text));
  const noSerializedAddressLeak = [...beforeRefresh.interAgent, ...afterRefresh.interAgent]
    .every((text) => !text.includes('{"rootTeamRunId"'));
  const rootedMembers = new Set(rootRun.members.map((member) => member.memberAddress));
  const rootedTopology = [
    '/Teacher',
    '/StudentStudyGroup/student_one',
    '/StudentStudyGroup/student_two',
  ].every((address) => rootedMembers.has(address));
  const taskAddress = record?.taskRun?.address ?? null;
  const exactTaskAddress = Boolean(
    taskAddress &&
    taskAddress.rootTeamRunId === rootTeamRunId &&
    taskAddress.memberAddress === '/StudentStudyGroup' &&
    taskAddress.taskTeamRunIds.length === 1 &&
    taskAddress.taskAgentRunId === null
  );
  const taskDetailVisible = [...beforeRefresh.taskDetails, ...afterRefresh.taskDetails]
    .some((detail) => detail.includes(expectedPeer) && detail.includes(expectedResult));
  const resultConditions = {
    freshRootTeamRun: !beforeIds.has(rootTeamRunId),
    rootedTopology,
    exactTaskAddress,
    exactOneDelegatedTask: finalTaskRecords.length === 1,
    acceptedStatus: record?.status === 'accepted',
    exactOneSubmission: exactSubmission.length === 1,
    acceptedReview: acceptedReviews.length === 1,
    exactOnePersistentReply: persistentReply.length === 1,
    taskPeerDelivered: taskPeer.length === 1,
    taskPeerReplyDelivered: taskPeerReply.length >= 1,
    observedTaskSummary,
    observedTaskTeamSummary,
    observedTransientTaskExecution,
    observedActiveTaskUi,
    observedAwaitingReviewUi,
    observedAcceptedTaskUi,
    observedSelectedDetail,
    taskDetailVisible,
    humanSenderVisible,
    noSerializedAddressLeak,
    completionMarkerVisible: (await page.locator('body').innerText()).includes(expectedComplete),
    refreshRetainedTaskCount: afterRefresh.taskEntries === 1,
    refreshRetainedTaskTeamSummary: afterRefresh.taskTeamEntries === 1,
    terminalTransientCleanup: afterRefresh.transientRows === 0,
    effectiveRuntimeMatches: effectiveLaunchForm.runtimeKind === runtime,
    effectiveCodexReasoningMatches: runtime !== 'codex_app_server' || effectiveLaunchForm.reasoningEffort === 'medium',
  };
  const passed = Object.values(resultConditions).every(Boolean);
  rowResult = {
    schemaVersion: 1,
    slug,
    runtime,
    model,
    startedAt,
    completedAt: new Date().toISOString(),
    passed,
    resultConditions,
    effectiveLaunchForm,
    rootRun,
    resumeConfig,
    finalTaskRecords,
    finalCommunications,
    observedStatuses: [...observedStatuses],
    beforeRefresh,
    afterRefresh,
    samples,
    consoleEvents,
    graphqlResponseSummaries,
  };
} catch (error) {
  fatalError = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  rowResult = {
    schemaVersion: 1,
    slug,
    runtime,
    model,
    startedAt,
    completedAt: new Date().toISOString(),
    passed: false,
    fatalError,
    rootRun,
    consoleEvents,
    graphqlResponseSummaries,
  };
  try {
    await page.screenshot({ path: `${outDir}/${slug}-failure.png`, fullPage: true });
  } catch {
    // Preserve the original failure when the browser is already closed.
  }
} finally {
  if (rootTeamRunId) {
    try {
      termination = (await gql(
        `mutation TerminateLiveRow($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) { success message }
        }`,
        { teamRunId: rootTeamRunId },
      )).terminateAgentTeamRun;
    } catch (error) {
      termination = { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }
  rowResult = { ...rowResult, termination };
  fs.writeFileSync(`${outDir}/${slug}-browser-row.json`, `${JSON.stringify(rowResult, null, 2)}\n`);
  console.log(JSON.stringify({
    slug,
    runtime,
    model,
    passed: rowResult.passed,
    rootTeamRunId,
    resultConditions: rowResult.resultConditions,
    observedStatuses: rowResult.observedStatuses,
    termination,
    fatalError,
  }, null, 2));
  await browser.close();
}

if (!rowResult.passed || !termination?.success) process.exitCode = 2;
