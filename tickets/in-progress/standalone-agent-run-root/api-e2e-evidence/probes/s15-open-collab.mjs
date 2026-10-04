export default async ({ page, shot }) => {
  await page.goto("http://127.0.0.1:3000/chat", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "sar-devstack-ws-JbyD1A" }).click();
  await page.waitForTimeout(1000);
  if (!(await page.getByText("echo helper b7ea", { exact: true }).count())) { await page.getByText("General Agent", { exact: true }).first().click(); await page.waitForTimeout(1500); }
  await page.getByText("echo helper b7ea", { exact: true }).first().click();
  await page.waitForTimeout(4000);
  await shot("s15-collab-open-before-crash");
  return (await page.evaluate(() => document.querySelector('[data-testid="agent-event-monitor"]')?.innerText ?? "")).slice(-200);
};
