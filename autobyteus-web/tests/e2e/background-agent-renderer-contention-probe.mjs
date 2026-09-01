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
const fixturePath = path.join(scriptDir, 'fixtures/background-agent-renderer-contention.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-background-agent-renderer-contention.vue');
const routePath = '/api-e2e-background-agent-renderer-contention';

const getArg = (name, fallback = undefined) => {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1];
  return fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '120000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/background-agent-renderer-contention'));
const explicitPort = getArg('port');
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));
const evidence = {
  startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version,
  browserExecutable: executablePath || null, webDir, fixturePath, installedPagePath, routePath,
  scenarios: {}, browserEvents: [], failures: [], cleanup: {},
};
const assert = (condition, message, details = undefined) => {
  if (!condition) { const error = new Error(message); error.details = details; throw error; }
};
const percentile = (values, fraction) => {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};
const metrics = (values) => ({
  count: values.length,
  min: values.length ? Math.min(...values) : null,
  mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
  p95: percentile(values, 0.95),
  max: values.length ? Math.max(...values) : null,
});
const waitFor = async (description, fn, timeout = timeoutMs, interval = 100) => {
  const startedAt = Date.now(); let lastValue; let lastError;
  while (Date.now() - startedAt < timeout) {
    try { lastValue = await fn(); if (lastValue) return lastValue; } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(lastValue)}${lastError ? `; error=${lastError.message}` : ''}`);
};
const choosePort = async () => explicitPort ? Number(explicitPort) : await new Promise((resolve, reject) => {
  const server = net.createServer(); server.unref(); server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0;
    server.close(() => resolve(port));
  });
});
const childHasExited = (child) => child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = async (child, timeout) => childHasExited(child) ? true : await new Promise((resolve) => {
  const onExit = () => finish(true); let timer;
  const finish = (exited) => { clearTimeout(timer); child.off('exit', onExit); resolve(exited); };
  child.once('exit', onExit); timer = setTimeout(() => finish(childHasExited(child)), timeout);
});
const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  assert(child.pid, 'Owned Nuxt process has no PID');
  const details = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (!childHasExited(child)) {
    if (process.platform === 'win32') child.kill('SIGTERM'); else process.kill(-child.pid, 'SIGTERM');
    if (!(await waitForChildExit(child, 10000))) {
      if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL');
      assert(await waitForChildExit(child, 5000), 'Owned Nuxt process did not stop after SIGKILL', details);
    }
  }
  return { status: 'terminated', ...details, finalExitCode: child.exitCode, finalSignalCode: child.signalCode };
};
const finishStream = async (stream) => { if (stream) await new Promise((resolve) => stream.end(resolve)); };
const runScenario = async (id, description, fn) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn(); evidence.scenarios[id] = { description, result: 'Pass', startedAt, details }; return details;
  } catch (error) {
    const failure = { id, description, message: error instanceof Error ? error.message : String(error), details: error?.details, stack: error instanceof Error ? error.stack : undefined };
    evidence.scenarios[id] = { description, result: 'Fail', startedAt, failure }; evidence.failures.push(failure); throw error;
  }
};

await fs.mkdir(outputDir, { recursive: true });
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const evidencePath = path.join(outputDir, 'evidence.json');
const desktopScreenshotPath = path.join(outputDir, 'desktop-hierarchy.png');
const mobileScreenshotPath = path.join(outputDir, 'mobile-composer.png');
let nuxtProcess; let nuxtLog; let browser; let page; let fixtureInstalled = false; let result = 'Pass';

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  await fs.copyFile(fixturePath, installedPagePath); fixtureInstalled = true;
  const port = await choosePort(); const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port; evidence.baseUrl = baseUrl;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: process.platform !== 'win32',
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxtProcess.stdout.pipe(nuxtLog); nuxtProcess.stderr.pipe(nuxtLog);
  await waitFor('Nuxt fixture route', async () => {
    if (childHasExited(nuxtProcess)) throw new Error(`Nuxt exited before readiness: code=${nuxtProcess.exitCode} signal=${nuxtProcess.signalCode}`);
    const response = await fetch(`${baseUrl}${routePath}`); return response.ok;
  });
  browser = await chromium.launch({
    headless: true, executablePath,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', colorScheme: 'light' });
  await context.grantPermissions(['microphone'], { origin: baseUrl });
  await context.route('**/rest/health', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
  await context.route('**/graphql', async (route) => {
    const request = route.request();
    let payload = {};
    try { payload = request.postDataJSON?.() ?? {}; } catch { payload = {}; }
    const requestUrl = new URL(request.url());
    const query = typeof payload.query === 'string'
      ? payload.query
      : (requestUrl.searchParams.get('query') ?? '');
    const variables = payload.variables ?? {};
    const workspaceRootPath = typeof variables.workspaceId === 'string'
      ? variables.workspaceId
      : '/probe/workspace-0';
    const data = {
      agentDefinitions: [],
      agentTeamDefinitions: [],
      applicationsCapability: {
        __typename: 'ApplicationsCapability',
        enabled: false,
        scope: 'BOUND_NODE',
        settingKey: 'ENABLE_APPLICATIONS',
        source: 'INITIALIZED_EMPTY_CATALOG',
      },
      workspaceRunHistory: {
        __typename: 'WorkspaceRunHistoryGroupObject',
        workspaceRootPath,
        workspaceName: workspaceRootPath.split('/').filter(Boolean).at(-1) ?? 'Probe',
        agentDefinitions: [],
        teamDefinitions: [],
      },
    };

    if (query.includes('workspaceRunHistory')) delete data.applicationsCapability;
    if (query.includes('applicationsCapability')) delete data.workspaceRunHistory;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data }),
    });
  });
  page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({ type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }));
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="background-contention-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => Boolean(window.__backgroundContentionProbe), null, { timeout: timeoutMs });
  // The application health store performs its first connected refresh on a
  // timer. Let that initial definition/history refresh finish before measuring
  // the warmed steady state.
  await page.waitForTimeout(7500);
  // Exercise lazy workspace-history initialization once before collecting the
  // warmed latency baseline; subsequent topology builds must be traffic-driven.
  await page.locator('[data-test="teams-tab"]').click();
  await page.waitForTimeout(1000);
  await page.locator('[data-test="files-tab"]').click();
  await page.waitForTimeout(500);
  evidence.browserEvents = [];

  await runScenario('BG-BROWSER-000', 'Production fixture seeds the approved 26-workspace/38-team topology', async () => {
    const text = await page.locator('[data-test="topology-counts"]').textContent();
    assert(text?.includes('workspaces=26'), 'Expected 26 workspaces', text);
    assert(text?.includes('teams=38'), 'Expected 38 team runs', text);
    return { topologyText: text };
  });

  const actionScenario = async (mode) => {
    await page.evaluate((scenario) => window.__backgroundContentionProbe.startLoad(scenario, 6500), mode);
    for (let index = 0; index < 28; index += 1) {
      await page.locator(index % 2 === 0 ? '[data-test="teams-tab"]' : '[data-test="files-tab"]').click();
      await page.waitForTimeout(150);
    }
    return await page.evaluate(() => window.__backgroundContentionProbe.waitLoad());
  };
  const idle = await runScenario('BG-BROWSER-001A', 'Warmed foreground Files/Teams latency at idle', async () => {
    const summary = await actionScenario('idle');
    const latency = metrics(summary.actionLatencies);
    assert(summary.windows === 0 && summary.dispatches === 0, 'Idle scenario dispatched traffic', summary);
    assert(summary.topologyDelta === 0, 'Idle scenario rebuilt navigation topology', summary);
    assert(latency.p95 <= 100, 'Idle p95 exceeded 100 ms', latency);
    assert(summary.longTasks.every((entry) => entry.duration < 50), 'Idle scenario observed a >=50 ms long task', summary.longTasks);
    return { ...summary, latency };
  });
  const one = await runScenario('BG-BROWSER-001B', 'One background run at two windows per second remains responsive', async () => {
    const summary = await actionScenario('one'); const latency = metrics(summary.actionLatencies);
    assert(summary.windows >= 10 && summary.windows <= 15, 'One-run window count was not representative', summary);
    assert(summary.dispatches === summary.windows * 2, 'One-run dispatch count mismatch', summary);
    assert(summary.topologyDelta === 0, 'One-run content/status rebuilt navigation topology', summary);
    assert(summary.presentationRevisionDelta === summary.windows, 'One-run content presentation revision mismatch', summary);
    assert(summary.statusValues.every((status) => status === 'running'), 'One-run status drifted', summary.statusValues);
    assert(latency.p95 <= 100, 'One-run p95 exceeded 100 ms', latency);
    assert(latency.p95 <= idle.latency.p95 * 1.5, 'One-run p95 exceeded 1.5x idle', { idle: idle.latency, one: latency });
    assert(summary.longTasks.every((entry) => entry.duration < 50), 'One-run scenario observed a >=50 ms long task', summary.longTasks);
    return { ...summary, latency };
  });
  const aggregate = await runScenario('BG-BROWSER-001C', 'Twenty-run aggregate-equivalent 40 windows/80 dispatches per second remains responsive', async () => {
    const summary = await actionScenario('aggregate'); const latency = metrics(summary.actionLatencies);
    assert(summary.windows >= 230 && summary.windows <= 270, 'Aggregate window count was not representative', summary);
    assert(summary.dispatches === summary.windows * 2, 'Aggregate dispatch count mismatch', summary);
    assert(summary.topologyDelta === 0, 'Aggregate content/status rebuilt navigation topology', summary);
    assert(summary.presentationRevisionDelta === summary.windows, 'Aggregate content presentation revision mismatch', summary);
    assert(summary.contentCharacterDelta > summary.windows * 2, 'Aggregate content was not accumulated', summary);
    assert(summary.statusValues.every((status) => status === 'running'), 'Aggregate status drifted', summary.statusValues);
    assert(latency.p95 <= 100, 'Aggregate p95 exceeded 100 ms', latency);
    assert(latency.p95 <= idle.latency.p95 * 1.5, 'Aggregate p95 exceeded 1.5x idle', { idle: idle.latency, aggregate: latency });
    assert(summary.longTasks.every((entry) => entry.duration < 50), 'Aggregate scenario observed a >=50 ms long task', summary.longTasks);
    return { ...summary, latency };
  });
  evidence.performanceComparison = {
    idleP95: idle.latency.p95, oneP95: one.latency.p95, aggregateP95: aggregate.latency.p95,
    oneToIdle: one.latency.p95 / idle.latency.p95, aggregateToIdle: aggregate.latency.p95 / idle.latency.p95,
  };

  await runScenario('BG-BROWSER-002', 'CONNECTED and exact repeated status cause no presentation or navigation work', async () => {
    const details = await page.evaluate(() => window.__backgroundContentionProbe.runNoEffectCheck());
    assert(details.topologyDelta === 0 && details.patchDelta === 0, 'No-effect traffic changed navigation', details);
    assert(details.presentationRevisionDelta === 0, 'No-effect traffic revised Event Monitor presentation', details);
    assert(details.status === 'running', 'No-effect traffic changed status', details);
    return details;
  });

  await runScenario('BG-BROWSER-003', 'Latest-100 retention remains exact after 110 completed segment lifecycles', async () => {
    const before = await page.evaluate(() => window.__backgroundContentionProbe.getRevisions());
    const details = await page.evaluate(() => window.__backgroundContentionProbe.runLatest100());
    const after = await page.evaluate(() => window.__backgroundContentionProbe.getRevisions());
    assert(details.visualCount === 100 && details.segmentCount === 100, 'Latest-100 bound was not exact', details);
    assert(details.firstContent === 'retained-10' && details.lastContent === 'retained-109', 'Latest-100 order/content mismatch', details);
    assert(after.topology === before.topology, 'Retention traffic rebuilt topology', { before, after });
    return { ...details, revisions: { before, after } };
  });

  await runScenario('BG-BROWSER-004', 'Collapsed/unfocused stable, task-agent, task-team, child, status, and focus survive sustained traffic', async () => {
    await page.locator('[data-test="teams-tab"]').click();
    const teamRow = page.locator('[data-test="workspace-team-row-team-0"]');
    await teamRow.waitFor({ state: 'visible' });
    assert(await page.locator('[data-test="workspace-team-transient-execution-row"]').count() === 0, 'Collapsed team leaked transient rows');
    await teamRow.click();
    const workerDisclosure = page.locator('[data-test="workspace-team-member-disclosure"][data-member-address="/worker"]');
    await workerDisclosure.click();
    await page.locator('[data-test="workspace-team-member-disclosure"][data-member-address="/ReviewTeam"]').click();
    await page.locator('[data-test="workspace-team-transient-disclosure"][data-member-address="/ReviewTeam"]').click();
    const hierarchy = await page.evaluate(() => window.__backgroundContentionProbe.inspectHierarchy());
    assert(hierarchy.rows.length === 6, 'Exact hierarchy row count mismatch', hierarchy);
    assert(hierarchy.rows.map((row) => `${row.kind}:${row.memberAddress}:${row.agentRunId || 'team'}:${row.depth}`).join('|') === [
      'stable_member:/worker:rich-worker-run:0', 'transient_execution:/worker:rich-task-agent-run:1',
      'stable_member:/ReviewTeam:team:0', 'stable_member:/ReviewTeam/reviewer:rich-reviewer-run:1',
      'transient_execution:/ReviewTeam:team:1', 'transient_execution:/ReviewTeam/reviewer:rich-task-team-child-run:2',
    ].join('|'), 'Exact hierarchy order/depth mismatch', hierarchy);
    assert(hierarchy.rows.find((row) => row.agentRunId === 'rich-task-agent-run')?.status === 'running', 'Task-agent status mismatch', hierarchy);
    assert(hierarchy.rows.find((row) => row.agentRunId === 'rich-task-team-child-run')?.status === 'running', 'Task-team child status mismatch', hierarchy);
    const taskAgent = page.locator('[data-test="workspace-team-transient-execution-row"][data-member-address="/worker"]');
    await taskAgent.click();
    await page.locator('[data-test="rich-focus"]').filter({ hasText: 'rich-task-agent-run' }).waitFor();
    const beforeDetail = await page.evaluate(() => window.__backgroundContentionProbe.getRevisions());
    await page.locator('[data-test="detail-only-update"]').click();
    const afterDetail = await page.evaluate(() => window.__backgroundContentionProbe.getRevisions());
    assert(afterDetail.topology === beforeDetail.topology && afterDetail.patch === beforeDetail.patch, 'Detail-only update changed navigation', { beforeDetail, afterDetail });
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
    return { hierarchy, beforeDetail, afterDetail, transientRowsVisible: await page.locator('[data-test="workspace-team-transient-execution-row"]').count() };
  });

  const pasteSamples = async (mode, prefix) => {
    await page.evaluate((scenario) => window.__backgroundContentionProbe.startLoad(scenario, 4000), mode);
    const values = [];
    for (let index = 0; index < 10; index += 1) {
      const sample = await page.evaluate((name) => window.__backgroundContentionProbe.pasteFile(name), `${prefix}-${index}.txt`);
      values.push(sample.placeholderLatencyMs);
    }
    const load = await page.evaluate(() => window.__backgroundContentionProbe.waitLoad());
    return { latency: metrics(values), load };
  };
  const pasteIdle = await runScenario('BG-BROWSER-005A', 'Delayed-upload paste-to-placeholder at idle', async () => {
    const details = await pasteSamples('idle', 'idle-paste');
    assert(details.latency.p95 <= 100, 'Idle paste placeholder p95 exceeded 100 ms', details);
    return details;
  });
  await runScenario('BG-BROWSER-005B', 'Delayed-upload paste-to-placeholder under aggregate traffic', async () => {
    const details = await pasteSamples('aggregate', 'aggregate-paste');
    assert(details.load.windows >= 140, 'Aggregate paste load was not sustained', details.load);
    assert(details.load.topologyDelta === 0, 'Paste aggregate rebuilt topology', details.load);
    assert(details.latency.p95 <= 100, 'Aggregate paste placeholder p95 exceeded 100 ms', details);
    assert(details.latency.p95 <= pasteIdle.latency.p95 * 1.5, 'Aggregate paste p95 exceeded 1.5x idle', { idle: pasteIdle.latency, aggregate: details.latency });
    return details;
  });

  const voiceSample = async () => {
    await page.evaluate(() => window.__backgroundContentionProbe.armVoiceTimeline());
    await page.getByTitle('Start voice input').click();
    const timeline = await waitFor('fake microphone recording state', async () => {
      const value = await page.evaluate(() => window.__backgroundContentionProbe.getVoiceTimeline());
      return value.recordingVisibleAt || value.error ? value : null;
    }, 15000, 25);
    assert(!timeline.error, 'Voice start failed', timeline);
    assert(timeline.clickedAt !== null && timeline.startingVisibleAt !== null && timeline.recordingVisibleAt !== null, 'Voice visibility timeline incomplete', timeline);
    const sample = {
      clickToStartingVisibleMs: timeline.startingVisibleAt - timeline.clickedAt,
      clickToRecordingVisibleMs: timeline.recordingVisibleAt - timeline.clickedAt,
      raw: timeline,
    };
    await page.evaluate(() => window.__backgroundContentionProbe.resetVoice());
    await page.getByTitle('Start voice input').waitFor({ state: 'visible' });
    return sample;
  };
  await voiceSample();
  const voiceIdle = await runScenario('BG-BROWSER-006A', 'Warmed fake-media voice start at idle', async () => {
    const samples = [];
    for (let index = 0; index < 3; index += 1) samples.push(await voiceSample());
    const starting = metrics(samples.map((sample) => sample.clickToStartingVisibleMs));
    const recording = metrics(samples.map((sample) => sample.clickToRecordingVisibleMs));
    assert(starting.p95 <= 100, 'Idle click-to-Starting p95 exceeded 100 ms', { starting, samples });
    return { samples, starting, recording };
  });
  await runScenario('BG-BROWSER-006B', 'Fake-media voice start under aggregate traffic', async () => {
    await page.evaluate(() => window.__backgroundContentionProbe.startLoad('aggregate', 6500));
    const samples = [];
    for (let index = 0; index < 3; index += 1) samples.push(await voiceSample());
    const load = await page.evaluate(() => window.__backgroundContentionProbe.waitLoad());
    const starting = metrics(samples.map((sample) => sample.clickToStartingVisibleMs));
    const recording = metrics(samples.map((sample) => sample.clickToRecordingVisibleMs));
    assert(load.windows >= 230 && load.topologyDelta === 0, 'Voice aggregate load was not representative or rebuilt topology', load);
    assert(starting.p95 <= 100, 'Aggregate click-to-Starting p95 exceeded 100 ms', { starting, samples });
    assert(recording.p95 <= voiceIdle.recording.p95 * 1.5, 'Aggregate click-to-Recording exceeded 1.5x idle', { idle: voiceIdle.recording, aggregate: recording });
    assert(recording.p95 <= voiceIdle.recording.p95 + 50, 'Aggregate click-to-Recording exceeded idle by 50 ms', { idle: voiceIdle.recording, aggregate: recording });
    return { samples, starting, recording, load };
  });

  await runScenario('BG-BROWSER-007', 'Mobile viewport preserves hierarchy/composer width and controls', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-test="files-tab"]').click();
    await page.waitForTimeout(200);
    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth, bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      voiceVisible: Boolean(document.querySelector('button[title="Start voice input"]')),
      attachmentVisible: Boolean(document.querySelector('[data-test="composer-attachments"]')),
    }));
    assert(dimensions.bodyScrollWidth <= dimensions.innerWidth && dimensions.documentScrollWidth <= dimensions.innerWidth, 'Mobile page overflowed horizontally', dimensions);
    assert(dimensions.voiceVisible && dimensions.attachmentVisible, 'Mobile composer controls missing', dimensions);
    await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
    return dimensions;
  });

  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  const consoleErrors = evidence.browserEvents.filter((event) => event.type === 'console:error');
  assert(pageErrors.length === 0, 'Browser page errors were observed', pageErrors);
  assert(consoleErrors.length === 0, 'Browser console errors were observed', consoleErrors);
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({ id: 'HARNESS', description: 'Run background contention browser probe', message: error instanceof Error ? error.message : String(error), details: error?.details, stack: error instanceof Error ? error.stack : undefined });
  }
} finally {
  try { await page?.context().close(); evidence.cleanup.browserContext = page ? 'closed' : 'not-started'; } catch (error) { result = 'Fail'; evidence.cleanup.browserContext = `failed: ${error.message}`; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess); } catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { await finishStream(nuxtLog); evidence.cleanup.nuxtLog = 'closed'; } catch (error) { result = 'Fail'; evidence.cleanup.nuxtLog = `failed: ${error.message}`; }
  try { if (fixtureInstalled) await fs.rm(installedPagePath, { force: true }); evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed'; } catch (error) { result = 'Fail'; evidence.cleanup.installedFixture = `failed: ${error.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = { evidencePath, nuxtLogPath, desktopScreenshotPath, mobileScreenshotPath };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
if (result !== 'Pass') { process.stderr.write(`Background contention browser probe failed. See ${evidencePath}\n`); process.exitCode = 1; }
else process.stdout.write(`Background contention browser probe passed. Evidence: ${evidencePath}\n`);
