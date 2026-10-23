// Opens the Notification Center with a real click on the Settings-row pill (or the strip icon).
export default async (page) => {
  const entry = page.locator('button[aria-label*="update"], a[aria-label*="update"]').first();
  await entry.click();
  await page.waitForSelector('[data-testid="notification-center"]', { timeout: 5000 });
  await page.waitForTimeout(300);
  return { opened: true, focused: await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName) };
};
