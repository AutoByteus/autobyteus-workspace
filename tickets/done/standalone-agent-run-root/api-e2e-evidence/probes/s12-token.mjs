export default async ({ page, shot }) => {
  await page.getByRole("button", { name: "Token", exact: true }).first().click().catch(async () => page.getByText("Token", { exact: true }).first().click());
  await page.waitForTimeout(3000);
  await shot("s12-host-token-meter");
  const panel = await page.evaluate(() => { const els = Array.from(document.querySelectorAll("[data-testid*=token], [data-testid*=usage]")); return els.map((e) => e.getAttribute("data-testid") + ": " + e.innerText.replace(/\s+/g, " ").slice(0, 400)).slice(0, 12); });
  return panel;
};
