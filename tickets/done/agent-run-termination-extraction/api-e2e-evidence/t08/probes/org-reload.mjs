export default async ({ page, shot, text }) => {
  await page.getByRole("button", { name: "Reload" }).first().click();
  await page.waitForTimeout(3000);
  await shot("r5-20c-org-reload");
  const t = await text(); const i = t.indexOf("Create Agent Org");
  return t.slice(i, i + 600);
};
