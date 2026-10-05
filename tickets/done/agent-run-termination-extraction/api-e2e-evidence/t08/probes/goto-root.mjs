// Click the run row whose title starts with args[0]; print the header.
export default async ({ page, shot, args }) => {
  const aside = page.locator("aside").first();
  await aside.getByText(new RegExp("^" + args[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first().click();
  await page.waitForTimeout(3000);
  await shot(args[1] ?? "goto");
  return (await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText)).slice(0, 140);
};
