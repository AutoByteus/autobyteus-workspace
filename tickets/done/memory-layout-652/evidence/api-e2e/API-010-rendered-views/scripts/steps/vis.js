// API/E2E 652: each VIS view at this viewport (screenshot + where content starts and ends, page scroll). Real clicks.
const vp = h.viewport; const tag = `${vp.width}x${vp.height}`;
const place = (sel) => page.locator(sel).first().evaluate((el) => {
  const r = el.getBoundingClientRect();
  const pageScrolls = [document.scrollingElement, ...document.querySelectorAll('*')].filter((n) => n && n !== el && n.contains(el))
    .filter((n) => n === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(n).overflowY)).some((n) => n.scrollHeight > n.clientHeight + 1);
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), toWindowBottom: Math.round(innerHeight - r.bottom), width: Math.round(r.width), pageScrolls };
});
const out = {};
// Global (VIS-006/007)
await h.goto('?view=home&section=browse&node=global');
await page.locator('[data-test="semantic-memory-explorer"]').waitFor({ timeout: 120000 });
await page.locator('[data-test="file-tab-name"]').first().waitFor({ timeout: 30000 });
await h.sleep(1200);
out.global = { panel: await place('[data-test="semantic-memory-explorer"]'), openTab: await page.locator('[data-test="file-tab-name"]').first().innerText(), sectionTabs: await page.locator('[data-test^="memory-section-"]').count() };
await h.shot(`global-${tag}`);
// Agents cards (VIS-008)
await page.locator('[data-test="memory-browse-tab-agents"]').click();
await page.locator('[data-test="memory-owner-card"]').first().waitFor({ timeout: 60000 });
await h.sleep(600);
out.agents = { firstCard: await place('[data-test="memory-owner-card"]'), cards: await page.locator('[data-test="memory-owner-card"]').allInnerTexts() };
await h.shot(`agents-${tag}`);
// Project Task Manager, Episodic (VIS-004/005)
await page.locator('[data-test="memory-owner-card"]', { hasText: 'Project Task Manager' }).first().click();
await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.episodic = { firstCard: await place('[data-test="agent-episode"]'), header: (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' '), sectionTabs: await page.locator('[data-test^="memory-section-"]').count() };
await h.shot(`episodic-${tag}`);
// Teams → the team (VIS-009 Members, VIS-010/011 Runs)
await page.locator('[data-test="memory-page-back"]').click();
await page.locator('[data-test="memory-browse-tab-teams"]').click();
await page.locator('[data-test="memory-owner-card"]', { hasText: 'Software Engineering Team' }).first().click();
await page.locator('[data-test="group-member"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.members = { firstCard: await place('[data-test="group-member"]'), header: (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' ') };
await h.shot(`team-members-${tag}`);
await page.locator('[data-test="group-memory-tab-runs"]').click();
await page.locator('[data-test="collaboration-run"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.runs = { firstCard: await place('[data-test="collaboration-run"]'), filterInHeader: await page.locator('[data-test="memory-page-header"] [data-test="group-runs-filter"]').count() };
await h.shot(`team-runs-${tag}`);
// The Solution Designer from the team (VIS-001/002/003)
await page.locator('[data-test="group-memory-tab-members"]').click();
await page.locator('[data-test="group-member"]', { hasText: 'Solution Designer' }).first().click();
await page.locator('[data-test="agent-memory-tab-semantic"]').click();
await page.locator('[data-test="semantic-memory-explorer"]').waitFor({ timeout: 60000 });
await page.locator('[data-test="file-tab-name"]').first().waitFor({ timeout: 30000 });
await h.sleep(1200);
out.semantic = { panel: await place('[data-test="semantic-memory-explorer"]'), back: await page.locator('[data-test="memory-page-back"]').innerText(), belongsTo: await page.locator('[data-test="agent-memory-places"]').count(),
  openTab: await page.locator('[data-test="file-tab-name"]').first().innerText(),
  listNames: await page.locator('[data-test="semantic-memory-explorer"] .file-header').evaluateAll((rows) => rows.map((r) => { const n = r.querySelector('span'); return { name: r.innerText.trim(), cut: n ? n.scrollWidth > n.clientWidth + 1 : null }; })) };
await h.shot(`semantic-${tag}`);
// Runs: Project Task Manager's runs (run one: one journal file; run two: three files) (VIS-012…017)
for (const [key, runId] of [['one', stack.runOne], ['multi', stack.runTwo]]) {
  await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
  await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
  await page.locator('[data-test="agent-episode"]').filter({ has: page.locator(`[title*="${runId}"]`) }).first().click();
  await page.locator('[data-test="work-journal-lines"]').first().waitFor({ timeout: 60000 });
  await h.sleep(1200);
  const journalCard = await page.locator('[data-test="work-journal-lines"]').evaluate((el) => { const card = el.closest('[data-test="work-journal"]') ?? el.parentElement; const r = card.getBoundingClientRect(); return { bottom: Math.round(r.bottom), toWindowBottom: Math.round(innerHeight - r.bottom) }; });
  out[`journal-${key}`] = { card: journalCard, header: (await page.locator('[data-test="memory-page-header"]').innerText()).replace(/\s+/g, ' '),
    title: await page.locator('[data-test="memory-inspector-run-title"], [data-test="memory-inspector-run-identity"]').first().evaluate((el) => ({ test: el.dataset.test, text: el.textContent.trim(), tooltip: el.title })),
    filesNav: await page.locator('nav[aria-label]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.split('\n')[0])),
    pickerVisible: await page.locator('select[data-test="work-journal-file-select"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length) };
  await h.shot(`journal-${key}-${tag}`);
  await page.locator('[data-test="memory-inspector-tab-raw"]').click();
  await page.locator('[data-test="raw-trace-limit"]').waitFor({ timeout: 30000 });
  await h.sleep(1500);
  out[`raw-${key}`] = { picker: await page.locator('select[data-test="raw-trace-file-select"]').evaluateAll((els) => els.map((el) => [...el.options].map((o) => o.text))),
    name: await page.locator('[data-test="raw-trace-file-name"]').allInnerTexts(), apply: await page.locator('button', { hasText: /^Apply$/ }).count(),
    spinner: await page.locator('[data-test="raw-trace-limit"]').evaluate((el) => getComputedStyle(el).appearance) };
  await h.shot(`raw-${key}-${tag}`);
}
return out;
