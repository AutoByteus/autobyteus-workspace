async (arg) => {
  const row = document.querySelector(arg.rowSelector);
  if (!row) return { error: 'row missing ' + arg.rowSelector };
  row.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 250));
  const btn = arg.buttonSelector ? document.querySelector(arg.buttonSelector) : row.querySelector(`[title="${arg.title}"]`) ?? row.parentElement.querySelector(`[title="${arg.title}"]`);
  if (!btn) return { error: 'button missing', title: arg.title };
  document.querySelectorAll('[data-aord-target]').forEach((e) => e.removeAttribute('data-aord-target'));
  btn.setAttribute('data-aord-target', '1');
  await __abDemo.hover({ selector: arg.rowSelector });
  const c1 = await __abDemo.click({ selector: '[data-aord-target="1"]' });
  let confirm = null;
  if (arg.confirmText) {
    const w = await __abDemo.waitFor({ text: arg.confirmText }, { timeoutMs: 4000 });
    const dialogText = (document.querySelector('[data-test="delete-confirmation-modal"]') ?? document.querySelector('[role=dialog]'))?.innerText.replace(/\s+/g, ' ').trim() ?? null;
    const btns = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === arg.confirmText && b.offsetParent !== null && b.getAttribute('data-aord-target') !== '1');
    const target = btns[btns.length - 1];
    if (target) target.setAttribute('data-aord-confirm', '1');
    const c2 = target ? await __abDemo.click({ selector: '[data-aord-confirm="1"]' }) : { ok: false, error: 'confirm button missing' };
    if (target) target.removeAttribute('data-aord-confirm');
    confirm = { waited: w.ok, dialogText, clicked: c2.ok ? 'ok' : c2.error };
  }
  const samples = []; const seen = new Set();
  const t0 = performance.now();
  let toast = null;
  for (let i = 0; i < 70; i += 1) {
    const s = [location.hash.split('?')[0] + (location.hash.includes('id=') ? '?id' : ''),
      document.querySelector('[data-test="chat-missing"]') ? 'MISSING' : '',
      document.querySelector('[data-test="chat-opening"]') ? 'OPENING' : '',
      document.querySelector('[data-test="chat-run-frame"]') ? 'RUNFRAME' : '',
      document.querySelector('[data-test="workspace-empty-state"]') ? 'EMPTY' : ''].filter(Boolean).join('|');
    if (!seen.has(s)) { seen.add(s); samples.push({ ms: Math.round(performance.now() - t0), s }); }
    const m = arg.toastPattern && document.body.innerText.match(new RegExp(arg.toastPattern));
    if (m && !toast) toast = m[0];
    await new Promise((r) => setTimeout(r, 50));
  }
  return { c1: c1.ok ? 'ok' : c1.error, confirm, toast, transitions: samples, finalHash: location.hash };
}
