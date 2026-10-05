// args: [groupName, shotName] — expand group, open its run row, report history
export default async ({ page, shot, args }) => {
  const aside = page.locator("aside").first();
  await aside.getByText(args[0], { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const lines = (await aside.innerText()).split("\n");
  const gi = lines.indexOf(args[0]);
  const runTitle = lines.slice(gi).find((l, i) => i > 1 && l.length > 30);
  await aside.getByText(runTitle, { exact: true }).first().click();
  await page.waitForTimeout(5000);
  await shot(args[1]);
  const feed = await page.evaluate(() => (document.querySelector('[data-testid="agent-event-monitor"]') ?? document.body).innerText);
  const header = await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText.slice(0, 120));
  return { runTitle, header, from: feed.match(/From [^\n]+:/g), feedHead: feed.slice(0, 300), tree: (await aside.innerText()).split("\n").filter(Boolean).slice(8) };
};
