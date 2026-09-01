#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require(process.env.PLAYWRIGHT_CORE_MODULE);

const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:33372';
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:29695';
const rootTeamRunId = process.env.ROOT_TEAM_RUN_ID
  || 'nested_classroom_test_team_50a66215ad3648688d73998834c9ceb4';
const marker = process.env.MARKER || `LIVE_EARLY_SELECT_${Date.now()}`;
const outputDir = process.env.OUTPUT_DIR || __dirname;
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

const taskPrompt = `Use delegate_task exactly once to delegate a new task to /StudentStudyGroup/student_two.
The task description MUST begin with ${marker} and instruct student_two to perform this exact sequence:
1. Immediately use send_message_to to send /StudentStudyGroup/student_one the exact token ${marker}_START.
2. Call get_handoff_rules once.
3. Use send_message_to again to send /StudentStudyGroup/student_one the exact token ${marker}_DONE.
4. Then stop. Do not call submit_task_result.
Do not perform student_two's task yourself and do not delegate to any other recipient. After delegate_task succeeds, wait.`;

const projectionQuery = `query GetTeamMemberRunProjection($teamRunId: String!, $agentRunId: String!) {
  getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) {
    agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents
  }
}`;

const checkpointQuery = `query GetTeamRunExecutionCheckpoint($teamRunId: String!) {
  getTeamRunExecutionCheckpoint(teamRunId: $teamRunId) {
    rootTeamRunId changeSequence hasOpenExecutionWork
  }
}`;

const postGraphql = async (query, variables) => {
  const response = await fetch(`${backendUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  return { status: response.status, body };
};

const safeJson = (value) => {
  try { return JSON.parse(value); } catch { return null; }
};

const summarizeWsFrame = (frame) => {
  const payload = typeof frame.payload === 'string'
    ? frame.payload
    : Buffer.from(frame.payload).toString('utf8');
  const parsed = safeJson(payload);
  const message = parsed?.payload && typeof parsed.payload === 'object' && parsed.type === 'next'
    ? parsed.payload?.data || parsed.payload
    : parsed;
  return {
    at: new Date().toISOString(),
    payload,
    parsed,
    topType: parsed?.type || null,
    projectedType: parsed?.payload?.type || parsed?.type || null,
    agentRunId:
      parsed?.payload?.payload?.agent_run_id
      || parsed?.payload?.agent_run_id
      || parsed?.agent_run_id
      || message?.agent_run_id
      || null,
  };
};

const run = async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1800, height: 1100 } });
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const graphql = [];
  const webSockets = [];

  page.on('console', (message) => consoleMessages.push({ at: new Date().toISOString(), type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => pageErrors.push({ at: new Date().toISOString(), error: String(error) }));
  page.on('request', (request) => {
    if (!request.url().includes('/graphql')) return;
    let postData = null;
    try { postData = request.postDataJSON(); } catch {}
    graphql.push({
      phase: 'request',
      at: new Date().toISOString(),
      url: request.url(),
      operationName: postData?.operationName || null,
      variables: postData?.variables || null,
    });
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/graphql')) return;
    let body = null;
    try { body = await response.json(); } catch {}
    graphql.push({
      phase: 'response',
      at: new Date().toISOString(),
      url: response.url(),
      status: response.status(),
      body,
    });
  });
  page.on('websocket', (socket) => {
    const record = { url: socket.url(), openedAt: new Date().toISOString(), sent: [], received: [], closedAt: null, errors: [] };
    webSockets.push(record);
    socket.on('framesent', (frame) => record.sent.push(summarizeWsFrame(frame)));
    socket.on('framereceived', (frame) => record.received.push(summarizeWsFrame(frame)));
    socket.on('socketerror', (error) => record.errors.push({ at: new Date().toISOString(), error: String(error) }));
    socket.on('close', () => { record.closedAt = new Date().toISOString(); });
  });

  let taskAgentRunId = null;

  const capture = async (label) => {
    const ui = await page.evaluate(({ label, marker, rootTeamRunId }) => {
      const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');
      const componentRow = (element) => {
        let component = element.__vueParentComponent;
        while (component) {
          if (component.props?.row?.agentRunId) return component.props.row;
          component = component.parent;
        }
        return null;
      };
      const rows = [...document.querySelectorAll('[role="treeitem"]')].map((element) => {
        const row = componentRow(element);
        return {
          test: element.getAttribute('data-test'),
          nodeKind: element.getAttribute('data-node-kind'),
          transientKind: element.getAttribute('data-transient-kind'),
          memberAddress: element.getAttribute('data-member-address'),
          agentRunId: row?.agentRunId || null,
          rowCurrentStatus: row?.currentStatus || null,
          current: element.getAttribute('aria-current'),
          selected: element.getAttribute('aria-selected'),
          expanded: element.getAttribute('aria-expanded'),
          label: element.getAttribute('aria-label'),
          text: compact(element.innerText),
        };
      });
      const app = document.querySelector('#__nuxt')?.__vue_app__;
      const pinia = app?.config?.globalProperties?.$pinia;
      const runHistory = pinia?._s?.get('runHistory');
      const teamContexts = pinia?._s?.get('agentTeamContexts');
      const activityStore = pinia?._s?.get('agentActivity');
      const team = teamContexts?.getTeamContextById?.(rootTeamRunId) || null;
      const focusedAgentRunId = team?.view?.getFocusedAgentRunId?.() || null;
      const focusedContext = focusedAgentRunId ? team?.view?.getAgentContext?.(focusedAgentRunId) || null : null;
      const stateMessages = focusedContext?.state?.conversation?.messages || [];
      return {
        label,
        marker,
        capturedAt: new Date().toISOString(),
        url: location.href,
        markerRows: rows.filter((row) => String(row.label || '').includes(marker)),
        currentRows: rows.filter((row) => row.current === 'true'),
        selectedTeamRunId: runHistory?.selectedTeamRunId || null,
        selectedTeamMemberAddress: runHistory?.selectedTeamMemberAddress || null,
        focusedAgentRunId,
        focusedContext: focusedContext ? {
          runId: focusedContext.state?.runId || null,
          currentStatus: focusedContext.state?.currentStatus || null,
          conversationMessageCount: stateMessages.length,
          activityCount: activityStore?.getActivities?.(focusedAgentRunId)?.length || 0,
          messages: stateMessages.map((message) => ({
            type: message.type || message.role || null,
            text: compact(message.text || message.content).slice(0, 1200),
          })),
        } : null,
        mainText: (document.querySelector('main')?.innerText || '').slice(0, 16000),
      };
    }, { label, marker, rootTeamRunId });

    if (!taskAgentRunId) {
      taskAgentRunId = ui.markerRows.find((row) => row.agentRunId)?.agentRunId || null;
    }
    const [projection, checkpoint] = await Promise.all([
      taskAgentRunId ? postGraphql(projectionQuery, { teamRunId: rootTeamRunId, agentRunId: taskAgentRunId }) : Promise.resolve(null),
      postGraphql(checkpointQuery, { teamRunId: rootTeamRunId }),
    ]);
    return { ...ui, taskAgentRunId, backendProjection: projection, backendCheckpoint: checkpoint };
  };

  const evidence = {
    startedAt: new Date().toISOString(),
    frontendUrl,
    backendUrl,
    rootTeamRunId,
    marker,
    runtime: 'codex_app_server',
    model: 'gpt-5.6-luna',
    taskPrompt,
    steps: [],
  };

  try {
    await page.goto(`${frontendUrl}/agents`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForSelector('[data-test="workspace-row"]', { timeout: 45_000 });

    const tempWorkspace = page.locator('[data-test="workspace-row"][data-workspace-id="temp_ws_default"]');
    await tempWorkspace.waitFor({ state: 'visible', timeout: 30_000 });
    if (await tempWorkspace.getAttribute('aria-expanded') !== 'true') {
      await tempWorkspace.locator('button').first().evaluate((button) => button.click());
      await page.waitForTimeout(1000);
    }

    const definitionFound = await page.evaluate(() => {
      const button = [...document.querySelectorAll('aside button')].find((element) =>
        element.hasAttribute('aria-expanded')
        && String(element.innerText || '').includes('Nested Classroom Test Team'));
      if (!button) return false;
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      return true;
    });
    if (!definitionFound) throw new Error('Nested Classroom Test Team definition row was not found.');
    await page.waitForTimeout(500);

    const runButton = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
    await runButton.waitFor({ state: 'visible', timeout: 30_000 });
    await runButton.evaluate((button) => button.click());
    await page.waitForURL('**/workspace', { timeout: 30_000 });
    await page.waitForSelector('textarea[placeholder="Type a message..."]', { timeout: 30_000 });
    await page.waitForTimeout(1500);

    for (const disclosure of await page.locator(`[data-team-run-id="${rootTeamRunId}"][aria-expanded="false"]`).all()) {
      const test = await disclosure.getAttribute('data-test');
      if (test === 'workspace-team-member-disclosure' || test === 'workspace-team-transient-disclosure') {
        await disclosure.evaluate((button) => button.click());
      }
    }

    const studentOneRow = page.locator(
      `[data-test="workspace-team-member-${rootTeamRunId}-/StudentStudyGroup/student_one"]`,
    );
    await studentOneRow.waitFor({ state: 'visible', timeout: 30_000 });
    await studentOneRow.evaluate((row) => row.click());
    await page.waitForTimeout(1000);
    evidence.steps.push(await capture('student-one-selected-before-request'));

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill(taskPrompt);
    await page.locator('button[title="Send message"]').click();
    evidence.steps.push(await capture('delegation-request-sent'));

    const deadline = Date.now() + 180_000;
    let taskAgentRow = null;
    while (Date.now() < deadline) {
      for (const disclosure of await page.locator(`[data-team-run-id="${rootTeamRunId}"][aria-expanded="false"]`).all()) {
        const test = await disclosure.getAttribute('data-test');
        if (test === 'workspace-team-member-disclosure' || test === 'workspace-team-transient-disclosure') {
          await disclosure.evaluate((button) => button.click());
        }
      }
      const candidate = page.locator(
        `[data-test="workspace-team-transient-execution-row"][data-node-kind="agent"][aria-label*="${marker}"]`,
      );
      if (await candidate.count()) {
        taskAgentRow = candidate.first();
        break;
      }
      await page.waitForTimeout(100);
    }
    if (!taskAgentRow) throw new Error('Timed out waiting for the exact marked student_two task row.');

    evidence.steps.push(await capture('task-row-visible-before-immediate-selection'));
    await page.screenshot({ path: path.join(outputDir, `${marker}-before-selection.png`), fullPage: true });
    await taskAgentRow.evaluate((row) => row.click());
    evidence.steps.push(await capture('task-selected-immediately'));
    await page.screenshot({ path: path.join(outputDir, `${marker}-selected-immediately.png`), fullPage: true });

    for (const [label, waitMs] of [['plus-2s', 2_000], ['plus-10s', 8_000], ['plus-30s', 20_000], ['plus-60s', 30_000]]) {
      await page.waitForTimeout(waitMs);
      evidence.steps.push(await capture(label));
      await page.screenshot({ path: path.join(outputDir, `${marker}-${label}.png`), fullPage: true });
    }
  } catch (error) {
    evidence.error = String(error?.stack || error);
    try {
      evidence.steps.push(await capture('failure-state'));
      await page.screenshot({ path: path.join(outputDir, `${marker}-failure.png`), fullPage: true });
    } catch {}
  } finally {
    evidence.finishedAt = new Date().toISOString();
    evidence.taskAgentRunId = taskAgentRunId;
    evidence.consoleMessages = consoleMessages;
    evidence.pageErrors = pageErrors;
    evidence.graphql = graphql;
    evidence.webSockets = webSockets;
    fs.writeFileSync(path.join(outputDir, `${marker}-reproduction.json`), `${JSON.stringify(evidence, null, 2)}\n`);
    await browser.close();
  }

  if (evidence.error) {
    console.error(evidence.error);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ marker, taskAgentRunId, steps: evidence.steps.map((step) => step.label) }, null, 2));
  }
};

run();
