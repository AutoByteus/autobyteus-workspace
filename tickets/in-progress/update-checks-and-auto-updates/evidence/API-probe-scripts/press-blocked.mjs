export default async (page) => {
  const btn = page.locator('[data-testid="notification-row-agent_runtime:codex_app_server"] [data-testid="notification-row-update"]');
  const attrs = await btn.evaluate((b) => ({ ariaDisabled: b.getAttribute('aria-disabled'), opacity: getComputedStyle(b).opacity, describedBy: document.getElementById(b.getAttribute('aria-describedby') ?? '')?.textContent.trim() ?? null }));
  await btn.click({ force: true }); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => document.querySelector('[data-testid="notification-row-agent_runtime:codex_app_server"]')?.getAttribute('data-state'));
  return { attrs, stateAfterPress: after };
};
