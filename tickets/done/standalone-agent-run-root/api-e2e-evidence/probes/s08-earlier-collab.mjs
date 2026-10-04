const fromSegs = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="agent-event-monitor"] *')).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 140)));
export default async ({ page, shot }) => {
  const monitor = page.locator('[data-testid="agent-event-monitor"]').first();
  const before = await fromSegs(page);
  const box = await monitor.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  const states = [];
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, -1500);
    await page.waitForTimeout(400);
    const segs = await fromSegs(page);
    if (i % 10 === 0) states.push({ i, segs: segs.length });
    if (segs.some((s) => /From General Agent:/.test(s))) break;
  }
  await page.waitForTimeout(1500);
  await shot("s08-collaborator-earlier-events");
  const after = await fromSegs(page);
  const rawHeader = await page.evaluate(() => /You received a message from sender name/.test(document.querySelector('[data-testid="agent-event-monitor"]').innerText));
  const browseText = await page.evaluate(() => { const t = document.querySelector('[data-testid="agent-event-monitor"]').innerText; const i = t.indexOf("From General Agent"); return i >= 0 ? t.slice(Math.max(0, i - 200), i + 400) : t.slice(0, 600); });
  return { beforeFromSegments: before, states, afterFromSegments: [...new Set(after)], rawHeaderVisible: rawHeader, browseText };
};
