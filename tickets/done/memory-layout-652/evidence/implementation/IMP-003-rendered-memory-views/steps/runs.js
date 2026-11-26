// VIS-004/005 (episodic), VIS-012/013/015 (Work Journal), VIS-014/016/017 (Raw Traces), from the Project Task Manager.
const vp = h.viewport;
const tag = `${vp.width}x${vp.height}`;
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
await h.sleep(600);
const episodic = {
  header: await h.box('[data-test="memory-page-header"]'),
  firstCard: await h.box('[data-test="agent-episode"]'),
  headerText: await page.locator('[data-test="memory-page-header"]').innerText(),
  cards: await page.locator('[data-test="agent-episode"]').evaluateAll((els) => els.map((el) => ({ title: el.querySelector('h3')?.textContent?.trim(), tooltip: el.querySelector('h3')?.title, lines: [...el.querySelectorAll('p')].map((p) => p.innerText.replace(/\s+/g, ' ').trim()) }))),
  filterInHeader: await page.locator('[data-test="memory-page-header"] [data-test="agent-episodes-filter"]').count(),
  sectionTabs: await page.locator('[data-test^="memory-section-"]').count(),
};
await h.shot(`episodic-${tag}`);

const openRun = async (runId) => {
  await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
  const card = page.locator('[data-test="agent-episode"]').filter({ has: page.locator(`h3[title="${runId}"]`) });
  await card.first().waitFor({ timeout: 60000 });
  await card.first().click();
  await page.locator('[data-test="work-journal-lines"]').first().waitFor({ timeout: 60000 });
  await h.sleep(800);
};
const journalFacts = async () => ({
  header: await h.box('[data-test="memory-page-header"]'),
  headerText: await page.locator('[data-test="memory-page-header"]').innerText(),
  title: await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().evaluate((el) => ({ test: el.dataset.test, text: el.textContent.trim(), tooltip: el.title })),
  h1: await page.locator('[data-test="memory-inspector-name"]').evaluate((el) => ({ text: el.textContent.trim(), srOnly: el.classList.contains('sr-only') })),
  lines: await h.box('[data-test="work-journal-lines"]'),
  card: await h.box('[data-test="work-journal-lines"]').then(() => page.locator('[data-test="work-journal-lines"]').evaluate((el) => { const r = el.parentElement.getBoundingClientRect(); return { bottom: Math.round(r.bottom) }; })),
  nav: await page.locator('nav[aria-label]').evaluateAll((els) => els.map((el) => ({ visible: el.getBoundingClientRect().width > 0, text: el.innerText.split('\n')[0] }))),
  picker: await page.locator('select[data-test="work-journal-file-select"]').evaluateAll((els) => els.map((el) => ({ visible: el.getBoundingClientRect().width > 0, options: [...el.options].map((o) => o.text) }))),
  fileName: await page.locator('[data-test="work-journal-file-name"]').evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), visible: el.getBoundingClientRect().width > 0 }))),
  goButton: await page.locator('[data-test="work-journal-line"]').evaluate((el) => !!el.closest('form').querySelector('button')),
  spinner: await page.locator('[data-test="work-journal-line"]').evaluate((el) => getComputedStyle(el).appearance),
  scroller: await page.evaluate(() => { const el = document.querySelector('.h-full.overflow-auto.bg-gray-50'); return el ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight } : null; }),
});
await openRun(stack.runOne);
const one = await journalFacts();
await h.shot(`journal-one-${tag}`);
await openRun(stack.runTwo);
const two = await journalFacts();
await h.shot(`journal-two-${tag}`);
await page.locator('[data-test="memory-inspector-tab-raw"]').click();
await page.locator('[data-test="raw-trace-limit"]').waitFor({ timeout: 30000 });
await h.sleep(1500);
const raw = {
  picker: await page.locator('select[data-test="raw-trace-file-select"]').evaluateAll((els) => els.map((el) => ({ options: [...el.options].map((o) => o.text), box: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; })() }))),
  name: await page.locator('[data-test="raw-trace-file-name"]').allInnerTexts(),
  show: await page.locator('[data-test="raw-trace-limit"]').evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), label: el.closest('label').innerText.trim(), appearance: getComputedStyle(el).appearance }; }),
  apply: await page.locator('button', { hasText: 'Apply' }).count(),
};
await h.shot(`raw-two-${tag}`);
await openRun(stack.runOne);
await page.locator('[data-test="memory-inspector-tab-raw"]').click();
await page.locator('[data-test="raw-trace-limit"]').waitFor({ timeout: 30000 });
await h.sleep(1500);
const rawOne = { picker: await page.locator('select[data-test="raw-trace-file-select"]').count(), name: await page.locator('[data-test="raw-trace-file-name"]').allInnerTexts() };
await h.shot(`raw-one-${tag}`);
return { viewport: vp, episodic, one, two, raw, rawOne };
