async (arg) => {
  const bubbles = () => [...document.querySelectorAll("main *")].filter((e) => e.children.length === 0 && /^OK (DUMP\d+|AFTER|RESTORED)$/.test(e.textContent.trim())).map((e) => e.textContent.trim());
  const status = () => document.querySelector("main")?.innerText.split("\n").slice(0, 3).join("|") ?? "";
  const before = bubbles().length;
  const el = document.querySelector("textarea") || document.querySelector("[role=combobox]");
  const text = arg.text ?? (`Data dump ${arg.turn}. Do not analyze. Reply with exactly: OK DUMP${arg.turn}\n` +
    Array.from({ length: 2200 }, (_, i) => `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n"));
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, text);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 500));
  document.querySelector('[aria-label="Send message"]').click();
  const t0 = Date.now();
  const samples = [];
  let last = "";
  while (Date.now() - t0 < 240000 && !(bubbles().length > before && /\|Idle$/.test(status()))) {
    const rows = [...document.querySelectorAll("[data-testid=compaction-status-row]")].map((e) => e.innerText.replace(/\s+/g, " ").slice(0, 160));
    const k = JSON.stringify(rows);
    if (k !== last) { samples.push({ dt: Date.now() - t0, rows }); last = k; }
    await new Promise((r) => setTimeout(r, 250));
  }
  return {
    elapsedMs: Date.now() - t0, status: status(), bubbles: bubbles(), samples,
    acts: [...document.querySelectorAll("[data-testid=compaction-activity-item]")].map((e) => e.innerText.replace(/\s+/g, " ").slice(0, 300)),
  };
}
