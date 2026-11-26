// VIS-001/002/003: the team's Solution Designer, Semantic memory, reached from the team (Back names the team).
const node = `teams/team:software-engineering-team/agent:${encodeURIComponent(stack.designerId)}`;
await h.goto(`?view=home&section=browse&node=${encodeURIComponent(node)}&pane=semantic`);
await page.locator('[data-test="semantic-memory-explorer"]').waitFor({ timeout: 60000 });
await page.locator('.semantic-memory-reader .markdown-body h1').first().waitFor({ timeout: 30000 });
await h.sleep(800);
const vp = h.viewport;
const scroller = await page.evaluate(() => { const el = document.querySelector('.h-full.overflow-auto.bg-gray-50'); return el ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight } : null; });
const header = await h.box('[data-test="memory-page-header"]');
const panel = await h.box('[data-test="semantic-memory-explorer"]');
const list = await h.box('.semantic-memory-sidebar');
const searchRow = await h.box('.semantic-memory-sidebar .file-explorer > div:first-child');
const tab = page.locator('[data-test="file-tab-name"]').first();
const tabInfo = await tab.evaluate((el) => ({ text: el.textContent.trim(), title: el.title, width: Math.round(el.getBoundingClientRect().width), truncated: el.scrollWidth > el.clientWidth }));
const type = await page.evaluate(() => {
  const px = (sel) => { const el = document.querySelector(`.semantic-memory-reader .markdown-body ${sel}`); return el ? getComputedStyle(el).fontSize : null; };
  const body = document.querySelector('.semantic-memory-reader .markdown-body');
  return { h1: px('h1'), h2: px('h2'), h3: px('h3'), body: body ? getComputedStyle(body).fontSize : null, li: px('li') };
});
const headerText = await page.locator('[data-test="memory-page-header"]').innerText();
const back = await page.locator('[data-test="memory-page-back"]').evaluate((el) => ({ text: el.innerText.trim(), label: el.getAttribute('aria-label') }));
const sectionTabs = await page.locator('[data-test^="memory-section-"]').count();
const icons = await page.locator('.semantic-memory-sidebar [data-test="file-item-icon"]').evaluateAll((els) => els.map((el) => ({ tag: el.tagName, paths: el.querySelectorAll('path').length, w: Math.round(el.getBoundingClientRect().width) })));
const rows = await page.locator('.semantic-memory-sidebar .file-header').allInnerTexts();
await h.shot(`semantic-${vp.width}x${vp.height}`);
// Copy folder path (TR-008).
const copy = page.locator('[data-test="semantic-memory-copy-path"]');
let copied = null;
if (await copy.isVisible()) {
  await copy.click();
  await h.sleep(200);
  copied = { label: (await copy.innerText()).trim(), clipboard: await page.evaluate(() => navigator.clipboard.readText()), path: stack.designerFolder };
  await h.sleep(1600);
  copied.after = (await copy.innerText()).trim();
}
return {
  viewport: vp, scroller, header, contentTop: panel.y, panel, panelGapToBottom: vp.height - panel.bottom, list, searchRowHeight: searchRow.h,
  tabInfo, type, headerText, back, sectionTabs, rows, icons, copied,
};
