// Presses a row's action button with a real click; optionally answers the skill confirmation.
export default async (page, args) => {
  const row = page.locator(`[data-testid="notification-row-${args.id}"]`);
  await row.locator(`[data-testid="notification-row-${args.button ?? 'update'}"]`).click();
  const out = {};
  if (args.confirm !== undefined) {
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await modal.waitFor({ timeout: 5000 });
    out.modalText = (await modal.textContent()).replace(/\s+/g, ' ').trim();
    if (args.shot) await page.screenshot({ path: args.shot });
    if (args.confirm) await modal.locator('button').filter({ hasNotText: /cancel/i }).last().click();
    else await modal.locator('button').filter({ hasText: /cancel/i }).click();
    await page.waitForTimeout(200);
    out.modalOpenAfter = await modal.count();
  }
  out.panelOpen = await page.locator('[data-testid="notification-center"]').count();
  return out;
};
