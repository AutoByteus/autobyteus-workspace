// D2: open the Docker node's own window from the Nodes page, show its runs, open the run on A. Counts object URLs from here on
// (URL.createObjectURL / revokeObjectURL wrapped in the window; RSK-002).
const main = pages.find(p => p.url().includes('renderer/index.html'));
const before = new Set(browser.contexts().flatMap(c => c.pages()));
await main.locator('[data-testid^="node-open-"]').first().click();
let win = null;
for (let i = 0; i < 40 && !win; i++) {
  await new Promise(r => setTimeout(r, 500));
  win = browser.contexts().flatMap(c => c.pages()).find(p => !before.has(p) && p.url().includes('renderer/index.html')) ?? null;
}
if (!win) return { error: 'no new window', pages: browser.contexts().flatMap(c => c.pages()).map(p => p.url()) };
await win.waitForLoadState('domcontentloaded');
await win.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 120000 });
if ((await win.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') {
  await win.locator('[data-test="run-section-view-menu"]').click();
  await win.locator('[data-test="run-section-view-runs"]').click();
}
await win.locator('[data-test="run-list-row"]').first().waitFor({ timeout: 60000 });
const node = await win.evaluate(() => {
  const s = window.__NUXT__ ? null : null;
  const pinia = document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$pinia;
  const ctx = pinia?._s.get('windowNodeContext');
  return { isEmbeddedWindow: ctx?.isEmbeddedWindow ?? null, rest: ctx?.getBoundEndpoints?.().rest ?? null };
});
await win.evaluate(() => {
  if (window.__abtest471) return;
  const created = [], revoked = [];
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); created.push(u); return u; };
  URL.revokeObjectURL = (u) => { revoked.push(u); return r(u); };
  window.__abtest471 = { created, revoked };
});
const row = win.locator(`[data-test="run-list-row"][data-run-id="${state.run}"] [data-test="workspace-agent-run-row"]`).first();
const showOlder = win.locator('[data-test="run-list-show-older"]');
if (!(await row.count()) && await showOlder.count()) await showOlder.click();
await row.click({ timeout: 60000 });
const link = p => win.locator(`[data-event-monitor-file-action-control="true"][title="${p}"]`).last();
await link(state.files.notes).waitFor({ timeout: 60000 });
const links = {};
for (const [k, p] of Object.entries(state.files)) links[k] = await link(p).count();
await win.screenshot({ path: '/tmp/abtest471/d2-window-run.png' });
return { url: win.url().replace(/\?.*/, ''), node, links, title: await win.title() };
