export default async ({ page, shot }) => {
  const reqs = [];
  page.on("request", (r) => { if (r.url().includes("graphql") && /ActiveTrace|activeTrace/i.test(r.postData() ?? "")) reqs.push(r.postData().slice(0, 300)); });
  page.on("response", async (r) => { if (r.url().includes("graphql") && /ActiveTrace|activeTrace/i.test(r.request().postData() ?? "")) reqs.push("RESP " + (await r.text()).slice(0, 600)); });
  const monitor = page.locator('[data-testid="agent-event-monitor"]').first();
  const box = await monitor.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 250);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(300); }
  for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, -800); await page.waitForTimeout(500); }
  await page.waitForTimeout(3000);
  const top = await page.evaluate(() => document.querySelector('[data-testid="agent-event-monitor"]').innerText.slice(0, 500));
  const attrs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="agent-event-monitor"] [data-testid]')).map((e) => e.getAttribute("data-testid")).filter((v, i, a) => a.indexOf(v) === i).slice(0, 40));
  await shot("s09-earlier-debug");
  return { reqs, top, testids: attrs };
};
