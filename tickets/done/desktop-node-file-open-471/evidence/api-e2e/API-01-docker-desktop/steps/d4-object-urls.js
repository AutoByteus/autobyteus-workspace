// D4 (RU-02, RSK-002): which object URLs the window makes while node files open and close. The record is reset and now
// keeps each URL's object (type, size) and the caller's stack, so the store's URLs are told apart from other components'.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await win.evaluate(() => {
  const rec = { created: [], revoked: [] };
  const c = window.__abtest471orig?.c ?? URL.createObjectURL.bind(URL), r = window.__abtest471orig?.r ?? URL.revokeObjectURL.bind(URL);
  window.__abtest471orig = { c, r };
  URL.createObjectURL = (o) => { const u = c(o); rec.created.push({ u, type: o?.type ?? typeof o, size: o?.size ?? null, from: (new Error().stack ?? '').split('\n').slice(2, 5).map(l => l.trim().replace(/\(.*\/(_nuxt|renderer)\//, '(').slice(0, 90)) }); return u; };
  URL.revokeObjectURL = (u) => { rec.revoked.push(u); return r(u); };
  window.__abtest471 = rec;
});
const link = p => win.locator(`[data-event-monitor-file-action-control="true"][title="${p}"]`).last();
const viewer = win.locator('#contentViewer:visible').first();
const F = state.files;
const openThenEscape = async (p, ready) => {
  await link(p).click(); const end = Date.now() + 15000;
  while (Date.now() < end && !(await ready().catch(() => false))) await sleep(250);
  await win.keyboard.press('Escape'); await win.locator('[data-test="workspace-right-tool-drawer"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => undefined);
};
await openThenEscape(F.picture, async () => (await viewer.locator('img[src^="blob:"]').count()) > 0);
await openThenEscape(F.plan, async () => (await viewer.locator('canvas').count()) > 0);
await openThenEscape(F.tone, async () => (await viewer.locator('audio[src^="blob:"]').count()) > 0);
await sleep(1000);
const storeUrls = await win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = pinia._s.get('activeContext').activeWorkspaceTarget.context.config.workspaceId;
  return pinia._s.get('fileExplorer')._getWorkspaceState(id).openFiles.filter(f => f.url?.startsWith('blob:')).map(f => ({ file: f.path.split('/').pop(), url: f.url }));
});
// Close every tab.
await link(F.tone).click(); await viewer.waitFor({ timeout: 10000 }); await sleep(800);
for (let i = 0; i < 20; i++) {
  const tab = win.locator('[data-event-monitor-active-file-tab="true"]').first();
  if (!(await tab.count())) break;
  await tab.hover(); await tab.locator('[aria-label="Close file"]').click(); await sleep(300);
}
await win.keyboard.press('Escape'); await sleep(1500);
const rec = await win.evaluate(() => window.__abtest471);
const revoked = new Set(rec.revoked);
return {
  storeUrls: storeUrls.map(s => ({ file: s.file, revoked: revoked.has(s.url) })),
  created: rec.created.map(c => ({ type: c.type, size: c.size, revoked: revoked.has(c.u), store: storeUrls.some(s => s.url === c.u), from: c.from })),
};
