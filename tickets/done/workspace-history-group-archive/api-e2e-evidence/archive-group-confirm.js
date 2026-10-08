async (arg) => {
  const sel = `[data-test="${arg.dataTest}"]`;
  const btn = document.querySelector(sel);
  if (!btn) return { error: 'button missing' };
  btn.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 300));
  const c1 = await __abDemo.click({ selector: sel });
  const w = await __abDemo.waitFor({ text: arg.confirmText }, { timeoutMs: 3000 });
  const dialogText = [...document.querySelectorAll('h1,h2,h3,p,div')].filter((e) => e.children.length === 0 && /Archive all runs\?|全部归档？|will be hidden|将从历史记录中隐藏/.test(e.innerText)).map((e) => e.innerText.trim());
  const c2 = await __abDemo.click({ text: arg.confirmText });
  let toast = null;
  for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 150)); const m = document.body.innerText.match(new RegExp(arg.toastPattern)); if (m) { toast = m[0]; break; } }
  await new Promise((r) => setTimeout(r, 1500));
  return { c1: c1.ok, w: w.ok, c2: c2.ok, dialogText: [...new Set(dialogText)], toast, hash: location.hash, buttonStill: !!document.querySelector(sel) };
}
