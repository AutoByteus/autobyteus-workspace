export default async ({ page, shot, text }) => {
  const done = page.getByRole("button", { name: "Done" });
  if (await done.count()) await done.first().click();
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.waitForTimeout(1500);
  const t = await text();
  await shot("r5-02-settings");
  return t.slice(0, 1500);
};
