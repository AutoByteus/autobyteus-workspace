// autobyteus-407 API/E2E AC-021 rendered in the phone view (/mobile in headless Chrome, test-owned node only).
// Device A = one browser profile paired once; its tabs share one device credential. Device B = a second profile.
// Steps: A tab 1 and tab 2 open the VNC Viewer (2 streams of one phone) -> A tab 3 shows "Too many viewers" + Retry
// and no upstream opens -> close A tab 1 -> Retry on tab 3 connects -> 2 raw trusted-network viewers bring the node
// to 4 -> device B opens the view: "Too many viewers" (node-wide) -> stop the fillers -> B's Retry connects.
// Usage: node AC021-browser-tabs.mjs <playwright-core dir> <ws package.json> <pairing URL A> <pairing URL B> <out dir>
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [pwDir, wsPkg, pairA, pairB, outDir] = process.argv.slice(2);
const { chromium } = createRequire(path.join(pwDir, 'package.json'))('playwright-core');
fs.mkdirSync(outDir, { recursive: true });
const node = (...a) => execFileSync('/private/tmp/abx407-api/probes/node.sh', a, { encoding: 'utf8' }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const step = (name, v) => { const r = { t: new Date().toISOString(), name, ...v }; results.push(r); console.log(JSON.stringify(r)); };
const host = new URL(pairA).hostname;
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: [`--host-resolver-rules=MAP ${host} 127.0.0.1`] });
const status = (p) => p.locator('[data-testid="mobile-node-desktop-status"]').textContent().catch(() => null);
const offer = (p) => p.locator('[data-testid="mobile-node-desktop-connect"]').textContent().catch(() => null);
const waitStatus = async (p, text, ms = 30000) => { await p.locator('[data-testid="mobile-node-desktop-status"]').filter({ hasText: text }).waitFor({ timeout: ms }); };

async function pairAndOpenView(context, pairingUrl, label) {
  const p = await context.newPage();
  await p.goto(pairingUrl, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'Pair this phone' }).click();
  await p.locator('[data-testid="mobile-new-run-button"]').click({ timeout: 60000 });
  await p.locator('[data-testid="mobile-run-model-select-toggle"]').click();
  await p.locator('[data-testid="mobile-run-model-select-search"]').fill('qwen3-max');
  await p.locator('[data-testid="mobile-run-model-select-option"]').first().click();
  await p.locator('[data-testid="mobile-run-launch"]').click();
  await p.locator('[data-testid="mobile-run-menu-button"]').click();
  await p.locator('[data-testid="mobile-run-menu-desktop"]').click();
  await waitStatus(p, 'Connected');
  step(`${label}: paired, run created (no message), VNC Viewer open`, { status: await status(p), upstream: node('up') });
  return p;
}
// Another tab of the same device does what a user does: open /mobile, New run (a draft, no message), ⋮ -> VNC Viewer.
async function openSameView(context, url, label, expect) {
  const p = await context.newPage();
  await p.goto(new URL('/mobile/', url).toString(), { waitUntil: 'domcontentloaded' });
  // A draft run with no message is not in the run list, so this tab starts its own draft run (still no message).
  await p.locator('[data-testid="mobile-new-run-button"]').click({ timeout: 60000 });
  await p.locator('[data-testid="mobile-run-model-select-toggle"]').click();
  await p.locator('[data-testid="mobile-run-model-select-search"]').fill('qwen3-max');
  await p.locator('[data-testid="mobile-run-model-select-option"]').first().click();
  await p.locator('[data-testid="mobile-run-launch"]').click();
  await p.locator('[data-testid="mobile-run-menu-button"]').click();
  await p.locator('[data-testid="mobile-run-menu-desktop"]').click();
  await waitStatus(p, expect);
  await sleep(1500);
  step(label, { status: await status(p), offer: await offer(p), upstream: node('up') });
  return p;
}

try {
  const deviceA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const a1 = await pairAndOpenView(deviceA, pairA, 'A tab 1');
  const viewUrl = a1.url();
  step('view URL (shared by the other tabs)', { path: new URL(viewUrl).pathname + new URL(viewUrl).search.replace(/(access_token|pairing)=[^&]+/g, '$1=<r>') });
  const a2 = await openSameView(deviceA, viewUrl, 'A tab 2 (2nd stream of the same phone)', 'Connected');
  const a3 = await openSameView(deviceA, viewUrl, 'A tab 3 (3rd stream of the same phone)', 'Too many viewers');
  await a3.screenshot({ path: path.join(outDir, 'AC021-1-third-tab-too-many.png') });
  step('server log after the refusal', { log: node('log', '3') });

  await a1.close();
  await sleep(2500);
  step('A tab 1 closed', { upstream: node('up'), log: node('log', '1') });
  await a3.locator('[data-testid="mobile-node-desktop-connect"]').click();
  await waitStatus(a3, 'Connected');
  await sleep(1000);
  step('A tab 3 Retry after a stream left', { status: await status(a3), offer: await offer(a3), upstream: node('up') });
  await a3.screenshot({ path: path.join(outDir, 'AC021-2-third-tab-after-retry.png') });

  const filler = spawn('node', ['/private/tmp/abx407-api/probes/filler.mjs', wsPkg, 'ws://127.0.0.1:56465', '2'], { stdio: ['ignore', 'pipe', 'inherit'] });
  let fillerOut = ''; filler.stdout.on('data', (d) => { fillerOut += d; });
  await sleep(4000);
  step('2 raw trusted-network viewers added', { filler: fillerOut.trim().split('\n'), upstream: node('up') });

  const deviceB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const b1 = await deviceB.newPage();
  await b1.goto(pairB, { waitUntil: 'domcontentloaded' });
  await b1.getByRole('button', { name: 'Pair this phone' }).click();
  await b1.locator('[data-testid="mobile-new-run-button"]').click({ timeout: 60000 });
  await b1.locator('[data-testid="mobile-run-model-select-toggle"]').click();
  await b1.locator('[data-testid="mobile-run-model-select-search"]').fill('qwen3-max');
  await b1.locator('[data-testid="mobile-run-model-select-option"]').first().click();
  await b1.locator('[data-testid="mobile-run-launch"]').click();
  await b1.locator('[data-testid="mobile-run-menu-button"]').click();
  await b1.locator('[data-testid="mobile-run-menu-desktop"]').click();
  await waitStatus(b1, 'Too many viewers');
  await sleep(1500);
  step('device B (5th stream node-wide)', { status: await status(b1), offer: await offer(b1), upstream: node('up'), log: node('log', '1') });
  await b1.screenshot({ path: path.join(outDir, 'AC021-3-fifth-stream-too-many.png') });

  filler.kill('SIGTERM');
  await sleep(3000);
  step('fillers closed', { upstream: node('up') });
  await b1.locator('[data-testid="mobile-node-desktop-connect"]').click();
  await waitStatus(b1, 'Connected');
  await sleep(1000);
  step('device B Retry', { status: await status(b1), upstream: node('up') });
  await deviceA.close(); await deviceB.close();
  await sleep(2500);
  step('all closed', { upstream: node('up') });
} catch (error) {
  step('error', { error: String(error).slice(0, 400) });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'AC021-results.json'), JSON.stringify(results, null, 2));
}
