#!/usr/bin/env node
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const fixturePath = path.join(scriptDir, 'fixtures/team-task-conversation.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-team-task-conversation.vue');
const routePath = '/api-e2e-team-task-conversation';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const timeoutMs = Number(getArg('timeout-ms', '90000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/team-task-conversation'));
const explicitPort = getArg('port');
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));
const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  scenarios: {},
  referenceRequests: [],
  browserEvents: [],
  failures: [],
  cleanup: {},
};

const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};
const scenario = async (id, run) => {
  const startedAt = Date.now();
  try {
    const details = await run();
    evidence.scenarios[id] = { result: 'Pass', durationMs: Date.now() - startedAt, ...details };
  } catch (error) {
    evidence.scenarios[id] = {
      result: 'Fail', durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error), details: error?.details,
    };
    throw error;
  }
};
const choosePort = async () => explicitPort ? Number(explicitPort) : await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});
const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = (child, timeout) => new Promise((resolve) => {
  if (childExited(child)) return resolve(true);
  const timer = setTimeout(() => resolve(childExited(child)), timeout);
  child.once('exit', () => { clearTimeout(timer); resolve(true); });
});
const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  if (!childExited(child)) {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    if (!await waitForChildExit(child, 5000)) {
      if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
      else child.kill('SIGKILL');
      assert(await waitForChildExit(child, 5000), 'Owned Nuxt process did not exit after SIGKILL');
    }
  }
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};
const waitForHttp = async (url, child) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    assert(!childExited(child), 'Nuxt exited before readiness');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
};
const visibleText = async (locator) => (await locator.innerText()).replace(/\s+/g, ' ').trim();
const rowLabels = async (entry) => await entry.locator('[data-test="team-delegated-task-lifecycle-label"]').allInnerTexts();
const waitFor = async (predicate, message, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
};

let nuxt;
let browser;
let context;
let page;
let serverLog;
let installed = false;
try {
  await fs.mkdir(outputDir, { recursive: true });
  assert(existsSync(fixturePath), `Missing fixture: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
  installed = true;

  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.baseUrl = baseUrl;
  serverLog = createWriteStream(path.join(outputDir, 'nuxt.log'), { flags: 'w' });
  nuxt = spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1' },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(serverLog);
  nuxt.stderr.pipe(serverLog);
  await waitForHttp(`${baseUrl}${routePath}`, nuxt);

  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));
  await page.route('**/team-runs/**/task-delegations/**/references/**/content', async (route) => {
    const url = new URL(route.request().url());
    const referenceId = decodeURIComponent(url.pathname.split('/').at(-2) || 'unknown');
    evidence.referenceRequests.push({ method: route.request().method(), url: url.toString(), referenceId });
    await route.fulfill({
      status: 200,
      contentType: 'text/markdown; charset=utf-8',
      body: `# Reference ${referenceId}\n\nREFERENCE_CONTENT_${referenceId}`,
    });
  });
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="team-task-conversation-probe"]').waitFor();
  await page.waitForFunction(() => Boolean(window.__teamTaskConversationProbe));
  await page.evaluate(() => window.__teamTaskConversationProbe.setLocale('en'));

  const messagesHeader = page.locator('[data-test="team-messages-header"]');
  const tasksHeader = page.locator('[data-test="team-delegated-tasks-header"]');
  const taskNavigator = page.locator('[data-test="team-delegated-tasks-navigator"]');

  await scenario('empty-and-messages-baseline', async () => {
    assert((await visibleText(messagesHeader)).includes('1 Messages'), 'Initial Messages count changed');
    assert((await visibleText(tasksHeader)).includes('0 tasks'), 'Initial Tasks empty count changed');
    assert(await page.locator('[data-test="team-communication-message-row"]').count() === 1, 'Ordinary message row missing');
    assert((await page.locator('body').innerText()).includes('Ordinary classroom note'), 'Ordinary message detail missing');
    return { messageRows: 1, taskCount: 0 };
  });

  await scenario('restored-snapshot-and-focus-filter', async () => {
    assert(await page.evaluate(() => window.__teamTaskConversationProbe.hydrate()) === 'applied', 'Snapshot was not applied');
    await tasksHeader.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent?.includes('2 tasks'));
    const entries = taskNavigator.locator('article');
    assert(await entries.count() === 2, 'Teacher perspective did not show exactly two related tasks');
    const first = entries.filter({ hasText: 'Classroom assignment' });
    const interrupted = entries.filter({ hasText: 'Wait for interruption validation' });
    assert(await first.count() === 1 && await interrupted.count() === 1, 'Restored task order/content missing');
    assert(await entries.first().innerText().then((text) => text.includes('Classroom assignment')), 'Task source order changed');
    assert(await first.locator('[data-test="team-delegated-task-summary-row"]').getAttribute('aria-pressed') === 'true', 'First root was not initially selected');
    assert((await visibleText(first.locator('[data-test="team-delegated-task-status"]'))).includes('Revision requested'), 'Derived revision status missing');
    assert((await rowLabels(first)).join('|') === 'Result submitted · Result 1|Revision requested · Result 1', 'Restored lifecycle labels/order changed');
    assert((await visibleText(interrupted)).includes('Task interrupted'), 'Interrupted terminal row missing');
    assert(!(await visibleText(taskNavigator)).includes('Ordinary classroom note'), 'Ordinary message leaked into task rows');
    return { taskEntries: 2, restoredLifecycleRows: 3 };
  });

  await scenario('keyboard-selection-and-live-replacement', async () => {
    const first = taskNavigator.locator('article').filter({ hasText: 'Classroom assignment' });
    const firstResult = first.locator('[data-test="team-delegated-task-lifecycle-row"]').first();
    await firstResult.focus();
    await page.keyboard.press('Enter');
    assert(await firstResult.getAttribute('aria-pressed') === 'true', 'Enter did not select the result row');
    const accessibleName = await firstResult.getAttribute('aria-label');
    assert(accessibleName?.includes('Result submitted · Result 1') && accessibleName.includes('StudentStudyGroup → Teacher'), 'Accessible row name is incomplete', { accessibleName });
    assert((await visibleText(page.locator('[data-test="delegated-task-update-body"]'))).includes('first classroom result needs review'), 'Selected result detail missing');
    assert(await page.evaluate(() => window.__teamTaskConversationProbe.acceptLive()) === 'applied', 'Live TASK_CHANGED was not applied');
    await page.waitForFunction(() => document.querySelectorAll('[data-test="team-delegated-task-lifecycle-row"]').length === 5);
    assert(await firstResult.getAttribute('aria-pressed') === 'true', 'Stable selected result was lost after full-record replacement');
    assert((await visibleText(page.locator('[data-test="delegated-task-update-body"]'))).includes('first classroom result needs review'), 'Live replacement changed selected detail');
    assert((await rowLabels(first)).join('|') === [
      'Result submitted · Result 1',
      'Revision requested · Result 1',
      'Revised result submitted · Result 2',
      'Result 2 accepted',
    ].join('|'), 'Live lifecycle rows were missing, reordered, or duplicated');
    assert((await visibleText(first.locator('[data-test="team-delegated-task-status"]'))).includes('Accepted'), 'Accepted status missing after live replacement');
    await first.locator('[data-test="team-delegated-task-lifecycle-row"]').nth(3).focus();
    await page.keyboard.press('Space');
    assert((await visibleText(page.locator('[data-test="delegated-task-item-title"]'))) === 'Result 2 accepted', 'Space did not select acceptance');
    assert((await visibleText(page.locator('[data-test="delegated-task-update-body"]'))).includes('Result accepted.'), 'Null-comment acceptance fallback missing');
    await page.screenshot({ path: path.join(outputDir, 'accepted-live-lifecycle.png'), fullPage: true });
    return { totalVisibleLifecycleRows: 5, stableSelection: true, acceptanceFallback: true };
  });

  await scenario('exact-reference-route-viewer-and-owner-return', async () => {
    const first = taskNavigator.locator('article').filter({ hasText: 'Classroom assignment' });
    const root = first.locator('[data-test="team-delegated-task-summary-row"]');
    const rootReference = first.locator('[data-test="team-delegated-task-references"] [data-test="team-delegated-task-reference-row"]');
    await rootReference.click();
    await page.getByText('REFERENCE_CONTENT_assignment-ref').waitFor();
    assert(evidence.referenceRequests.at(-1)?.url.includes('/team-runs/browser-team-run/task-delegations/task-accepted-lifecycle/references/assignment-ref/content'), 'Root reference used the wrong content route', evidence.referenceRequests.at(-1));
    const viewer = page.locator('[data-test="team-reference-viewer-shell"]');
    assert(await viewer.getByTitle('Raw').count() === 1 && await viewer.getByTitle('Preview').count() === 1, 'Icon-only Raw/Preview controls missing');
    assert(!(await visibleText(viewer)).includes('Raw') && !(await visibleText(viewer)).includes('Preview'), 'Raw/Preview became visible text controls');
    await viewer.locator('[data-test="team-reference-viewer-maximize-toggle"]').click();
    assert((await viewer.getAttribute('class'))?.includes('fixed'), 'Viewer did not maximize');
    await page.keyboard.press('Escape');
    assert(!(await viewer.getAttribute('class'))?.includes('fixed'), 'Escape did not restore viewer');
    await root.click();
    assert(await page.locator('[data-test="delegated-task-task-body"]').count() === 1, 'Root owner did not restore task content');

    const resultReference = first.locator('[data-test="team-delegated-task-update-references"]').first()
      .locator('[data-test="team-delegated-task-reference-row"]');
    await resultReference.click();
    await page.getByText('REFERENCE_CONTENT_result-v1-ref').waitFor();
    const beforeReselect = evidence.referenceRequests.length;
    await resultReference.click();
    await waitFor(
      () => evidence.referenceRequests.length === beforeReselect + 1,
      'Timed out waiting for exact-reference reselection refresh',
    );
    assert(evidence.referenceRequests.length === beforeReselect + 1, 'Reselect did not refresh the exact reference');
    await first.locator('[data-test="team-delegated-task-lifecycle-row"]').first().click();
    assert((await visibleText(page.locator('[data-test="delegated-task-update-body"]'))).includes('first classroom result needs review'), 'Submission owner did not restore result content');

    const reviewReference = first.locator('[data-test="team-delegated-task-update-references"]').nth(1)
      .locator('[data-test="team-delegated-task-reference-row"]');
    await reviewReference.click();
    await page.getByText('REFERENCE_CONTENT_review-ref').waitFor();
    assert(evidence.referenceRequests.at(-1)?.referenceId === 'review-ref', 'Review reference owner identity was lost');
    await page.screenshot({ path: path.join(outputDir, 'review-reference-preview.png'), fullPage: true });
    return { referenceRequests: evidence.referenceRequests.length, maximizeEscapeRestore: true };
  });

  await scenario('focus-perspectives-and-messages-no-change', async () => {
    const ids = await page.evaluate(() => window.__teamTaskConversationProbe.ids);
    await page.evaluate((id) => window.__teamTaskConversationProbe.focus(id), ids.studentTaskRunId);
    await page.waitForFunction(() => document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent?.includes('1 task'));
    assert((await visibleText(taskNavigator)).includes('Classroom assignment'), 'Task-Team coordinator perspective lost owning task');
    assert(!(await visibleText(taskNavigator)).includes('Wait for interruption validation'), 'Task-Team execution leaked another task-Team execution');
    await page.evaluate((id) => window.__teamTaskConversationProbe.focus(id), ids.observerRunId);
    await page.waitForFunction(() => document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent?.includes('1 task'));
    assert((await visibleText(taskNavigator)).includes('Observer-only unrelated task'), 'Observer perspective did not show exact related task');
    assert(!(await visibleText(taskNavigator)).includes('Classroom assignment'), 'Observer perspective leaked teacher task');
    await page.evaluate((id) => window.__teamTaskConversationProbe.focus(id), ids.teacherRunId);
    await page.waitForFunction(() => document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent?.includes('2 tasks'));
    await messagesHeader.click();
    assert(await page.locator('[data-test="team-communication-message-row"]').count() === 1, 'Messages list count changed after task journeys');
    assert((await visibleText(page.locator('[data-test="team-communication-detail-pane"]'))).includes('Ordinary classroom note'), 'Messages selected detail changed');
    return { teacherTasks: 2, studentTaskTasks: 1, observerTasks: 1, messages: 1 };
  });

  await scenario('localization-accessibility-and-technical-absence', async () => {
    await tasksHeader.click();
    await page.evaluate(() => window.__teamTaskConversationProbe.setLocale('zh-CN'));
    await page.waitForFunction(() => document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent?.includes('任务'));
    const first = taskNavigator.locator('article').filter({ hasText: 'Classroom assignment' });
    const chineseLabels = await rowLabels(first);
    assert(chineseLabels.join('|') === '已提交结果 · 结果 1|已请求修订 · 结果 1|已提交修订结果 · 结果 2|结果 2 已接受', 'Simplified Chinese lifecycle labels diverged', { chineseLabels });
    assert((await visibleText(first.locator('[data-test="team-delegated-task-status"]'))).includes('已接受'), 'Chinese status text missing');
    const bodyText = await page.locator('body').innerText();
    assert(!bodyText.includes('Technical details') && !bodyText.includes('技术详情'), 'Technical details disclosure remains visible');
    assert(!/task-accepted-lifecycle|teacher-run|task-study-group-run/.test(bodyText), 'Internal IDs leaked into visible UI');
    assert(await page.locator('[data-test="team-delegated-task-technical-details"]').count() === 0, 'Technical-details DOM remains');
    assert(await page.locator('[data-test="delegated-task-detail-pane"] [data-test="team-delegated-task-lifecycle-list"]').count() === 0, 'Right pane duplicates the lifecycle list');
    assert(await page.locator('[data-test="delegated-task-detail-pane"] [data-test="team-delegated-task-reference-row"]').count() === 0, 'Right item detail duplicates reference rows');
    const handle = page.locator('[data-test="team-delegated-tasks-resize-handle"]');
    const aside = page.locator('[data-test="team-delegated-tasks-navigator"]');
    const initialWidth = await aside.evaluate((element) => element.getBoundingClientRect().width);
    const box = await handle.boundingBox();
    assert(box, 'Resize handle has no browser geometry');
    await handle.dispatchEvent('mousedown', { clientX: box.x + box.width / 2, button: 0 });
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, buttons: 1 }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 0, button: 0 }));
    });
    const minWidth = await aside.evaluate((element) => element.getBoundingClientRect().width);
    const minBox = await handle.boundingBox();
    assert(minBox, 'Resize handle lost browser geometry after minimum resize');
    await handle.dispatchEvent('mousedown', { clientX: minBox.x + minBox.width / 2, button: 0 });
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1200, buttons: 1 }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 1200, button: 0 }));
    });
    const maxWidth = await aside.evaluate((element) => element.getBoundingClientRect().width);
    assert(Math.abs(initialWidth - 248) <= 1 && Math.abs(minWidth - 168) <= 1 && Math.abs(maxWidth - 360) <= 1, 'Split bounds changed', { initialWidth, minWidth, maxWidth });
    await page.screenshot({ path: path.join(outputDir, 'localized-technical-absence.png'), fullPage: true });
    return { chineseLabels, technicalDetailsAbsent: true, rightPaneNavigationAbsent: true, splitWidths: { initialWidth, minWidth, maxWidth } };
  });

  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail';
  evidence.failures.push({
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
} finally {
  try { if (page && outputDir) await page.screenshot({ path: path.join(outputDir, 'final-state.png'), fullPage: true }); } catch {}
  try { await context?.close(); evidence.cleanup.browserContext = 'closed'; } catch (error) { evidence.failures.push({ message: `context cleanup: ${error.message}` }); }
  try { await browser?.close(); evidence.cleanup.browser = 'closed'; } catch (error) { evidence.failures.push({ message: `browser cleanup: ${error.message}` }); }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxt); } catch (error) { evidence.failures.push({ message: `nuxt cleanup: ${error.message}` }); }
  try { if (installed) await fs.rm(installedPagePath, { force: true }); evidence.cleanup.fixturePage = 'removed'; } catch (error) { evidence.failures.push({ message: `fixture cleanup: ${error.message}` }); }
  try { serverLog?.end(); } catch {}
  evidence.finishedAt = new Date().toISOString();
  if (evidence.failures.length && evidence.result === 'Pass') {
    evidence.result = 'Fail';
    process.exitCode = 1;
  }
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ result: evidence.result, scenarios: evidence.scenarios, cleanup: evidence.cleanup }, null, 2)}\n`);
}
