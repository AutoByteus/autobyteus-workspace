// VIS-006/007 Global, VIS-008 the Agents cards.
const vp = h.viewport; const tag = `${vp.width}x${vp.height}`;
await h.goto('?view=home&section=browse&node=global');
await page.locator('[data-test="semantic-memory-explorer"]').waitFor({ timeout: 60000 });
await page.locator('.semantic-memory-reader .markdown-body h1').first().waitFor({ timeout: 30000 });
await h.sleep(600);
const panel = await h.box('[data-test="semantic-memory-explorer"]');
const global = {
  topRow: await h.box('[data-test="memory-section-browse"]'),
  panel, readerTop: panel.y, gapToBottom: vp.height - panel.bottom,
  h1: await page.locator('[data-test="global-memory-page"] > h1').evaluate((el) => ({ text: el.textContent.trim(), srOnly: el.classList.contains('sr-only') })),
  tabTooltip: await page.locator('[data-test="memory-browse-tab-global"]').getAttribute('title'),
  openTab: await page.locator('[data-test="file-tab-name"]').first().innerText(),
  scroller: await page.evaluate(() => { const el = document.querySelector('.h-full.overflow-auto.bg-gray-50'); return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }; }),
};
await h.shot(`global-${tag}`);
await h.goto('?view=home&section=browse&node=agents');
await page.locator('[data-test="memory-owner-card"]').first().waitFor({ timeout: 60000 });
await h.sleep(500);
const agents = {
  topRow: await page.locator('[data-test="memory-browse"] > div').first().evaluate((el) => el.innerText.replace(/\s+/g, ' ')),
  firstCard: await h.box('[data-test="memory-owner-card"]'),
  cards: await page.locator('[data-test="memory-owner-card"]').evaluateAll((els) => els.map((el) => ({ text: el.innerText.replace(/\s+/g, ' ').trim(), tooltip: el.querySelector('h2')?.title }))),
};
await h.shot(`agents-${tag}`);
await h.goto('?view=home&section=browse&node=teams');
await page.locator('[data-test="memory-owner-card"]').first().waitFor({ timeout: 60000 });
await h.sleep(500);
const teams = { cards: await page.locator('[data-test="memory-owner-card"]').evaluateAll((els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim())) };
return { viewport: vp, global, agents, teams };
