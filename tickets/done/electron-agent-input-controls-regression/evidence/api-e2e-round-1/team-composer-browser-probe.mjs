#!/usr/bin/env node
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../../../../../autobyteus-web');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const fixturePath = path.join(scriptDir, 'team-composer-browser.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-team-composer.vue');
const routePath = '/api-e2e-team-composer';
const outputDir = path.join(scriptDir, 'browser');
const timeoutMs = 90_000;
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || browserCandidates.find((candidate) => existsSync(candidate));

const evidence = {
  startedAt: new Date().toISOString(),
  result: 'Pass',
  webDir,
  fixturePath,
  installedPagePath,
  browserExecutable: executablePath ?? null,
  scenarios: {},
  browserEvents: [],
  cleanup: {},
};

const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const choosePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close(() => resolve(port));
  });
});

const waitFor = async (description, callback, timeout = timeoutMs) => {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeout) {
    try {
      const value = await callback();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};

const childHasExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForExit = (child, timeout) => new Promise((resolve) => {
  if (childHasExited(child)) return resolve(true);
  let timer;
  const done = (value) => {
    clearTimeout(timer);
    child.off('exit', onExit);
    resolve(value);
  };
  const onExit = () => done(true);
  child.once('exit', onExit);
  timer = setTimeout(() => done(childHasExited(child)), timeout);
});

const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  if (!childHasExited(child)) {
    process.kill(-child.pid, 'SIGTERM');
    if (!(await waitForExit(child, 10_000))) {
      process.kill(-child.pid, 'SIGKILL');
      assert(await waitForExit(child, 5_000), 'Owned Nuxt process did not exit after SIGKILL');
    }
  }
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};

const finishStream = (stream) => new Promise((resolve) => stream ? stream.end(resolve) : resolve());

const runScenario = async (id, description, callback) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await callback();
    evidence.scenarios[id] = { description, result: 'Pass', startedAt, details };
    return details;
  } catch (error) {
    const failure = {
      description,
      result: 'Fail',
      startedAt,
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = failure;
    evidence.result = 'Fail';
    throw error;
  }
};

await fs.mkdir(outputDir, { recursive: true });
const logPath = path.join(outputDir, 'nuxt.log');
const evidencePath = path.join(outputDir, 'evidence.json');
let logStream;
let nuxtProcess;
let browser;
let fixtureInstalled = false;

try {
  assert(existsSync(fixturePath), `Missing fixture: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable was found');
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;

  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  logStream = createWriteStream(logPath, { flags: 'w' });
  nuxtProcess = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: true,
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxtProcess.stdout.pipe(logStream);
  nuxtProcess.stderr.pipe(logStream);

  await waitFor('owned Nuxt fixture readiness', async () => {
    if (childHasExited(nuxtProcess)) throw new Error(`Nuxt exited: ${nuxtProcess.exitCode}/${nuxtProcess.signalCode}`);
    const response = await fetch(`${baseUrl}${routePath}`);
    return response.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, locale: 'en-US' });
  await context.route('**/rest/health', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ok' }),
  }));
  const page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed',
    url: request.url(),
    failure: request.failure()?.errorText,
  }));
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="team-composer-browser-probe"]').waitFor({ state: 'visible' });

  const text = (testId) => page.locator(`[data-test="${testId}"]`).innerText();
  const textarea = page.locator('[data-test="composer-surface"] textarea');
  const clickControl = (id) => page.locator(`[data-test="${id}"]`).click();
  const clickAttachmentRemove = (label) => page.locator('li').filter({ hasText: label }).locator('button').last().click();
  const clickClearAll = () => page.getByRole('button', { name: /Clear all/i }).click();

  await runScenario('BR-003A', 'successful individual remove and Clear all keep visible and authoritative Team attachment state equal', async () => {
    await clickControl('stage-success-attachments');
    await waitFor('two visible success attachments', async () => (await text('visible-attachment-ids')) === 'success-one,success-two');
    await clickAttachmentRemove('success-one.txt');
    await waitFor('one visible/authoritative success attachment', async () => (
      (await text('visible-attachment-ids')) === 'success-two'
      && (await text('a-attachment-ids')) === 'success-two'
    ));
    await clickClearAll();
    await waitFor('successful Clear all', async () => (
      (await text('visible-attachment-ids')) === ''
      && (await text('a-attachment-ids')) === ''
    ));
    return { deletedIds: await text('delete-calls'), visible: await text('visible-attachment-ids'), authoritative: await text('a-attachment-ids') };
  });

  await runScenario('BR-003B', 'delete failure retains only the failed Team attachment after Clear all', async () => {
    await clickControl('stage-failure-attachments');
    await waitFor('two failure-phase attachments', async () => (await text('a-attachment-ids')) === 'failure-keep,failure-remove');
    await clickClearAll();
    await waitFor('failed item retained and independent item removed', async () => (
      (await text('visible-attachment-ids')) === 'failure-keep'
      && (await text('a-attachment-ids')) === 'failure-keep'
    ));
    const bAttachments = await text('b-attachment-ids');
    assert(bAttachments === '', 'Member B attachments changed during A Clear all', { bAttachments });
    return { deletedIds: await text('delete-calls'), retained: await text('a-attachment-ids'), memberB: bAttachments };
  });

  await runScenario('BR-001_BR-004', 'actual Team send action admits once, clears visible draft, exposes pending, and sends only retained attachment state', async () => {
    await clickControl('reset-a-attachments');
    await clickControl('stage-send-attachments');
    await waitFor('three staged send attachments', async () => (await text('a-attachment-ids')) === 'retained-image,retained-file,removed-file');
    await clickAttachmentRemove('removed-file.txt');
    await waitFor('removed item absent before send', async () => (await text('a-attachment-ids')) === 'retained-image,retained-file');
    await textarea.fill('Submit exactly once');
    await textarea.press('Enter');
    await waitFor('one local event and one transport call', async () => (
      (await text('a-event-count')) === '1'
      && (await text('send-count')) === '1'
      && (await text('a-pending')) === 'true'
      && (await textarea.inputValue()) === ''
    ));
    const send = JSON.parse(await text('send-last'));
    assert(send.text === 'Submit exactly once', 'Transport text mismatch', send);
    assert(send.agentRunId === 'browser-member-a-run', 'Transport AgentRun mismatch', send);
    assert(JSON.stringify(send.contextFilePaths) === JSON.stringify(['/synthetic/retained-file.txt']), 'Transport context paths mismatch', send);
    assert(JSON.stringify(send.imageUrls) === JSON.stringify(['/synthetic/retained-image.png']), 'Transport image URLs mismatch', send);
    assert(!JSON.stringify(send).includes('removed-file'), 'Removed attachment reached transport', send);
    assert((await text('a-event-attachment-ids')) === 'retained-image,retained-file', 'Local event attachment state mismatch');
    assert((await text('a-draft')) === '', 'Authoritative A draft did not clear');
    assert((await text('a-attachment-ids')) === '', 'Authoritative A attachments did not clear');

    await clickControl('focus-b');
    await waitFor('member B isolated empty composer', async () => (
      (await text('selection')) === 'member-b'
      && (await textarea.inputValue()) === ''
      && (await text('visible-pending')) === 'false'
      && (await text('visible-attachment-ids')) === ''
    ));
    return {
      eventCount: await text('a-event-count'),
      eventAttachmentIds: await text('a-event-attachment-ids'),
      pendingA: await text('a-pending'),
      focusedB: {
        draft: await textarea.inputValue(),
        pending: await text('visible-pending'),
        attachments: await text('visible-attachment-ids'),
      },
      send,
    };
  });

  await runScenario('BR-002', 'actual voice result processing writes captured member A while B is focused and does not auto-submit', async () => {
    const sendCountBefore = await text('send-count');
    await clickControl('prepare-a-voice');
    assert((await text('selection')) === 'member-b', 'Voice preparation did not retain B focus');
    await clickControl('complete-voice');
    await waitFor('voice transcript-ready result', async () => (await text('voice-outcome')) === 'transcript-ready');
    assert((await text('voice-error')) === '', 'Voice boundary reported an error', await text('voice-error'));
    assert((await text('a-draft')) === 'Voice base captured transcript', 'Captured A draft mismatch', await text('a-draft'));
    assert((await text('b-draft')) === '', 'Focused B was mutated by A voice result', await text('b-draft'));
    assert((await textarea.inputValue()) === '', 'Focused B textarea changed during A voice result', await textarea.inputValue());
    assert((await text('send-count')) === sendCountBefore, 'Voice result auto-submitted');
    assert((await text('a-event-count')) === '1', 'Voice result added a local event');
    await clickControl('focus-a');
    await waitFor('captured A transcript visible on refocus', async () => (await textarea.inputValue()) === 'Voice base captured transcript');
    return {
      outcome: await text('voice-outcome'),
      memberA: await text('a-draft'),
      memberB: await text('b-draft'),
      sendCount: await text('send-count'),
      eventCount: await text('a-event-count'),
      visibleOnRefocus: await textarea.inputValue(),
    };
  });

  await runScenario('BR-005', 'standalone Agent draft, transcript insertion, and clear remain browser-observable', async () => {
    await clickControl('select-standalone');
    await waitFor('standalone selection', async () => (await text('selection')) === 'standalone');
    await textarea.fill('Standalone draft');
    await textarea.blur();
    await waitFor('standalone authoritative draft', async () => (await text('standalone-draft')) === 'Standalone draft');
    const sendCountBefore = await text('send-count');
    await clickControl('prepare-standalone-voice');
    await clickControl('complete-voice');
    await waitFor('standalone transcript visible', async () => (await textarea.inputValue()) === 'Standalone draft standalone transcript');
    assert((await text('send-count')) === sendCountBefore, 'Standalone voice result auto-submitted');
    await clickControl('clear-standalone');
    await waitFor('standalone clear visible', async () => (
      (await textarea.inputValue()) === ''
      && (await text('standalone-draft')) === ''
    ));
    return { transcriptVisible: true, cleared: true, sendCount: await text('send-count') };
  });

  await page.screenshot({ path: path.join(outputDir, 'final-standalone-clear.png'), fullPage: true });
  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  assert(pageErrors.length === 0, 'Browser emitted page errors', pageErrors);
  evidence.completedAt = new Date().toISOString();
} catch (error) {
  evidence.result = 'Fail';
  evidence.failure = {
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  };
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
    evidence.cleanup.browser = 'closed';
  }
  evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess);
  await finishStream(logStream);
  if (fixtureInstalled) {
    await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.temporaryPage = existsSync(installedPagePath) ? 'failed' : 'removed';
  } else {
    evidence.cleanup.temporaryPage = 'not-installed';
  }
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ result: evidence.result, evidencePath, cleanup: evidence.cleanup }, null, 2)}\n`);
}
