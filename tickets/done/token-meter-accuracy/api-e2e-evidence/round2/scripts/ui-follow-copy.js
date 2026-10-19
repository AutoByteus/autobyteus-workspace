async (arg) => {
  const leafs = (text) => [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() === text);
  const t0 = Date.now();
  const initial = leafs("worker").length;
  while (leafs("worker").length <= initial && Date.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 300));
  const rows = leafs("worker");
  if (rows.length <= initial) return { error: "no new copy row", initial, now: rows.length };
  const appearedAt = Date.now() - t0;
  rows[rows.length - 1].click();
  await new Promise((r) => setTimeout(r, 1200));
  const btn = [...document.querySelectorAll("button,[role=tab]")].find((b) => b.innerText.trim() === "Token");
  if (btn) btn.click();
  const samples = [];
  const s0 = Date.now();
  let prev = null;
  while (Date.now() - s0 < 45000) {
    const body = document.body.innerText;
    const i = body.indexOf("Token Meter");
    const t = i >= 0 ? body.slice(i, i + 4000) : "";
    const status = (body.match(/\n(Running|Idle|Offline|Initializing)\n/) || [])[1] || "?";
    const s = { t: Date.now() - t0, status, unavailable: /temporarily unavailable/.test(t),
      prompt: (t.match(/([\d.]+) \/ ([\d.]+) context tokens/) || [])[0] || null,
      calls: (t.match(/Usage reports\n([^\n]+)/) || [])[1] || null,
      model: (t.match(/Latest model\n([^\n]+)/) || [])[1] || null,
      runtime: (t.match(/Runtime\n([^\n]+)/) || [])[1] || null, hash: location.hash };
    const key = JSON.stringify([s.status, s.unavailable, s.prompt, s.calls, s.model]);
    if (key !== prev) { samples.push(s); prev = key; }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { initial, appearedAt, samples };
}
