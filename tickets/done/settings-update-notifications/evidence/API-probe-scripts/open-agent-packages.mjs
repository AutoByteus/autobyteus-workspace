export default async (page) => {
  await page.locator('a, button').filter({ hasText: /^\s*Settings\s*$/ }).first().click();
  await page.locator('a, button').filter({ hasText: /^\s*Agent Packages\s*$/ }).first().click();
  await page.waitForTimeout(500);
  return { url: page.url().split('#')[1], at: new Date().toISOString() };
};
