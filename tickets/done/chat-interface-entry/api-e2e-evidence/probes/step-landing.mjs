export default async ({ page, front, out }) => {
  await page.goto(`${front}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/chat/, { timeout: 90000 });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(2500);
  const nav = await page.locator('[data-test="app-left-panel-primary-nav"]').innerText();
  const composer = await page.locator('[data-test="chat-composer"]').innerText();
  const footer = await page.locator('[data-test="chat-composer-footer"]').innerHTML();
  await page.screenshot({ path: `${out}/landing.png` });
  return {
    url: page.url(),
    nav,
    newChat: await page.locator('[data-test="chat-new"]').innerText(),
    composer,
    pencil: await page.locator('[data-test="app-left-panel-new-chat"]').count(),
    sendDisabled: await page.locator('[data-test="chat-primary-action"]').first().isDisabled(),
    modelTrigger: await page.locator('[data-test="chat-model-trigger"]').innerText(),
    workspaceTrigger: await page.locator('[data-test="chat-workspace-trigger"]').innerText(),
    approval: await page.locator('[data-test="chat-approval-toggle"]').innerText(),
    footerLen: footer.length,
  };
};
