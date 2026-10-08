async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (!document.querySelector('[data-test="app-left-panel-run-history"]') && document.querySelector('[data-test="workspace-empty-state-runs"]')) { document.querySelector('[data-test="workspace-empty-state-runs"]').click(); await sleep(800); }
  for (const name of ['Keeper Agent', 'Live Agent', 'Open Agent', 'Other Team', 'Bridge Team', 'Delivery Org', 'Live Org']) {
    const header = [...document.querySelectorAll('[data-test="workspace-agent-row"], [data-test^="workspace-team-definition-row-"], [data-test^="agent-org-definition-"]')].find((e) => e.innerText.replace(/\s+/g, ' ').includes(name));
    if (header) { header.dispatchEvent(new MouseEvent('click', { bubbles: true })); await sleep(400); }
  }
  await sleep(800);
  const text = document.body.innerText;
  return {
    hash: location.hash,
    emptyState: !!document.querySelector('[data-test="workspace-empty-state"]'),
    chatMissing: !!document.querySelector('[data-test="chat-missing"]'),
    groupHeaders: [...document.querySelectorAll('[data-test="workspace-agent-row"], [data-test^="workspace-team-definition-row-"], [data-test^="agent-org-definition-"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
    agentRowIds: [...document.querySelectorAll('[data-test="workspace-agent-run-row"]')].map((e) => e.getAttribute('data-run-id')),
    teamRowIds: [...document.querySelectorAll('[data-test^="workspace-team-row-"]')].map((e) => e.getAttribute('data-test').replace('workspace-team-row-', '')),
    orgRowIds: [...document.querySelectorAll('[data-test^="agent-org-run-open-"]')].map((e) => e.getAttribute('data-test').replace('agent-org-run-open-', '')),
    mentionsArchived: ['open_agent', 'bridge_team', 'delivery_org'].filter((p) => document.body.innerHTML.includes(p)),
    hasOpenAgentText: text.includes('Open Agent'), hasBridgeTeamText: text.includes('Bridge Team'), hasDeliveryOrgText: text.includes('Delivery Org'),
  };
}
