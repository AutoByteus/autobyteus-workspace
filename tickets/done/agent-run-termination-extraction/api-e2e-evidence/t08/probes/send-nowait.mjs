// Send a message and return once the run shows activity (Running / a tool card). args: [shotName, message]
export default async ({ page, shot, args }) => {
  const [name, message] = args;
  const box = page.getByRole("combobox").last();
  await box.click();
  await page.keyboard.type(message, { delay: 3 });
  await page.getByRole("button", { name: "Send message" }).last().click();
  const t0 = Date.now(); let header = "";
  while (Date.now() - t0 < 60000) {
    await page.waitForTimeout(1500);
    header = await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText.slice(0, 200));
    const feed = await page.evaluate(() => (document.querySelector('[data-testid="agent-event-monitor"]') ?? document.body).innerText);
    const after = feed.slice(feed.lastIndexOf(message.slice(0, 40)));
    if (/Running|Thinking/.test(header) && /sleep|run_bash|command|Bash|shell/i.test(after)) break;
  }
  await page.waitForTimeout(2000);
  await shot(name);
  const feed = await page.evaluate(() => (document.querySelector('[data-testid="agent-event-monitor"]') ?? document.body).innerText);
  return { seconds: Math.round((Date.now() - t0) / 1000), header: header.slice(0, 80), tail: feed.slice(-300) };
};
