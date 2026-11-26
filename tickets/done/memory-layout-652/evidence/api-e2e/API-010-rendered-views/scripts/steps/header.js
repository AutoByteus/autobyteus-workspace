// API/E2E 652: how the owner header shares its width (name, subtitle, filter, switch) for an agent with a subtitle.
await h.goto(`?view=home&section=browse&node=${encodeURIComponent('agents/agent:project-task-manager')}`);
await page.locator('[data-test="agent-episode"]').first().waitFor({ timeout: 60000 });
await h.sleep(1000);
const m = await page.locator('[data-test="memory-page-header"]').evaluate((header) => {
  const b = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), scrollW: el.scrollWidth, clientW: el.clientWidth, text: el.textContent.trim().slice(0, 60), cls: el.className.slice(0, 120) }; };
  const h1 = header.querySelector('h1');
  return { header: b(header), back: b(header.querySelector('[data-test="memory-page-back"]')), h1: b(h1), h1Parent: b(h1?.parentElement), places: b(header.querySelector('[data-test="agent-memory-places"]')),
    filter: b(header.querySelector('[data-test="agent-episodes-filter"]')), switch: b(header.querySelector('[role="tablist"]')) };
});
await h.shot(`header-subtitle-${h.viewport.width}x${h.viewport.height}`);
return m;
