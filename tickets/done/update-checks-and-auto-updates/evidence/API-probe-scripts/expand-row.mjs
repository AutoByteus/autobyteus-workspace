export default async (page, args) => {
  const row = page.locator(`[data-testid="notification-row-${args.id}"]`);
  await row.locator('[data-testid="notification-row-summary"]').click();
  await page.waitForTimeout(300);
  return { expanded: await row.locator('[data-testid="notification-row-details"]').count() };
};
