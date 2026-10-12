async () => {
  const label = (b) => (b.innerText || "").trim() || (b.getAttribute("aria-label") || b.title || "").trim();
  const btn = [...document.querySelectorAll("button,[role=tab]")].find((b) => label(b) === "Token");
  if (!btn) return { error: "no Token tab" };
  btn.click();
  await new Promise((r) => setTimeout(r, 2500));
  const t = document.querySelector("[data-test=context-tokens]");
  const body = document.body.innerText; const i = body.indexOf("Token Meter");
  return { card: t ? t.textContent.trim() : null, meter: body.slice(i, i + 160) };
}
