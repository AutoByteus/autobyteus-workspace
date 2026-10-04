export default async ({ page, shot }) => {
  const out = [];
  page.on("request", (r) => { if (r.url().includes("graphql")) { const b = r.postData() ?? ""; const m = b.match(/"operationName":"([^"]+)"/); out.push("REQ " + (m ? m[1] : b.slice(0, 80))); } });
  page.on("response", async (r) => { if (r.url().includes("graphql")) { const b = r.request().postData() ?? ""; if (/race|Trace/.test(b)) out.push("RESP " + r.status() + " " + (await r.text()).slice(0, 900)); } });
  const overlay = await page.locator('[data-testid="event-monitor-top-overlay"]').innerText().catch((e) => "n/a " + e.message);
  await page.locator('[data-testid="event-monitor-retry-earlier"]').click();
  await page.waitForTimeout(5000);
  const overlay2 = await page.locator('[data-testid="event-monitor-top-overlay"]').innerText().catch((e) => "n/a");
  await shot("s10-after-retry");
  const segs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="agent-event-monitor"] *')).filter((e) => e.children.length < 3 && /^From\s/.test((e.textContent ?? "").trim())).map((e) => (e.textContent ?? "").trim().slice(0, 140)));
  return { overlay, overlay2, out, segs: [...new Set(segs)] };
};
