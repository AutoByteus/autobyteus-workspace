async (arg) => { try {
  const row = document.querySelector(`[data-test="workspace-team-row-${arg.teamRunId}"]`);
  if (!row) return { error: 'team row missing' };
  let m = document.querySelector(`[data-test^="workspace-team-member-${arg.teamRunId}"]`);
  if (!m) {
    const disc = row.querySelector('[data-test="workspace-team-run-disclosure"]') ?? row.parentElement.querySelector('[data-test="workspace-team-run-disclosure"]');
    if (disc) { disc.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 800)); }
    m = document.querySelector(`[data-test^="workspace-team-member-${arg.teamRunId}"]`);
  }
  if (!m) return { member: null, members: [...document.querySelectorAll('[data-test^="workspace-team-member-"]')].map((e) => e.getAttribute('data-test')) };
  document.querySelectorAll('[data-aord-member]').forEach((e) => e.removeAttribute('data-aord-member'));
  m.setAttribute('data-aord-member', '1');
  const c = await __abDemo.click({ selector: '[data-aord-member="1"]' });
  await new Promise((r) => setTimeout(r, 2500));
  return { member: m.getAttribute('data-test'), click: c.ok || c.error, hash: location.hash };
} catch (e) { return { thrown: String(e), stack: e.stack?.slice(0, 300) }; } }
