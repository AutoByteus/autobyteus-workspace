export default async ({ page, shot, text }) => {
  await page.getByRole("button", { name: /^Run/ }).first().click();
  await page.waitForTimeout(2500);
  await shot("r5-21-org-form");
  const t = await text();
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map((b) => b.innerText.trim()).filter((s) => /Run|Launch|Start/.test(s)));
  return { btns, form: t.slice(t.indexOf("Settings") + 8, t.indexOf("Settings") + 1300) };
};
