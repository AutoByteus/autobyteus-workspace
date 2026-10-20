// Waits (no reload) until the pill shows at least args.count updates; returns the marker and timing.
export default async (page, args) => {
  const started = Date.now();
  await page.waitForFunction((n) => [...document.querySelectorAll('*')].some((el) => el.children.length === 0 && (+((el.textContent.trim().match(/^(\d+) updates?$/) ?? [])[1] ?? 0)) >= n), args.count, { timeout: args.timeoutMs ?? 150000, polling: 250 });
  return page.evaluate((s) => ({ marker: window.__apiE2eMarker ?? null, url: location.href, pill: [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^\d+ updates?$/.test(el.textContent.trim())).map((el) => el.textContent.trim()), waitedMs: Date.now() - s, at: new Date().toISOString() }), started);
};
