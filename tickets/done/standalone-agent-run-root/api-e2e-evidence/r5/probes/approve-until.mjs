// Click Approve (trusted) whenever shown until the feed matches args[1]. args: [shotName, regex, timeoutSec?]
export default async ({ page, shot, args }) => {
  const re = new RegExp(args[1], "i"); const t0 = Date.now(); let approvals = 0; let ok = false; let feed = "";
  while (Date.now() - t0 < Number(args[2] ?? 300) * 1000) {
    const btn = page.getByRole("button", { name: "Approve", exact: true });
    if (await btn.count()) { await btn.first().click(); approvals++; await page.waitForTimeout(1500); continue; }
    feed = await page.evaluate(() => (document.querySelector('[data-testid="agent-event-monitor"]') ?? document.body).innerText);
    if (re.test(feed)) { ok = true; break; }
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(2000); await shot(args[0]);
  feed = await page.evaluate(() => (document.querySelector('[data-testid="agent-event-monitor"]') ?? document.body).innerText);
  return { ok, approvals, seconds: Math.round((Date.now() - t0) / 1000), tail: feed.slice(-600) };
};
