// Background tasks on the phone's Activity and after a desktop reload (autobyteus-473). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its phone page right after the zoom
// cases (`--cases=MSP-44,MSP-45,MSP-46` runs only these).
//
// On alpha, an Antigravity run on the probe's scripted AGY CLI: `BACKGROUND_STEP:{"seconds":N,"exitCode":C}` leaves a
// daemon `run_command` step open at turn end (a background task, as AGY does), then writes the exit message AGY writes when
// such a command exits, so the node's monitor ends the task by itself (exit code 0 → completed, otherwise failed).
//
//   MSP-44 AC-001  A background task started before the phone opens the run's Activity is listed there as running (the
//                  node's view brings it), with its command; when it exits with code 1 it shows Failed and the exit message.
//   MSP-45 AC-002  A task started while Activity is open appears there live, newest first.
//   MSP-46 AC-003  A desktop window (`nuxt dev` against alpha) with a running task: after a reload, the expanded Background
//                  Tasks section of the Activity tab lists it as running.
import { attachToBrowserContext } from './fixtures/probe-node-access.mjs';
import { waitForDevServerReady } from './fixtures/dev-server-ready.mjs';

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `browser`, `sel`, `toList`, `openRow`, `menuOpen`,
 *   `shot`, `waitFor`, `sleep`, `assert`, `desktopRunsView`.
 */
export const runBackgroundTaskCases = async (probe) => {
  const { runCase, page, stack, alpha, browser, sel, toList, openRow, menuOpen, shot, waitFor, sleep, assert, desktopRunsView } = probe;

  const createRun = async () => {
    const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
      { i: { agentDefinitionId: stack.ids.checker, ...stack.runConfig } })).createAgentRun;
    assert(created.success, created.message);
    return created.runId;
  };
  /** Starts a background step on the run and waits until the node's view lists it running. */
  const startTask = async (runId, seconds, exitCode, marker) => {
    await stack.agentSay(runId, `${marker} BACKGROUND_STEP:${JSON.stringify({ seconds, exitCode })}`);
    return waitFor(`the node lists ${marker}'s task running`, async () => {
      const tasks = await nodeTasks(runId);
      return tasks.filter(task => task.status === 'running').length > 0 ? tasks : undefined;
    }, 60_000);
  };
  const nodeTasks = async (runId) => (await alpha.gql(`query($id:String!){ agentBackgroundTaskView(agentRunId:$id) { __typename
    ... on AgentBackgroundTaskEventStream { currentTasks: tasks { taskId status command summary startedAt } } } }`, { id: runId })).agentBackgroundTaskView?.currentTasks ?? [];
  const phoneRows = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="mobile-background-task"]')].map(row => ({
    status: row.getAttribute('data-status'), text: row.textContent.replace(/\s+/g, ' ').trim(),
  })));

  let run = null;
  let firstTask = null;

  await runCase('MSP-44', async () => {
    run = await createRun();
    const tasks = await startTask(run, 25, 1, 'BG-473-ONE');
    firstTask = tasks.find(task => task.status === 'running');
    await sleep(1_000);
    // The phone opens the run, then its Activity, after the task started.
    await toList(page);
    await waitFor('the run in the phone list', async () => (await page.locator(sel(`mobile-run-row-agent:${run}`)).count()) > 0, 30_000);
    await openRow(page, `agent:${run}`);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await waitFor('the task listed on the phone', async () => (await phoneRows()).length > 0, 20_000).catch(() => undefined);
    const listed = await phoneRows();
    await shot(page, 'MSP-44-activity-running');
    // It ends by itself (exit code 1) while Activity stays open.
    await waitFor('the task shown failed', async () => (await phoneRows()).some(row => row.status === 'failed'), 60_000).catch(() => undefined);
    const ended = await phoneRows();
    await shot(page, 'MSP-44-activity-failed');
    const section = (await page.locator(sel('mobile-background-tasks')).innerText().catch(() => '')).replace(/\s+/g, ' ');
    const details = { run, firstTask, listed, ended, section: section.slice(0, 400) };
    assert(listed.length === 1 && listed[0].status === 'running' && listed[0].text.includes(firstTask.command), 'AC-001 a task started before Activity opened is listed running, with its command', details);
    assert(ended.length === 1 && ended[0].status === 'failed' && /Failed/.test(ended[0].text) && /exit/i.test(ended[0].text), 'AC-001 when it ends it shows Failed with how it ended', details);
    assert(section.startsWith('Background tasks') || section.startsWith('BACKGROUND TASKS'), 'the section is titled Background tasks', details);
    return details;
  });

  await runCase('MSP-45', async () => {
    assert(run, 'MSP-45 needs MSP-44 (its run, with Activity open)');
    const before = await phoneRows();
    await stack.agentSay(run, `BG-473-TWO BACKGROUND_STEP:${JSON.stringify({ seconds: 8, exitCode: 0 })}`);
    await waitFor('the second task appears live', async () => (await phoneRows()).length === before.length + 1, 60_000).catch(() => undefined);
    const live = await phoneRows();
    await shot(page, 'MSP-45-activity-live');
    await waitFor('the second task completed', async () => (await phoneRows()).some(row => row.status === 'completed'), 60_000).catch(() => undefined);
    const completed = await phoneRows();
    const details = { before, live, completed };
    assert(live.length === before.length + 1 && live[0].status === 'running', 'AC-002 a task started while Activity is open appears live, newest first', details);
    assert(completed[0].status === 'completed', 'AC-002 it then shows Completed', details);
    await page.goBack();
    return details;
  });

  await runCase('MSP-46', async () => {
    const deskRun = await createRun();
    const tasks = await startTask(deskRun, 60, 0, 'BG-473-DESK');
    const task = tasks.find(entry => entry.status === 'running');
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(context);
    await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desk = await context.newPage();
    try {
      await waitForDevServerReady(stack.frontendUrl, { timeoutMs: 120_000 });
      await desk.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      const openPanel = async () => {
        await desktopRunsView(desk);
        await desk.locator(`[data-test="run-list-row"][data-run-id="${deskRun}"] [data-test="workspace-agent-run-row"]`).first().click({ timeout: 60_000 });
        await desk.locator('[data-test="right-side-tab-list"]').getByText('Activity', { exact: true }).first().click();
        const header = desk.locator('[data-test="background-tasks-header"]').first();
        await header.waitFor({ timeout: 30_000 });
        if (!(await desk.locator('[data-test="background-tasks-list"]:visible, [data-test="background-tasks-empty"]:visible, [data-test="background-tasks-availability"]:visible').count())) await header.click();
      };
      const rows = () => desk.evaluate(() => [...document.querySelectorAll('[data-test="background-task-row"]')].map(row => ({
        status: row.getAttribute('data-status'), text: row.textContent.replace(/\s+/g, ' ').trim() })));
      await openPanel();
      await waitFor('the desktop panel lists the task', async () => (await rows()).length > 0, 30_000).catch(() => undefined);
      const beforeReload = await rows();
      // A reload: the store starts empty; the view's answer brings the running task back.
      await desk.reload({ waitUntil: 'domcontentloaded', timeout: 240_000 });
      await openPanel();
      await waitFor('the desktop panel lists the task after the reload', async () => (await rows()).length > 0, 30_000).catch(() => undefined);
      const afterReload = await rows();
      await desk.screenshot({ path: `${probe.outputDir}/MSP-46-desktop-after-reload.png` }).catch(() => undefined);
      const details = { deskRun, task, beforeReload, afterReload };
      assert(afterReload.length === 1 && afterReload[0].status === 'running' && afterReload[0].text.includes(task.command),
        'AC-003 after a reload the desktop Background Tasks section lists the running task', details);
      return details;
    } finally {
      await context.close().catch(() => undefined);
    }
  });
};
