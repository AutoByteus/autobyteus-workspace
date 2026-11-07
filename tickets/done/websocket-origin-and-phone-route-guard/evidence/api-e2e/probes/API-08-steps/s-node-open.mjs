export default async ({ browser, page, shot }) => {
  const before = browser.contexts().flatMap(c => c.pages()).length;
  await page.locator('[data-testid^="node-open-"]').first().click();
  for (let i = 0; i < 30 && browser.contexts().flatMap(c => c.pages()).length <= before; i += 1) await page.waitForTimeout(500);
  await page.waitForTimeout(6000);
  const pages = browser.contexts().flatMap(c => c.pages());
  return { windows: pages.map(p => p.url()) };
};
