export default async ({ page, shot, text }) => {
  const box = page.getByPlaceholder("/absolute/path/to/agent-package or https://github.com/owner/repo");
  await box.click();
  await page.keyboard.type("/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-evidence/r5/sar-test-agents");
  await page.getByRole("button", { name: "Import Package" }).click();
  await page.waitForTimeout(5000);
  await shot("r5-04-imported");
  const t = await text();
  const i = t.indexOf("sar-test-agents");
  return { around: i >= 0 ? t.slice(Math.max(0, i - 300), i + 600) : t.slice(-1500) };
};
