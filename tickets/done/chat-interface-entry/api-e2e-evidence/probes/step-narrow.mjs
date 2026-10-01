// AC-015 / QR-003 at 390×844: no horizontal overflow; model menu is a bottom sheet with drill-in.
export default async ({ page, front, out }) => {
  const r = {};
  const overflow = () => page.evaluate(() => ({ scrollW: document.scrollingElement.scrollWidth, innerW: window.innerWidth,
    wide: [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}@${Math.round(e.getBoundingClientRect().right)}`) }));
  await page.goto(`${front}/chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="chat-new"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(2000);
  r.newChat = await overflow();
  await page.screenshot({ path: `${out}/narrow-new-chat.png` });
  await page.locator('[data-test="chat-model-trigger"]').click();
  const menu = page.locator('[data-test="chat-model-menu"]');
  await menu.waitFor();
  await page.waitForTimeout(500);
  r.menuBox = await menu.boundingBox();
  await page.locator('[data-test="chat-runtime-codex_app_server"]').click();
  await page.locator('[data-test^="chat-model-option-"]').first().waitFor({ timeout: 60000 });
  r.drillBack = await page.locator('[data-test="chat-model-drill-back"]').count();
  r.drillBox = await page.locator('[data-test="chat-model-menu"]').boundingBox();
  r.menuOverflow = await overflow();
  await page.screenshot({ path: `${out}/narrow-model-sheet.png` });
  await page.keyboard.press('Escape');
  if (process.env.RUN_ID) {
    await page.goto(`${front}/chat?id=${process.env.RUN_ID}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-test="chat-run-view"]').waitFor({ timeout: 90000 });
    await page.waitForTimeout(2500);
    r.chatView = await overflow();
    await page.screenshot({ path: `${out}/narrow-chat-view.png` });
  }
  return r;
};
