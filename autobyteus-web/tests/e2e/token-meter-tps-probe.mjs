// Durable TPS browser regression (output-tps-precision AC-001,005–008). Owns temporary route, Nuxt and Chromium.
// Prerequisites: pnpm install, web dependency builds, nuxt prepare; Chromium or --browser-executable.
// Run: pnpm -C autobyteus-web test:e2e:token-meter-tps --output-dir <fresh-absolute-directory>
// Default: deterministic reports (not runtime proof). --backend-url/--run-id/--file: real server
// supplied by token-meter-tps-transport.e2e.test.ts, production AgentStreamingService/WS intake.
// Cases: "—"/120 generation/tiny call kept/90 end-to-end/model vs totals/offline/keyboard help/en/zh narrow/
// selection/reload "—"; live: scripted AGY end-to-end + generation + tiny calls on the real per-call event.
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
  const probeState = async () => JSON.parse(await page.locator('[data-test="probe-state"]').textContent());
  const format = value => new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) + ' tokens/s';
  if (backend) {
    assert.equal(await read('throughput-empty'), '—');
    await click('Connect');
    const connectedDeadline = Date.now() + 15000;
    while (!result.frames.some(row => row.type === 'CONNECTED')) {
      assert(Date.now() < connectedDeadline, 'Agent stream did not connect'); await pause(50);
    }
    await click('Send');
    await page.waitForFunction(() => document.querySelector('[data-test="probe-state"]')?.textContent?.includes('"outputTokens":999'));
    result.firstReading = await probeState();
    assert.deepEqual(result.firstReading, { method: 'end_to_end', outputTokens: 999, durationMs: 2674, model: 'gemini-3.8-flash-low' });
    assert.match(await read('throughput-model'), /incl\. time to first token/);
    await page.waitForFunction(() => document.querySelector('[data-test="probe-state"]')?.textContent?.includes('"outputTokens":200'));
    const deadline = Date.now() + 30000;
    while (result.frames.filter(row => row.type === 'TOKEN_USAGE_UPDATED').length < 3) {
      assert(Date.now() < deadline, 'Third usage frame did not arrive'); await pause(50);
    }
    await pause(300);
    const state = await probeState();
    const calls = result.frames.filter(row => row.type === 'TOKEN_USAGE_UPDATED');
    assert.equal(calls.length, 3);
    assert.equal(new Set(calls.map(row => row.payload.turn_id)).size, 1);
    assert.deepEqual(calls[0].payload.output_throughput, { method: 'end_to_end', output_tokens: 999, duration_ms: 2674 });
    assert.equal(calls[1].payload.output_throughput.method, 'generation');
    assert.equal(calls[1].payload.output_throughput.output_tokens, 200);
    assert(calls[1].payload.output_throughput.duration_ms >= 850, JSON.stringify(calls[1].payload.output_throughput));
    assert.equal(calls[2].payload.output_throughput, null);
    assert.deepEqual(state, { method: 'generation', outputTokens: 200,
      durationMs: calls[1].payload.output_throughput.duration_ms, model: 'gemini-3.8-flash-low' });
    assert(result.frames.some(row => row.type.includes('TOOL') && JSON.stringify(row).includes('TPS_OWNED_TOOL_CONTENT')));
    const displayed = await read('throughput-value');
    assert.equal(displayed, format(state.outputTokens / (state.durationMs / 1000)));
    assert.equal(await read('throughput-model'), 'gemini-3.8-flash-low');
    await click('Other'); assert.equal(await read('throughput-empty'), '—');
    await click('Live'); assert.equal(await read('throughput-value'), displayed);
    await click('Disconnect'); await pause(1200); assert.equal(await read('throughput-value'), displayed);
    await page.screenshot({ path: path.join(out, 'live-scripted.png'), fullPage: true });
    result.liveState = state;
    result.checks = ['three same-turn calls carry their own output_throughput', 'AGY fractional duration rounded (end to end)',
      'generation window from first text_delta', 'tiny call carries none and keeps the shown value', 'exact run and reported model',
      'selection isolation', 'kept after disconnect'];
  } else {
    assert.equal(await read('throughput-empty'), '—');
    assert.equal(await page.locator('[data-test="token-usage-primary"]').count(), 0);
    await page.screenshot({ path: path.join(out, 'no-reading.png'), fullPage: true });
    await click('Generation'); assert.equal(await read('throughput-value'), '120.0 tokens/s');
    assert.equal(await read('throughput-model'), 'exact-reported-model-with-a-long-identity-for-narrow-panel-checks');
    const cardText = await page.locator('[data-test="throughput-card"]').innerText();
    for (const removed of ['Output TPS', 'Selected agent only', 'Estimated', 'Last reported', 'autobyteus ·', 'output tokens /', '2026']) {
      assert(!cardText.includes(removed), `card still shows ${removed}`);
    }
    await click('Tiny'); assert.equal(await read('throughput-value'), '120.0 tokens/s');
    await click('Totals'); assert.match(await read('throughput-model'), /exact-reported-model/);
    assert.match(await page.locator('[data-test="token-usage-primary"]').innerText(), /aggregate-child-model/);
    const help = page.locator('[data-test="throughput-help"] summary'); await help.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-test="throughput-help"]').getAttribute('open'), '');
    assert(await help.evaluate(el => el === document.activeElement));
    assert.match(await read('throughput-method-help'), /2,400 tokens in 20\.0 s/);
    await page.screenshot({ path: path.join(out, 'generation-en.png'), fullPage: true });
    await click('Offline'); await pause(1500); assert.equal(await read('throughput-value'), '120.0 tokens/s');
    await click('EndToEnd'); assert.equal(await read('throughput-value'), '90.0 tokens/s');
    assert.match(await read('throughput-model'), /incl\. time to first token/);
    assert.match(await read('throughput-method-help'), /sending the request.*900 tokens in 10\.0 s/);
    await page.screenshot({ path: path.join(out, 'end-to-end-en.png'), fullPage: true });
    await click('Chinese'); await page.setViewportSize({ width: 320, height: 1000 });
    assert.match(await read('throughput-value'), /90.0 词元\/秒/);
    assert.match(await read('throughput-model'), /含首词元等待时间/);
    const geometry = await page.locator('[data-test="throughput-card"]').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, width: el.getBoundingClientRect().width }));
    assert(geometry.scroll <= geometry.client, JSON.stringify(geometry)); result.geometry = geometry;
    await page.screenshot({ path: path.join(out, 'end-to-end-zh-narrow.png'), fullPage: true });
    await click('Other'); assert.equal(await read('throughput-empty'), '—');
    await page.screenshot({ path: path.join(out, 'no-reading-zh-narrow.png'), fullPage: true });
    await click('Host'); assert.match(await read('throughput-value'), /90.0/);
    await click('English');
    await page.reload(); await page.locator('[data-test="throughput-card"]').waitFor(); await pause(1500);
    assert.equal(await read('throughput-empty'), '—');
    result.checks = ['"—" without a reading', '120 generation on a single call', 'removed words absent', 'tiny call keeps value',
      'reported model vs aggregate totals', 'keyboard help with method numbers', 'offline keeps value', '90 end-to-end with qualifier',
      'zh-CN 320px no card overflow', 'selection switches immediately', 'reload shows "—"'];
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
