// D2b: in the Docker node's window, click the run's row; report what the window shows (links, hash, conversation).
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
await win.evaluate(() => {
  if (window.__abtest471) return;
  const created = [], revoked = [];
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); created.push(u); return u; };
  URL.revokeObjectURL = (u) => { revoked.push(u); return r(u); };
  window.__abtest471 = { created, revoked };
});
await win.locator(`[data-test="workspace-agent-run-row"][data-run-id="${state.run}"]`).click();
await win.waitForTimeout(6000);
const facts = await win.evaluate(() => ({ hash: location.hash.slice(0, 200),
  links: [...document.querySelectorAll('[data-event-monitor-file-action-control="true"]')].map(e => e.getAttribute('title')),
  text: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 700) ?? null }));
await win.screenshot({ path: '/tmp/abtest471/d2b.png' });
return facts;
