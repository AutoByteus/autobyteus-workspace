const fromSegs = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="agent-event-monitor"] *')).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 140)));
export default async ({ page, shot }) => {
  const net = [];
  page.on("response", async (r) => { const b = r.request().postData() ?? ""; if (r.url().includes("graphql") && /ActiveTracePage/.test(b)) { const t = await r.text(); net.push((b.match(/"operationName":"([^"]+)"/) ?? [])[1] + " " + r.status() + " errors=" + /"errors"/.test(t) + " interAgent=" + (t.match(/"inter_agent"/g) ?? []).length); } });
  await page.goto("http://127.0.0.1:3000/chat", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "sar-devstack-ws-JbyD1A" }).click();
  await page.waitForTimeout(1000);
  if (!(await page.getByText("Call the run_bash tool 60 separate times", { exact: false }).count())) { await page.getByText("General Agent", { exact: true }).first().click(); await page.waitForTimeout(1000); }
  await page.getByText("Call the run_bash tool 60 separate times", { exact: false }).first().click();
  await page.waitForTimeout(5000);
  const before = await fromSegs(page);
  await shot("s11a-host-latest");
  const monitor = page.locator('[data-testid="agent-event-monitor"]').first();
  const box = await monitor.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 250);
  for (let i = 0; i < 70; i++) { await page.mouse.wheel(0, -1200); await page.waitForTimeout(350); if ((await fromSegs(page)).length >= 2) break; }
  await page.waitForTimeout(2000);
  await shot("s11b-host-earlier-events");
  const after = await fromSegs(page);
  const retry = await page.locator('[data-testid="event-monitor-retry-earlier"]').count();
  const raw = await page.evaluate(() => /You received a message from sender name/.test(document.querySelector('[data-testid="agent-event-monitor"]').innerText));
  return { beforeFromSegments: before, afterFromSegments: [...new Set(after)], retryControls: retry, rawHeaderVisible: raw, net };
};
