// Sets an UpdateIntervalField like a user: unit select, then the number and Enter.
export default async (page, args) => {
  const k = args.key;
  if (args.unit) { await page.locator(`[data-testid="update-interval-${k}-unit"]`).selectOption(args.unit); await page.waitForTimeout(400); }
  const input = page.locator(`[data-testid="update-interval-${k}-value"]`);
  await input.fill(String(args.value)); await input.press('Enter'); await page.waitForTimeout(800);
  return page.evaluate((key) => ({ value: document.querySelector(`[data-testid="update-interval-${key}-value"]`)?.value, unit: document.querySelector(`[data-testid="update-interval-${key}-unit"]`)?.value,
    hint: document.querySelector(`[data-testid="update-interval-${key}-hint"]`)?.textContent.trim() ?? null, saved: document.querySelector(`[data-testid="update-interval-${key}-saved"]`)?.textContent.trim() ?? null }), k);
};
