// API/E2E 652 round 2: the owner header at laptop widths: the name's box, the left group and the right controls.
const out = {};
for (const id of ['project-task-manager', 'capacity-planner']) {
  await h.goto(`?view=home&section=browse&node=${encodeURIComponent(`agents/agent:${id}`)}`);
  await page.locator('[data-test="memory-page-header"]').first().waitFor({ timeout: 60000 });
  await h.sleep(1200);
  out[id] = await page.locator('[data-test="memory-page-header"]').evaluate((header) => {
    const b = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), needs: el.scrollWidth }; };
    const h1 = header.querySelector('h1');
    return { header: b(header), group: b(h1.parentElement), back: b(header.querySelector('[data-test="memory-page-back"]')), h1: b(h1), h1Text: h1.textContent.trim().slice(0, 30),
      filter: b(header.querySelector('[data-test="agent-episodes-filter"]')), switch: b(header.querySelector('[role="tablist"]')) };
  });
  await h.shot(`r2-header-${id}-${h.viewport.width}x${h.viewport.height}`);
}
return out;
