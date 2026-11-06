export default async ({ page, shot }) => {
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[data-tab-name]')].map(e => ({ name: e.getAttribute('data-tab-name'), label: e.getAttribute('aria-label'), visible: !!e.offsetParent })));
  await page.locator('[data-testid="chat-model-trigger"],[data-test="chat-model-trigger"]').first().click();
  await page.waitForTimeout(1500);
  await shot(page, 'API-08-01-model-menu');
  const menu = (await page.evaluate(() => document.body.innerText)).split('\n').filter(Boolean).slice(-80);
  await page.keyboard.press('Escape');
  return { tabs, menu };
};
