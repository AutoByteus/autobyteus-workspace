export default async (page, args) => {
  if (!(await page.locator('[data-testid="update-checks-card"]').count())) {
    if (!/#\/settings/.test(page.url())) await page.locator('a, button').filter({ hasText: /^\s*Settings\s*$/ }).first().click();
    await page.locator('a, button').filter({ hasText: /^\s*Server Settings\s*$/ }).first().click();
  }
  await page.waitForSelector('[data-testid="update-checks-card"]', { timeout: 15000 });
  const card = page.locator('[data-testid="update-checks-card"]');
  await card.scrollIntoViewIfNeeded();
  const read = async () => card.evaluate((el) => { const t = el.querySelector('[data-testid="update-checks-toggle"]'); return { text: el.textContent.replace(/\s+/g, ' ').trim(), toggle: { role: t?.getAttribute('role'), checked: t?.getAttribute('aria-checked'), disabled: t?.disabled ?? null, label: t?.getAttribute('aria-label') ?? t?.getAttribute('aria-labelledby') } }; });
  const before = await read();
  if (args.shot) await page.screenshot({ path: args.shot });
  if (args.toggle) { await card.locator('[data-testid="update-checks-toggle"]').click(); await page.waitForTimeout(800); }
  return { before, after: args.toggle ? await read() : null };
};
