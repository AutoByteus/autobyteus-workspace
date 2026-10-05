async (arg) => {
  const rows = () => [...document.querySelectorAll("[data-testid=compaction-status-row]")].map((e) => e.innerText.replace(/\s+/g, " ").slice(0, 200));
  const acts = () => [...document.querySelectorAll("[data-testid=compaction-activity-item]")].map((e) => e.innerText.replace(/\s+/g, " ").slice(0, 300));
  const replies = () => [...document.querySelectorAll("main *")].filter((e) => e.children.length === 0 && /^OK [A-Z0-9]+$/.test(e.textContent.trim())).map((e) => e.textContent.trim());
  const status = () => document.querySelector("main")?.innerText.split("\n").slice(0, 3).join("|") ?? "";
  const before = replies().length;
  const text = arg.text ?? (`Data dump ${arg.label}. Do not analyze. Reply with exactly: OK ${arg.label}\n` +
    Array.from({ length: 2000 }, (_, i) => `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n"));
  const el = document.querySelector("textarea");
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, text);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  document.querySelector('[aria-label="Send message"]').click();
  const t0 = Date.now(); const samples = []; let last = ""; let stopped = null;
  while (Date.now() - t0 < 240000) {
    const r = rows(); const k = JSON.stringify(r);
    if (k !== last) { samples.push({ dt: Date.now() - t0, rows: r }); last = k; }
    if (arg.stopOnCompacting && !stopped && r.some((x) => /COMPACTING/.test(x))) {
      const btn = document.querySelector('[aria-label="Stop generation"]');
      if (btn) { btn.click(); stopped = Date.now() - t0; }
    }
    const idle = /\|Idle$/.test(status());
    if (idle && Date.now() - t0 > 2000 && (stopped !== null || replies().length > before)) break;
    await new Promise((res) => setTimeout(res, 100));
  }
  await new Promise((r) => setTimeout(r, 1000));
  return { elapsedMs: Date.now() - t0, stoppedAtMs: stopped, status: status(), replies: replies().slice(-3), samples, rows: rows(), acts: acts() };
}
