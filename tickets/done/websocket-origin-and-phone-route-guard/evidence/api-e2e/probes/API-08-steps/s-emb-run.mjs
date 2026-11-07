export default async ({ page, shot }) => {
  /* run already open */
  await page.waitForTimeout(2500);
  const marker = `ABX403-DESK-${Date.now().toString(36)}`;
  const input = page.locator('textarea[placeholder^="Ask anything"]').last();
  await input.click(); await input.fill(`Desktop origin check. Marker ${marker}`);
  await page.keyboard.press('Enter');
  const deadline = Date.now() + 45000; let text = '';
  while (Date.now() < deadline) { text = await page.evaluate(() => document.querySelector('[data-test="workspace-center-pane"]')?.innerText ?? document.body.innerText); if ((text.match(new RegExp(marker, 'g')) || []).length >= 1 && /CALLED|AGY|fake|Hello|response|assistant|done/i.test(text.split(marker).pop())) break; await page.waitForTimeout(1000); }
  await shot(page, 'API-08-10-embedded-run-streamed');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[data-tab-name]')].map(e => ({ name: e.getAttribute('data-tab-name'), visible: !!e.offsetParent })));
  return { marker, tail: text.split(marker).pop().slice(0, 600), tabs };
};
