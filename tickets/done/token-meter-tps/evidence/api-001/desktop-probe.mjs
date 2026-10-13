// Temporary ticket-owned full-product probe. Run under unprivileged identity + whole-session Xvfb
// after current worktree build: node <this file> <fresh output directory>. Fake agy is on private PATH.
// Public API seed only; real packaged UI selection/Token/composer/send/reload; no Pinia mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const out = process.argv[2];
await fs.mkdir(out);
const run = promisify(execFile);
const { chromium } = createRequire(path.join(root, 'autobyteus-web/package.json'))('playwright-core');
const receipt = { platform: `${process.platform}-${process.arch}`, uid: process.getuid(), errors: [], frames: [], checks: [], cleanup: {} };
const lifecycle = async (...args) => {
  const { stdout } = await run(process.execPath, [path.join(root, 'autobyteus-web/scripts/isolated-app/cli.mjs'), ...args], { cwd: root, maxBuffer: 1024 * 1024 });
  const result = JSON.parse(stdout); assert(result.ok, JSON.stringify(result)); return result.result;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let instance, browser, page;
try {
  assert(receipt.uid > 0);
  instance = await lifecycle('start', '--from-worktree'); receipt.instance = instance;
  await fs.writeFile(path.join(out, 'start.json'), JSON.stringify(instance, null, 2));
  const asar = await fs.readFile(path.join(path.dirname(instance.executablePath), 'resources/app.asar'));
  receipt.appAsarHash = createHash('sha256').update(asar).digest('hex');
  receipt.packagedOutputTPS = asar.includes(Buffer.from('Output TPS'));
  assert(receipt.packagedOutputTPS, 'current TPS label missing from packaged renderer');
  receipt.sourceHashes = {};
  for (const relative of ['stores/tokenUsageThroughput.ts', 'stores/tokenUsageMeterStore.ts', 'components/workspace/usage/TokenUsageThroughputCard.vue'])
    receipt.sourceHashes[relative] = createHash('sha256').update(await fs.readFile(path.join(root, 'autobyteus-web', relative))).digest('hex');
  receipt.executableHash = createHash('sha256').update(await fs.readFile(instance.executablePath)).digest('hex');
  const gql = async (query, variables = {}) => {
    const resp = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const body = await resp.json(); assert(!body.errors, JSON.stringify(body)); return body.data;
  };
  browser = await chromium.connectOverCDP(instance.controlEndpoint);
  const context = browser.contexts()[0];
  page = context.pages().find(p => p.url().includes('renderer/index.html')) || context.pages()[0];
  await page.setViewportSize({ width: 1540, height: 1050 });
  page.on('pageerror', e => receipt.errors.push({ type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') receipt.errors.push({ type: 'console', message: m.text() }); });
  page.on('websocket', ws => ws.on('framereceived', f => {
    const row = JSON.parse(String(f.payload));
    if (/TOKEN_USAGE_UPDATED|TOOL_|TURN_COMPLETED/.test(row.type)) receipt.frames.push(row);
  }));
  const workspace = path.join(process.env.HOME, 'tps-workspace'); await fs.mkdir(workspace);
  const file = path.join(workspace, 'tool.txt'); await fs.writeFile(file, 'TPS_OWNED_TOOL_CONTENT');
  const definition = (await gql('mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }',
    { input: { name: 'TPS Desktop Agent', role: 'assistant', description: 'Disposable scripted TPS', instructions: 'Read the supplied file.', category: 'runtime-e2e', toolNames: [] } })).createAgentDefinition.id;
  const create = async () => {
    const result = (await gql('mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }',
      { input: { agentDefinitionId: definition, workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', runtimeKind: 'antigravity_cli', autoExecuteTools: true } })).createAgentRun;
    assert(result.success, result.message); return result.runId;
  };
  const runId = await create(); const otherId = await create(); receipt.runIds = [runId, otherId];
  const openRun = async id => {
    await page.evaluate(id => { location.hash = '/chat?id=' + encodeURIComponent(id); }, id);
    await page.locator('[data-test="chat-run-frame"]').waitFor({ timeout: 60000 });
    const tab = page.getByRole('tab', { name: 'Token', exact: true });
    if (!(await tab.isVisible())) {
      // Compact tool rail's normal expand affordance, if the panel starts collapsed.
      const expand = page.locator('[data-test="workspace-right-tool-strip-surface"] [data-tab-name="usage"]');
      if (await expand.count()) await expand.click();
    }
    await tab.click(); await page.locator('[data-test="throughput-card"]').waitFor();
    await pause(700);
  };
  await openRun(runId);
  assert.equal(await page.locator('[data-test="throughput-value"]').count(), 0);
  await page.screenshot({ path: path.join(out, 'before-send.png'), fullPage: true });
  const composer = page.locator('[data-test="chat-run-frame"] textarea').first();
  await composer.fill('TPS_READ:' + file);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.locator('[data-test="throughput-value"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('[data-test="throughput-interval"]')?.textContent?.includes('150 output tokens'));
  const calls = receipt.frames.filter(row => row.type === 'TOKEN_USAGE_UPDATED');
  assert.equal(calls.length, 3); assert.equal(new Set(calls.map(row => row.payload.turn_id)).size, 1);
  assert.deepEqual(calls.map(row => row.payload.meter_delta_output_tokens), [999, 200, 150]);
  const elapsed = (Date.parse(calls[2].payload.observed_at) - Date.parse(calls[1].payload.observed_at)) / 1000;
  const expected = new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(150 / elapsed) + ' tokens/s';
  const value = page.locator('[data-test="throughput-value"]');
  assert.equal(await value.innerText(), expected);
  assert.match(await page.locator('[data-test="throughput-identity"]').innerText(), /antigravity_cli.*gemini-3.8-flash-low/);
  assert.match(await page.locator('[data-test="throughput-qualification"]').innerText(), /Estimated.*Last reported/);
  const time = await page.locator('[data-test="throughput-time"]').getAttribute('datetime');
  const help = page.locator('[data-test="throughput-help"] summary'); await help.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-test="throughput-help"]').getAttribute('open'), '');
  await page.screenshot({ path: path.join(out, 'ready-desktop.png'), fullPage: true });
  await pause(1500); assert.equal(await value.innerText(), expected);
  assert.equal(await page.locator('[data-test="throughput-time"]').getAttribute('datetime'), time);
  await openRun(otherId); assert.equal(await value.count(), 0);
  await openRun(runId); assert.equal(await value.innerText(), expected);
  await page.reload(); await page.locator('[data-test="chat-run-frame"]').waitFor();
  await page.getByRole('tab', { name: 'Token', exact: true }).click();
  await page.locator('[data-test="throughput-card"]').waitFor();
  assert.equal(await value.count(), 0); // normal saved totals must not restore ephemeral TPS
  await page.screenshot({ path: path.join(out, 'reloaded-unavailable.png'), fullPage: true });
  receipt.summary = (await gql('query($runId: String!) { getAgentRunTokenUsageSummary(runId:$runId) { runId outputTokens usageReportCount } }', { runId })).getAgentRunTokenUsageSummary;
  assert.equal(receipt.summary.outputTokens, 1349); assert.equal(receipt.summary.usageReportCount, 3);
  assert.deepEqual(receipt.errors, []);
  receipt.checks = ['packaged worktree real server', 'public API test seed', 'real chat selection and Token tab', 'UI composer send', 'same-turn three calls with tool', 'server-time arithmetic and identity', 'keyboard help', 'frozen completed reading', 'other-run isolation', 'reload does not synthesize TPS'];
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = { message: error.message, stack: error.stack, stdout: error.stdout, stderr: error.stderr };
  await page?.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
  if (page) await fs.writeFile(path.join(out, 'failure-dom.txt'), await page.locator('body').innerText().catch(() => 'unavailable'));
  process.exitCode = 1;
} finally {
  if (instance) {
    await fs.copyFile(instance.logPath, path.join(out, 'instance.log')).catch(() => {});
    receipt.cleanup.stop = await lifecycle('stop', instance.instanceId).catch(error => ({ error: error.message }));
    receipt.cleanup.list = await lifecycle('list').catch(error => ({ error: error.message }));
  }
  // Lifecycle owns app/browser; CDP client releases without closing anyone else's instance.
  await browser?.close().catch(() => {});
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ status: receipt.status, failure: receipt.failure, out, cleanup: receipt.cleanup }));
}
