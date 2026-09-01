#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const playwrightModule = process.env.PLAYWRIGHT_CORE_MODULE;
if (!playwrightModule) {
  throw new Error('Set PLAYWRIGHT_CORE_MODULE to the absolute playwright-core module path.');
}
const { chromium } = require(playwrightModule);

const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:33372';
const rootTeamRunId = process.env.ROOT_TEAM_RUN_ID
  || 'nested_classroom_test_team_3d07be9f368f459b94cf28ab9f20f434';
const outputDir = process.env.OUTPUT_DIR || __dirname;
const marker = process.env.MARKER || 'STUDENT_TWO_MONITOR_PROBE';
const outputStem = marker.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const preClickWaitMs = Number(process.env.PRE_CLICK_WAIT_MS || 0);
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

const taskPrompt = `Create a second live delegated-task monitor probe. Use delegate_task to delegate one task to /StudentStudyGroup. The nested task packet must instruct its coordinator student_one to do all of the following:
1. Use delegate_task to delegate a dedicated subtask to the exact student_two Agent address available in its own Team roster.
2. The student_two subtask description must begin with ${marker} and require student_two to immediately send student_one an ordinary message containing exactly STUDENT_TWO_TASK_STARTED.
3. Student_two must then run at least one visible tool step, wait at least 120 seconds, and only then call submit_task_result with exactly STUDENT_TWO_TASK_FINISHED.
4. Student_one must wait for the student_two task result and must not perform the subtask itself.
After delegating to /StudentStudyGroup, wait. Do not perform either nested task yourself.`;

const run = async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const graphql = [];
  page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('request', (request) => {
    if (!request.url().includes('/graphql')) return;
    let postData = null;
    try { postData = request.postDataJSON(); } catch {}
    graphql.push({ phase: 'request', url: request.url(), postData: postData ? { operationName: postData.operationName, variables: postData.variables } : null });
  });
  page.on('response', (response) => {
    if (!response.url().includes('/graphql')) return;
    graphql.push({ phase: 'response', url: response.url(), status: response.status() });
  });

  const capture = async (label) => page.evaluate(({ label, marker, rootTeamRunId }) => {
    const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');
    const componentRow = (element) => {
      let component = element.__vueParentComponent;
      while (component) {
        if (component.props?.row?.agentRunId) {
          const row = component.props.row;
          return {
            rowKey: row.rowKey,
            agentRunId: row.agentRunId,
            memberAddress: row.memberAddress,
            currentStatus: row.currentStatus,
            transientKind: row.transientKind,
          };
        }
        component = component.parent;
      }
      return null;
    };
    const rows = [...document.querySelectorAll('[role="treeitem"]')].map((element) => {
      const row = componentRow(element);
      return {
        test: element.getAttribute('data-test'),
        rowKind: element.getAttribute('data-row-kind'),
        nodeKind: element.getAttribute('data-node-kind'),
        transientKind: element.getAttribute('data-transient-kind'),
        teamRunId: element.getAttribute('data-team-run-id'),
        memberAddress: element.getAttribute('data-member-address'),
        agentRunId: row?.agentRunId || null,
        rowCurrentStatus: row?.currentStatus || null,
        current: element.getAttribute('aria-current'),
        selected: element.getAttribute('aria-selected'),
        expanded: element.getAttribute('aria-expanded'),
        label: element.getAttribute('aria-label'),
        text: compact(element.innerText),
        activeElement: document.activeElement === element,
        classes: element.className,
      };
    });
    const app = document.querySelector('#__nuxt')?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const runHistory = pinia?._s?.get('runHistory');
    const teamContexts = pinia?._s?.get('agentTeamContexts');
    const activityStore = pinia?._s?.get('agentActivity');
    const team = teamContexts?.getTeamContextById?.(rootTeamRunId) || null;
    const focusedAgentRunId = team?.view?.getFocusedAgentRunId?.() || null;
    const focusedContext = focusedAgentRunId
      ? team?.view?.getAgentContext?.(focusedAgentRunId) || null
      : null;
    const navigationTeam = runHistory?.navigationProjection?.teamNodes?.find?.(
      (candidate) => candidate.teamRunId === rootTeamRunId,
    ) || null;
    const main = document.querySelector('main');
    const activityHeading = [...document.querySelectorAll('h3')]
      .find((element) => compact(element.innerText) === 'Activity');
    const activitySection = activityHeading?.closest('section,div');
    const markerRows = rows.filter((row) => String(row.label || '').includes(marker));
    return {
      label,
      capturedAt: new Date().toISOString(),
      url: location.href,
      currentRows: rows.filter((row) => row.current === 'true'),
      markerRows,
      allRows: rows,
      storeState: {
        selectedTeamRunId: runHistory?.selectedTeamRunId || null,
        selectedTeamMemberAddress: runHistory?.selectedTeamMemberAddress || null,
        navigationFocusedAgentRunId: navigationTeam?.focusedAgentRunId || null,
        viewFocusedAgentRunId: focusedAgentRunId,
        focusedContext: focusedContext ? {
          runId: focusedContext.state?.runId || null,
          currentStatus: focusedContext.state?.currentStatus || null,
          conversationMessageCount: focusedContext.state?.conversation?.messages?.length || 0,
          activityCount: activityStore?.getActivities?.(focusedAgentRunId)?.length || 0,
          lastConversationText: compact(
            focusedContext.state?.conversation?.messages?.at?.(-1)?.text
              || focusedContext.state?.conversation?.messages?.at?.(-1)?.content,
          ).slice(0, 600),
        } : null,
      },
      mainText: (main?.innerText || '').slice(0, 12000),
      bodyTail: (document.body.innerText || '').slice(-12000),
      activityText: compact(activitySection?.innerText).slice(0, 3000),
    };
  }, { label, marker, rootTeamRunId });

  const evidence = {
    startedAt: new Date().toISOString(),
    frontendUrl,
    rootTeamRunId,
    runtime: 'codex_app_server',
    model: 'gpt-5.6-luna',
    taskPrompt,
    steps: [],
  };

  try {
    await page.goto(`${frontendUrl}/agents`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('[data-test="workspace-row"]', { timeout: 30_000 });

    const tempWorkspace = page.locator('[data-test="workspace-row"][data-workspace-id="temp_ws_default"]');
    await tempWorkspace.waitFor({ state: 'visible', timeout: 30_000 });
    if (await tempWorkspace.getAttribute('aria-expanded') !== 'true') {
      await tempWorkspace.locator('button').first().evaluate((button) => button.click());
      await page.waitForTimeout(1500);
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
    await page.waitForTimeout(750);

    const runButton = page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
    await runButton.waitFor({ state: 'visible', timeout: 30_000 });
    await runButton.evaluate((button) => button.click());
    await page.waitForURL('**/workspace', { timeout: 30_000 });
    await page.waitForSelector('textarea[placeholder="Type a message..."]', { timeout: 30_000 });
    await page.waitForTimeout(2500);
    evidence.steps.push(await capture('root-opened-before-second-delegation'));

    const teacherRow = page.locator(
      `[data-test="workspace-team-member-${rootTeamRunId}-/Teacher"]`,
    );
    if (await teacherRow.getAttribute('aria-current') !== 'true') {
      await teacherRow.evaluate((row) => row.click());
      await page.waitForTimeout(1500);
    }

    const textarea = page.locator('textarea[placeholder="Type a message..."]');
    await textarea.fill(taskPrompt);
    const sendButton = page.locator('button[title="Send message"]');
    await sendButton.waitFor({ state: 'visible', timeout: 10_000 });
    await sendButton.click();
    evidence.steps.push(await capture('second-delegation-request-sent'));

    const deadline = Date.now() + 180_000;
    let taskAgentRow = null;
    while (Date.now() < deadline) {
      const candidate = page.locator(
        `[data-test="workspace-team-transient-execution-row"][data-node-kind="agent"]`
        + `[aria-label*="${marker}"]`,
      );
      if (await candidate.count()) {
        taskAgentRow = candidate.first();
        break;
      }

      for (const disclosure of await page.locator(
        `[data-team-run-id="${rootTeamRunId}"][aria-expanded="false"]`,
      ).all()) {
        const test = await disclosure.getAttribute('data-test');
        if (test === 'workspace-team-member-disclosure'
          || test === 'workspace-team-transient-disclosure') {
          await disclosure.evaluate((button) => button.click());
        }
      }
      await page.waitForTimeout(1000);
    }
    if (!taskAgentRow) {
      evidence.steps.push(await capture('student-two-task-row-not-found'));
      throw new Error('Timed out waiting for the student_two delegated task Agent row.');
    }

    if (preClickWaitMs > 0) {
      await page.waitForTimeout(preClickWaitMs);
    }
    evidence.steps.push(await capture('student-two-task-row-visible-before-click'));
    await page.screenshot({ path: path.join(outputDir, `${outputStem}-before-click.png`), fullPage: true });

    await taskAgentRow.evaluate((row) => row.click());
    evidence.steps.push(await capture('student-two-immediately-after-click'));
    await page.waitForTimeout(2500);
    evidence.steps.push(await capture('student-two-2.5s-after-click'));
    await page.screenshot({ path: path.join(outputDir, `${outputStem}-after-click.png`), fullPage: true });
    await page.waitForTimeout(7500);
    evidence.steps.push(await capture('student-two-10s-after-click'));
  } catch (error) {
    evidence.error = String(error && error.stack ? error.stack : error);
    try {
      evidence.steps.push(await capture('failure-state'));
      await page.screenshot({ path: path.join(outputDir, `${outputStem}-failure-state.png`), fullPage: true });
    } catch {}
  } finally {
    evidence.finishedAt = new Date().toISOString();
    evidence.consoleMessages = consoleMessages;
    evidence.pageErrors = pageErrors;
    evidence.graphql = graphql;
    fs.writeFileSync(
      path.join(outputDir, `${outputStem}-reproduction.json`),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    await browser.close();
  }

  if (evidence.error) {
    console.error(evidence.error);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ outputDir, steps: evidence.steps.map((step) => step.label) }, null, 2));
  }
};

run();
