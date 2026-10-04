import { execSync } from "node:child_process";
export default async ({ page, shot }) => {
  await page.locator("aside").getByText("General Agent", { exact: true }).first().click();
  await page.waitForTimeout(1000);
  const lines = await page.evaluate(() => document.querySelector("aside").innerText.split("\n"));
  const runTitle = lines[lines.indexOf("(1)") + 1];
  await page.locator("aside").getByText(runTitle, { exact: true }).first().click();
  await page.waitForTimeout(4000);
  const before = execSync("ps -A -o pid=,ppid=,command= | awk '$2==79405' | cut -c1-60").toString();
  const hostPid = execSync("ps -A -o pid=,ppid=,command= | awk '$2==79405' | grep -v 'resume=b323c4b4' | grep claude | awk '{print $1}'").toString().trim();
  execSync(`kill -9 ${hostPid}`);
  await page.waitForTimeout(4000);
  const afterKill = execSync("ps -A -o pid=,ppid=,command= | awk '$2==79405' | cut -c1-60").toString();
  const box = page.getByRole("combobox").first();
  await box.click();
  await page.keyboard.type("Reply with the single word HOSTBACK. Do not call any tool.", { delay: 10 });
  await page.getByRole("button", { name: "Send message" }).first().click();
  const t0 = Date.now(); let seen = false;
  while (Date.now() - t0 < 150000) {
    const t = await page.evaluate(() => document.querySelector('[data-testid="agent-event-monitor"]').innerText);
    if (/\nHOSTBACK\s*\n/.test(t + "\n")) { seen = true; break; }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000);
  await shot("s19-host-send-after-crash");
  const after = execSync("ps -A -o pid=,ppid=,command= | awk '$2==79405' | cut -c1-120").toString();
  return { runTitle, before, killed: hostPid, afterKill, replySeen: seen, ms: Date.now() - t0, after };
};
