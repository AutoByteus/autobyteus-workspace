async () => {
  await new Promise((r) => setTimeout(r, 400));
  const app = document.querySelector('#__nuxt')?.__vue_app__;
  const pinia = app?.config?.globalProperties?.$pinia;
  const st = (id) => pinia?._s?.get(id);
  const sel = st('agentSelection');
  const ctx = st('agentContexts');
  const teams = st('agentTeamContexts');
  const agentRows = [...document.querySelectorAll('[data-test="workspace-agent-run-row"]')].map((e) => ({ id: e.getAttribute('data-run-id'), text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.className.includes('bg-indigo-50') }));
  const teamRows = [...document.querySelectorAll('[data-test^="workspace-team-row-"]')].map((e) => ({ id: e.getAttribute('data-test').replace('workspace-team-row-', ''), selected: /bg-indigo-50|bg-blue-50/.test(e.className) }));
  const orgRows = [...document.querySelectorAll('[data-test^="agent-org-run-open-"]')].map((e) => e.getAttribute('data-test').replace('agent-org-run-open-', ''));
  const toasts = [...document.querySelectorAll('[role=status], [role=alert], [class*=toast]')].map((e) => e.innerText.trim()).filter(Boolean);
  return {
    hash: location.hash,
    emptyState: !!document.querySelector('[data-test="workspace-empty-state"]'),
    emptyText: document.querySelector('[data-test="workspace-empty-state"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    chatMissing: !!document.querySelector('[data-test="chat-missing"]'),
    chatOpening: !!document.querySelector('[data-test="chat-opening"]'),
    chatRunFrame: !!document.querySelector('[data-test="chat-run-frame"]'),
    selection: sel ? { type: sel.selectedType, id: sel.selectedRunId } : 'no-pinia',
    agentContexts: ctx ? [...ctx.runs.keys()] : 'no-pinia',
    teamContexts: teams ? [...(teams.teams?.keys?.() ?? [])] : 'no-pinia',
    agentRows, teamRows, orgRows, toasts,
    localBadges: [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^local$/i.test(e.innerText?.trim() ?? '')).length,
  };
}
