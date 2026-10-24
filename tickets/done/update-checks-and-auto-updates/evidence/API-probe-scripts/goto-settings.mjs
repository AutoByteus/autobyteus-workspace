export default async (page) => {
  await page.locator('a, button').filter({ hasText: /^\s*Settings\s*$/ }).first().click();
  await page.waitForTimeout(800);
  return page.evaluate(() => { window.__apiE2eMarker = `marker-${Date.now()}`; return { url: location.href, marker: window.__apiE2eMarker, at: new Date().toISOString() }; });
};
