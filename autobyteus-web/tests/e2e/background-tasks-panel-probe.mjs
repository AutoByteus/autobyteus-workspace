#!/usr/bin/env node
/**
 * Browser dev-path probe: the Activity tab's Background Tasks section.
 * Starts its own Nuxt dev server on a free port (no backend), installs a probe page that renders the
 * production ProgressPanel at right-panel width, answers the panel's background-task view query per run
 * (an event-stream run, a snapshot run with a polled row, an unsupported run; autobyteus-473), and delivers
 * BACKGROUND_TASK_UPDATED messages through the production stream projector.
 * Prerequisite: Google Chrome (or --browser-executable).
 *
 *   pnpm -C autobyteus-web test:e2e:background-tasks-panel [--output-dir <new dir>]
 *
 * Cases: BT-UI-001..007 the panel and live rows; BT-UI-008 why a task ended (end reasons and exit codes,
 * autobyteus-483); BT-UI-009 a polled (snapshot) run and an unsupported run; BT-UI-010 no run selected.
 */

import assert from 'node:assert/strict';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '../..');
const fixturePath = path.join(here, 'fixtures/background-tasks-panel.page.vue');
const installedPagePath = path.join(webDir, 'pages/__background-tasks-panel-probe.vue');
const routePath = '/__background-tasks-panel-probe';
const valueAfter = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const outputDir = path.resolve(process.cwd(), valueAfter('--output-dir', 'test-results/background-tasks-panel'));
const executablePath = valueAfter(
  '--browser-executable',
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
);
const timeoutMs = Number(valueAfter('--timeout-ms', '120000'));
const RUN = 'browser-claude-run';
const OTHER_RUN = 'browser-codex-run';
const UNSUPPORTED_RUN = 'browser-unsupported-run';
/** The node's answer to `agentBackgroundTaskView` for each run of the probe page. */
const viewAnswers = {
  [RUN]: { __typename: 'AgentBackgroundTaskEventStream', agentRunId: RUN, currentTasks: [] },
  [OTHER_RUN]: {
    __typename: 'AgentBackgroundTaskSnapshot', agentRunId: OTHER_RUN, runInstanceId: 'probe-instance', observedAt: '2026-11-17T10:00:00.000Z',
    tasks: [{ __typename: 'AgentBackgroundTaskViewRow', taskId: 'codex-proc-1', kind: 'shell', description: 'node', command: null, status: 'failed', exitCode: 2, startedAt: '2026-11-17T09:59:00.000Z' }],
  },
  [UNSUPPORTED_RUN]: { __typename: 'AgentBackgroundTaskUnsupported', agentRunId: UNSUPPORTED_RUN, reason: 'unsupported' },
};

const evidence = {
  startedAt: new Date().toISOString(),
  browserExecutable: executablePath,
  fixturePath,
  installedPagePath,
  routePath,
  scenarios: {},
  browserEvents: [],
  cleanup: {},
  failures: [],
};
const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const waitFor = async (label, predicate) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};
const exited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const waitForExit = (child, ms) => new Promise((resolve) => {
  if (exited(child)) return resolve(true);
  const done = () => { clearTimeout(timer); child.off('exit', done); resolve(true); };
  child.once('exit', done);
  const timer = setTimeout(() => { child.off('exit', done); resolve(exited(child)); }, ms);
});
const stopOwned = async (child) => {
  if (!child || exited(child)) return { status: child ? 'already-exited' : 'not-started' };
  process.kill(-child.pid, 'SIGTERM');
  if (!(await waitForExit(child, 10000))) {
    process.kill(-child.pid, 'SIGKILL');
    assert.equal(await waitForExit(child, 5000), true, 'Owned Nuxt process did not stop');
  }
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};
const record = async (id, description, fn) => {
  try {
    const details = await fn();
    evidence.scenarios[id] = { result: 'Pass', description, details };
  } catch (error) {
    const failure = { id, description, message: error.message, stack: error.stack };
    evidence.scenarios[id] = { result: 'Fail', description, failure };
    evidence.failures.push(failure);
    throw error;
  }
};


const snapshot = (overrides) => ({
  type: 'BACKGROUND_TASK_UPDATED',
  payload: {
    task_id: 'bg-1', kind: 'shell', description: 'sleep 20; echo done > marker', command: null, status: 'running',
    summary: null, end_reason: null, exit_code: null, started_at: '2026-09-29T16:48:20.000Z', ...overrides,
  },
});

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const logPath = path.join(outputDir, 'nuxt.log');
let fixtureInstalled = false;
let child;
let log;
let browser;
let result = 'Pass';

try {
  assert.equal(existsSync(fixturePath), true, `Missing fixture ${fixturePath}`);
  assert.equal(existsSync(installedPagePath), false, `Refusing to overwrite ${installedPagePath}`);
  assert.equal(existsSync(executablePath), true, `Missing browser ${executablePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  log = createWriteStream(logPath, { flags: 'w' });
  child = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: true,
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  await waitFor('Nuxt probe route', async () => {
    if (exited(child)) throw new Error(`Nuxt exited early (${child.exitCode}/${child.signalCode})`);
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  await page.route('http://127.0.0.1:65534/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(new URL(route.request().url()).pathname.includes('/rest/health') ? { status: 'ok' } : { data: {} }),
  }));
  // The app shell polls /rest/health through the Nuxt dev proxy; with no backend that proxy answers 500.
  await page.route('**/rest/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
  // The panel reads the selected run's background-task view; every other GraphQL operation gets the empty mock answer.
  await page.route('**/graphql', (route) => {
    const body = route.request().postDataJSON?.() ?? null;
    if (body?.operationName !== 'AgentBackgroundTaskView') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    }
    const view = viewAnswers[body.variables?.agentRunId];
    evidence.viewQueries = (evidence.viewQueries ?? 0) + 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { agentBackgroundTaskView: view ?? null } }) });
  });
  // The app shell opens its node WebSockets (package definitions, update notifications) to the absent backend: the
  // probe owns them as open sockets that never send anything, so the page reaches no refused connection.
  await page.routeWebSocket(/^ws:\/\/127\.0\.0\.1:65534\//, () => {});
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForFunction(() => window.__backgroundTasksProbe?.ready === true, null, { timeout: timeoutMs });
  const panel = page.locator('[data-test="right-panel"]');
  const header = panel.locator('[data-test="background-tasks-header"]');
  const counts = panel.locator('[data-test="background-tasks-counts"]');
  const rows = panel.locator('[data-test="background-task-row"]');
  // ProgressPanel animates section height for 300 ms; let it settle before capturing evidence.
  const shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(outputDir, name) }); };
  const deliver = (runId, message) => page.evaluate(([id, msg]) => { window.__backgroundTasksProbe.deliver(id, msg); }, [runId, message]);

  await record('BT-UI-001', 'To-Do is gone; Background Tasks sits above Activity, collapsed; expanded it reads the run and shows 0 counts; Activity expanded by default (AC-001, AC-002)', async () => {
    const text = await panel.innerText();
    assert.doesNotMatch(text, /To-Do|to-dos|No to-dos yet/i);
    assert.equal((await header.locator('h3').innerText()).trim(), 'Background Tasks');
    // Collapsed, the section reads nothing yet (autobyteus-473: only the expanded panel reads the run's view).
    assert.equal((await counts.innerText()).trim(), 'Current count unavailable');
    const headerBox = await header.boundingBox();
    const activityBox = await panel.getByRole('heading', { name: 'Activity' }).boundingBox();
    assert.ok(headerBox.y < activityBox.y, 'Background Tasks must be above Activity');
    assert.equal(await panel.locator('[data-test="background-tasks-empty"]').isVisible(), false, 'section starts collapsed');
    assert.equal(await panel.getByText('No activity history yet.').isVisible(), true, 'Activity starts expanded');
    await shot('01-default-collapsed.png');

    await header.click();
    await panel.locator('[data-test="background-tasks-empty"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await panel.locator('[data-test="background-tasks-empty"]').innerText()).trim(), 'No background tasks');
    assert.equal((await counts.innerText()).trim(), '0 running · 0 total');
    assert.equal(await panel.getByText('No activity history yet.').isVisible(), false, 'Activity collapses when Background Tasks expands');
    await shot('02-empty-expanded.png');
    return { headerY: headerBox.y, activityY: activityBox.y };
  });

  await record('BT-UI-002', 'A running task appears live with description, kind and status without changing run status (AC-007)', async () => {
    const statusBefore = await page.evaluate((id) => window.__backgroundTasksProbe.status(id), RUN);
    await deliver(RUN, snapshot());
    await rows.first().waitFor({ state: 'visible', timeout: 5000 });
    const row = rows.first();
    assert.equal(await row.getAttribute('data-status'), 'running');
    assert.match(await row.innerText(), /sleep 20; echo done > marker[\s\S]*Running[\s\S]*Shell/);
    assert.equal((await counts.innerText()).trim(), '1 running · 1 total');
    assert.equal(await page.evaluate((id) => window.__backgroundTasksProbe.status(id), RUN), statusBefore);
    await shot('03-running.png');
    return { statusBefore };
  });

  await record('BT-UI-003', 'Newest first; finishing one task changes only that entry; long text stays inside the panel (AC-008, AC-012)', async () => {
    const longDescription = `python3 -m http.server 8080 --directory ${'very/long/path/segment/'.repeat(12)}`;
    const longSummary = `The command exited with code 3.\nOutput:\n${'FAILING line with details '.repeat(30)}`;
    await deliver(RUN, snapshot({ task_id: 'bg-2', kind: 'subagent', description: 'Research lighthouse history', started_at: '2026-09-29T16:49:00.000Z' }));
    await deliver(RUN, snapshot({ task_id: 'bg-3', description: longDescription, started_at: '2026-09-29T16:50:00.000Z' }));
    await deliver(RUN, snapshot({ status: 'completed', summary: 'Background command "sleep 20; echo done > marker" completed (exit code 0)', exit_code: 0 }));
    await deliver(RUN, snapshot({ task_id: 'bg-3', description: longDescription, started_at: '2026-09-29T16:50:00.000Z', status: 'failed', summary: longSummary, exit_code: 3 }));
    const statuses = await rows.evaluateAll((items) => items.map((item) => item.getAttribute('data-status')));
    assert.deepEqual(statuses, ['failed', 'running', 'completed']);
    assert.equal((await counts.innerText()).trim(), '1 running · 3 total');
    assert.match(await rows.nth(2).innerText(), /Completed[\s\S]*Exit code 0[\s\S]*Background command "sleep 20; echo done > marker" completed \(exit code 0\)/);
    assert.equal((await rows.nth(0).locator('[data-test="background-task-end"]').innerText()).trim(), 'Exit code 3');
    const descriptionEl = rows.nth(0).locator('p[title]');
    assert.equal(await descriptionEl.getAttribute('title'), longDescription);
    const truncation = await descriptionEl.evaluate((el) => ({ clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }));
    assert.ok(truncation.scrollWidth > truncation.clientWidth, 'long description is truncated');
    const overflow = await panel.evaluate((el) => {
      const list = el.querySelector('[data-test="background-tasks-list"]').parentElement;
      return { listClient: list.clientWidth, listScroll: list.scrollWidth };
    });
    assert.ok(overflow.listScroll <= overflow.listClient, `horizontal overflow: ${JSON.stringify(overflow)}`);
    await shot('04-mixed-statuses.png');
    return { statuses, truncation, overflow };
  });

  await record('BT-UI-004', 'Summary expands by click and keyboard and collapses again', async () => {
    const summary = rows.nth(0).locator('[data-test="background-task-summary"]');
    const collapsedHeight = (await summary.boundingBox()).height;
    const lineHeight = await summary.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    assert.ok(collapsedHeight <= lineHeight * 2 + 1, `collapsed summary must show at most 2 lines: ${collapsedHeight}px / ${lineHeight}px`);
    assert.equal(await summary.getAttribute('aria-expanded'), 'false');
    await summary.click();
    assert.equal(await summary.getAttribute('aria-expanded'), 'true');
    const expandedHeight = (await summary.boundingBox()).height;
    assert.ok(expandedHeight > collapsedHeight, 'expanded summary is taller');
    await shot('05-summary-expanded.png');
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await summary.getAttribute('aria-expanded'), 'false');
    return { collapsedHeight, expandedHeight };
  });

  await record('BT-UI-005', 'Tasks are per run: another run shows only its own tasks, and the first run its own again (AC-009 web side)', async () => {
    await page.evaluate((id) => window.__backgroundTasksProbe.select(id), OTHER_RUN);
    await panel.locator('[data-test="background-tasks-scope"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await rows.count(), 1);
    assert.equal((await counts.innerText()).trim(), '0 running · 1 total');
    await page.evaluate((id) => window.__backgroundTasksProbe.select(id), RUN);
    // Its rows show at once from the stream store ("last-known"); the run's view answer then confirms them.
    await waitFor('the first run\'s rows again', async () => (await rows.count()) === 3);
    await waitFor('the confirmed counts', async () => (await counts.innerText()).trim() === '1 running · 3 total');
    return { otherRunRows: 1 };
  });

  await record('BT-UI-006', 'Accordion: expanding Activity collapses Background Tasks; a narrow (320px, drawer-like) right panel keeps a one-line header and rows inside the panel', async () => {
    await panel.getByRole('heading', { name: 'Activity' }).click();
    assert.equal(await rows.first().isVisible(), false);
    await header.click();
    assert.equal(await rows.first().isVisible(), true);
    await panel.evaluate((el) => { el.style.width = '320px'; });
    await page.waitForTimeout(100);
    const narrow = await panel.evaluate((el) => {
      const inside = (node) => {
        const box = node.getBoundingClientRect();
        const outer = el.getBoundingClientRect();
        return box.left >= outer.left - 0.5 && box.right <= outer.right + 0.5;
      };
      const list = el.querySelector('[data-test="background-tasks-list"]').parentElement;
      return {
        panelWidth: el.clientWidth,
        listClient: list.clientWidth,
        listScroll: list.scrollWidth,
        countsInside: inside(el.querySelector('[data-test="background-tasks-counts"]')),
        headerHeight: el.querySelector('[data-test="background-tasks-header"]').getBoundingClientRect().height,
        titleTruncated: (() => { const h3 = el.querySelector('[data-test="background-tasks-header"] h3'); return h3.scrollWidth > h3.clientWidth; })(),
        chipsInside: [...el.querySelectorAll('[data-test="background-task-row"] span.rounded-full')].every(inside),
      };
    });
    assert.ok(narrow.listScroll <= narrow.listClient, `narrow horizontal overflow: ${JSON.stringify(narrow)}`);
    assert.equal(narrow.countsInside, true, 'header counts stay inside the panel');
    assert.ok(narrow.headerHeight < 40, `header stays one line: ${narrow.headerHeight}px`);
    assert.equal(narrow.titleTruncated, false, 'title is not truncated at 320px');
    assert.equal(narrow.chipsInside, true, 'status chips stay inside the panel');
    await shot('06-narrow-panel.png');
    return narrow;
  });

  await record('BT-UI-007', 'Shell command line: filled in by a follow-up snapshot, one truncated monospace line with tooltip, click/keyboard expand, no repeat of an AGY title (ticket background-task-shell-command AC-001, AC-003, AC-004, AC-005)', async () => {
    const title = 'Wait for release workflows to complete';
    const command = `cd /Users/normy/autobyteus_org/autobyteus-worktrees/release && for i in $(seq 1 110); do gh run list --workflow release-desktop.yml --limit 1 --json status,conclusion; sleep 30; done`;
    const started = { task_id: 'bg-4', description: title, started_at: '2026-09-29T16:51:00.000Z' };
    await deliver(RUN, snapshot(started));
    const row = rows.first();
    await row.getByText(title).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await row.locator('[data-test="background-task-command"]').count(), 0, 'unknown command: row as before');
    assert.equal((await row.locator('[data-test="background-task-kind-line"]').innerText()).trim(), 'Shell');

    await deliver(RUN, snapshot({ ...started, command }));
    const commandButton = row.locator('[data-test="background-task-command"]');
    await commandButton.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await rows.count(), 4, 'follow-up snapshot updates the same row');
    assert.equal((await counts.innerText()).trim(), '2 running · 4 total');
    assert.equal((await row.locator('p[title]').innerText()).trim(), title, 'title stays the description');
    assert.match((await row.locator('[data-test="background-task-kind-line"]').innerText()).replace(/\s+/g, ' '), /^Shell · cd \/Users/);
    assert.equal(await commandButton.getAttribute('title'), command);
    const style = await commandButton.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { fontFamily: computed.fontFamily, whiteSpace: computed.whiteSpace, textOverflow: computed.textOverflow,
        clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(computed.lineHeight) };
    });
    assert.match(style.fontFamily, /mono|Menlo|Monaco|Consolas|Courier/i, `monospace font: ${style.fontFamily}`);
    assert.equal(style.textOverflow, 'ellipsis');
    assert.ok(style.scrollWidth > style.clientWidth, 'long command is truncated');
    assert.ok(style.height <= style.lineHeight + 1, `collapsed command is one line: ${style.height}px`);
    await shot('07-command-collapsed.png');

    assert.equal(await commandButton.getAttribute('aria-expanded'), 'false');
    await commandButton.click();
    assert.equal(await commandButton.getAttribute('aria-expanded'), 'true');
    const expanded = await commandButton.evaluate((el) => ({ height: el.getBoundingClientRect().height, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }));
    assert.ok(expanded.height > style.height * 2, `expanded command wraps onto several lines: ${expanded.height}px`);
    assert.ok(expanded.scrollWidth <= expanded.clientWidth, 'expanded command wraps inside the row');
    const overflow = await panel.evaluate((el) => {
      const list = el.querySelector('[data-test="background-tasks-list"]').parentElement;
      return { listClient: list.clientWidth, listScroll: list.scrollWidth };
    });
    assert.ok(overflow.listScroll <= overflow.listClient, `horizontal overflow: ${JSON.stringify(overflow)}`);
    await shot('08-command-expanded.png');
    await commandButton.focus();
    await page.keyboard.press('Enter');
    assert.equal(await commandButton.getAttribute('aria-expanded'), 'false');

    // AGY: the title already is the command line, so it is not repeated (REQ-006).
    await deliver(RUN, snapshot({ task_id: 'bg-5', description: 'npm run dev', command: 'npm run dev', started_at: '2026-09-29T16:52:00.000Z' }));
    const agyRow = rows.first();
    await agyRow.getByText('npm run dev').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await agyRow.locator('[data-test="background-task-command"]').count(), 0);
    assert.equal((await agyRow.locator('[data-test="background-task-kind-line"]').innerText()).trim(), 'Shell');
    // Subagent rows have no command line (REQ-004).
    assert.equal(await rows.filter({ hasText: 'Research lighthouse history' }).locator('[data-test="background-task-command"]').count(), 0);
    await shot('09-command-and-agy-rows.png');
    return { style, expanded, overflow };
  });

  await record('BT-UI-008', 'Why a task ended: one line under each ended task, status chips unchanged, the summary kept (autobyteus-483 REQ-004, AC-005..AC-008)', async () => {
    const ended = [
      { task_id: 'bg-10', description: 'Wait for the release workflow', status: 'stopped', end_reason: 'time_limit',
        summary: 'Background command "Wait for the release workflow" was stopped after reaching its background time limit',
        line: 'Stopped: it reached its time limit — not a failure of the command', chip: 'Stopped' },
      { task_id: 'bg-11', description: 'pnpm test', status: 'stopped', end_reason: 'low_memory',
        summary: 'Background command "pnpm test" was stopped because the system is running low on memory',
        line: 'Stopped: the computer was low on memory', chip: 'Stopped' },
      { task_id: 'bg-12', description: 'pnpm dev --port 3000', status: 'stopped', end_reason: 'run_ended', summary: 'signal SIGTERM',
        line: 'Stopped: the run ended', chip: 'Stopped' },
      { task_id: 'bg-13', description: 'pnpm lint', status: 'failed', exit_code: 1, line: 'Exit code 1', chip: 'Failed' },
      { task_id: 'bg-14', description: 'tail -f build.log', status: 'stopped', summary: 'signal SIGTERM', line: null, chip: 'Stopped' },
    ];
    for (const [index, task] of ended.entries()) {
      const { line: _line, chip: _chip, ...payload } = task;
      await deliver(RUN, snapshot({ ...payload, started_at: `2026-09-29T17:0${index}:00.000Z` }));
    }
    const details = [];
    for (const task of ended) {
      const row = rows.filter({ hasText: task.description }).first();
      await row.waitFor({ state: 'visible', timeout: 5000 });
      const endLines = await row.locator('[data-test="background-task-end"]').allInnerTexts();
      assert.deepEqual(endLines.map((text) => text.trim()), task.line ? [task.line] : [], `${task.task_id} end line`);
      assert.match(await row.innerText(), new RegExp(task.chip));
      if (task.summary) assert.equal((await row.locator('[data-test="background-task-summary"]').innerText()).trim(), task.summary);
      const lineBox = task.line ? await row.locator('[data-test="background-task-end"]').boundingBox() : null;
      const rowBox = await row.boundingBox();
      if (lineBox) assert.ok(lineBox.x + lineBox.width <= rowBox.x + rowBox.width + 0.5, `${task.task_id} end line stays inside its row`);
      details.push({ taskId: task.task_id, endLines });
    }
    await panel.evaluate((el) => { el.querySelector('[data-test="background-tasks-list"]').parentElement.scrollTop = 0; });
    await shot('10-end-reasons.png');
    return details;
  });

  await record('BT-UI-009', 'A polled (snapshot) run shows its exit code line; an unsupported run says inspection is unavailable (autobyteus-473 answers)', async () => {
    await panel.evaluate((el) => { el.style.width = '380px'; });
    await page.evaluate((id) => window.__backgroundTasksProbe.select(id), OTHER_RUN);
    await panel.locator('[data-test="background-tasks-scope"]').waitFor({ state: 'visible', timeout: 5000 });
    const row = rows.first();
    assert.equal(await row.getAttribute('data-status'), 'failed');
    assert.equal((await row.locator('[data-test="background-task-end"]').innerText()).trim(), 'Exit code 2');
    assert.match(await row.locator('[data-test="background-task-observed"]').innerText(), /codex-pr · observed/);
    await shot('11-snapshot-run.png');

    await page.evaluate((id) => window.__backgroundTasksProbe.select(id), UNSUPPORTED_RUN);
    const availability = panel.locator('[data-test="background-tasks-availability"]');
    await waitFor('the unsupported answer', async () => (await availability.innerText()).includes('unavailable'));
    assert.equal((await availability.innerText()).trim(), 'Current background-task inspection is unavailable.');
    assert.equal((await counts.innerText()).trim(), 'Current count unavailable');
    assert.equal(await rows.count(), 0);
    await shot('12-unsupported-run.png');
    return { snapshotRow: 'Exit code 2', unsupported: true };
  });

  await record('BT-UI-010', 'No run selected: a plain message instead of checking forever, no counts (autobyteus-483 REQ-005, AC-009)', async () => {
    const queriesBefore = evidence.viewQueries ?? 0;
    await page.evaluate(() => window.__backgroundTasksProbe.clear());
    const noRun = panel.locator('[data-test="background-tasks-no-run"]');
    await noRun.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(3000);
    assert.equal((await noRun.innerText()).trim(), 'Select an agent to see its background tasks.');
    assert.equal(await counts.count(), 0, 'no counts without a run');
    const text = await panel.innerText();
    assert.doesNotMatch(text, /Checking|Current count unavailable/);
    assert.equal(evidence.viewQueries ?? 0, queriesBefore, 'nothing is read without a run');
    await shot('13-no-run.png');

    await page.evaluate((id) => window.__backgroundTasksProbe.select(id), RUN);
    await rows.first().waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await noRun.count(), 0);
    return { queriesBefore };
  });

  // The probe has no backend: app-shell GraphQL bootstrap queries get an empty mock response and Apollo
  // logs "missing field" (error 13) for them. They are unrelated to the panel and recorded separately.
  const isMockBackendNoise = (event) => event.type === 'console:error' && event.text.includes('go.apollo.dev/c/err')
    && decodeURIComponent(event.text).includes('"message":13');
  const browserEvents = evidence.browserEvents.filter((event) => event.type === 'pageerror' || event.type === 'console:error');
  evidence.ignoredMockBackendErrors = browserEvents.filter(isMockBackendNoise).length;
  const browserErrors = browserEvents.filter((event) => !isMockBackendNoise(event));
  assert.deepEqual(browserErrors, [], `Browser errors: ${JSON.stringify(browserErrors)}`);
  await context.close();
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({ id: 'HARNESS', message: error.message, stack: error.stack });
  }
} finally {
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwned(child); }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { if (log) await new Promise((resolve) => log.end(resolve)); evidence.cleanup.log = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.log = `failed: ${error.message}`; }
  try { if (fixtureInstalled) await fs.rm(installedPagePath, { force: true }); evidence.cleanup.fixture = fixtureInstalled ? 'removed' : 'not-installed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.fixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = { evidencePath, logPath };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result !== 'Pass') {
  console.error(`Background tasks browser probe failed. Evidence: ${evidencePath}`);
  process.exitCode = 1;
} else {
  console.log(`Background tasks browser probe passed. Evidence: ${evidencePath}`);
}
