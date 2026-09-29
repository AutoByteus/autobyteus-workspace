export default async ({ page, front, out }) => {
  const r = { urls: [] };
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) r.urls.push(f.url()); });
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  r.model = await page.locator('[data-test="chat-model-trigger"]').innerText();
  const input = page.locator('[data-test="chat-message-input"] textarea, textarea[data-test="chat-message-input"]').first();
  await input.fill('Reply with exactly PING-1.');
  await page.locator('[data-test="chat-primary-action"]').first().click();
  r.startingText = await page.locator('[data-test="chat-new"]').innerText().catch(() => null);
  await page.waitForURL(/\/chat\?id=/, { timeout: 90000 });
  r.urlAfterSend = page.url();
  await page.waitForTimeout(8000);
  r.urlLater = page.url();
  r.view = (await page.locator('[data-test="chat-page"]').innerText()).slice(0, 1500);
  await page.screenshot({ path: `${out}/failsend.png` });
  return r;
};
