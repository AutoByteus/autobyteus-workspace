// API/E2E 652: a short window (1280×720) with a long document: the panel fills to the bottom, the reader scrolls inside.
const out = {};
await h.goto(`?view=home&section=browse&node=${encodeURIComponent(`teams/team:software-engineering-team/agent:${stack.designerId}`)}&pane=semantic`);
await page.locator('[data-test="semantic-memory-explorer"]').waitFor({ timeout: 60000 });
await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'release-handbook.md' }).click();
await page.locator('text=Step 40').first().waitFor({ timeout: 30000 });
await h.sleep(1000);
out.panel = await page.locator('[data-test="semantic-memory-explorer"]').evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), toWindowBottom: Math.round(innerHeight - r.bottom), height: Math.round(r.height) }; });
out.pageScroll = await page.evaluate(() => [document.scrollingElement, ...document.querySelectorAll('*')].filter((n) => n && n.contains(document.querySelector('[data-test="semantic-memory-explorer"]')) && n !== document.querySelector('[data-test="semantic-memory-explorer"]'))
  .filter((n) => n === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(n).overflowY)).some((n) => n.scrollHeight > n.clientHeight + 1));
out.readerScroll = await page.evaluate(() => { const r = document.querySelector('.semantic-memory-reader'); const s = [...r.querySelectorAll('*')].find((n) => /(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1); if (!s) return null; s.scrollTop = s.scrollHeight; return { scrollHeight: s.scrollHeight, clientHeight: s.clientHeight, lastVisible: !!document.evaluate("//*[contains(text(),'Step 40')]", document, null, 9, null).singleNodeValue }; });
await h.sleep(500);
out.panelAfterScroll = await page.locator('[data-test="semantic-memory-explorer"]').evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), toWindowBottom: Math.round(innerHeight - r.bottom) }; });
await h.shot('short-long-document-1280x720');
// The Work Journal at the same height (run two).
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
await page.locator('[data-test="agent-episode"]').filter({ has: page.locator(`[title*="${stack.runTwo}"]`) }).first().click();
await page.locator('[data-test="work-journal-lines"]').waitFor({ timeout: 60000 });
await h.sleep(1000);
out.journal = await page.locator('[data-test="work-journal-lines"]').evaluate((el) => { const card = el.closest('[data-test="work-journal"]') ?? el.parentElement; const r = card.getBoundingClientRect(); return { top: Math.round(r.top), toWindowBottom: Math.round(innerHeight - r.bottom) }; });
await h.shot('short-journal-1280x720');
return out;
