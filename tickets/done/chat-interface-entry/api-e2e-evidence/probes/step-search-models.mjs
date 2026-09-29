export default async ({ page, front }) => {
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.locator('[data-test="chat-model-trigger"]').click();
  await page.locator('[data-test="chat-runtime-autobyteus"]').click();
  await page.locator('[data-test^="chat-model-option-"]').first().waitFor({ timeout: 60000 });
  return await page.locator('[data-test^="chat-model-option-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')));
};
