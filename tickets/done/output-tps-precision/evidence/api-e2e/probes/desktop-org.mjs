// Temporary API/E2E desktop journey D03 (output-tps-precision AC-005, Org): from the real Org view,
// send to the Org's direct agent (lead), which messages the Org team member /crew/worker. Then select
// the lead and the crew worker in the tree; each card must show its own run's newest wire reading.
// node desktop-org.mjs <controlEndpoint> <org-seed.json> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/autobyteus-web/package.json')('playwright-core');
const [endpoint, orgSeedFile, out] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const orgSeed = JSON.parse(await fs.readFile(orgSeedFile, 'utf8'));
const pause = ms => new Promise(r => setTimeout(r, ms));
const fmt = t => new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(t.output_tokens / (t.duration_ms / 1000));
const receipt = { journey: 'D03 Org', errors: [], frames: [], checks: [] };
const browser = await chromium.connectOverCDP(endpoint);
let page;
try {
  page = browser.contexts()[0].pages().find(p => p.url().includes('renderer/index.html'));
  await page.setViewportSize({ width: 1700, height: 1050 });
  page.on('pageerror', e => receipt.errors.push({ type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') receipt.errors.push({ type: 'console', message: m.text() }); });
  page.on('websocket', ws => ws.on('framereceived', f => {
    try { const s = String(f.payload); if (s.includes('TOKEN_USAGE_UPDATED')) receipt.frames.push({ t: Date.now(), url: ws.url(), row: JSON.parse(s) }); } catch {}
  }));
  await page.reload(); await page.waitForLoadState('load'); await pause(3000);
  await page.evaluate(id => { location.hash = `/workspace?rootSubjectKind=agent_org&definitionId=tps-desktop-org&orgRunId=${id}&mode=active`; }, orgSeed.orgRunId);
  await pause(3000);
  const children = page.locator(`[data-test="agent-org-run-children-${orgSeed.orgRunId}"]`);
  if (!(await children.isVisible())) { await page.locator(`[data-test="agent-org-run-disclosure-${orgSeed.orgRunId}"]`).click(); await pause(800); }
  const leadRow = children.locator('[data-test^="agent-org-agent-row-"][aria-label*=", /lead,"]');
  const leadRunId = (await leadRow.getAttribute('data-test')).replace('agent-org-agent-row-', '');
  await leadRow.click(); await pause(2000);
  await page.locator('[data-tab-name="usage"]').click();
  await page.locator('[data-test="throughput-card"]').waitFor({ timeout: 30000 });
  assert.equal(await page.locator('[data-test="throughput-empty"]').innerText(), '—');
  receipt.checks.push({ name: 'Org lead before any call shows "—"' });
  await page.screenshot({ path: path.join(out, 'D03-1-org-lead-before.png') });
  await page.locator('textarea').first().fill('Call send_message_to exactly once with recipient_address "/crew/worker" and content '
    + '"Write one plain-text paragraph of about 120 words about forests. Do not use tools." '
    + 'Then reply with one plain-text paragraph of about 100 words about organizations.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  receipt.sentAt = Date.now();
  // Org frames nest the run's presentation message: ROOT_EXECUTION_EVENT.payload.event.{agent_run_id, message}.
  const usageOf = row => row.type === 'ROOT_EXECUTION_EVENT'
    ? (row.payload?.event?.message?.type === 'TOKEN_USAGE_UPDATED'
      ? { ...row.payload.event.message.payload, agent_run_id: row.payload.event.agent_run_id, member_address: row.payload.event.member_address } : null)
    : row.type === 'TOKEN_USAGE_UPDATED' ? row.payload : null;
  const readingRuns = () => new Set(receipt.frames.map(f => usageOf(f.row)).filter(p => p?.output_throughput).map(p => p.agent_run_id));
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline && readingRuns().size < 2) await pause(2000);
  await pause(12000);
  const newest = {};
  for (const f of receipt.frames) { const p = usageOf(f.row); if (p?.output_throughput) newest[p.agent_run_id] = { ...p.output_throughput, model: p.model_identifier, member: p.member_address, url: f.url }; }
  receipt.newest = newest; receipt.leadRunId = leadRunId;
  assert(newest[leadRunId], 'lead produced a reading');
  const workerRunId = Object.keys(newest).find(id => id !== leadRunId && id.startsWith('tps_worker'));
  assert(workerRunId, 'crew worker produced a reading');
  const readCard = async () => { await pause(1200); return page.locator('[data-test="throughput-value"]').innerText(); };
  await leadRow.click(); await page.locator('[data-tab-name="usage"]').click().catch(() => {});
  const leadShown = await readCard();
  assert(leadShown.startsWith(fmt(newest[leadRunId]) + ' '), `${leadShown} vs ${JSON.stringify(newest[leadRunId])}`);
  receipt.checks.push({ name: 'Org direct agent (lead) shows its own newest reading', runId: leadRunId, shown: leadShown, reading: newest[leadRunId] });
  await page.screenshot({ path: path.join(out, 'D03-2-org-lead.png') });
  const crewRow = children.locator('[data-test^="agent-org-team-row-"]');
  await crewRow.click(); await pause(1500);
  const workerRow = page.locator(`[data-test="agent-org-agent-row-${workerRunId}"]`);
  if (!(await workerRow.isVisible())) { await crewRow.click(); await pause(1500); }
  // The crew coordinator made no model call in this session: its card shows "—".
  const crewCoordinatorRow = children.locator('[data-test^="agent-org-agent-row-"][aria-label*=", /crew/coordinator,"]');
  {
    await crewCoordinatorRow.click(); await page.locator('[data-tab-name="usage"]').click().catch(() => {}); await pause(1200);
    assert.equal(await page.locator('[data-test="throughput-value"]').count(), 0);
    assert.equal(await page.locator('[data-test="throughput-empty"]').innerText(), '—');
    receipt.checks.push({ name: 'Org team member without a call (crew/coordinator) shows "—"', runId: (await crewCoordinatorRow.getAttribute('data-test')).replace('agent-org-agent-row-', '') });
  }
  await workerRow.click(); await page.locator('[data-tab-name="usage"]').click().catch(() => {});
  const workerShown = await readCard();
  assert(workerShown.startsWith(fmt(newest[workerRunId]) + ' '), `${workerShown} vs ${JSON.stringify(newest[workerRunId])}`);
  assert.notEqual(workerShown, leadShown);
  receipt.checks.push({ name: 'Org team member (crew/worker) shows its own newest reading', runId: workerRunId, shown: workerShown, reading: newest[workerRunId] });
  await page.screenshot({ path: path.join(out, 'D03-3-org-crew-worker.png') });
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = { message: error.message, stack: error.stack };
  await page?.screenshot({ path: path.join(out, 'D03-failure.png') }).catch(() => {});
} finally {
  await fs.writeFile(path.join(out, 'D03-result.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, failure: receipt.failure?.message, checks: receipt.checks.map(c => [c.name, c.shown]), newest: receipt.newest }));
}
