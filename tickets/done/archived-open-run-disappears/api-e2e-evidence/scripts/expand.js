async (arg) => {
  const panel = document.querySelector('[data-test="app-left-panel-run-history"]') ?? document;
  const out = [];
  for (const name of arg.names) {
    const cands = [...panel.querySelectorAll('[aria-expanded]')].filter((el) => {
      const row = el.closest('div');
      return row && row.innerText.replace(/\s+/g, ' ').trim().startsWith(name) || el.innerText.replace(/\s+/g, ' ').includes(name);
    });
    const el = cands.find((c) => c.innerText.replace(/\s+/g, ' ').includes(name)) ?? cands[0];
    if (!el) { out.push({ name, found: false }); continue; }
    if (el.getAttribute('aria-expanded') === 'false') { el.click(); await new Promise((r) => setTimeout(r, 300)); }
    out.push({ name, expanded: el.getAttribute('aria-expanded') });
  }
  return { out, hash: location.hash, agentRows: [...document.querySelectorAll('[data-test="workspace-agent-run-row"]')].map((e) => e.getAttribute('data-run-id')) };
}
