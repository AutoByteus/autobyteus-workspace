export default async ({ page, shot }) => {
  await page.goto("http://127.0.0.1:3000/chat", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "sar-devstack-ws-JbyD1A" }).click();
  await page.waitForTimeout(1000);
  if (!(await page.getByText("echo helper b7ea", { exact: true }).count())) { await page.getByText("General Agent", { exact: true }).first().click(); await page.waitForTimeout(1000); }
  if (!(await page.getByText("echo helper b7ea", { exact: true }).count())) { await page.getByText("Use send_message_to to message the mentioned collaborator", { exact: false }).first().click(); await page.waitForTimeout(1500); }
  await page.getByText("echo helper b7ea", { exact: true }).first().click();
  await page.waitForTimeout(5000);
  await shot("s07-collaborator-latest");
  const candidates = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role=button], a")).map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim()).filter((s) => /earlier|older|load|history|beginning/i.test(s)));
  return { candidates };
};
