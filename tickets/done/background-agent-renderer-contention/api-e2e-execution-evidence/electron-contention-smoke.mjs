import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(await fs.readFile(path.join(here, 'electron-owned-runtime.json'), 'utf8'));
const baseUrl = `http://127.0.0.1:${meta.frontendPort}`;
const evidence = { startedAt: new Date().toISOString(), baseUrl, meta, assertions: {}, metrics: {}, browserEvents: [] };
const percentile = (values, fraction) => [...values].sort((a,b)=>a-b)[Math.max(0, Math.ceil(values.length * fraction)-1)] ?? null;
const summarize = (values) => ({ count: values.length, min: Math.min(...values), p95: percentile(values,.95), max: Math.max(...values) });
const waitFor = async (label, fn, timeoutMs = 30_000, intervalMs = 25) => {
  const started = Date.now(); let value;
  while (Date.now() - started < timeoutMs) {
    value = await fn(); if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}; last=${JSON.stringify(value)}`);
};

let browser;
try {
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${meta.cdpPort}`);
  const context = browser.contexts()[0];
  await context.grantPermissions(['microphone'], { origin: baseUrl });
  const page = context.pages()[0] ?? await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type:`console:${message.type()}`, text:message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type:'pageerror', text:error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({ type:'requestfailed', text:`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}` }));
  await page.goto(`${baseUrl}/api-e2e-background-agent-renderer-contention`, { waitUntil:'domcontentloaded', timeout:60_000 });
  await page.locator('[data-test="background-contention-probe"]').waitFor({ state:'visible', timeout:60_000 });
  await page.waitForFunction(() => Boolean(window.__backgroundContentionProbe), null, { timeout:60_000 });
  await page.waitForTimeout(3000);
  evidence.browserEvents = [];

  const shell = await page.evaluate(async () => ({
    userAgent: navigator.userAgent,
    electronApi: Boolean(window.electronAPI),
    serverStatus: await window.electronAPI?.getServerStatus?.(),
  }));
  evidence.shell = shell;
  evidence.assertions.electronUserAgent = shell.userAgent.includes('Electron/');
  evidence.assertions.preloadBridgePresent = shell.electronApi === true;
  evidence.assertions.isolatedEmbeddedServerRunning = shell.serverStatus?.status === 'running'
    && JSON.stringify(shell.serverStatus).includes(`127.0.0.1:${meta.backendPort}`);

  const shellFile = path.join(meta.runtimeDir, 'shell-file-smoke.txt');
  await fs.writeFile(shellFile, 'ELECTRON_FILE_SMOKE_OK');
  const fileRead = await page.evaluate((filePath) => window.electronAPI?.readLocalTextFile?.(filePath), shellFile);
  evidence.fileBridge = fileRead;
  evidence.assertions.nativeFileBridgeExact = fileRead?.success === true && fileRead?.content === 'ELECTRON_FILE_SMOKE_OK';

  await page.locator('[data-test="teams-tab"]').click();
  await page.locator('[data-test="files-tab"]').click();
  await page.evaluate(() => window.__backgroundContentionProbe.startLoad('aggregate', 4500));
  const nav = [];
  for (let index = 0; index < 24; index += 1) {
    const started = performance.now();
    await page.locator(index % 2 === 0 ? '[data-test="teams-tab"]' : '[data-test="files-tab"]').click();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    nav.push(performance.now() - started);
    await page.waitForTimeout(100);
  }
  const navigationLoad = await page.evaluate(() => window.__backgroundContentionProbe.waitLoad());
  evidence.metrics.navigation = summarize(nav);
  evidence.navigationLoad = navigationLoad;
  evidence.assertions.aggregateRepresentative = navigationLoad.windows >= 150 && navigationLoad.dispatches === navigationLoad.windows * 2;
  evidence.assertions.aggregateTopologyStable = navigationLoad.topologyDelta === 0;
  evidence.assertions.fileTeamP95Under100Ms = evidence.metrics.navigation.p95 <= 100;
  evidence.assertions.noLongTask = navigationLoad.longTasks.every((entry) => entry.duration < 50);

  const voiceSample = async () => {
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__backgroundContentionProbe.armVoiceTimeline());
    await page.getByTitle('Start voice input').click();
    const timeline = await waitFor('Electron fake microphone recording', async () => {
      const value = await page.evaluate(() => window.__backgroundContentionProbe.getVoiceTimeline());
      return value.recordingVisibleAt || value.error ? value : null;
    }, 15_000);
    if (timeline.error) throw new Error(`Electron voice failed: ${timeline.error}`);
    const sample = {
      clickToStartingVisibleMs: timeline.startingVisibleAt - timeline.clickedAt,
      clickToRecordingVisibleMs: timeline.recordingVisibleAt - timeline.clickedAt,
    };
    if (sample.clickToStartingVisibleMs < 0 || sample.clickToRecordingVisibleMs < 0) {
      throw new Error(`Electron voice timeline was non-monotonic: ${JSON.stringify({ timeline, sample })}`);
    }
    await page.evaluate(() => window.__backgroundContentionProbe.resetVoice());
    await page.getByTitle('Start voice input').waitFor({ state:'visible', timeout:10_000 });
    await page.waitForTimeout(100);
    return sample;
  };
  await voiceSample();
  const voiceIdleSamples = [];
  for (let index = 0; index < 3; index += 1) voiceIdleSamples.push(await voiceSample());
  await page.evaluate(() => window.__backgroundContentionProbe.startLoad('aggregate', 6500));
  const voiceAggregateSamples = [];
  for (let index = 0; index < 3; index += 1) voiceAggregateSamples.push(await voiceSample());
  const voiceLoad = await page.evaluate(() => window.__backgroundContentionProbe.waitLoad());
  const idleStarting = summarize(voiceIdleSamples.map((sample) => sample.clickToStartingVisibleMs));
  const idleRecording = summarize(voiceIdleSamples.map((sample) => sample.clickToRecordingVisibleMs));
  const aggregateStarting = summarize(voiceAggregateSamples.map((sample) => sample.clickToStartingVisibleMs));
  const aggregateRecording = summarize(voiceAggregateSamples.map((sample) => sample.clickToRecordingVisibleMs));
  evidence.metrics.voice = { voiceIdleSamples, voiceAggregateSamples, idleStarting, idleRecording, aggregateStarting, aggregateRecording };
  evidence.voiceLoad = voiceLoad;
  evidence.assertions.voiceAggregateRepresentative = voiceLoad.windows >= 230 && voiceLoad.topologyDelta === 0;
  evidence.assertions.voiceStartingP95Under100Ms = aggregateStarting.p95 <= 100;
  evidence.assertions.voiceRecordingWithinRatio = aggregateRecording.p95 <= idleRecording.p95 * 1.5;
  evidence.assertions.voiceRecordingWithin50Ms = aggregateRecording.p95 <= idleRecording.p95 + 50;
  evidence.assertions.voiceNoLongTask = voiceLoad.longTasks.every((entry) => entry.duration < 50);

  await page.screenshot({ path:path.join(here, 'electron-contention-smoke.png'), fullPage:true });
  const errors = evidence.browserEvents.filter((entry) => entry.type === 'pageerror' || entry.type === 'console:error');
  evidence.errors = errors;
  evidence.assertions.noRendererErrors = errors.length === 0;
  if (Object.values(evidence.assertions).some((value) => value !== true)) {
    throw new Error(`Electron assertions failed: ${JSON.stringify(evidence.assertions)}`);
  }
  evidence.result = 'Pass';
  evidence.completedAt = new Date().toISOString();
} catch (error) {
  evidence.result = 'Fail';
  evidence.failure = { message:error?.message ?? String(error), stack:error?.stack };
  evidence.completedAt = new Date().toISOString();
  throw error;
} finally {
  await fs.writeFile(path.join(here, 'electron-contention-smoke.json'), JSON.stringify(evidence, null, 2));
  await browser?.close().catch(() => {});
}

console.log('Electron contention smoke passed.');
