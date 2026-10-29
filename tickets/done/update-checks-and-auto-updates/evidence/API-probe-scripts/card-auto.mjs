// Server Settings → Basics → Update checks card: reads it; optionally toggles one kind's switch and answers its confirmation.
export default async (page, args) => {
  if (!(await page.locator('[data-testid="update-checks-card"]').count())) {
    if (!/#\/settings/.test(page.url())) await page.locator('a, button').filter({ hasText: /^\s*Settings\s*$/ }).first().click();
    await page.locator('a, button').filter({ hasText: /^\s*Server Settings\s*$/ }).first().click();
    await page.waitForSelector('[data-testid="update-checks-card"]', { timeout: 15000 });
  }
  const card = page.locator('[data-testid="update-checks-card"]');
  await card.scrollIntoViewIfNeeded();
  const read = () => card.evaluate((el) => ({ text: el.textContent.replace(/\s+/g, ' ').trim(),
    switches: [...el.querySelectorAll('[data-testid^="auto-update-"][data-testid$="-toggle"]')].map((t) => `${t.getAttribute('data-testid')}=${t.getAttribute('aria-checked')}`),
    intervals: [...el.querySelectorAll('[data-testid^="update-interval-"][data-testid$="-value"]')].map((i) => `${i.getAttribute('data-testid')}=${i.value}`),
    banner: [...el.querySelectorAll('*')].map((n) => n.children.length === 0 ? n.textContent.trim() : '').find((s) => /GitHub asked this node to wait/.test(s)) ?? null }));
  const before = await read();
  let dialog = null;
  if (args.toggle) {
    await card.locator(`[data-testid="auto-update-${args.toggle}-toggle"]`).click(); await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    if (await modal.count()) { dialog = (await modal.textContent()).replace(/\s+/g, ' ').trim(); if (args.shot) await page.screenshot({ path: args.shot });
      await modal.locator('button').filter({ hasText: args.confirm === false ? /^\s*Cancel\s*$/ : /^\s*Turn on\s*$/ }).click(); await page.waitForTimeout(600); }
  }
  return { before, dialog, after: args.toggle ? await read() : null };
};
