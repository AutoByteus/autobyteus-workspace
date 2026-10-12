async (arg) => {
  // Samples the Token Meter context card (D-13): value, muted state, note, call count.
  const t0 = Date.now();
  const out = [];
  let prev = null;
  const reopenToken = () => {
    const label = (b) => (b.innerText || "").trim() || (b.getAttribute("aria-label") || b.title || "").trim();
    const btn = [...document.querySelectorAll("button,[role=tab]")].find((b) => label(b) === "Token");
    if (btn) btn.click();
  };
  let reopened = 0;
  while (Date.now() - t0 < (arg && arg.ms ? arg.ms : 60000)) {
    if (!document.body.innerText.includes("Token Meter")) { reopenToken(); reopened += 1; out.push({ t: Date.now() - t0, event: "reopened Token tab" }); await new Promise((r) => setTimeout(r, 300)); }
    const tokens = document.querySelector('[data-test="context-tokens"]');
    const note = document.querySelector('[data-test="context-compacted-note"]');
    const body = document.body.innerText;
    const i = body.indexOf("Token Meter");
    const meter = i >= 0 ? body.slice(i, i + 3000) : "";
    const s = {
      t: Date.now() - t0,
      tokens: tokens ? tokens.textContent.trim().replace(/\s+/g, " ") : null,
      muted: tokens ? tokens.className.includes("text-slate-400") : null,
      note: note ? note.textContent.trim() : null,
      calls: (meter.match(/Usage reports\n([^\n]+)/) || [])[1] || null,
      pct: (meter.match(/Latest prompt\n([^\n]+)/) || [])[1] || null,
      compaction: (body.match(/\n(Compacting[^\n]*|Compacted[^\n]*|Compaction[^\n]*)\n/) || [])[1] || null,
    };
    const key = JSON.stringify([s.tokens, s.muted, s.note, s.calls, s.compaction]);
    if (key !== prev) { out.push(s); prev = key; }
    await new Promise((r) => setTimeout(r, arg && arg.every ? arg.every : 150));
  }
  return out;
}
