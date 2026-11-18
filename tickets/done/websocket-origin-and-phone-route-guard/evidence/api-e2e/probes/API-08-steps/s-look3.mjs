export default async ({ page, shot }) => {
  await page.locator('[data-testid="chat-model-trigger"],[data-test="chat-model-trigger"]').first().click();
  await page.waitForTimeout(800);
  await page.getByText('AutoByteus', { exact: true }).last().click();
  await page.waitForTimeout(1500);
  await shot(page, 'API-08-02-models');
  const items = await page.evaluate(() => [...document.querySelectorAll('[role="option"],[role="menuitem"],li,button')].filter(e => e.offsetParent).map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(t => /gemma|qwen|lm ?studio|ollama/i.test(t)).slice(0, 20));
  await page.keyboard.press('Escape');
  return { items };
};
