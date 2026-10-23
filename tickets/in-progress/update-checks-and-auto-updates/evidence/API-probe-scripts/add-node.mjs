export default async (page, args) => {
  await page.locator('[data-testid="add-node-address"]').fill(args.address);
  await page.locator('[data-testid="add-node-name"]').fill(args.name);
  await page.locator('button').filter({ hasText: /^\s*Add node\s*$/ }).click(); await page.waitForTimeout(3000);
  return page.evaluate((name) => ({ rows: [...document.querySelectorAll('li, tr, [data-testid*="node"]')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.includes(name)).slice(0, 3),
    buttons: [...document.querySelectorAll('button')].map((b) => ({ text: b.textContent.replace(/\s+/g, ' ').trim(), testid: b.getAttribute('data-testid') })).filter((b) => /open|window|connect/i.test(b.text + (b.testid ?? ''))).slice(0, 10) }), args.name);
};
