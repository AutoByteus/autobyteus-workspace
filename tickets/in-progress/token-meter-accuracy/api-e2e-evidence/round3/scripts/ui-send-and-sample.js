async (arg) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const label = (b) => (b.innerText || "").trim() || (b.getAttribute("aria-label") || b.title || "").trim();
  const send = async (text, typeFirst) => {
    if (typeFirst) { await __abDemo.type({ selector: "textarea" }, text, { delayMs: 10, clear: true }); await sleep(400); }
    const btn = [...document.querySelectorAll("button")].find((b) => label(b) === "Send message");
    btn.click();
  };
  __abDemo.setPresentation(false);
  const out = []; let prev = null; const t0 = Date.now();
  const read = () => {
    const tokens = document.querySelector('[data-test="context-tokens"]');
    const note = document.querySelector('[data-test="context-compacted-note"]');
    const body = document.body.innerText; const i = body.indexOf("Token Meter"); const meter = i >= 0 ? body.slice(i, i + 3000) : "";
    return { t: Date.now() - t0, tokens: tokens ? tokens.textContent.trim() : null, muted: tokens ? tokens.className.includes("text-slate-400") : null,
      note: note ? note.textContent.trim() : null, calls: (meter.match(/Usage reports\n([^\n]+)/) || [])[1] || null,
      status: (body.match(/\n(Idle|Offline|Running|Initializing)\n/) || [])[1] || null };
  };
  const sample = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) { const s = read(); const k = JSON.stringify([s.tokens, s.muted, s.note, s.calls, s.status]); if (k !== prev) { out.push(s); prev = k; } await sleep(120); } };
  await send(arg.first, arg.typeFirst === true);
  out.push({ t: Date.now() - t0, event: `sent ${arg.first}` });
  await sample(arg.firstMs);
  await send(arg.second, true);
  out.push({ t: Date.now() - t0, event: `sent ${arg.second}` });
  await sample(arg.secondMs);
  return out;
}
