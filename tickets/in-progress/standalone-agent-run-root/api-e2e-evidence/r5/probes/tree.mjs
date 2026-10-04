// Print the sidebar tree, optionally clicking a row: args [rowText?, nth?]
export default async ({ page, shot, args }) => {
  const aside = page.locator("aside").first();
  if (args[0]) { await aside.getByText(args[0], { exact: true }).nth(Number(args[1] ?? 0)).click(); await page.waitForTimeout(2500); await shot(`tree-${args[0].replace(/\W+/g, "_")}`); }
  const header = await page.evaluate(() => { const m = document.querySelector("main") ?? document.body; return m.innerText.slice(0, 160); });
  return { tree: (await aside.innerText()).split("\n").filter(Boolean), header };
};
