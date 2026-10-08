async (arg) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (!document.querySelector(`[data-test^="agent-org-run-open-${arg.org}"]`)) { await __abDemo.click({ text: 'Live Org' }); await sleep(800); }
  const agentRow = document.querySelector(`[data-test="workspace-agent-run-row"][data-run-id="${arg.agent}"]`);
  const teamRow = document.querySelector(`[data-test="workspace-team-row-${arg.team}"]`);
  const titles = (el) => el ? [...el.querySelectorAll('[title]')].map((b) => b.getAttribute('title')) : null;
  const before = {
    agentRowTitles: titles(agentRow),
    teamRowTitles: titles(teamRow),
    orgArchiveBtn: !!document.querySelector(`[data-test="agent-org-run-archive-${arg.org}"]`),
    orgDeleteBtn: !!document.querySelector(`[data-test="agent-org-run-delete-${arg.org}"]`),
    groupButtons: [...document.querySelectorAll('[data-test^="workspace-agent-group-archive-"],[data-test^="workspace-team-group-archive-"],[data-test^="agent-org-group-archive-"]')].map((e) => e.getAttribute('data-test')),
  };
  const results = {};
  for (const sel of arg.groupSelectors) {
    const el = document.querySelector(`[data-test="${sel}"]`);
    if (!el) { results[sel] = 'absent'; continue; }
    el.scrollIntoView({ block: 'center' }); await sleep(200);
    const c = await __abDemo.click({ selector: `[data-test="${sel}"]` });
    let toast = null; let dialog = null;
    for (let i = 0; i < 40; i += 1) {
      await sleep(100);
      const m = document.body.innerText.match(/Stop running runs first\.|Archived [^.]*\./); if (m) { toast = m[0]; break; }
      const d = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Archive all' && b.offsetParent); if (d) { dialog = 'confirm dialog opened'; break; }
    }
    if (dialog) { const cancel = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Cancel' && b.offsetParent).pop(); cancel?.click(); await sleep(300); }
    results[sel] = { click: c.ok || c.error, toast, dialog, hash: location.hash };
    await sleep(2500);
  }
  return { before, results, hash: location.hash };
}
