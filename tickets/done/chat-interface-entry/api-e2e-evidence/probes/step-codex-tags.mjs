import fs from 'node:fs/promises';
const gql = async (query, variables = {}) => {
  const r = await fetch('http://127.0.0.1:18731/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  return (await r.json());
};
export default async ({ page, front, out }) => {
  const r = { urls: [] };
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) r.urls.push(f.url()); });
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.locator('[data-test="chat-model-trigger"]').click();
  await page.locator('[data-test="chat-runtime-codex_app_server"]').click();
  await page.locator('[data-test="chat-model-option-gpt-5.5"]').click();
  const input = page.locator('[data-test="chat-message-input"] textarea, textarea[data-test="chat-message-input"]').first();
  await input.click();
  await input.type('/probe-al');
  await page.locator('[data-test="chat-skill-option-probe-alpha"]').waitFor();
  await page.keyboard.press('Enter');
  await input.type('/probe-bund');
  await page.locator('[data-test="chat-skill-option-probe-bundled"]').click();
  r.chips = await page.locator('[data-test^="chat-skill-chip-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test')));
  r.inputAfterTags = await input.inputValue();
  await input.type('Reply with the markers from both skills, nothing else.');
  await page.screenshot({ path: `${out}/codex-tags-draft.png` });
  await page.locator('[data-test="chat-primary-action"]').first().click();
  await page.waitForURL(/\/chat\?id=/, { timeout: 120000 });
  r.urlAfterSend = page.url();
  const runId = new URL(page.url()).searchParams.get('id');
  r.runId = runId;
  // workspace materialization while live
  await page.waitForTimeout(4000);
  const ws = '/tmp/chat-entry-live-g5kZ/server-data/temp_workspace/.codex/skills';
  r.materialized = await fs.readdir(ws).catch((e) => `ERR ${e.code}`);
  // wait for reply
  await page.waitForFunction(() => /ALPHA-OK|BUNDLED-OK/.test(document.querySelector('[data-test="chat-page"]')?.innerText ?? ''), null, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(3000);
  r.header = await page.locator('[data-test="chat-run-header"]').innerText();
  r.sentChips = await page.locator('[data-test="skill-request-chips"]').first().innerText().catch(() => null);
  r.treeSelected = await page.locator('[aria-selected="true"], .bg-indigo-50').evaluateAll((els) => els.map((e) => e.innerText.slice(0, 80)));
  await page.screenshot({ path: `${out}/codex-tags-live.png` });
  // hover sent-as tooltip
  await page.locator('[data-test="skill-request-chips"]').first().hover().catch(() => {});
  await page.waitForTimeout(500);
  r.sentAs = await page.locator('[data-test="skill-request-sent-as"]').first().innerText().catch(() => null);
  await page.screenshot({ path: `${out}/codex-sent-as.png` });
  const proj = await gql('query($runId:String!){getRunProjection(runId:$runId){summary conversation}}', { runId });
  r.summary = proj.data?.getRunProjection?.summary;
  r.firstUserContent = JSON.stringify(proj.data?.getRunProjection?.conversation ?? '').slice(0, 700);
  r.view = (await page.locator('[data-test="chat-page"]').innerText()).slice(0, 1200);
  // reload → chips from history
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(3000);
  r.urlAfterReload = page.url();
  r.chipsAfterReload = await page.locator('[data-test="skill-request-chips"]').first().innerText().catch(() => null);
  r.lastModel = await page.evaluate(() => localStorage.getItem('autobyteus.chat.lastModel'));
  return r;
};
