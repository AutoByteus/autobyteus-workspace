(async () => {
  // Navigates this window to Nodes for the first time and samples the card every 50 ms for 10 s, recording each
  // change of the failure line, the server version and the notice (AR-001 first-view order, no reload).
  const E = 'remote-9b9dfdc6-6852-4629-83a4-18b038c084fb';
  const N = 'srv_MNIZuC4HXb_2IVm37Uhuo80fFeg7NWKZ';
  const text = (id) => document.querySelector(`[data-testid="${id}"]`)?.innerText.trim() ?? null;
  const startRoute = location.hash;
  const navigationEntries = performance.getEntriesByType('navigation').length;
  const t0 = performance.now();
  // Every insertion/removal of the failure line, however brief (a MutationObserver sees DOM changes a 50 ms sampler can miss).
  const lineEvents = [];
  const selector = `[data-testid="node-auto-update-failed-${E}"]`;
  const scan = (nodes, kind) => nodes.forEach((n) => { if (n.nodeType === 1 && (n.matches?.(selector) || n.querySelector?.(selector))) lineEvents.push({ kind, ms: Math.round(performance.now() - t0), at: new Date().toISOString(), text: (n.matches?.(selector) ? n : n.querySelector(selector)).innerText?.trim() ?? null }); });
  const observer = new MutationObserver((records) => records.forEach((r) => { scan([...r.addedNodes], 'added'); scan([...r.removedNodes], 'removed'); }));
  observer.observe(document.body, { childList: true, subtree: true });
  location.hash = '#/nodes';
  const changes = [];
  let last = '';
  while (performance.now() - t0 < 10000) {
    const sample = {
      version: text(`node-server-version-${N}`),
      failed: text(`node-auto-update-failed-${E}`) ? 'shown' : null,
      updated: text(`node-auto-update-updated-${E}`),
      notice: text(`node-server-notice-${N}`),
    };
    const key = JSON.stringify(sample);
    if (key !== last) { changes.push({ ms: Math.round(performance.now() - t0), at: new Date().toISOString(), ...sample }); last = key; }
    await new Promise((r) => setTimeout(r, 50));
  }
  observer.disconnect();
  return { lineEvents, startRoute, endRoute: location.hash, sameDocument: performance.getEntriesByType('navigation').length === navigationEntries, timeOrigin: new Date(performance.timeOrigin).toISOString(), changes };
})()
