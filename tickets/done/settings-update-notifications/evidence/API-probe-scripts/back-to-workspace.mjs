export default async (page) => {
  const t0 = Date.now();
  await page.locator('a, button').filter({ hasText: /Back to Workspace/ }).first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('*')].some((el) => el.children.length === 0 && /^\d+ updates?$/.test(el.textContent.trim())), null, { timeout: 10000, polling: 50 });
  return page.evaluate((t) => ({ marker: window.__apiE2eMarker ?? null, url: location.hash, pillVisibleAfterMs: Date.now() - t,
    pill: [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && /^\d+ updates?$/.test(el.textContent.trim())).map((el) => ({ text: el.textContent.trim(), bg: getComputedStyle(el.closest('[class*="bg-"]') ?? el).backgroundColor, color: getComputedStyle(el.closest('[class*="bg-"]') ?? el).color })),
    aria: [...document.querySelectorAll('[aria-label*="update"]')].map((el) => el.getAttribute('aria-label')) }), t0);
};
