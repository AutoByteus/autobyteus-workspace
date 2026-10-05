// Composer send with trusted input. args: [shotName, expectRegex, message, mentionName?]
export default async ({ page, shot, args }) => {
  const [name, expect, message, mention] = args;
  const feed = () => page.evaluate(() => (document.querySelector('[data-testid="agent-event-monitor"]') ?? document.querySelector("main") ?? document.body).innerText);
  const before = await feed();
  const box = page.getByRole("combobox").last();
  await box.click();
  if (mention) {
    await page.keyboard.type("@" + mention.split(" ")[0], { delay: 30 });
    await page.waitForTimeout(1200);
    const opt = page.getByRole("option", { name: new RegExp(mention, "i") }).first();
    if (await opt.count()) await opt.click(); else await page.getByText(mention, { exact: true }).last().click();
    await page.waitForTimeout(500);
    await page.keyboard.type(" ", { delay: 10 });
  }
  await page.keyboard.type(message, { delay: 4 });
  await shot(`${name}-typed`);
  await page.getByRole("button", { name: "Send message" }).last().click();
  const re = new RegExp(expect, "i");
  const t0 = Date.now(); let ok = false; let after = "";
  while (Date.now() - t0 < 300000) {
    await page.waitForTimeout(2000);
    after = await feed();
    const at = after.lastIndexOf(message.slice(0, 60));
    const fresh = at >= 0 ? after.slice(at + Math.min(60, message.length)) : "";
    if (re.test(fresh.replace(message, "").replace(/Context Files[\s\S]*$/, ""))) { ok = true; break; }
  }
  await page.waitForTimeout(3000);
  await shot(`${name}-done`);
  after = await feed();
  return { ok, seconds: Math.round((Date.now() - t0) / 1000), tail: after.slice(-900) };
};
