// API/E2E 652: why the Episodic cards are wider than a 390 px window (a long workspace path).
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
await h.sleep(1000);
return await page.evaluate(() => {
  const card = document.querySelector('[data-test="agent-episode"]');
  const chain = []; let n = card;
  for (let i = 0; i < 6 && n; i += 1) { const r = n.getBoundingClientRect(); const s = getComputedStyle(n); chain.push({ tag: n.tagName, test: n.dataset.test || null, w: Math.round(r.width), display: s.display, gridCols: s.gridTemplateColumns.slice(0, 60), minW: s.minWidth, cls: (n.className?.baseVal ?? n.className).slice(0, 110) }); n = n.parentElement; }
  const inner = [...card.querySelectorAll('*')].map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, w: Math.round(r.width), sw: e.scrollWidth, text: e.textContent.trim().slice(0, 40), cls: (e.className?.baseVal ?? e.className).slice(0, 90) }; }).filter((x) => x.w > 330);
  const de = document.documentElement;
  const scrollers = [...document.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, sw: e.scrollWidth, cw: e.clientWidth, cls: e.className.slice(0, 80) }));
  return { viewport: innerWidth, chain, wideInner: inner, pageScrollsSideways: de.scrollWidth > de.clientWidth + 1, scrollers };
});
