// API/E2E 652: Search → a result's run → the run page (no summary from search: run ID · workspace in mono) → Back "Search results".
const out = {};
await h.goto('?view=home&section=search');
await page.locator('[data-test="memory-search-input"]').waitFor({ timeout: 60000 });
await page.locator('[data-test="memory-search-input"]').fill('release notes');
await page.keyboard.press('Enter');
await page.locator('[data-test="memory-result"]').first().waitFor({ timeout: 60000 });
await h.sleep(1000);
out.results = (await page.locator('[data-test="memory-result"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 120)).slice(0, 4);
await h.shot('search-results-1440x900');
const opener = page.locator('[data-test="memory-result"] a, [data-test="memory-result"] button').first();
await opener.click();
await page.locator('[data-test="memory-page-header"]').waitFor({ timeout: 60000 });
await h.sleep(1500);
out.run = { header: (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' '),
  back: { text: (await page.locator('[data-test="memory-page-back"]').innerText()).trim(), label: await page.locator('[data-test="memory-page-back"]').getAttribute('aria-label') },
  title: await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().evaluate((el) => ({ test: el.dataset.test, text: el.textContent.trim(), tooltip: el.title, font: getComputedStyle(el).fontFamily.slice(0, 50), size: getComputedStyle(el).fontSize })) };
await h.shot('search-run-1440x900');
await page.locator('[data-test="memory-page-back"]').click();
await page.locator('[data-test="memory-search-input"]').waitFor({ timeout: 60000 });
await h.sleep(800);
out.afterBack = { query: await page.locator('[data-test="memory-search-input"]').inputValue(), results: await page.locator('[data-test="memory-result"]').count() };
return out;
