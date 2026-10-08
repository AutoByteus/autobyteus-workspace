async (arg) => {
  const el = document.querySelector(arg.selector);
  if (!el) return { error: 'missing ' + arg.selector };
  el.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 250));
  const c = await __abDemo.click({ selector: arg.selector });
  await new Promise((r) => setTimeout(r, arg.waitMs ?? 2500));
  return { click: c.ok ? 'ok' : c.error, hash: location.hash };
}
