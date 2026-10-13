// Durable TPS browser regression (R1 AC-001–006). Owns temporary route, Nuxt and Chromium.
// Prerequisites: pnpm install, web dependency builds, nuxt prepare; Chromium or --browser-executable.
// Run: pnpm -C autobyteus-web test:e2e:token-meter-tps --output-dir <fresh-absolute-directory>
// Default: deterministic reports (not runtime proof). --backend-url/--run-id/--file: real server
// supplied by token-meter-tps-transport.e2e.test.ts, production AgentStreamingService/WS intake.
// Cases: collecting/20→30/zero/invalid/identity/offline/keyboard/en/zh narrow; live same-turn tool gap.
// Browser errors fail; receipts retain hashes, wire frames, checks and cleanup. No paid inference.
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '../../..');
const option = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? undefined : process.argv[i + 1]; };
const backend = option('backend-url');
const web = path.join(root, 'autobyteus-web');
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const route = path.join(web, 'pages/probe-token-meter-tps.vue');
const out = path.resolve(option('output-dir') || path.join(web, 'test-results', `token-meter-tps-${Date.now()}`));
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.mkdir(out);
const result = { layer: backend ? 'Real scripted runtime/server/WS/browser' : 'Durable browser fixture; not runtime inference',
  source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), errors: [], checks: [], cleanup: {}, hashes: {} };
for (const file of ['components/workspace/usage/TokenUsageThroughputCard.vue', 'components/workspace/usage/TokenUsageMeterPanel.vue', 'stores/tokenUsageThroughput.ts', 'stores/tokenUsageMeterStore.ts', 'composables/useTokenUsageWorkspaceScope.ts']) {
  result.hashes[file] = createHash('sha256').update(await fs.readFile(path.join(web, file))).digest('hex');
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = async () => {
  const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
};
let browser, child, installed = false;
try {
  await fs.copyFile(path.join(scriptDir, 'fixtures/token-meter-tps.page.vue'), route, 1); installed = true;
  const uiPort = await port(), backendPort = backend ? Number(new URL(backend).port) : await port(); result.ports = { uiPort, backendPort };
  const log = createWriteStream(path.join(out, 'nuxt.log'));
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(uiPort)], {
    cwd: web, detached: true, env: { PATH: process.env.PATH, HOME: process.env.HOME, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log); child.stderr.pipe(log); result.nuxtPid = child.pid;
  const url = `http://127.0.0.1:${uiPort}/probe-token-meter-tps` + (backend ? '?' + new URLSearchParams({ backend, runId: option('run-id'), file: option('file') }) : '');
  const deadline = Date.now() + 120000;
  while (true) {
    if (child.exitCode !== null || Date.now() > deadline) throw new Error('Nuxt readiness failed');
    try { if ((await fetch(url)).ok) break; } catch {}
    await pause(300);
  }
  browser = await chromium.launch({ headless: true, executablePath: option('browser-executable') || process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/usr/bin/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, locale: 'en-US' });
  page.on('pageerror', error => result.errors.push({ kind: 'pageerror', text: error.message }));
  page.on('console', message => { if (message.type() === 'error') result.errors.push({ kind: 'console', text: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) result.errors.push({ kind: 'http', status: response.status(), url: response.url() }); });
  result.frames = [];
  page.on('websocket', ws => ws.on('framereceived', frame => {
    const row = JSON.parse(String(frame.payload));
    if (/CONNECTED|TOKEN_USAGE_UPDATED|TOOL_|TURN_COMPLETED/.test(row.type)) result.frames.push(row);
  }));
  if (!backend) {
    await page.route('**/rest/health', r => r.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
    await page.route('**/graphql', r => {
      const q = r.request().postDataJSON()?.query ?? '';
      const data = q.includes('getStandaloneRunTokenUsageSummary') ? { getStandaloneRunTokenUsageSummary: null }
        : q.includes('getAgentRunTokenUsageSummary') ? { getAgentRunTokenUsageSummary: null }
        : q.includes('serverSettings') ? { serverSettings: [] }
        : q.includes('agentDefinitions') ? { agentDefinitions: [] }
        : q.includes('agentTeamDefinitions') ? { agentTeamDefinitions: [] }
        : q.includes('workspaces') ? { workspaces: [] } : null;
      if (data === null) result.errors.push({ kind: 'unexpected-graphql', query: q });
      return r.fulfill({ status: data === null ? 500 : 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    });
    await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, ws => ws.send(JSON.stringify({ type: 'connected' })));
  }
  await page.goto(url); await page.locator('[data-test="throughput-card"]').waitFor();
  await pause(4000); // settle cold Vite optimization/reload
  const read = selector => page.locator(`[data-test="${selector}"]`).innerText();
  const click = text => page.getByRole('button', { name: text, exact: true }).click();
  if (backend) {
    await click('Connect');
    const connectedDeadline = Date.now() + 15000;
    while (!result.frames.some(row => row.type === 'CONNECTED')) {
      assert(Date.now() < connectedDeadline, 'Agent stream did not connect'); await pause(50);
    }
    await click('Send');
    await page.waitForFunction(() => document.querySelector('[data-test="probe-state"]')?.textContent?.includes('"status":"collecting"'));
    await page.waitForFunction(() => document.querySelector('[data-test="probe-state"]')?.textContent?.includes('"outputTokens":200'));
    result.firstReading = JSON.parse(await page.locator('[data-test="probe-state"]').textContent());
    assert.equal(result.firstReading.outputTokens, 200);
    await page.locator('[data-test="throughput-value"]').waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-test="probe-state"]')?.textContent?.includes('"outputTokens":150'));
    const state = JSON.parse(await page.locator('[data-test="probe-state"]').textContent());
    const calls = result.frames.filter(row => row.type === 'TOKEN_USAGE_UPDATED');
    assert.equal(calls.length, 3);
    assert.equal(new Set(calls.map(row => row.payload.turn_id)).size, 1);
    assert.deepEqual(calls.map(row => row.payload.meter_delta_output_tokens), [999, 200, 150]);
    assert.equal(state.identity.runId, option('run-id'));
    assert.equal(state.identity.runtimeKind, 'antigravity_cli');
    assert.equal(state.identity.modelIdentifier, 'gemini-3.8-flash-low');
    const elapsed = (Date.parse(calls[2].payload.observed_at) - Date.parse(calls[1].payload.observed_at)) / 1000;
    assert(elapsed >= 0.8);
    assert.equal(state.elapsedSeconds, elapsed);
    assert.equal(state.tokensPerSecond, 150 / elapsed);
    const gap = (Date.parse(calls[1].payload.observed_at) - Date.parse(calls[0].payload.observed_at)) / 1000;
    assert(gap >= 1.1);
    assert.equal(result.firstReading.elapsedSeconds, gap);
    assert.equal(result.firstReading.tokensPerSecond, 200 / gap);
    assert(result.frames.some(row => row.type.includes('TOOL') && JSON.stringify(row).includes('TPS_OWNED_TOOL_CONTENT')));
    const displayed = await read('throughput-value');
    assert.equal(displayed, new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(state.tokensPerSecond) + ' tokens/s');
    await click('Other'); assert.equal(await page.locator('[data-test="throughput-value"]').count(), 0);
    await click('Live'); assert.equal(await read('throughput-value'), displayed);
    await click('Disconnect'); await pause(1200); assert.equal(await read('throughput-value'), displayed);
    await page.screenshot({ path: path.join(out, 'live-scripted.png'), fullPage: true });
    result.liveState = state; result.toolGapSeconds = gap;
    result.checks = ['three same-turn canonical calls', 'first baseline excludes 999 tokens', 'tool gap included', 'exact identity and server timestamp arithmetic', 'selection isolation', 'frozen after disconnect'];
  } else {
    assert.equal(await read('throughput-state'), 'Collecting');
    assert.equal(await page.locator('[data-test="token-usage-primary"]').count(), 0);
    await page.screenshot({ path: path.join(out, 'collecting.png'), fullPage: true });
    await click('Baseline'); assert.match(await read('throughput-reason'), /another matching/);
    await click('Second'); assert.equal(await read('throughput-value'), '20.0 tokens/s');
    await click('Totals'); assert.match(await read('throughput-identity'), /exact-reported-model/);
    assert.match(await page.locator('[data-test="token-usage-primary"]').innerText(), /aggregate-child-model/);
    const help = page.locator('[data-test="throughput-help"] summary'); await help.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-test="throughput-help"]').getAttribute('open'), '');
    assert(await help.evaluate(el => el === document.activeElement));
    await page.screenshot({ path: path.join(out, 'ready-en.png'), fullPage: true });
    const fixedTime = await page.locator('[data-test="throughput-time"]').getAttribute('datetime');
    await click('Offline'); await pause(1500); assert.equal(await read('throughput-value'), '20.0 tokens/s');
    assert.equal(await page.locator('[data-test="throughput-time"]').getAttribute('datetime'), fixedTime);
    await click('Third'); assert.equal(await read('throughput-value'), '30.0 tokens/s');
    await click('Chinese'); await page.setViewportSize({ width: 320, height: 1000 });
    assert.match(await read('throughput-qualification'), /估算 · 最近上报/);
    assert.match(await read('throughput-value'), /30.0 词元\/秒/);
    const geometry = await page.locator('[data-test="throughput-card"]').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, width: el.getBoundingClientRect().width }));
    assert(geometry.scroll <= geometry.client, JSON.stringify(geometry)); result.geometry = geometry;
    await page.screenshot({ path: path.join(out, 'ready-zh-narrow.png'), fullPage: true });
    await click('Zero'); assert.match(await read('throughput-value'), /0.0 词元\/秒/);
    await click('Invalid'); assert.equal(await page.locator('[data-test="throughput-value"]').count(), 0);
    await page.screenshot({ path: path.join(out, 'unavailable-zh-narrow.png'), fullPage: true });
    await click('Other'); assert.match(await read('throughput-reason'), /历史累计用量/);
    await click('English'); assert.match(await read('throughput-reason'), /Saved totals/);
    result.checks = ['No-total collecting', 'baseline only', '20 then 30 TPS', 'exact vs aggregate identity', 'keyboard help and focus', 'offline frozen number/time', 'zh-CN 320px no card overflow', 'true zero', 'invalid interval no number', 'selection history unavailable'];
  }
  assert.deepEqual(result.errors, []);
  result.status = 'pass';
} catch (error) { result.status = 'fail'; result.failure = error.stack; process.exitCode = 1; }
finally {
  await browser?.close(); result.cleanup.browserClosed = Boolean(browser);
  if (child?.exitCode === null) { process.kill(-child.pid, 'SIGTERM'); await Promise.race([new Promise(resolve => child.once('close', resolve)), pause(5000)]); }
  if (child?.exitCode === null && child?.signalCode === null) { process.kill(-child.pid, 'SIGKILL'); await pause(500); }
  result.cleanup.nuxtStopped = !child || child.exitCode !== null || child.signalCode !== null;
  if (installed) await fs.unlink(route); result.cleanup.routeRemoved = installed;
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(out, result.status, result.failure ?? '');
}
