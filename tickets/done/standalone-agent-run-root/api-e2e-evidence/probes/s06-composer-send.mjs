export default async ({ page, shot }) => {
  const box = page.getByRole("combobox").first();
  const placeholder = await box.getAttribute("aria-label") ?? await box.getAttribute("placeholder");
  await box.click();
  await page.keyboard.type("Reply with the single word CLICKED. Do not call any tool.", { delay: 15 });
  await shot("s06a-composer-typed");
  const send = page.getByRole("button", { name: "Send message" }).first();
  const enabled = await send.isEnabled();
  await send.click();
  const t0 = Date.now();
  let seen = false;
  while (Date.now() - t0 < 120000) {
    const body = await page.evaluate(() => document.body.innerText);
    if (/CLICKED/.test(body.replace("Reply with the single word CLICKED", ""))) { seen = true; break; }
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(2000);
  await shot("s06b-composer-reply");
  const value = await box.inputValue().catch(() => null);
  return { placeholder, sendEnabledBeforeClick: enabled, replySeen: seen, ms: Date.now() - t0, composerAfter: value };
};
