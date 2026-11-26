// API/E2E 652 round 2: CR-001 (card grids inside the window) and CR-002 (the owner name whole beside its places line).
const vp = h.viewport; const out = { viewport: `${vp.width}x${vp.height}` };
const fit = (sel) => page.evaluate((s) => {
  const cards = [...document.querySelectorAll(s)];
  const list = cards[0]?.parentElement;
  const sideways = list ? [document.scrollingElement, ...document.querySelectorAll('*')].filter((n) => n && n.contains(list))
    .some((n) => n.scrollWidth > n.clientWidth + 1 && (n === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(n).overflowX))) : null;
  return { count: cards.length, maxRight: Math.max(...cards.map((c) => Math.round(c.getBoundingClientRect().right))), window: innerWidth, sideways,
    names: cards.map((c) => { const n = c.querySelector('h2, h3'); return n ? { text: n.textContent.trim().slice(0, 30), cut: n.scrollWidth > n.clientWidth + 1, tooltip: n.title || null } : null; }).filter(Boolean).slice(0, 6) };
}, sel);
const name = () => page.locator('[data-test="memory-page-header"] h1').first().evaluate((el) => ({ text: el.textContent.trim(), width: el.clientWidth, needs: el.scrollWidth, whole: el.scrollWidth <= el.clientWidth + 1 }));
const places = () => page.locator('[data-test="agent-memory-places"]').evaluateAll((els) => els.map((el) => ({ visible: el.getBoundingClientRect().width > 0, width: Math.round(el.getBoundingClientRect().width), needs: el.scrollWidth })));
await h.goto('?view=home&section=browse&node=agents');
await page.locator('[data-test="memory-owner-card"]').first().waitFor({ timeout: 120000 });
await h.sleep(1000);
out.agentsCards = await fit('[data-test="memory-owner-card"]');
await h.shot(`r2-agents-${out.viewport}`);
await page.locator('[data-test="memory-owner-card"]', { hasText: 'Project Task Manager' }).first().click();
await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
await h.sleep(1000);
out.episodic = await fit('[data-test="agent-episode"]');
out.ptmName = await name(); out.ptmPlaces = await places();
await h.shot(`r2-episodic-${out.viewport}`);
await h.goto('?view=home&section=browse&node=teams');
await page.locator('[data-test="memory-owner-card"]', { hasText: 'Software Engineering Team' }).first().click();
await page.locator('[data-test="group-member"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.members = await fit('[data-test="group-member"]');
await page.locator('[data-test="group-memory-tab-runs"]').click();
await page.locator('[data-test="collaboration-run"]').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.teamRuns = await fit('[data-test="collaboration-run"]');
await h.shot(`r2-team-runs-${out.viewport}`);
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:capacity-planner')}`);
await page.locator('[data-test="memory-page-header"] h1').first().waitFor({ timeout: 60000 });
await h.sleep(800);
out.longName = await name();
await h.shot(`r2-long-name-${out.viewport}`);
return out;
