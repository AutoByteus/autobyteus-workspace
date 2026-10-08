async (arg) => {
  const sel = `[data-test="${arg.dataTest}"]`;
  const btn = document.querySelector(sel);
  if (!btn) return { error: 'button missing' };
  const r = await __abDemo.click({ selector: sel });
  await new Promise((res) => setTimeout(res, arg.waitMs ?? 1200));
  const dialogs = [...document.querySelectorAll('[role=dialog], .fixed.inset-0')].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => e.innerText.trim()).filter(Boolean);
  const toasts = [...document.querySelectorAll('[class*=toast], [data-test*=toast], [role=status], [role=alert]')].map((e) => e.innerText.trim()).filter(Boolean);
  return { click: r, ariaLabel: btn.getAttribute('aria-label'), title: btn.getAttribute('title'), disabled: btn.disabled, dialogs, toasts };
}
