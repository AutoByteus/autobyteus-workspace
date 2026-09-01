#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require(path.resolve(process.cwd(), 'autobyteus-web/node_modules/playwright-core'));

const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:60638';
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:60637';
const setupPath = process.env.SETUP_PATH || path.join(__dirname, 'setup.json');
const setup = JSON.parse(fs.readFileSync(setupPath, 'utf8'));
const rootTeamRunId = setup.teamRunId;
const teamName = `AC017 Live Team ${setup.marker}`;
const outputDir = process.env.OUTPUT_DIR || __dirname;
const chrome = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const projectionQuery = `query GetTeamMemberRunProjection($teamRunId: String!, $agentRunId: String!) {
  getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) {
    agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents
  }
}`;
const checkpointQuery = `query GetTeamRunExecutionCheckpoint($teamRunId: String!) {
  getTeamRunExecutionCheckpoint(teamRunId: $teamRunId) { rootTeamRunId changeSequence hasOpenExecutionWork }
}`;

const postGraphql = async (query, variables) => {
  const response = await fetch(`${backendUrl}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body)}`);
  return body.data;
};
const compact = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const parseFrame = (payload) => {
  try { return JSON.parse(typeof payload === 'string' ? payload : Buffer.from(payload).toString('utf8')); }
  catch { return null; }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const run = async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const evidence = {
    evidenceId: 'API-E2E-AC017-001-002',
    startedAt: new Date().toISOString(), frontendUrl, backendUrl, rootTeamRunId, teamName,
    runtime: setup.runtime, model: setup.model,
    setup: {
      modelCatalogContainsExactModel: setup.modelCatalog.includes('gpt-5.6-luna'),
      resumeConfig: setup.resumeConfig,
    },
    navigationEvents: [], graphql: [], webSockets: [], steps: [], tasks: [], assertions: {},
    consoleMessages: [], pageErrors: [],
  };

  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ viewport: { width: 1800, height: 1100 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('console', (message) => evidence.consoleMessages.push({ at: new Date().toISOString(), type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => evidence.pageErrors.push({ at: new Date().toISOString(), error: String(error) }));
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) evidence.navigationEvents.push({ at: new Date().toISOString(), url: frame.url() }); });
  page.on('request', (request) => {
    if (!request.url().includes('/graphql')) return;
    let body = null; try { body = request.postDataJSON(); } catch {}
    evidence.graphql.push({ phase: 'request', at: new Date().toISOString(), operationName: body?.operationName || null, variables: body?.variables || null });
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/graphql')) return;
    let body = null; try { body = await response.json(); } catch {}
    evidence.graphql.push({ phase: 'response', at: new Date().toISOString(), status: response.status(), body });
  });
  page.on('websocket', (socket) => {
    const record = { url: socket.url(), openedAt: new Date().toISOString(), received: [], sent: [], errors: [], closedAt: null };
    evidence.webSockets.push(record);
    socket.on('framereceived', (frame) => record.received.push({ at: new Date().toISOString(), parsed: parseFrame(frame.payload) }));
    socket.on('framesent', (frame) => record.sent.push({ at: new Date().toISOString(), parsed: parseFrame(frame.payload) }));
    socket.on('socketerror', (error) => record.errors.push({ at: new Date().toISOString(), error: String(error) }));
    socket.on('close', () => { record.closedAt = new Date().toISOString(); });
  });

  const rootSocket = () => evidence.webSockets.find((socket) => socket.url.includes(`/ws/agent-team/${rootTeamRunId}`));
  const rootFrames = () => (rootSocket()?.received || []).map((frame) => frame.parsed).filter(Boolean);
  const activationForMarker = (marker) => rootFrames().find((frame) =>
    frame.type === 'TASK_DELEGATION_EVENT' &&
    frame.payload?.event_type === 'TASK_AGENT_ACTIVATED' &&
    String(frame.payload?.task?.description || '').includes(marker));

  const openFinalSnapshot = () => page.evaluate(({ wsUrl, rootTeamRunId }) => new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsUrl}/ws/agent-team/${rootTeamRunId}`);
    const timeout = setTimeout(() => { socket.close(); reject(new Error('snapshot timeout')); }, 15000);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT') {
          clearTimeout(timeout); socket.close(); resolve(parsed.payload);
        }
      } catch {}
    };
    socket.onerror = () => { clearTimeout(timeout); reject(new Error('snapshot websocket error')); };
  }), { wsUrl: backendUrl.replace(/^http/, 'ws'), rootTeamRunId });

  const capture = async (label, taskAgentRunId = null) => {
    const ui = await page.evaluate(({ label, rootTeamRunId }) => {
      const compactBrowser = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
      const rowData = (element) => {
        let component = element.__vueParentComponent;
        while (component) {
          if (component.props?.row?.agentRunId) return component.props.row;
          component = component.parent;
        }
        return null;
      };
      const rows = [...document.querySelectorAll('[role="treeitem"]')].map((element) => {
        const row = rowData(element);
        return {
          test: element.getAttribute('data-test'), nodeKind: element.getAttribute('data-node-kind'),
          transientKind: element.getAttribute('data-transient-kind'), memberAddress: element.getAttribute('data-member-address'),
          agentRunId: row?.agentRunId || null, currentStatus: row?.currentStatus || null,
          current: element.getAttribute('aria-current'), selected: element.getAttribute('aria-selected'),
          label: element.getAttribute('aria-label'), text: compactBrowser(element.innerText),
        };
      });
      const app = document.querySelector('#__nuxt')?.__vue_app__;
      const pinia = app?.config?.globalProperties?.$pinia;
      const runHistory = pinia?._s?.get('runHistory');
      const teamContexts = pinia?._s?.get('agentTeamContexts');
      const activityStore = pinia?._s?.get('agentActivity');
      const team = teamContexts?.getTeamContextById?.(rootTeamRunId) || null;
      const focusedAgentRunId = team?.view?.getFocusedAgentRunId?.() || null;
      const focused = focusedAgentRunId ? team?.view?.getAgentContext?.(focusedAgentRunId) || null : null;
      const messages = focused?.state?.conversation?.messages || [];
      const activities = focusedAgentRunId ? activityStore?.getActivities?.(focusedAgentRunId) || [] : [];
      return {
        label, at: new Date().toISOString(), url: location.href,
        navigationType: performance.getEntriesByType('navigation')[0]?.type || null,
        selectedTeamRunId: runHistory?.selectedTeamRunId || null,
        selectedTeamMemberAddress: runHistory?.selectedTeamMemberAddress || null,
        focusedAgentRunId,
        currentRows: rows.filter((row) => row.current === 'true'),
        taskRows: rows.filter((row) => row.transientKind === 'task' || String(row.label || '').includes('Task:')),
        configuredStudentTwoRows: rows.filter((row) => row.memberAddress === '/student_two' && !row.transientKind),
        focusedContext: focused ? {
          runId: focused.state?.runId || null,
          currentStatus: focused.state?.currentStatus || null,
          conversationMessageCount: messages.length,
          activityCount: activities.length,
          messages: messages.map((message) => ({ type: message.type || message.role || null, text: compactBrowser(message.text || message.content).slice(0, 2000) })),
          activities: activities.map((activity) => ({ type: activity.type || activity.kind || null, text: compactBrowser(activity.content || activity.message || JSON.stringify(activity)).slice(0, 1000) })),
        } : null,
        mainText: (document.querySelector('main')?.innerText || '').slice(0, 30000),
      };
    }, { label, rootTeamRunId });
    let projection = null;
    if (taskAgentRunId) projection = (await postGraphql(projectionQuery, { teamRunId: rootTeamRunId, agentRunId: taskAgentRunId })).getTeamMemberRunProjection;
    const checkpoint = (await postGraphql(checkpointQuery, { teamRunId: rootTeamRunId })).getTeamRunExecutionCheckpoint;
    const result = { ...ui, taskAgentRunId, projection, checkpoint };
    evidence.steps.push(result);
    return result;
  };

  const expandTeamRows = async () => {
    for (const disclosure of await page.locator(`[data-team-run-id="${rootTeamRunId}"][aria-expanded="false"]`).all()) {
      const test = await disclosure.getAttribute('data-test');
      if (test === 'workspace-team-member-disclosure' || test === 'workspace-team-transient-disclosure') {
        await disclosure.evaluate((element) => element.click());
      }
    }
  };

  const clickConfigured = async (address) => {
    await expandTeamRows();
    const locator = page.locator(`[data-test="workspace-team-member-${rootTeamRunId}-${address}"]`);
    await locator.waitFor({ state: 'visible', timeout: 30000 });
    await locator.evaluate((element) => element.click());
    await page.waitForTimeout(300);
  };

  const sendDelegation = async (marker) => {
    const description = `${marker}\nPerform this exact sequence in order:\n1. Immediately call send_message_to with recipient_address exactly /student_one and message exactly ${marker}_START.\n2. Call get_handoff_rules once.\n3. Call send_message_to again with recipient_address exactly /student_one and message exactly ${marker}_DONE.\n4. Reply with exactly ${marker}_COMPLETE and stop.\nDo not call submit_task_result. Do not delegate.`;
    const prompt = `Call delegate_task exactly once with recipient_address exactly /student_two and description exactly the following text. Do not do the work yourself and do not call another tool after delegate_task succeeds.\n\n${description}`;
    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill(prompt);
    await page.locator('button[title="Send message"]').click();
    return { description, prompt };
  };

  const waitForTaskRow = async (marker) => {
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      await expandTeamRows();
      const row = page.locator(`[data-test="workspace-team-transient-execution-row"][data-node-kind="agent"][aria-label*="${marker}"]`).first();
      if (await row.count()) return row;
      await page.waitForTimeout(50);
    }
    throw new Error(`Timed out waiting for marked task row ${marker}`);
  };

  const waitForTaskCompletionFrames = async (taskAgentRunId) => {
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      const frames = rootFrames().filter((frame) => frame.payload?.agent_run_id === taskAgentRunId);
      const types = new Set(frames.map((frame) => frame.type));
      const sendSucceeded = frames.filter((frame) => frame.type === 'TOOL_EXECUTION_SUCCEEDED' && frame.payload?.tool_name === 'send_message_to').length;
      const handoffSucceeded = frames.some((frame) => frame.type === 'TOOL_EXECUTION_SUCCEEDED' && frame.payload?.tool_name === 'get_handoff_rules');
      const idleAfterTurn = frames.some((frame) => frame.type === 'TURN_COMPLETED') && frames.some((frame) => frame.type === 'AGENT_STATUS' && frame.payload?.status === 'idle');
      if (types.has('SEGMENT_CONTENT') && sendSucceeded >= 2 && handoffSucceeded && idleAfterTurn) return;
      await page.waitForTimeout(250);
    }
    throw new Error(`Timed out waiting for exact task completion frames ${taskAgentRunId}`);
  };

  const assertSocketTask = (marker, taskAgentRunId) => {
    const frames = rootFrames();
    const activationIndex = frames.findIndex((frame) => frame.type === 'TASK_DELEGATION_EVENT' && frame.payload?.event_type === 'TASK_AGENT_ACTIVATED' && frame.payload?.execution?.agent_run_id === taskAgentRunId);
    const exact = frames.map((frame, index) => ({ frame, index })).filter(({ frame }) => frame.payload?.agent_run_id === taskAgentRunId);
    const types = [...new Set(exact.map(({ frame }) => frame.type))];
    const sequences = frames.map((frame) => frame.payload?.change_sequence).filter(Number.isFinite);
    const strictlyIncreasing = sequences.every((value, index) => index === 0 || value > sequences[index - 1]);
    const assertions = {
      marker, taskAgentRunId, activationIndex,
      exactFrameCount: exact.length, exactFrameTypes: types,
      activationPrecedesEveryExactAgentFrame: activationIndex >= 0 && exact.length > 0 && exact.every(({ index }) => index > activationIndex),
      representativeStatus: types.includes('AGENT_STATUS'),
      representativeTurn: types.includes('TURN_STARTED') && types.includes('TURN_COMPLETED'),
      representativeContent: types.includes('SEGMENT_CONTENT'),
      representativeTool: types.includes('TOOL_EXECUTION_STARTED') && types.includes('TOOL_EXECUTION_SUCCEEDED'),
      rootChangeSequenceCount: sequences.length,
      rootChangeSequencesStrictlyIncreasing: strictlyIncreasing,
      rootChangeSequencesUnique: new Set(sequences).size === sequences.length,
    };
    Object.entries(assertions).forEach(([key, value]) => {
      if (typeof value === 'boolean') assert(value, `${marker} socket assertion failed: ${key}`);
    });
    return assertions;
  };

  const runTask = async (marker, ordinal) => {
    await clickConfigured('/student_one');
    await capture(`${marker}-student-one-before-request`);
    const request = await sendDelegation(marker);
    await capture(`${marker}-request-sent`);
    const row = await waitForTaskRow(marker);
    const activation = activationForMarker(marker);
    assert(activation, `${marker} activation not captured on actual root socket`);
    const taskAgentRunId = activation.payload.execution.agent_run_id;
    const taskId = activation.payload.task.task_id;
    const beforeSelectionNavigationCount = evidence.navigationEvents.length;
    const before = await capture(`${marker}-row-visible-before-selection`, taskAgentRunId);
    await page.screenshot({ path: path.join(outputDir, `${marker}-before-selection.png`), fullPage: true });
    await row.click({ force: true });
    await page.waitForFunction(({ rootTeamRunId, taskAgentRunId }) => {
      const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$pinia;
      const teamStore = pinia?._s?.get('agentTeamContexts');
      const team = teamStore?.getTeamContextById?.(rootTeamRunId);
      return team?.view?.getFocusedAgentRunId?.() === taskAgentRunId;
    }, { rootTeamRunId, taskAgentRunId }, { timeout: 30000 });
    const selected = await capture(`${marker}-selected-early`, taskAgentRunId);
    await page.screenshot({ path: path.join(outputDir, `${marker}-selected-early.png`), fullPage: true });
    const selectedNavigationCount = evidence.navigationEvents.length;
    assert(selected.focusedAgentRunId === taskAgentRunId, `${marker} did not focus exact task`);
    assert(selected.currentRows.length === 1 && selected.currentRows[0].agentRunId === taskAgentRunId, `${marker} current row mismatch`);
    await waitForTaskCompletionFrames(taskAgentRunId);
    await page.waitForTimeout(1500);
    let final = await capture(`${marker}-final`, taskAgentRunId);
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && (
      !final.projection ||
      final.focusedContext?.activityCount !== final.projection.activities.length ||
      !final.mainText.includes(`${marker}_COMPLETE`)
    )) {
      await page.waitForTimeout(500);
      final = await capture(`${marker}-final-reconcile-poll`, taskAgentRunId);
    }
    const snapshot = await openFinalSnapshot();
    const snapshotStatus = snapshot.agent_statuses?.find((status) => status.agent_run_id === taskAgentRunId)?.status || null;
    await page.screenshot({ path: path.join(outputDir, `${marker}-final.png`), fullPage: true });
    const socketAssertions = assertSocketTask(marker, taskAgentRunId);
    const projectionText = JSON.stringify(final.projection);
    const taskResult = {
      ordinal, marker, taskId, taskAgentRunId, request,
      assignmentSnapshot: {
        conversationCount: selected.focusedContext?.conversationMessageCount,
        activityCount: selected.focusedContext?.activityCount,
        status: selected.focusedContext?.currentStatus,
        projectionConversationCount: selected.projection?.conversation?.length,
        projectionActivityCount: selected.projection?.activities?.length,
      },
      final: {
        conversationCount: final.focusedContext?.conversationMessageCount,
        activityCount: final.focusedContext?.activityCount,
        status: final.focusedContext?.currentStatus,
        projectionConversationCount: final.projection?.conversation?.length,
        projectionActivityCount: final.projection?.activities?.length,
        snapshotStatus,
      },
      noReloadOrRefocus: {
        selectedUrl: selected.url, finalUrl: final.url,
        navigationType: final.navigationType,
        navigationCountAtSelection: selectedNavigationCount,
        navigationCountAtFinal: evidence.navigationEvents.length,
        focusedExactAtEveryPostSelectionCapture: evidence.steps.filter((step) => step.label.startsWith(`${marker}-`) && ['selected-early','final','final-reconcile-poll'].some((suffix) => step.label.endsWith(suffix))).every((step) => step.focusedAgentRunId === taskAgentRunId),
      },
      socketAssertions,
      assertions: {
        advancedConversation: final.focusedContext.conversationMessageCount > selected.focusedContext.conversationMessageCount,
        advancedActivity: final.focusedContext.activityCount > selected.focusedContext.activityCount,
        finalConversationSemanticallyEqualsProjection:
          final.mainText.includes(marker) &&
          final.mainText.includes(`${marker}_COMPLETE`) &&
          projectionText.includes(marker) &&
          projectionText.includes(`${marker}_COMPLETE`) &&
          final.mainText.includes('send_message_to') &&
          final.mainText.includes('get_handoff_rules'),
        finalActivityEqualsProjection: final.focusedContext.activityCount === final.projection.activities.length,
        finalStatusEqualsSnapshot: final.focusedContext.currentStatus === snapshotStatus,
        exactProjectionIdentity: final.projection.agentRunId === taskAgentRunId,
        retainedStartMarker: projectionText.includes(`${marker}_START`),
        retainedDoneMarker: projectionText.includes(`${marker}_DONE`),
        retainedCompleteMarker: projectionText.includes(`${marker}_COMPLETE`),
        retainedToolCalls: projectionText.includes('send_message_to') && projectionText.includes('get_handoff_rules'),
        noReloadOrNavigationAfterSelection: evidence.navigationEvents.length === selectedNavigationCount && final.url === selected.url && final.navigationType === 'navigate',
        exactFocusHeld: final.focusedAgentRunId === taskAgentRunId,
        currentRowHeld: final.currentRows.length === 1 && final.currentRows[0].agentRunId === taskAgentRunId,
      },
      beforeSelectionNavigationCount,
    };
    Object.entries(taskResult.assertions).forEach(([key, value]) => assert(value, `${marker} assertion failed: ${key}`));
    evidence.tasks.push(taskResult);
    return taskResult;
  };

  try {
    await page.goto(`${frontendUrl}/agents`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-test="workspace-row"]', { timeout: 60000 });
    const workspaceRows = await page.locator('[data-test="workspace-row"]').all();
    for (const workspaceRow of workspaceRows) {
      if (await workspaceRow.getAttribute('aria-expanded') !== 'true') {
        await workspaceRow.locator('button').first().evaluate((element) => element.click());
      }
    }
    await page.waitForTimeout(500);
    const definitionFound = await page.evaluate((teamName) => {
      const button = [...document.querySelectorAll('aside button')].find((element) => element.hasAttribute('aria-expanded') && String(element.innerText || '').includes(teamName));
      if (!button) return false;
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      return true;
    }, teamName);
    assert(definitionFound, `Team definition '${teamName}' not found`);
    const runButton = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
    await runButton.waitFor({ state: 'visible', timeout: 30000 });
    await runButton.evaluate((element) => element.click());
    await page.waitForURL('**/workspace', { timeout: 30000 });
    await page.waitForSelector('textarea[placeholder="Type a message..."]', { timeout: 30000 });
    await page.waitForTimeout(1000);
    await expandTeamRows();
    evidence.steps.push(await capture('team-already-open-before-work'));

    const taskOne = await runTask('AC017_CURRENT_SOURCE_FINAL_TASK_ONE', 1);
    const taskTwo = await runTask('AC017_CURRENT_SOURCE_FINAL_TASK_TWO', 2);
    assert(taskOne.taskAgentRunId !== taskTwo.taskAgentRunId, 'Repeated tasks reused one AgentRun ID');

    const taskOneRow = page.locator(`[data-test="workspace-team-transient-execution-row"][aria-label*="AC017_CURRENT_SOURCE_FINAL_TASK_ONE"]`).first();
    await taskOneRow.evaluate((element) => element.click());
    const taskOneReselected = await capture('isolation-task-one-reselected', taskOne.taskAgentRunId);
    await clickConfigured('/student_two');
    const configuredStudentTwo = await capture('isolation-configured-student-two');
    const configuredStudentTwoRunId = setup.resumeConfig.executionTree.root_team.members.find((member) => member.address === '/student_two').agent_run_id;
    await expandTeamRows();
    const taskTwoRow = page.locator(`[data-test="workspace-team-transient-execution-row"][aria-label*="AC017_CURRENT_SOURCE_FINAL_TASK_TWO"]`).first();
    await taskTwoRow.waitFor({ state: 'visible', timeout: 30000 });
    await taskTwoRow.click({ force: true });
    await page.waitForFunction(({ rootTeamRunId, taskAgentRunId }) => {
      const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$pinia;
      const teamStore = pinia?._s?.get('agentTeamContexts');
      return teamStore?.getTeamContextById?.(rootTeamRunId)?.view?.getFocusedAgentRunId?.() === taskAgentRunId;
    }, { rootTeamRunId, taskAgentRunId: taskTwo.taskAgentRunId }, { timeout: 30000 });
    const taskTwoReselected = await capture('isolation-task-two-reselected', taskTwo.taskAgentRunId);

    evidence.assertions = {
      exactRuntimeModel: setup.runtime === 'codex_app_server' && setup.model === 'gpt-5.6-luna' && setup.modelCatalog.includes('gpt-5.6-luna'),
      configuredMembersExactRuntimeModel: setup.resumeConfig.executionTree.root_team.members.every((member) => member.launch_configuration.runtime_kind === 'codex_app_server' && member.launch_configuration.llm_model_identifier === 'gpt-5.6-luna'),
      repeatedTaskIdsDistinct: taskOne.taskId !== taskTwo.taskId,
      repeatedTaskRunIdsDistinct: taskOne.taskAgentRunId !== taskTwo.taskAgentRunId,
      sameAddress: taskOneReselected.taskRows.find((row) => row.agentRunId === taskOne.taskAgentRunId)?.memberAddress === '/student_two' && taskTwoReselected.taskRows.find((row) => row.agentRunId === taskTwo.taskAgentRunId)?.memberAddress === '/student_two',
      taskOneIdentityRestored: taskOneReselected.focusedAgentRunId === taskOne.taskAgentRunId && JSON.stringify(taskOneReselected.projection).includes('AC017_CURRENT_SOURCE_FINAL_TASK_ONE') && !JSON.stringify(taskOneReselected.projection).includes('AC017_CURRENT_SOURCE_FINAL_TASK_TWO'),
      configuredIdentitySeparate: configuredStudentTwo.focusedAgentRunId === configuredStudentTwoRunId && configuredStudentTwoRunId !== taskOne.taskAgentRunId && configuredStudentTwoRunId !== taskTwo.taskAgentRunId,
      taskTwoIdentityRestored: taskTwoReselected.focusedAgentRunId === taskTwo.taskAgentRunId && JSON.stringify(taskTwoReselected.projection).includes('AC017_CURRENT_SOURCE_FINAL_TASK_TWO') && !JSON.stringify(taskTwoReselected.projection).includes('AC017_CURRENT_SOURCE_FINAL_TASK_ONE'),
      noPageErrors: evidence.pageErrors.length === 0,
    };
    Object.entries(evidence.assertions).forEach(([key, value]) => assert(value, `overall assertion failed: ${key}`));
    evidence.result = 'Pass';
  } catch (error) {
    evidence.result = 'Fail'; evidence.error = String(error?.stack || error);
    try { await page.screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true }); } catch {}
  } finally {
    evidence.finishedAt = new Date().toISOString();
    evidence.cleanup = { browserClosed: true, backendAndNuxtOwnedByParent: true };
    fs.writeFileSync(path.join(outputDir, 'evidence.raw.json.gz'), zlib.gzipSync(`${JSON.stringify(evidence)}\n`));
    const summary = {
      evidenceId: evidence.evidenceId, startedAt: evidence.startedAt, finishedAt: evidence.finishedAt,
      result: evidence.result, error: evidence.error || null, frontendUrl, backendUrl, rootTeamRunId,
      runtime: evidence.runtime, model: evidence.model, setup: evidence.setup,
      tasks: evidence.tasks, assertions: evidence.assertions,
      navigationEvents: evidence.navigationEvents, pageErrors: evidence.pageErrors,
      consoleErrors: evidence.consoleMessages.filter((message) => message.type === 'error'),
      rootSocket: rootSocket() ? { url: rootSocket().url, receivedFrameCount: rootSocket().received.length, errors: rootSocket().errors } : null,
      evidenceFiles: ['evidence.raw.json.gz', 'AC017_CURRENT_SOURCE_TASK_ONE-*.png', 'AC017_CURRENT_SOURCE_TASK_TWO-*.png'],
    };
    fs.writeFileSync(path.join(outputDir, 'evidence.json'), `${JSON.stringify(summary, null, 2)}\n`);
    await browser.close();
  }
  if (evidence.result !== 'Pass') { console.error(evidence.error); process.exitCode = 1; }
  else console.log(JSON.stringify({ result: evidence.result, rootTeamRunId, tasks: evidence.tasks.map((task) => ({ marker: task.marker, taskId: task.taskId, taskAgentRunId: task.taskAgentRunId, final: task.final })) }, null, 2));
};
run();
