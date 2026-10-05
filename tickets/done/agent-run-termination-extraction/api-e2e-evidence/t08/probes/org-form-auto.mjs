export default async ({ page, shot }) => {
  await page.getByRole("button", { name: "Agent Orgs", exact: true }).first().click();
  await page.waitForTimeout(1500);
  if (!(await page.getByText("SAR Org", { exact: true }).count())) { await page.getByRole("button", { name: "Reload" }).first().click(); await page.waitForTimeout(2500); }
  await page.getByRole("button", { name: /^Run/ }).first().click();
  await page.waitForTimeout(2500);
  const toggles = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role=switch], input[type=checkbox]")).filter((e) => /auto approve/i.test((e.innerText || e.getAttribute("aria-label") || "") + (e.closest("div")?.innerText ?? "").slice(0, 40))).map((e) => ({ tag: e.tagName, role: e.getAttribute("role"), aria: e.getAttribute("aria-checked") ?? e.getAttribute("aria-pressed"), label: (e.innerText || e.getAttribute("aria-label") || "").slice(0, 40), checked: e.checked ?? null })));
  await shot("t08-09-org-form");
  return toggles;
};
