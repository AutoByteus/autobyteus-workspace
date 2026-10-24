// Settings → <section> by real clicks (Settings row, then the section in Settings' own sidebar).
export default async (page, args) => {
  if (!/#\/settings/.test(page.url())) await page.locator('a, button').filter({ hasText: /^\s*Settings\s*$/ }).first().click();
  await page.locator('a, button').filter({ hasText: new RegExp(`^\\s*${args.section}\\s*$`) }).first().click();
  await page.waitForTimeout(600);
  return { url: page.url().split('#')[1] };
};
