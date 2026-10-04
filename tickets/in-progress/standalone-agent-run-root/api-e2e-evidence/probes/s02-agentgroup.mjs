export default async ({ page, shot, text }) => {
  await page.getByText("General Agent", { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await shot("s02-agent-group");
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll("aside button, aside [role=button]")).map((b) => (b.getAttribute("aria-label") ?? "") + " | " + b.innerText.replace(/\s+/g, " ").slice(0, 80)).filter((s) => s.trim() !== "|"));
  return { rows, main: (await text()).slice(0, 1200) };
};
