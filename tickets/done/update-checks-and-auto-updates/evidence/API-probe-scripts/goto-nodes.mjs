export default async (page) => {
  await page.locator('a, button').filter({ hasText: /^\s*Nodes\s*$/ }).first().click(); await page.waitForTimeout(800);
  return page.evaluate(() => ({ url: location.hash, buttons: [...document.querySelectorAll('button, a')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40),
    inputs: [...document.querySelectorAll('input')].map((i) => ({ placeholder: i.placeholder, testid: i.getAttribute('data-testid'), name: i.name })) }));
};
