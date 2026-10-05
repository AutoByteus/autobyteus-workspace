export default async ({ page, shot, text }) => {
  const card = page.locator("div").filter({ hasText: /^SH\s*SAR Host/ }).last();
  const runBtns = page.getByRole("button", { name: "Run", exact: true });
  const n = await runBtns.count();
  // pick the Run button whose card contains "SAR Host"
  let idx = -1;
  for (let i = 0; i < n; i++) { const t = await runBtns.nth(i).evaluate((b) => b.closest("[class*=rounded], article, li, div")?.parentElement?.innerText ?? ""); if (/SAR Host/.test(t) && !/SAR Helper/.test(t)) { idx = i; break; } }
  if (idx < 0) idx = n - 1;
  await runBtns.nth(idx).click();
  await page.waitForTimeout(2500);
  await shot("r5-06-run-setup");
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role=combobox], select, textarea")).map((b) => `${b.tagName}:${(b.innerText || b.getAttribute("aria-label") || b.getAttribute("placeholder") || "").trim().slice(0, 80)}`).filter((s) => s.length > 5));
  return { idx, n, btns: [...new Set(btns)].slice(0, 50), text: (await text()).slice(0, 1200) };
};
