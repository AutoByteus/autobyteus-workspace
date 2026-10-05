const WS = "sar-devstack-ws-0jI9CG", CHILD = "echo helper fe71";
const fromSegs = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="agent-event-monitor"] *')).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 140)));
const pageBack = async (page, shot, label, want) => {
  const net = [];
  const onResp = async (r) => { const b = r.request().postData() ?? ""; if (r.url().includes("graphql") && /ActiveTracePage/.test(b)) { const t = await r.text(); net.push(((b.match(/"operationName":"([^"]+)"/) ?? [])[1]) + " " + r.status() + " errors=" + /"errors"/.test(t) + " interAgent=" + (t.match(/"inter_agent"/g) ?? []).length + " senderAddress=" + JSON.stringify([...new Set((t.match(/"senderAddress":(null|"[^"]*")/g) ?? []))])); } };
  page.on("response", onResp);
  const before = await fromSegs(page);
  await shot(`r2-${label}-latest`);
  const box = await page.locator('[data-testid="agent-event-monitor"]').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 250);
  for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, -1200); await page.waitForTimeout(350); if ((await fromSegs(page)).filter((s) => want.test(s)).length >= 2) break; }
  await page.waitForTimeout(2000);
  await shot(`r2-${label}-earlier-events`);
  const after = [...new Set(await fromSegs(page))];
  const retry = await page.locator('[data-testid="event-monitor-retry-earlier"]').count();
  const raw = await page.evaluate(() => /You received a message from sender name/.test(document.querySelector('[data-testid="agent-event-monitor"]').innerText));
  page.off("response", onResp);
  return { beforeFromSegments: before, afterFromSegments: after, retryControls: retry, rawHeaderVisible: raw, net };
};
export default async ({ page, shot }) => {
  await page.goto("http://127.0.0.1:3000/chat", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: WS }).click();
  await page.waitForTimeout(1000);
  if (!(await page.getByText(CHILD, { exact: true }).count())) { await page.locator("aside").getByText("General Agent", { exact: true }).first().click(); await page.waitForTimeout(1500); }
  await page.getByText(CHILD, { exact: true }).first().click();
  await page.waitForTimeout(5000);
  const collaborator = await pageBack(page, shot, "collaborator", /From General Agent:/);
  const lines = await page.evaluate(() => document.querySelector("aside").innerText.split("\n"));
  const runTitle = lines[lines.indexOf("(1)") + 1];
  await page.locator("aside").getByText(runTitle, { exact: true }).first().click();
  await page.waitForTimeout(5000);
  const host = await pageBack(page, shot, "host", /From Echo Helper/);
  return { collaborator, host };
};
