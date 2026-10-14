// Temporary API/E2E desktop journey D01 (output-tps-precision AC-001,006,007,008 on the real app).
// node desktop-standalone.mjs <controlEndpoint> <graphqlUrl> <seed.json> <outDir>
// Real packaged UI: select run, Token tab, composer send, keyboard help, switch runs, reload, history.
// Seeds only through the public API (desktop-seed.mjs). Never mutates Pinia; never closes the app.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/autobyteus-web/package.json')('playwright-core');
const [endpoint, gqlUrl, seedFile, out] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const gql = async (query, variables = {}) => {
  const r = await fetch(gqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data;
};
const pause = ms => new Promise(r => setTimeout(r, ms));
const receipt = { journey: 'D01 standalone', errors: [], frames: [], checks: [] };
const check = (name, detail) => { receipt.checks.push({ name, ...detail }); console.log('CHECK', name, JSON.stringify(detail ?? {})); };
const browser = await chromium.connectOverCDP(endpoint);
let page;
try {
  page = browser.contexts()[0].pages().find(p => p.url().includes('renderer/index.html'));
  await page.keyboard.press('Escape').catch(() => {}); // close a drawer left open by an earlier attempt
  await page.setViewportSize({ width: 1700, height: 1050 });
  page.on('pageerror', e => receipt.errors.push({ type: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') receipt.errors.push({ type: 'console', message: m.text() }); });
  page.on('websocket', ws => ws.on('framereceived', f => {
    try { const row = JSON.parse(String(f.payload)); if (/TOKEN_USAGE_UPDATED|TURN_COMPLETED/.test(row.type)) receipt.frames.push({ t: Date.now(), url: ws.url(), ...row }); } catch {}
  }));
  // Reload once so the app's WebSockets reconnect while the frame listener is attached.
  await page.reload(); await page.waitForLoadState('load'); await pause(3000);
  const value = page.locator('[data-test="throughput-value"]');
  const empty = page.locator('[data-test="throughput-empty"]');
  const openRun = async id => {
    await page.evaluate(id => { location.hash = '/chat?id=' + encodeURIComponent(id); }, id);
    await page.locator('[data-test="chat-run-frame"]').waitFor({ timeout: 60000 });
    await page.locator('[data-tab-name="usage"]').click();
    await page.locator('[data-test="throughput-card"]').waitFor({ timeout: 30000 });
    await pause(800);
  };
  const expectedText = t => new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(t.output_tokens / (t.duration_ms / 1000));
  await openRun(seed.runB);
  assert.equal(await empty.innerText(), '—'); assert.equal(await value.count(), 0);
  check('no reading before any call shows "—"');
  await page.screenshot({ path: path.join(out, 'D01-1-before.png') });
  const composer = page.locator('[data-test="chat-run-frame"] textarea').first();
  await composer.fill('Write one plain-text paragraph of about 120 words about lighthouses. Do not use tools.');
  const sentAt = Date.now();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await value.waitFor({ timeout: 180000 });
  await pause(1500);
  const readings = receipt.frames.filter(f => f.type === 'TOKEN_USAGE_UPDATED' && f.payload?.output_throughput);
  assert(readings.length >= 1, 'a reading frame arrived');
  const last = readings.at(-1);
  const runOf = f => f.payload.agent_run_id ?? f.payload.run_id;
  assert.equal(runOf(last), seed.runB);
  const shown = await value.innerText();
  assert(shown.startsWith(expectedText(last.payload.output_throughput) + ' '), `${shown} vs ${JSON.stringify(last.payload.output_throughput)}`);
  const method = last.payload.output_throughput.method;
  const modelLine = await page.locator('[data-test="throughput-model"]').innerText();
  assert(modelLine.includes(last.payload.model_identifier), modelLine);
  assert.equal(/incl\. time to first token/.test(modelLine), method === 'end_to_end', modelLine);
  const cardText = await page.locator('[data-test="throughput-card"]').innerText();
  for (const removed of ['Output TPS', 'Selected agent only', 'Estimated', 'Last reported', seed.runtimeKind ?? 'codex_app_server', 'output tokens /'])
    assert(!cardText.includes(removed), `removed text present: ${removed}`);
  check('single-call turn shows its own reading with the method label', { shown, frame: last.payload.output_throughput, model: last.payload.model_identifier, msAfterSend: last.t - sentAt, cardText });
  const help = page.locator('[data-test="throughput-help"] summary');
  await help.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-test="throughput-help"]').getAttribute('open'), '');
  const helpText = await page.locator('[data-test="throughput-method-help"]').innerText();
  const tokens = new Intl.NumberFormat('en').format(last.payload.output_throughput.output_tokens);
  const secs = new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(last.payload.output_throughput.duration_ms / 1000);
  assert(helpText.includes(`${tokens} tokens in ${secs} s`), helpText);
  assert.match(helpText, method === 'end_to_end' ? /from sending the request/ : /from its first streamed output/);
  check('keyboard help states method, tokens and seconds', { helpText });
  await page.screenshot({ path: path.join(out, 'D01-2-reading-help.png') });
  await pause(3000); assert.equal(await value.innerText(), shown); check('idle keeps the value', { shown });
  await openRun(seed.runA); assert.equal(await value.count(), 0); assert.equal(await empty.innerText(), '—');
  check('other run shows "—" immediately');
  await openRun(seed.runB); assert.equal(await value.innerText(), shown); check('back to the run shows its newest reading');
  await page.reload(); await page.waitForLoadState('load'); await pause(3000);
  await openRun(seed.runB); assert.equal(await value.count(), 0); assert.equal(await empty.innerText(), '—');
  check('after reload the card shows "—"');
  await page.screenshot({ path: path.join(out, 'D01-3-after-reload.png') });
  const terminated = (await gql('mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }', { id: seed.runB })).terminateAgentRun;
  assert(terminated.success); await pause(2000);
  await openRun(seed.runB); assert.equal(await value.count(), 0); assert.equal(await empty.innerText(), '—');
  check('history (terminated) run shows "—"');
  await page.screenshot({ path: path.join(out, 'D01-4-history.png') });
  assert.deepEqual(receipt.errors.filter(e => !/favicon/i.test(e.message)), []);
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = { message: error.message, stack: error.stack };
  await page?.screenshot({ path: path.join(out, 'D01-failure.png') }).catch(() => {});
} finally {
  await fs.writeFile(path.join(out, 'D01-result.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, failure: receipt.failure?.message, errors: receipt.errors.length }));
}
