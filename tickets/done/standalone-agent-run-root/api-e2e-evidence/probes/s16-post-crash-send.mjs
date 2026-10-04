export default async ({ page, shot }) => {
  const box = page.getByRole("combobox").first();
  await box.click();
  await page.keyboard.type("Reply with the single word POSTCRASH. Do not call any tool.", { delay: 10 });
  await page.getByRole("button", { name: "Send message" }).first().click();
  const t0 = Date.now(); let seen = false;
  while (Date.now() - t0 < 120000) {
    const t = await page.evaluate(() => document.querySelector('[data-testid="agent-event-monitor"]').innerText);
    if (/\nPOSTCRASH\s*\n/.test(t + "\n")) { seen = true; break; }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(3000);
  await shot("s16-collab-send-after-host-crash");
  const errs = await page.evaluate(() => Array.from(document.querySelectorAll('[role=alert], [role=status]')).map((e) => e.innerText.trim()).filter(Boolean));
  return { replySeen: seen, ms: Date.now() - t0, alerts: errs };
};
