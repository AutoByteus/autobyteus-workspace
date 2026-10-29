(() => {
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const textOf = (e) => (e.innerText || '').replace(/\s+/g, ' ').trim();
  const withText = [], iconOnly = [], spinners = [];
  for (const svg of document.querySelectorAll('main svg, [role=dialog] svg, section svg, body svg')) {
    if (!visible(svg)) continue;
    const host = svg.closest('button, a, label, li, [role=button], [role=menuitem], h1, h2, h3, h4, p, span, div');
    if (!host) continue;
    const cls = (svg.getAttribute('class') || '') + ' ' + (svg.parentElement?.getAttribute('class') || '');
    if (/animate-spin/.test(cls)) { spinners.push(textOf(host).slice(0, 40)); continue; }
    const control = svg.closest('button, a, [role=button]');
    const scope = control || svg.parentElement;
    const t = textOf(scope);
    const name = svg.getAttribute('data-icon') || svg.getAttribute('aria-label') || [...svg.classList].join('.') || 'svg';
    if (t) withText.push({ text: t.slice(0, 60), icon: name.slice(0, 50), control: !!control });
    else iconOnly.push({ label: (control?.getAttribute('aria-label') || control?.getAttribute('title') || '').slice(0, 40), icon: name.slice(0, 50) });
  }
  return { path: location.hash, iconWithText: withText, iconOnlyCount: iconOnly.length, iconOnly: iconOnly.slice(0, 12), spinners };
})()
