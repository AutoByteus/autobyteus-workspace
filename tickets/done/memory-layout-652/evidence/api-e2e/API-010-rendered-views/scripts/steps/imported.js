// API/E2E 652: an imported source (beta synced into this node's hub): its badge in the top bar and the new header rows; Semantic.
const out = {};
await h.goto('?view=home&section=browse&node=agents');
await page.locator('#memory-source-select').waitFor({ timeout: 60000 });
out.sources = await page.locator('#memory-source-select option').allInnerTexts();
const value = await page.locator('#memory-source-select option').evaluateAll((os) => os.map((o) => o.value).find((v) => v.startsWith('imported:')));
out.importedValue = value;
await page.locator('#memory-source-select').selectOption(value);
await page.locator('[data-test="memory-owner-card"]').first().waitFor({ timeout: 60000 });
await h.sleep(1000);
out.topBar = (await page.locator('[data-test="memory-browse"]').first().innerText()).split('\n').slice(0, 8).join(' | ');
out.cards = (await page.locator('[data-test="memory-owner-card"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
await h.shot('imported-agents-1440x900');
await page.locator('[data-test="memory-owner-card"]').first().click();
await page.locator('[data-test="memory-page-header"]').waitFor({ timeout: 60000 });
await h.sleep(1500);
out.agentHeader = (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' ');
out.badgeInHeader = await page.locator('[data-test="memory-page-header"] .bg-amber-100').count();
await h.shot('imported-agent-episodic-1440x900');
if (await page.locator('[data-test="agent-memory-tab-semantic"]').count()) {
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await h.sleep(2500);
  out.semantic = { notSynced: await page.locator('[data-test="semantic-memory-not-synced"]').count(), text: (await page.locator('[data-test="semantic-memory-folder"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200) };
  await h.shot('imported-agent-semantic-1440x900');
}
return out;
