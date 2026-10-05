export default async ({ page, shot, text }) => {
  await page.getByText("echo helper b7ea", { exact: true }).first().click();
  await page.waitForTimeout(5000);
  await shot("s04-collaborator-prechange-history");
  const segs = await page.evaluate(() => Array.from(document.querySelectorAll("*")).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 160)).slice(0, 6));
  const tabs = await page.evaluate(() => Array.from(document.querySelectorAll("[role=tab], button")).map((b) => b.innerText.trim()).filter((s) => s && s.length < 30));
  return { fromSegments: segs, tabs: [...new Set(tabs)], hasRawHeader: /You received a message from sender name/.test(await text()) };
};
