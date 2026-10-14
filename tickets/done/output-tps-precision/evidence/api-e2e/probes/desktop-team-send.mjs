// Temporary API/E2E desktop journey D02a (output-tps-precision AC-005): from the real team view,
// send one message to the coordinator through the composer, then capture every WS frame carrying
// usage while the coordinator, the /worker member and a delegated worker copy run.
// node desktop-team-send.mjs <controlEndpoint> <seed.json> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/autobyteus-web/package.json')('playwright-core');
const [endpoint, seedFile, out] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const pause = ms => new Promise(r => setTimeout(r, ms));
const receipt = { journey: 'D02a team send', errors: [], frames: [] };
const browser = await chromium.connectOverCDP(endpoint);
let page;
try {
  page = browser.contexts()[0].pages().find(p => p.url().includes('renderer/index.html'));
  await page.setViewportSize({ width: 1700, height: 1050 });
  page.on('pageerror', e => receipt.errors.push({ type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') receipt.errors.push({ type: 'console', message: m.text() }); });
  page.on('websocket', ws => ws.on('framereceived', f => {
    try {
      const row = JSON.parse(String(f.payload));
      const s = JSON.stringify(row);
      if (s.includes('TOKEN_USAGE_UPDATED') || s.includes('TURN_COMPLETED')) receipt.frames.push({ t: Date.now(), url: ws.url(), row });
    } catch {}
  }));
  await page.reload(); await page.waitForLoadState('load'); await pause(3000);
  const teamDefRow = page.locator(`[data-test="workspace-team-definition-row-${seed.team}"]`);
  if (!(await teamDefRow.isVisible())) { await page.getByText('tps-desktop-ws', { exact: true }).click(); await pause(800); }
  await teamDefRow.click(); await pause(500);
  const teamRow = page.locator(`[data-test="workspace-team-row-${seed.teamRunId}"]`);
  if (!(await teamRow.isVisible())) await page.locator(`[data-test="workspace-team-definition-row-${seed.team}"]`).click();
  await teamRow.click(); await pause(2500);
  await page.locator(`[data-test="workspace-team-member-${seed.teamRunId}-/coordinator"]`).click(); await pause(1500);
  await page.locator('[data-tab-name="usage"]').click().catch(async () => {
    await page.getByRole('tab', { name: 'Token', exact: true }).click();
  });
  await page.locator('[data-test="throughput-card"]').waitFor({ timeout: 30000 });
  assert.equal(await page.locator('[data-test="throughput-empty"]').innerText(), '—');
  await page.screenshot({ path: path.join(out, 'D02-1-team-before.png') });
  const composer = page.locator('textarea').first();
  await composer.fill('Do these two steps in order. Step 1: call send_message_to exactly once with recipient_address "/worker" and content '
    + '"Write one plain-text paragraph of about 120 words about rivers. Do not use tools." '
    + 'Step 2: call delegate_task exactly once with recipient_address "/worker" and description '
    + '"Write one plain-text paragraph of about 150 words about mountains. Do not use tools." '
    + 'Then reply with one plain-text paragraph of about 100 words about teamwork.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  receipt.sentAt = Date.now();
  const runsWithReadings = () => new Set(receipt.frames.map(f => f.row).filter(r => JSON.stringify(r).includes('"output_throughput":{'))
    .map(r => r.payload?.agent_run_id ?? r.payload?.run_id ?? r.payload?.payload?.agent_run_id));
  const deadline = Date.now() + 360000;
  while (Date.now() < deadline && runsWithReadings().size < 3) await pause(2000);
  await pause(15000); // let trailing calls finish
  receipt.runsWithReadings = [...runsWithReadings()];
  await page.screenshot({ path: path.join(out, 'D02-2-team-after.png') });
  receipt.status = 'captured';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = { message: error.message, stack: error.stack };
  await page?.screenshot({ path: path.join(out, 'D02-failure.png') }).catch(() => {});
} finally {
  await fs.writeFile(path.join(out, 'D02a-frames.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, failure: receipt.failure?.message, runs: receipt.runsWithReadings, frames: receipt.frames.length, errors: receipt.errors }));
}
