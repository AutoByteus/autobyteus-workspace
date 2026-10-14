// Temporary API/E2E desktop journey D02b (output-tps-precision AC-005): without reloading, select
// the coordinator, the /worker member and the delegated worker copy in the real tree and compare
// each card with that exact run's newest reading captured in D02a.
// node desktop-team-select.mjs <controlEndpoint> <seed.json> <D02a-frames.json> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/autobyteus-web/package.json')('playwright-core');
const [endpoint, seedFile, framesFile, out] = process.argv.slice(2);
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const captured = JSON.parse(await fs.readFile(framesFile, 'utf8'));
const pause = ms => new Promise(r => setTimeout(r, ms));
const newest = {};
for (const f of captured.frames) {
  const p = f.row.payload ?? {};
  if (f.row.type === 'TOKEN_USAGE_UPDATED' && p.output_throughput) newest[p.agent_run_id] = p.output_throughput;
}
const fmt = t => new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(t.output_tokens / (t.duration_ms / 1000));
const receipt = { journey: 'D02b team selection', newest, checks: [], errors: [] };
const browser = await chromium.connectOverCDP(endpoint);
let page;
try {
  page = browser.contexts()[0].pages().find(p => p.url().includes('renderer/index.html'));
  page.on('pageerror', e => receipt.errors.push({ type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') receipt.errors.push({ type: 'console', message: m.text() }); });
  const read = async () => {
    await page.locator('[data-test="throughput-card"]').waitFor({ timeout: 30000 }); await pause(800);
    const value = await page.locator('[data-test="throughput-value"]').innerText().catch(() => null);
    const help = page.locator('[data-test="throughput-help"]');
    if ((await help.getAttribute('open')) === null) await help.locator('summary').click();
    const methodHelp = await page.locator('[data-test="throughput-method-help"]').innerText().catch(() => null);
    return { value, methodHelp, header: (await page.locator('header, [data-test="chat-run-header"]').first().innerText().catch(() => '')).slice(0, 80) };
  };
  const targets = [
    { name: 'coordinator (Team member)', click: () => page.locator(`[data-test="workspace-team-member-${seed.teamRunId}-/coordinator"]`).click() },
    { name: 'worker (Team member)', click: () => page.locator(`[data-test="workspace-team-member-${seed.teamRunId}-/worker"]`).click() },
    { name: 'worker (delegated copy)', click: () => page.locator('[data-test="workspace-team-transient-execution-row"]').first().click() },
  ];
  const seen = new Set();
  for (const target of targets) {
    await target.click(); await pause(1500);
    await page.locator('[data-tab-name="usage"]').click().catch(() => {});
    const shown = await read();
    const matching = Object.entries(newest).filter(([, t]) => shown.value?.startsWith(fmt(t) + ' '));
    assert.equal(matching.length, 1, `${target.name}: ${JSON.stringify(shown)} vs ${JSON.stringify(newest)}`);
    const [runId, reading] = matching[0];
    assert(!seen.has(runId), `${target.name} shows another selection's reading`); seen.add(runId);
    const tokens = new Intl.NumberFormat('en').format(reading.output_tokens);
    assert(shown.methodHelp.includes(`${tokens} tokens in`), shown.methodHelp);
    receipt.checks.push({ target: target.name, runId, reading, shown });
    console.log('CHECK', target.name, runId, shown.value);
    await page.screenshot({ path: path.join(out, `D02-3-${target.name.replace(/[^a-z]+/gi, '-')}.png`) });
  }
  assert.equal(seen.size, 3);
  assert(receipt.checks[0].runId.startsWith('tps_coordinator'));
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = { message: error.message, stack: error.stack };
  await page?.screenshot({ path: path.join(out, 'D02b-failure.png') }).catch(() => {});
} finally {
  await fs.writeFile(path.join(out, 'D02b-result.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, failure: receipt.failure?.message }));
}
