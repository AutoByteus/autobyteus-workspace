async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const header = [...document.querySelectorAll('[data-test="workspace-agent-row"]')].find((e) => e.innerText.includes('Keeper Agent'));
  if (!header) return { error: 'keeper header missing' };
  const plus = header.parentElement.querySelector('[title="New run with this agent"]');
  plus.setAttribute('data-aord-plus', '1');
  const c = await __abDemo.click({ selector: '[data-aord-plus="1"]' });
  await sleep(2500);
  const draftHash = location.hash;
  const draftRow = [...document.querySelectorAll('[data-test="workspace-agent-run-row"]')].find((e) => (e.getAttribute('data-run-id') || '').startsWith('temp-'));
  if (!draftRow) return { click: c.ok || c.error, draftHash, error: 'no draft row' };
  const draftId = draftRow.getAttribute('data-run-id');
  const rm = draftRow.querySelector('[title="Remove draft run"]');
  rm.setAttribute('data-aord-rm', '1');
  await __abDemo.hover({ selector: `[data-run-id="${draftId}"]` });
  const c2 = await __abDemo.click({ selector: '[data-aord-rm="1"]' });
  const samples = []; const seen = new Set(); const t0 = performance.now();
  for (let i = 0; i < 60; i += 1) {
    const s = [location.hash, document.querySelector('[data-test="chat-new-frame"]') ? 'NEWCHAT' : '', document.querySelector('[data-test="workspace-empty-state"]') ? 'EMPTY' : '', document.querySelector('[data-test="chat-run-frame"]') ? 'RUNFRAME' : ''].filter(Boolean).join('|');
    if (!seen.has(s)) { seen.add(s); samples.push({ ms: Math.round(performance.now() - t0), s }); }
    await sleep(50);
  }
  return { click: c.ok || c.error, draftHash, draftId, remove: c2.ok || c2.error, transitions: samples };
}
