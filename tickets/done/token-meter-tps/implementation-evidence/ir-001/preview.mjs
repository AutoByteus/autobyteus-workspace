// Implementation self-inspection only: temporary Nuxt fixture + production panel/store, no server/runtime proof.
// Run from repository root with: node tickets/in-progress/token-meter-tps/implementation-evidence/ir-001/preview.mjs
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDir, '../../../../..');
const web = path.join(root, 'autobyteus-web');
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const route = path.join(web, 'pages/implementation-token-tps.vue');
const out = path.join(evidenceDir, `render-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(out);
const result = { layer: 'Implementation rendered self-check; fixture reports, not E2E/runtime validation',
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
  await fs.copyFile(path.join(evidenceDir, 'preview.page.vue'), route, 1); installed = true;
  const uiPort = await port(), backendPort = await port(); result.ports = { uiPort, backendPort };
  const log = createWriteStream(path.join(out, 'nuxt.log'));
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(uiPort)], {
    cwd: web, detached: true, env: { PATH: process.env.PATH, HOME: process.env.HOME, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log); child.stderr.pipe(log); result.nuxtPid = child.pid;
  const url = `http://127.0.0.1:${uiPort}/implementation-token-tps`;
  const deadline = Date.now() + 120000;
  while (true) {
    if (child.exitCode !== null || Date.now() > deadline) throw new Error('Nuxt readiness failed');
    try { if ((await fetch(url)).ok) break; } catch {}
    await pause(300);
  }
  browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, locale: 'en-US' });
  page.on('pageerror', error => result.errors.push({ kind: 'pageerror', text: error.message }));
  page.on('console', message => { if (message.type() === 'error') result.errors.push({ kind: 'console', text: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) result.errors.push({ kind: 'http', status: response.status(), url: response.url() }); });
  await page.route('**/rest/health', r => r.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
  await page.route('**/graphql', r => {
    const q = r.request().postDataJSON()?.query ?? '';
    const data = q.includes('getStandaloneRunTokenUsageSummary') ? { getStandaloneRunTokenUsageSummary: null }
      : q.includes('getAgentRunTokenUsageSummary') ? { getAgentRunTokenUsageSummary: null }
      : q.includes('serverSettings') ? { serverSettings: [] }
      : q.includes('agentDefinitions') ? { agentDefinitions: [] }
      : q.includes('agentTeamDefinitions') ? { agentTeamDefinitions: [] }
      : q.includes('workspaces') ? { workspaces: [] } : {};
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, ws => ws.send(JSON.stringify({ type: 'connected' })));
  await page.goto(url); await page.locator('[data-test="throughput-card"]').waitFor();
  await pause(4000); // settle cold Vite optimization/reload
  const read = selector => page.locator(`[data-test="${selector}"]`).innerText();
  const click = text => page.getByRole('button', { name: text, exact: true }).click();
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
  assert.deepEqual(result.errors, []);
  result.checks = ['No-total collecting', 'baseline only', '20 then 30 TPS', 'exact vs aggregate identity', 'keyboard help and focus', 'offline frozen number/time', 'zh-CN 320px no card overflow', 'true zero', 'invalid interval no number', 'selection history unavailable'];
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
