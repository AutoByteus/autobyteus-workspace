// Run setup: Codex App Server + GPT-6-Astra, auto-approve on, click args[0] (run button label).
export default async ({ page, shot, text, args }) => {
  const sel = page.locator("select").filter({ hasText: "Codex App Server" }).first();
  if ((await sel.inputValue()) !== "codex_app_server") { await sel.selectOption({ label: "Codex App Server" }); await page.waitForTimeout(1200); }
  if (!(await page.getByText(/GPT-6-Astra/).count())) { await page.getByRole("button", { name: "Select a model" }).first().click(); await page.waitForTimeout(600); }
  const box = page.getByPlaceholder(/search|model/i).first();
  if (await box.count() && await box.isVisible()) { await box.fill("gpt-6-astra"); await page.waitForTimeout(500); }
  await page.getByText(/GPT-6-Astra \(default reasoning/).first().click();
  await page.waitForTimeout(800);
  await shot(`${args[1] ?? "setup"}-filled`);
  const t = await text(); const i = t.indexOf("LLM Model");
  await page.getByRole("button", { name: args[0] }).last().click();
  await page.waitForTimeout(4000);
  await shot(`${args[1] ?? "setup"}-started`);
  return { modelField: t.slice(i, i + 80), after: (await text()).slice(0, 600) };
};
