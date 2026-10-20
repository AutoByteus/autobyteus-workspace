export default async (page) => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); return { open: await page.locator('[data-testid="notification-center"]').count() }; };
