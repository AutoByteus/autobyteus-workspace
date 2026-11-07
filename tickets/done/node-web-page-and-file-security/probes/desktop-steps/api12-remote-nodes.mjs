// API-12 (AC-011): the packaged desktop app adds a test-owned Docker node at http://localhost:<published port> and a
// node on this machine by its .local name (http://normys-macbook-pro.local:<port>) on the Nodes page, opens each node's
// window, and that window works against its node: the app loads there, its GraphQL and WebSocket calls answer, and it
// lists the agent seeded on that node. The nodes log no refusal.
// args: <label>=<node URL>=<seeded agent name> … (one per node)
export default async ({ args, browser, main, allPages, shot, assert, waitFor, sleep }) => {
  const nodes = args.map(a => { const [label, url, agentName] = a.split('='); return { label, url, agentName }; });
  const base = main.url().split('#')[0];
  const results = {};
  for (const n of nodes) {
    await main.goto(`${base}#/nodes`); await sleep(1500);
    const row = main.locator('[data-testid^="node-row-"]').filter({ hasText: `api416-${n.label}` }).first();
    let collaboration = null;
    if (!(await row.count())) {
      const addPanel = main.locator('[data-testid="add-node-panel"]');
      if (!(await addPanel.count())) await main.locator('button').filter({ hasText: /^\s*Add node\s*$/ }).first().click();
      await main.locator('[data-testid="add-node-address"]').fill(n.url);
      await main.locator('[data-testid="add-node-name"]').fill(`api416-${n.label}`);
      await main.locator('[data-testid="add-node-submit"]').click();
      await row.waitFor({ timeout: 30_000 });
    }
    {
      // The add form's collaboration switch is on by default: the app asks to turn collaboration on, on both nodes.
      const overlay = main.locator('[data-testid="node-change-overlay"]');
      await overlay.waitFor({ timeout: 10_000 }).catch(() => undefined);
      if (await overlay.count()) {
        const question = (await overlay.innerText()).replace(/\s+/g, ' ').trim();
        await main.locator('[data-testid="node-change-confirm"]').click();
        await waitFor('the change to finish', async () => (await main.locator('[data-testid="node-change-close"]').count()) > 0 || (await overlay.count()) === 0, 60_000);
        const outcome = (await overlay.count()) ? (await overlay.innerText()).replace(/\s+/g, ' ').trim() : 'closed by itself';
        await shot(main, `API-12-collaboration-${n.label}`);
        if (await main.locator('[data-testid="node-change-close"]').count()) await main.locator('[data-testid="node-change-close"]').click();
        await overlay.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
        collaboration = { question: question.slice(0, 400), outcome: outcome.slice(0, 600), partial: outcome.includes('partial') || (await main.locator('[data-testid="node-change-partial"]').count()) > 0 };
      }
    }
    await sleep(3000);
    const rowText = (await row.innerText()).replace(/\s+/g, ' ').trim();
    await shot(main, `API-12-nodes-page-${n.label}`);
    const pagesBefore = new Set(allPages());
    await row.locator('[data-testid^="node-open-"]').first().click();
    const win = await waitFor('the node window', async () => allPages().find(p => !pagesBefore.has(p) && p.url().includes('/renderer/index.html')), 30_000);
    await win.locator('[data-test="run-target-switcher-trigger"]').waitFor({ timeout: 60_000 });
    const inWindow = await win.evaluate(async (nodeUrl) => {
      const r = await fetch(`${nodeUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ agentDefinitions { name } }' }) });
      const names = ((await r.json()).data?.agentDefinitions ?? []).map(a => a.name);
      const ws = await new Promise(resolve => { const s = new WebSocket(`${nodeUrl.replace('http', 'ws')}/ws/agent-package-definitions`); s.onopen = () => { s.close(); resolve('opened'); }; s.onerror = () => resolve('error'); setTimeout(() => resolve('timeout'), 8000); });
      return { status: r.status, names, ws, href: location.href };
    }, n.url);
    await win.locator('[data-test="run-target-switcher-trigger"]').click();
    const listed = await waitFor('the seeded agent in the window', async () => (await win.locator('body').innerText()).includes(n.agentName), 15_000).then(() => true, () => false);
    await shot(win, `API-12-node-window-${n.label}`);
    await win.keyboard.press('Escape').catch(() => undefined);
    results[n.label] = { url: n.url, rowText, collaboration, inWindow, seededAgentListed: listed };
    assert(inWindow.status === 200 && inWindow.names.includes(n.agentName) && inWindow.ws === 'opened' && listed, `the ${n.label} window works`, results[n.label]);
    await win.close().catch(() => undefined);
  }
  return results;
};
