export default async ({ page, shot }) => {
  await page.locator('[data-test="workspace-agent-row"]').first().click();
  await page.waitForTimeout(1500);
  let rows = await page.evaluate(() => [...document.querySelectorAll('[data-test*="run"],[data-testid*="run"]')].filter(e => e.offsetParent).map(e => `${e.getAttribute('data-test') || e.getAttribute('data-testid')}: ${e.innerText.replace(/\s+/g, ' ').slice(0, 60)}`).slice(0, 30));
  await shot(page, 'API-08-05-agent-row');
  return { rows };
};
