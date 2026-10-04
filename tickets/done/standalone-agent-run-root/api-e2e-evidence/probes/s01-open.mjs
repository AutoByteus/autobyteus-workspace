export default async ({ page, shot, text }) => {
  await page.goto("http://127.0.0.1:3000/chat", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "sar-devstack-ws-JbyD1A" }).click();
  await page.waitForTimeout(1500);
  await shot("s01-workspace-expanded");
  const t = await text();
  return t.slice(0, 1500);
};
