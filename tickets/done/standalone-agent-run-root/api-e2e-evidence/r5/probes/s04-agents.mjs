export default async ({ page, shot, text }) => {
  await page.getByRole("button", { name: "Back to Workspace" }).click().catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Agents", exact: true }).first().click();
  await page.waitForTimeout(1500);
  const card = page.getByText("SAR Host", { exact: true }).first();
  await card.click();
  await page.waitForTimeout(1500);
  await shot("r5-05-sar-host");
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim()).filter(Boolean));
  return { btns: [...new Set(btns)].slice(0, 60), text: (await text()).slice(0, 800) };
};
