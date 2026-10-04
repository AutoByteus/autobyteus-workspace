export default async ({ page }) => {
  const row = page.locator("aside").getByText(/Call send_message_to exactly once with recipient_address \/general_agent|Reply with the single word|Call the run_bash tool/).first();
  await page.locator("aside").getByText("General Agent", { exact: true }).first().click().catch(() => undefined);
  await page.waitForTimeout(800);
  const rows = await page.evaluate(() => document.querySelector("aside").innerText.split("\n").slice(9, 16));
  return rows;
};
