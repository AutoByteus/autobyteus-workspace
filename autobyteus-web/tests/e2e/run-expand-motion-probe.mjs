#!/usr/bin/env node
// autobyteus-390 (REQ-001, REQ-002, REQ-004; AC-001, AC-002, AC-005, AC-006): rows of the Runs view never slide. Against
// the product RunListPanel in real headless Chrome, an Agent run's delegated rows:
//   - expand shows them complete (with their Task lines) at their final place from the first frame; collapse hides them;
//   - Task answers that arrive after the rows are shown push the rows below at once, with no transform;
//   - expanding a delegated Team pushes the rows below at once, with no transform;
//   - a finished Task's row still fades and closes, and the row below glides up by layout;
//   - outside the Runs view (the Workspaces and Projects trees) the shared move rule is unchanged.
//   pnpm -C autobyteus-web test:e2e:run-expand-motion [--output-dir <fresh dir>] [--browser-executable <path>]
// Prerequisites: pnpm install; pnpm exec nuxt prepare. Owns a Nuxt dev server on a free port with a dead backend URL,
// a fixture route (tests/e2e/fixtures/run-expand-motion.page.vue) and Chrome; all are removed in finally.
// Before the fix: on the base, expand slid every row down from the top of the window; with SR-001's v-if, the rows came
// back without their Task lines and slid when the answers arrived.
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { prepareOutputDir, probeOutputDir } from './fixtures/probe-output-dir.mjs';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const fixturePath = path.join(scriptDir, 'fixtures/run-expand-motion.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-run-expand-motion.vue');
const routePath = '/api-e2e-run-expand-motion';
const arg = (name) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : undefined;
};
const outputDir = prepareOutputDir(probeOutputDir(webDir, 'run-expand-motion', arg('output-dir')));
const executablePath = arg('browser-executable') || process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const FRAMES = 4;
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version,
  executablePath, cases: {}, browserEvents: [], cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const until = async (label, predicate, ms = 180_000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(100); }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const exited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const stop = async (child) => {
  if (exited(child)) return 'not-running';
  process.kill(-child.pid, 'SIGTERM');
  try { await until('Nuxt exit', () => exited(child), 10_000); return 'SIGTERM'; }
  catch { process.kill(-child.pid, 'SIGKILL'); await until('Nuxt forced exit', () => exited(child), 5_000); return 'SIGKILL'; }
};
const runCase = async (id, description, fn) => {
  try {
    evidence.cases[id] = { description, result: 'Pass', details: await fn() };
  } catch (error) {
    evidence.cases[id] = { description, result: 'Fail', message: error.message, details: error.details };
    evidence.failures.push({ id, message: error.message });
  }
  await save();
  console.log(`${id} ${evidence.cases[id].result} ${description}${evidence.cases[id].message ? ` — ${evidence.cases[id].message}` : ''}`);
};

let nuxt, nuxtLog, browser, installed = false;
try {
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  assert(!existsSync(installedPagePath), `Refusing to overwrite an existing page: ${installedPagePath}`);
  await fs.copyFile(fixturePath, installedPagePath); installed = true;
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  nuxtLog = createWriteStream(path.join(outputDir, 'nuxt.log'));
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
  });
  nuxt.stdout.pipe(nuxtLog); nuxt.stderr.pipe(nuxtLog);
  await until('Nuxt fixture route', async () => { assert(!exited(nuxt), 'Nuxt exited'); return (await fetch(`${baseUrl}${routePath}`)).ok; });

  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => { if (message.type() === 'error') evidence.browserEvents.push({ type: 'console:error', text: message.text() }); });
  // The fixture has no backend: GraphQL answers empty, and the shell's change-feed sockets stay quiet.
  await page.route('**/rest/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
  // Each delegated worker is on a Task (taskWorkerTasks). While `holdTasks` is set, the answers wait until released, as a
  // slow answer does: the rows are shown first and their Task lines arrive later.
  let holdTasks = false;
  const heldTasks = [];
  const taskAnswer = (workerKind) => (workerRunId) => ({ __typename: 'TaskWorkerTask', workerKind, workerRunId, task: {
    taskId: `task-${workerRunId}`, projectId: 'probe-project', title: `Release notes for ${workerRunId}`,
    description: `Release notes for ${workerRunId}`, status: 'IN_PROGRESS' } });
  await page.route('**/graphql', (route) => {
    let payload = {};
    try { payload = route.request().postDataJSON() ?? {}; } catch { payload = {}; }
    if (payload.operationName !== 'GetTaskWorkerTasks') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    }
    const { agentRunIds = [], teamRunIds = [] } = payload.variables ?? {};
    const body = JSON.stringify({ data: { taskWorkerTasks: [...agentRunIds.map(taskAnswer('agent')), ...teamRunIds.map(taskAnswer('team'))] } });
    const answer = () => route.fulfill({ status: 200, contentType: 'application/json', body });
    if (holdTasks) { heldTasks.push(answer); return undefined; }
    return answer();
  });
  const releaseTasks = async () => { holdTasks = false; for (const answer of heldTasks.splice(0)) await answer(); };
  await page.routeWebSocket(/\/ws\/projects(\?|$)/, (ws) => { ws.send(JSON.stringify({ type: 'connected' })); });
  await page.routeWebSocket(/\/ws\/(?!projects)/, () => undefined);
  const load = async () => {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__runExpandMotionProbe) && window.__runExpandMotionProbe.rowCount() > 0, undefined, { timeout: 120_000 });
  };
  // Warm-up: a cold Nuxt dev server may re-optimize dependencies and reload the page once (TESTING.md).
  await load(); await sleep(3000); await load(); await sleep(1000);
  holdTasks = true;
  await load();
  evidence.browserEvents = [];
  const probe = (fn, ...args) => page.evaluate(([name, rest]) => window.__runExpandMotionProbe[name](...rest), [fn, args]);
  /** Every sample of a row that was on screen before and after: no transform, and only at its old or its new top. */
  const slides = (frames, before, after) => frames.flatMap(({ t, rows }) => rows
    .filter((row) => !row.leaving && row.key in before && row.key in after)
    .filter((row) => row.transform !== 'none' || (row.top !== before[row.key] && row.top !== after[row.key]))
    .map((row) => ({ t, ...row, before: before[row.key], after: after[row.key] })));
  const topsByKey = (rows) => Object.fromEntries(rows.map((row) => [row.key, row.top]));

  await runCase('REM-01', 'Expanded at first: twelve delegated rows at rest, before their Task answers arrive', async () => {
    assert(await probe('isExpanded') === true, 'The run does not start expanded');
    await until('the Task answers asked', async () => heldTasks.length > 0, 15_000);
    const rows = await probe('sample');
    assert(rows.length === 12, 'Expected twelve delegated rows', { rows });
    assert(rows.every((row) => row.transform === 'none' && !row.taskLine), 'A row is moving, or already has its Task line', { rows });
    assert(rows[0].top > 150, 'The delegated rows are not below other runs', { rows });
    await page.screenshot({ path: path.join(outputDir, 'REM-01-before-task-answers.png') });
    return { rows };
  });

  await runCase('REM-02', 'Task answers arrive after the rows are shown: the rows below move to their new place at once, with no transform (AC-005)', async () => {
    const before = topsByKey(await probe('sample'));
    await probe('startRecording');
    await releaseTasks();
    await until('every Task line', async () => (await probe('taskLines')) === 12, 15_000);
    await sleep(600);
    const frames = await probe('stopRecording');
    const settled = await probe('sample');
    const after = topsByKey(settled);
    const moved = Object.keys(after).filter((key) => after[key] !== before[key]);
    assert(moved.length >= 10, 'The Task lines did not push the rows below', { before, after });
    const offending = slides(frames, before, after);
    assert(offending.length === 0, `${offending.length} row samples slid while the Task lines arrived`, { firstOffending: offending.slice(0, 6) });
    await page.screenshot({ path: path.join(outputDir, 'REM-02-task-lines.png') });
    return { frames: frames.length, moved: moved.length, before, after };
  });

  let expanded = [];
  await runCase('REM-03', 'Collapse: the delegated rows are hidden at once (AC-002)', async () => {
    expanded = await probe('sample');
    const { perFrame, settled } = await probe('toggleAndSample', FRAMES);
    assert(await probe('isExpanded') === false, 'The run did not collapse');
    assert(perFrame.every((rows) => rows.length === 0) && settled.length === 0, 'Delegated rows are still shown after collapse', { perFrame, settled });
    assert(await probe('treeShown') === false, 'The delegated tree is still shown');
    await page.screenshot({ path: path.join(outputDir, 'REM-03-collapsed.png') });
    return { perFrame: perFrame.map((rows) => rows.length) };
  });

  await runCase('REM-04', `Expand: from the first frame, every row is complete (its Task line) at its final place with no transform (AC-001; ${FRAMES} frames)`, async () => {
    const { perFrame, settled } = await probe('toggleAndSample', FRAMES);
    assert(await probe('isExpanded') === true, 'The run did not expand');
    const finalTops = settled.map((row) => row.top);
    const expandedTops = expanded.map((row) => row.top);
    assert(settled.length === 12 && JSON.stringify(finalTops) === JSON.stringify(expandedTops), 'Settled rows differ from before collapse', { finalTops, expandedTops });
    assert(perFrame.every((rows) => rows.length === 12), 'Not every delegated row is on screen from the first frame', { counts: perFrame.map((rows) => rows.length) });
    const offending = perFrame.flatMap((rows, frame) => rows
      .map((row, index) => ({ frame, index, ...row, final: finalTops[index] }))
      .filter((row) => row.transform !== 'none' || row.top !== row.final || !row.taskLine));
    assert(offending.length === 0, `${offending.length} row samples moved from elsewhere on screen, or lacked their Task line`, { firstOffending: offending.slice(0, 6), frames: perFrame });
    await page.screenshot({ path: path.join(outputDir, 'REM-04-expanded-again.png') });
    return { frames: perFrame, settled };
  });

  await runCase('REM-05', 'Expanding a delegated Team: its members appear and the rows below move at once, with no transform (AC-005)', async () => {
    const before = topsByKey(await probe('sample'));
    await probe('startRecording');
    await probe('expandTeam', 2);
    await until('the Team\'s members', async () => (await probe('rowCount')) > 12, 10_000);
    await sleep(600);
    const frames = await probe('stopRecording');
    const settled = await probe('sample');
    const after = topsByKey(settled);
    const pushed = Object.keys(before).filter((key) => after[key] !== undefined && after[key] > before[key]);
    assert(pushed.length >= 9, 'The members did not push the rows below', { before, after });
    const offending = slides(frames, before, after);
    assert(offending.length === 0, `${offending.length} row samples slid when the Team expanded`, { firstOffending: offending.slice(0, 6) });
    const members = settled.filter((row) => !(row.key in before));
    assert(members.length > 0 && members.every((row) => row.transform === 'none'), 'The members are not at rest', { members });
    await page.screenshot({ path: path.join(outputDir, 'REM-05-team-expanded.png') });
    return { frames: frames.length, pushed: pushed.length, members: members.length };
  });

  await runCase('REM-06', 'A finished Task\'s row fades and closes; the row below glides up by layout, with no transform (AC-005, E-11)', async () => {
    const before = await probe('sample');
    // Team 5's row; after REM-05 the rows of Team 2's members sit above it, so it is found among the Team rows.
    const closedKey = await probe('teamRowKey', 5);
    const index = before.findIndex((row) => row.key === closedKey);
    const nextKey = before[index + 1]?.key;
    assert(closedKey && nextKey, 'No row to close, or none below it', { before });
    await probe('startRecording');
    await probe('closeDelegation', 5);
    await until('the closed row is gone', async () => !(await probe('sample')).some((row) => row.key === closedKey), 5_000);
    await sleep(300);
    const frames = await probe('stopRecording');
    const leavingOpacities = frames.flatMap(({ rows }) => rows.filter((row) => row.key === closedKey && row.leaving).map((row) => row.opacity));
    const nextTops = [...new Set(frames.map(({ rows }) => rows.find((row) => row.key === nextKey)?.top).filter((top) => top !== undefined))];
    const transforms = frames.flatMap(({ t, rows }) => rows.filter((row) => !row.leaving && row.transform !== 'none').map((row) => ({ t, ...row })));
    assert(leavingOpacities.some((opacity) => opacity > 0.05 && opacity < 0.95), 'The finished row did not fade', { leavingOpacities });
    assert(nextTops.length >= 3 && nextTops.every((top, i) => i === 0 || top < nextTops[i - 1]), 'The row below did not glide up', { nextTops });
    assert(transforms.length === 0, 'A row moved with a transform', { transforms: transforms.slice(0, 6) });
    await page.screenshot({ path: path.join(outputDir, 'REM-06-after-done.png') });
    return { closedKey, nextKey, leavingOpacities: leavingOpacities.slice(0, 20), nextTops };
  });

  await runCase('REM-07', 'AC-006: the move is off inside the Runs view only; the same tree row outside it keeps the shared move rule', async () => {
    const transitions = await probe('moveTransitions');
    assert(!/transform/.test(transitions.insideRunsView), 'The Runs view still moves rows', transitions);
    assert(/transform 0\.2s ease-out/.test(transitions.outsideRunsView), 'The shared move rule is gone outside the Runs view', transitions);
    return transitions;
  });

  await runCase('REM-08', 'No browser errors during the cases', async () => {
    assert(evidence.browserEvents.length === 0, 'Browser errors', evidence.browserEvents);
    return { events: 0 };
  });
} catch (error) {
  evidence.failures.push({ id: 'harness', message: String(error?.stack ?? error) });
  console.error(`[run-expand-motion] ${error.message}`);
} finally {
  await browser?.close().catch(() => undefined); evidence.cleanup.browserClosed = Boolean(browser);
  evidence.cleanup.nuxt = await stop(nuxt).catch((error) => `stop failed: ${error.message}`);
  nuxtLog?.end();
  if (installed) await fs.rm(installedPagePath, { force: true });
  evidence.cleanup.installedPageRemoved = !existsSync(installedPagePath);
  evidence.result = evidence.failures.length === 0 && Object.keys(evidence.cases).length === 8 ? 'Pass' : 'Fail';
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ result: evidence.result, evidencePath, cleanup: evidence.cleanup }));
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}
