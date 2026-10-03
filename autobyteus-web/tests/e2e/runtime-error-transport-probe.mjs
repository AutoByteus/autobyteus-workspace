#!/usr/bin/env node
// Invoked by the real-server AGY suite; TESTING.md browser dev-path probe, not a full packaged-product test.
// Prerequisites: pnpm install; NUXT_TEST=true pnpm exec nuxt prepare; server-suite owned manifest.
// RUN_AGY_ERROR_BROWSER=1 RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch -t 'closes real'
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name) => process.argv[process.argv.indexOf('--' + name) + 1];
const manifest = JSON.parse(await fs.readFile(arg('manifest'), 'utf8'));
const outputDir = path.resolve(arg('output-dir'));
assert.equal(new URL(manifest.serverUrl).hostname, '127.0.0.1');
assert.notEqual(new URL(manifest.serverUrl).port, '8001');
const installed = path.join(webDir, 'pages/__runtime-error-transport-probe.vue');
const fixture = path.join(webDir, 'tests/e2e/fixtures/runtime-error-transport.page.vue');
const evidence = { startedAt: new Date().toISOString(), serverUrl: manifest.serverUrl, platform: `${process.platform}-${process.arch}`, node: process.version, cases: {}, events: [], cleanup: {} };
await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'browser-evidence.json');
const persist = () => fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const ledgerEvent = async (id, event, result, detail) => {
  if (process.env.AGY_ERROR_LEDGER) await fs.appendFile(process.env.AGY_ERROR_LEDGER,
    `| auto | ${id} | ${new Date().toISOString()} | ${event} | Public message→DOM and continuity | ${detail.replaceAll('|', '/').replaceAll('\n', ' ')} | ${result} | evidence/api-e2e/browser-evidence.json |\n`);
};
let cancelled = false;
const until = async (label, predicate, ms = 120_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (cancelled) throw new Error('Probe execution cancelled'); if (await predicate()) return; await new Promise((r) => setTimeout(r, 100)); }
  throw new Error('Timed out waiting for ' + label);
};
const freePort = () => new Promise((resolve) => {
  const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); });
});
let nuxt, browser, log, pageInstalled = false;
const exited = (child) => child.exitCode !== null || child.signalCode !== null;
const stop = async (child) => {
  if (!child || exited(child)) return;
  process.kill(-child.pid, 'SIGTERM');
  try { await until('owned Nuxt exit', () => exited(child), 10_000); }
  catch { process.kill(-child.pid, 'SIGKILL'); await until('owned Nuxt forced exit', () => exited(child), 5_000); }
};
const cancel = () => { cancelled = true; void browser?.close().catch(() => undefined); };
process.on('SIGTERM', cancel);
const watchdog = setTimeout(cancel, 230_000);
let activeId;
try {
  assert.equal(existsSync(installed), false, 'Refuse to overwrite a page');
  await fs.copyFile(fixture, installed); pageInstalled = true;
  const port = await freePort(); evidence.port = port;
  log = createWriteStream(path.join(outputDir, 'nuxt.log'));
  nuxt = spawn('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: true, env: { ...process.env, NUXT_TEST: 'true', BACKEND_NODE_BASE_URL: manifest.serverUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(log); nuxt.stderr.pipe(log);
  const url = `http://127.0.0.1:${port}/__runtime-error-transport-probe`;
  await until('owned Nuxt route', async () => { assert.equal(exited(nuxt), false); return (await fetch(url).catch(() => null))?.ok; });
  const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('pageerror', (error) => evidence.events.push({ type: 'pageerror', detail: String(error) }));
  page.on('console', (message) => { if (message.type() === 'error') evidence.events.push({ type: 'console:error', detail: message.text() }); });
  page.on('dialog', async (dialog) => { evidence.events.push({ type: 'dialog', detail: dialog.message() }); await dialog.dismiss(); });
  const frames = [];
  const sent = [];
  let socketSequence = 0;
  evidence.frames = frames; evidence.sent = sent;
  page.on('websocket', (socket) => {
    const socketId = ++socketSequence;
    socket.on('framereceived', ({ payload }) => { try { frames.push({ socketId, url: socket.url(), frame: JSON.parse(String(payload)) }); } catch {} });
    socket.on('framesent', ({ payload }) => { try { sent.push({ socketId, url: socket.url(), frame: JSON.parse(String(payload)) }); } catch {} });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__runtimeErrorTransport), undefined, { timeout: 120_000 });
  for (const run of manifest.runs) {
    activeId = run.scope === 'agent' ? 'UI-A01' : 'UI-T01';
    await ledgerEvent(activeId, 'Started', 'N/A', run.scope + ' real stream journey');
    evidence.cases[activeId] = { run, result: 'Running', steps: [] }; await persist();
    await page.evaluate((input) => window.__runtimeErrorTransport.configure(input), { serverUrl: manifest.serverUrl, run });
    await page.waitForFunction(() => window.__runtimeErrorTransport.snapshot().ready, undefined, { timeout: 20_000 });
    const conversation = page.locator('[data-test="conversation"]');
    const submit = async (content) => {
      const start = sent.length;
      await page.getByLabel('Message', { exact: true }).fill(content);
      await page.getByRole('button', { name: 'Send message', exact: true }).click();
      await until('one outgoing user command', () => sent.slice(start).some(({ frame }) => frame.type === 'SEND_MESSAGE'), 10_000);
      const commands = sent.slice(start).filter(({ frame }) => frame.type === 'SEND_MESSAGE');
      assert.equal(commands.length, 1, 'One user click issues one command');
      assert.equal(commands[0].frame.payload.content, content);
      assert.equal(commands[0].url, manifest.serverUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/' + (run.scope === 'agent' ? 'agent' : 'agent-team') + '/' + run.rootId);
      return commands[0].socketId;
    };
    for (const [index, [kind, expected]] of manifest.cases.entries()) {
      const start = frames.length;
      const socketId = await submit('Report runtime case: ' + kind);
      await until(kind + ' error card', async () => (await conversation.locator('.error-segment').count()) === index + 1, 20_000);
      const card = conversation.locator('.error-segment').last();
      assert.equal(await card.locator('p.mt-1').textContent(), expected);
      assert.equal(await card.locator('img, script').count(), 0);
      assert.equal(await page.evaluate(() => window.__runtimeInjected), undefined);
      assert.doesNotMatch(await conversation.textContent(), /PRIVATE_AGY_SECRET|PRIVATE_RESPONSE_MARKER|\[object Object\]/);
      const received = frames.slice(start).filter((entry) => entry.socketId === socketId);
      const publicError = received.find(({ frame }) => frame.type === 'ERROR' && frame.payload.code === 'AGY_TURN_ERROR');
      assert.ok(publicError, 'Actual public error frame observed');
      assert.equal(publicError.frame.payload.message, expected);
      assert.equal(received.some(({ frame }) => frame.type === 'TURN_COMPLETED'), false);
      if (run.scope === 'team') assert.equal(publicError.frame.payload.agent_run_id, run.runId);
      const snapshot = await page.evaluate(() => window.__runtimeErrorTransport.snapshot());
      assert.equal(snapshot.failure, ''); assert.equal(snapshot.run.runId, run.runId);
      assert.equal(snapshot.activities.filter((activity) => activity.status === 'success').length, index + 1);
      assert.match(JSON.stringify(snapshot.conversation), /PARTIAL_WORK_PRESERVED/);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await card.scrollIntoViewIfNeeded();
        const layout = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        assert.ok(layout.scroll <= layout.client + 1, `Horizontal overflow at ${width}`);
        if (kind === 'quota' || kind === 'credential') await card.screenshot({ path: path.join(outputDir, `${run.scope}-${kind}-${width}.png`) });
      }
      evidence.cases[activeId].steps.push({ kind, expected, result: 'Pass', publicError, snapshot }); await persist();
      await ledgerEvent(activeId, 'Checkpoint', 'N/A', kind + ': actual public frame matches inert card, completed tool preserved');
    }
    const before = await page.evaluate(() => window.__runtimeErrorTransport.snapshot());
    const start = frames.length;
    const socketId = await submit('Continue the same work.');
    const received = () => frames.slice(start).filter((entry) => entry.socketId === socketId);
    await until('next user turn completion', () => received().some(({ frame }) => frame.type === 'TURN_COMPLETED'), 20_000);
    await until('next response visible', async () => (await conversation.textContent()).includes('NEXT_USER_TURN_OK'), 10_000);
    const after = await page.evaluate(() => window.__runtimeErrorTransport.snapshot());
    assert.deepEqual(after.activities, before.activities); assert.equal(after.run.runId, run.runId);
    assert.equal(await conversation.locator('.error-segment').count(), manifest.cases.length);
    assert.equal(received().filter(({ frame }) => frame.type === 'TURN_COMPLETED').length, 1);
    assert.equal(received().some(({ frame }) => frame.type === 'ERROR'), false);
    evidence.cases[activeId].result = 'Pass'; evidence.cases[activeId].nextTurn = { before, after }; await persist();
    await ledgerEvent(activeId, 'Completed', 'Pass', 'Seven error shapes and user-driven next turn; exact identity/work retained');
    activeId = undefined;
  }
  assert.equal(evidence.events.some((event) => ['pageerror', 'dialog'].includes(event.type)), false, JSON.stringify(evidence.events));
  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail'; evidence.failure = { message: String(error), stack: error.stack };
  if (activeId) { evidence.cases[activeId].result = 'Fail'; await ledgerEvent(activeId, 'Completed', 'Fail', String(error)); }
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog); process.off('SIGTERM', cancel);
  if (browser) { await browser.close(); evidence.cleanup.browserClosed = true; }
  await stop(nuxt); evidence.cleanup.nuxtStopped = !nuxt || exited(nuxt);
  if (log) log.end();
  if (pageInstalled) await fs.rm(installed);
  evidence.cleanup.installedPageRemoved = !existsSync(installed);
  evidence.cleanup.userNode8001Accessed = false;
  evidence.finishedAt = new Date().toISOString(); await persist();
  console.log(JSON.stringify({ result: evidence.result, evidencePath, cleanup: evidence.cleanup }));
}
