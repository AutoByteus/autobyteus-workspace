// Background tasks on the phone's Activity and after a desktop reload (autobyteus-473). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its phone page right after the zoom
// cases (`--cases=MSP-47,MSP-48,MSP-49` runs only these).
//
// On alpha, an Antigravity run on the probe's scripted AGY CLI: `BACKGROUND_STEP:{"seconds":N,"exitCode":C}` leaves a
// daemon `run_command` step open at turn end (a background task, as AGY does), then writes the exit message AGY writes when
// such a command exits, so the node's monitor ends the task by itself (exit code 0 → completed, otherwise failed).
//
//   MSP-47 AC-001  A background task started before the phone opens the run's Activity is listed there as running (the
//                  node's view brings it), with its command; when it exits with code 1 it shows Failed and the exit message.
//   MSP-48 AC-002  A task started while Activity is open appears there live, newest first.
//   MSP-49 AC-003  A desktop window (`nuxt dev` against alpha) with a running task: after a reload, the expanded Background
//                  Tasks section of the Activity tab lists it as running.
//   MSP-59 autobyteus-483 AC-007  The run is terminated while its task runs and the phone's Activity is open: the row shows
//                  Stopped and the line "Stopped: the run ended". (MSP-47 also checks autobyteus-483 AC-006's line
//                  "exit code 1".)
//   MSP-78 autobyteus-517 AC-002  A task that ended (code 1) before the phone opened the run's Activity is still listed
//                  there (the Antigravity view keeps ended tasks): Failed, with the line "exit code 1".
//   MSP-99 autobyteus-609 AC-I  A task's end update is lost: the phone's socket for the run swallows every
//                  BACKGROUND_TASK_UPDATED frame before the app reads it (the page's WebSocket wrapped before the run is
//                  opened). The run is terminated
//                  while its task runs and Activity is open: within 10 s the row reads Stopped and "Stopped: the run
//                  ended", from the run's stop alone (the list ends a stopped run's running tasks, D-I).
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
    await waitFor(`the node lists ${marker}'s task running`, async () => (await nodeTasks(runId)).some(task => task.status === 'running'), 60_000);
    return nodeTasks(runId);
  };
  const nodeTasks = async (runId) => (await alpha.gql(`query($id:String!){ agentBackgroundTaskView(agentRunId:$id) { __typename
    ... on AgentBackgroundTaskEventStream { currentTasks: tasks { taskId status command summary startedAt } } } }`, { id: runId })).agentBackgroundTaskView?.currentTasks ?? [];
  const phoneRows = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="mobile-background-task"]')].map(row => ({
    status: row.getAttribute('data-status'), text: row.textContent.replace(/\s+/g, ' ').trim(),
    end: row.querySelector('[data-testid="mobile-background-task-end"]')?.textContent.trim() ?? null,
  })));

  let run = null;
  let firstTask = null;

  await runCase('MSP-47', async () => {
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
    await shot(page, 'MSP-47-activity-running');
    // It ends by itself (exit code 1) while Activity stays open.
    await waitFor('the task shown failed', async () => (await phoneRows()).some(row => row.status === 'failed'), 60_000).catch(() => undefined);
    const ended = await phoneRows();
    await shot(page, 'MSP-47-activity-failed');
    const section = (await page.locator(sel('mobile-background-tasks')).innerText().catch(() => '')).replace(/\s+/g, ' ');
    const details = { run, firstTask, listed, ended, section: section.slice(0, 400) };
    assert(listed.length === 1 && listed[0].status === 'running' && listed[0].text.includes(firstTask.command), 'AC-001 a task started before Activity opened is listed running, with its command', details);
    assert(ended.length === 1 && ended[0].status === 'failed' && /Failed/.test(ended[0].text) && /exit/i.test(ended[0].text), 'AC-001 when it ends it shows Failed with how it ended', details);
    // autobyteus-483 AC-006: the end line is the exit code field's line, not the runtime's summary.
    assert(ended[0].end === 'exit code 1', 'autobyteus-483 AC-006 the phone shows the line "exit code 1"', details);
    assert(section.startsWith('Background tasks') || section.startsWith('BACKGROUND TASKS'), 'the section is titled Background tasks', details);
    return details;
  });

  await runCase('MSP-48', async () => {
    assert(run, 'MSP-48 needs MSP-47 (its run, with Activity open)');
    const before = await phoneRows();
    await stack.agentSay(run, `BG-473-TWO BACKGROUND_STEP:${JSON.stringify({ seconds: 8, exitCode: 0 })}`);
    await waitFor('the second task appears live', async () => (await phoneRows()).length === before.length + 1, 60_000).catch(() => undefined);
    const live = await phoneRows();
    await shot(page, 'MSP-48-activity-live');
    await waitFor('the second task completed', async () => (await phoneRows()).some(row => row.status === 'completed'), 60_000).catch(() => undefined);
    const completed = await phoneRows();
    const details = { before, live, completed };
    assert(live.length === before.length + 1 && live[0].status === 'running', 'AC-002 a task started while Activity is open appears live, newest first', details);
    assert(completed[0].status === 'completed', 'AC-002 it then shows Completed', details);
    await page.goBack();
    return details;
  });

  await runCase('MSP-49', async () => {
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
      await desk.screenshot({ path: `${probe.outputDir}/MSP-49-desktop-after-reload.png` }).catch(() => undefined);
      const details = { deskRun, task, beforeReload, afterReload };
      assert(afterReload.length === 1 && afterReload[0].status === 'running' && afterReload[0].text.includes(task.command),
        'AC-003 after a reload the desktop Background Tasks section lists the running task', details);
      return details;
    } finally {
      await context.close().catch(() => undefined);
    }
  });
  await runCase('MSP-59', async () => {
    const endRun = await createRun();
    const tasks = await startTask(endRun, 120, 0, 'BG-483-END');
    const task = tasks.find(entry => entry.status === 'running');
    await toList(page);
    await waitFor('the run in the phone list', async () => (await page.locator(sel(`mobile-run-row-agent:${endRun}`)).count()) > 0, 30_000);
    await openRow(page, `agent:${endRun}`);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await waitFor('the task listed running on the phone', async () => (await phoneRows()).some(row => row.status === 'running'), 20_000).catch(() => undefined);
    const listed = await phoneRows();
    // The user ends the run (Terminate on the node) while its command still runs.
    const terminated = (await alpha.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: endRun })).terminateAgentRun;
    await waitFor('the task shown stopped', async () => (await phoneRows()).some(row => row.status === 'stopped'), 30_000).catch(() => undefined);
    const ended = await phoneRows();
    await shot(page, 'MSP-59-activity-run-ended');
    const details = { endRun, task, terminated, listed, ended };
    assert(listed.length === 1 && listed[0].status === 'running', 'the task is listed running before the run ends', details);
    assert(terminated.success === true, 'the run was terminated', details);
    assert(ended.length === 1 && ended[0].status === 'stopped' && /Stopped/.test(ended[0].text), 'autobyteus-483 AC-007 the task shows Stopped', details);
    assert(ended[0].end === 'Stopped: the run ended', 'autobyteus-483 AC-007 the phone shows "Stopped: the run ended"', details);
    await page.goBack();
    return details;
  });
  await runCase('MSP-78', async () => {
    const lateRun = await createRun();
    const tasks = await startTask(lateRun, 5, 1, 'BG-517-LATE');
    const task = tasks.find(entry => entry.status === 'running');
    // The task ends (code 1) before anyone opens the run's Activity; the node's view still lists it (autobyteus-517 FU-003).
    await waitFor('the node lists the ended task', async () => (await nodeTasks(lateRun)).some(entry => entry.status === 'failed'), 60_000).catch(() => undefined);
    const nodeAfterEnd = await nodeTasks(lateRun);
    await toList(page);
    await waitFor('the run in the phone list', async () => (await page.locator(sel(`mobile-run-row-agent:${lateRun}`)).count()) > 0, 30_000);
    await openRow(page, `agent:${lateRun}`);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await waitFor('the ended task listed on the phone', async () => (await phoneRows()).length > 0, 20_000).catch(() => undefined);
    const listed = await phoneRows();
    await shot(page, 'MSP-78-activity-opened-after-end');
    const details = { lateRun, task, nodeAfterEnd, listed };
    assert(nodeAfterEnd.length === 1 && nodeAfterEnd[0].status === 'failed', 'autobyteus-517 AC-002 the node view still lists the ended task', details);
    assert(listed.length === 1 && listed[0].status === 'failed' && /Failed/.test(listed[0].text) && listed[0].text.includes(task.command),
      'autobyteus-517 AC-002 Activity opened after the end lists the task as Failed, with its command', details);
    assert(listed[0].end === 'exit code 1', 'autobyteus-517 AC-002 the phone shows its end line "exit code 1"', details);
    await page.goBack();
    return details;
  });
  await runCase('MSP-99', async () => {
    const lostRun = await createRun();
    const tasks = await startTask(lostRun, 120, 0, 'BG-609-LOST');
    const task = tasks.find(entry => entry.status === 'running');
    // Every live task update of this run is lost before the app reads it; every other frame passes. The page's WebSocket
    // is wrapped before the run is opened: this run's agent socket swallows BACKGROUND_TASK_UPDATED frames ahead of the
    // app's own handlers. (Playwright's routeWebSocket proxy cannot reach the node here: the phone's address is mapped
    // to 127.0.0.1 only inside Chrome, and the proxied socket neither connected nor closed.)
    await page.evaluate((runId) => {
      const probe = window.__probeLostTaskUpdates ?? (window.__probeLostTaskUpdates = { runs: new Set(), dropped: 0 });
      probe.runs.add(runId);
      if (window.__probeLostTaskUpdatesInstalled) return;
      window.__probeLostTaskUpdatesInstalled = true;
      const Native = window.WebSocket;
      window.WebSocket = class extends Native {
        constructor(url, protocols) {
          super(url, protocols);
          const path = new URL(String(url), location.href).pathname;
          if (![...probe.runs].some((id) => path === `/ws/agent/${id}`)) return;
          // Registered before the app's handlers, so it runs first and can stop the frame.
          this.addEventListener('message', (event) => {
            try {
              if (JSON.parse(String(event.data)).type === 'BACKGROUND_TASK_UPDATED') { probe.dropped += 1; event.stopImmediatePropagation(); }
            } catch { /* not JSON: passed */ }
          });
        }
      };
    }, lostRun);
    const droppedNow = () => page.evaluate(() => window.__probeLostTaskUpdates?.dropped ?? 0);
    await toList(page);
    await waitFor('the run in the phone list', async () => (await page.locator(sel(`mobile-run-row-agent:${lostRun}`)).count()) > 0, 30_000);
    await openRow(page, `agent:${lostRun}`);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await waitFor('the task listed running on the phone', async () => (await phoneRows()).some(row => row.status === 'running'), 20_000).catch(() => undefined);
    const listed = await phoneRows();
    const droppedBeforeStop = await droppedNow();
    const stoppedAt = Date.now();
    const terminated = (await alpha.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: lostRun })).terminateAgentRun;
    let shownStoppedAfterMs = null;
    try {
      await waitFor('the task shown stopped within 10 s', async () => (await phoneRows()).some(row => row.status === 'stopped'), 10_000);
      shownStoppedAfterMs = Date.now() - stoppedAt;
    } catch { /* recorded */ }
    await sleep(1_500);
    const ended = await phoneRows();
    const nodeAfterStop = await nodeTasks(lostRun);
    await shot(page, 'MSP-99-activity-end-lost');
    const droppedUpdates = await droppedNow();
    const details = { lostRun, task, terminated, listed, ended, shownStoppedAfterMs, droppedUpdates, droppedBeforeStop, nodeAfterStop };
    assert(listed.length === 1 && listed[0].status === 'running', 'the task is listed running before the run stops', details);
    assert(terminated.success === true, 'the run was terminated', details);
    assert(droppedUpdates > droppedBeforeStop, 'the run end\'s task update reached the phone and was lost on purpose', details);
    assert(shownStoppedAfterMs !== null && ended.length === 1 && ended[0].status === 'stopped' && /Stopped/.test(ended[0].text),
      'AC-I within 10 s of the stop the task shows Stopped, though its end update was lost', details);
    assert(ended[0].end === 'Stopped: the run ended', 'AC-I the phone shows "Stopped: the run ended"', details);
    await page.goBack();
    return details;
  });
};
