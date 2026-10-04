export default async ({ page, shot }) => {
  const net = [];
  page.on("request", (r) => { const b = r.postData() ?? ""; if (r.url().includes("graphql") && /ActiveTracePage/.test(b)) net.push((b.match(/"operationName":"([^"]+)"/) ?? [])[1]); });
  const tree = await page.evaluate(() => document.querySelector("aside").innerText.split("\n"));
  const label = tree.find((l) => /lead/i.test(l));
  await page.locator("aside").getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(5000);
  await shot("r2-team-lead-page");
  const segs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="agent-event-monitor"] *')).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 120)));
  return { treeLabel: label, fromSegments: [...new Set(segs)], earlierRequests: net, tree: tree.slice(9, 20) };
};
