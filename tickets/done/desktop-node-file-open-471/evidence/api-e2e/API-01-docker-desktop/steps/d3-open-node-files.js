// D3 (AC-001, AC-002, RU-01, RU-02, RU-04): in the Docker node's window, with the run open, click each path the agent named.
// Facts per click: the Files panel's text, alert, blob image/audio/PDF, edit controls, typing, the status line, and the
// window's requests to the node-file route and the workspace content route. Then every node file's object URL is checked
// against the window's URL.createObjectURL / revokeObjectURL record (wrapped in D2b) while tabs close and files reopen.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const requests = [];
win.on('response', r => { const u = new URL(r.url()); if (/\/rest\/(node-files\/content|workspaces\/)/.test(u.pathname)) requests.push({ route: u.pathname.includes('node-files') ? 'node-file' : 'workspace', path: u.searchParams.get('path') ?? decodeURIComponent(u.pathname.split('/').slice(-1)[0]), status: r.status() }); });
const consoleErrors = [];
win.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 220)); });
const viewer = win.locator('#contentViewer:visible').first();
const link = p => win.locator(`[data-event-monitor-file-action-control="true"][title="${p}"]`).last();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = () => win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = pinia._s.get('activeContext')?.activeWorkspaceTarget?.context.config.workspaceId;
  const fe = pinia._s.get('fileExplorer');
  const files = id ? fe.getOpenFiles(id) : [];
  const ws = id ? fe._getWorkspaceState(id) : null;
  const open = (ws?.openFiles ?? []).map(f => ({ path: f.path, type: f.type, url: f.url, error: f.error, readOnly: f.accessIntent?.readOnly ?? null, isLoading: f.isLoading }));
  return { workspaceId: id, files, open, active: ws?.activeFile ?? null, urls: { ...window.__abtest471, created: [...window.__abtest471.created], revoked: [...window.__abtest471.revoked] } };
});
const facts = async () => ({
  text: (await viewer.innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').slice(0, 200),
  alert: (await viewer.locator('[role="alert"]').innerText({ timeout: 300 }).catch(() => '')).replace(/\s+/g, ' ').trim(),
  image: await viewer.locator('img[src^="blob:"]').evaluateAll(es => es.map(e => ({ w: e.naturalWidth, h: e.naturalHeight }))).catch(() => []),
  audio: await viewer.locator('audio').evaluateAll(es => es.map(e => ({ blob: e.src.startsWith('blob:'), duration: Math.round(e.duration * 10) / 10, readyState: e.readyState }))).catch(() => []),
  pdf: await viewer.evaluate(el => ({ canvases: [...el.querySelectorAll('canvas')].filter(c => c.width > 0 && c.height > 0).length, frames: [...el.querySelectorAll('iframe,embed,object')].map(f => (f.src || f.data || '').slice(0, 5)) })).catch(() => null),
  editControls: await viewer.getByRole('button', { name: /^(Edit|Save)$/ }).count() + await win.locator('[title="Edit Mode"]:visible').count(),
  status: (await win.locator('[data-testid="event-monitor-file-preview-status"]').innerText({ timeout: 300 }).catch(() => '')).trim(),
});
const until = async (test, ms = 20000) => { const end = Date.now() + ms; let f; while (Date.now() < end) { f = await facts(); if (test(f)) return { ...f, settled: true }; await sleep(250); } return { ...f, settled: false }; };
const open = async (name, p, test) => {
  const from = requests.length;
  await link(p).scrollIntoViewIfNeeded(); const t0 = Date.now(); await link(p).click();
  const f = await until(test); f.ms = Date.now() - t0; f.requests = requests.slice(from).map(r => `${r.route} ${r.status}`);
  await win.screenshot({ path: `/tmp/abtest471/d3-${name}.png` });
  // The Files panel opens as a drawer over the conversation in this window size: close it as the user does (Escape).
  await win.keyboard.press('Escape'); await win.locator('[data-test="workspace-right-tool-drawer"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => undefined);
  return f;
};
const drawerOpen = async () => (await win.locator('[data-test="workspace-right-tool-drawer"]').count()) > 0;
await win.keyboard.press('Escape'); await sleep(500);
const F = state.files;
const r = {};
const fsMod = await import('node:fs');
const partial = (k, v) => { r[k] = v; fsMod.writeFileSync('/tmp/abtest471/d3-partial.json', JSON.stringify(r, null, 1)); return v; };
r.notes = await open('notes', F.notes, f => f.text.includes('NOTES-MARKER-471'));
// Read-only: type into the shown Markdown; nothing may change.
const body = viewer.locator('.monaco-editor, .markdown-body, [data-testid="markdown-preview"]').first();
await link(F.notes).click(); await viewer.waitFor({ timeout: 10000 });
if (await body.count()) { await body.click({ position: { x: 40, y: 20 } }).catch(() => undefined); await win.keyboard.type('TYPED-471', { delay: 10 }).catch(() => undefined); await sleep(400); }
r.notes.typedChanges = (await viewer.innerText().catch(() => '')).includes('TYPED-471');
await win.keyboard.press('Escape'); await sleep(500); if (await drawerOpen()) { await win.keyboard.press('Escape'); await sleep(500); }
partial('picture', await open('picture', F.picture, f => f.image.some(i => i.w === 120)));
partial('plan', await open('plan', F.plan, f => (f.pdf?.canvases ?? 0) > 0 || (f.pdf?.frames ?? []).includes('blob:')));
partial('tone', await open('tone', F.tone, f => f.audio.some(a => a.blob && a.readyState >= 1)));
partial('inside', await open('inside', F.inside, f => f.text.includes('INSIDE-MARKER-471')));
partial('missing', await open('missing', F.missing, f => !!f.alert));
partial('folder', await open('folder', F.folder, f => !!f.alert));
partial('device', await open('device', F.device, f => !!f.alert));
const afterOpen = await store();
// RU-02: close every tab (active tab's close control), then reopen the picture and the PDF, close them again.
const closeAll = async (reveal) => {
  // The drawer is revealed through a link of an open file (the panel has no other way in from the conversation).
  await link(reveal).click(); await viewer.waitFor({ timeout: 10000 }); await sleep(800);
  for (let i = 0; i < 20; i++) {
    const tab = win.locator('[data-event-monitor-active-file-tab="true"]').first();
    if (!(await tab.count())) { const any = win.locator('button:has(> span.truncate)').filter({ hasText: /471/ }).first(); if (!(await any.count())) break; await any.click(); await sleep(200); continue; }
    await tab.hover(); await tab.locator('[aria-label="Close file"]').click(); await sleep(300);
  }
  await win.keyboard.press('Escape'); await win.locator('[data-test="workspace-right-tool-drawer"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => undefined);
};
await closeAll(F.device);
const afterClose = await store();
const reopened = { picture: await open('picture-again', F.picture, f => f.image.some(i => i.w === 120)), plan: await open('plan-again', F.plan, f => (f.pdf?.canvases ?? 0) > 0 || (f.pdf?.frames ?? []).includes('blob:')) };
const afterReopen = await store();
await closeAll(F.plan);
const afterSecondClose = await store();
const nodeFileUrls = s => s.open.filter(f => f.url && f.url.startsWith('blob:')).map(f => f.url);
const storeUrls = [...new Set([...nodeFileUrls(afterOpen), ...nodeFileUrls(afterReopen)])];
const lifecycle = {
  nodeFileTabsOpen: afterOpen.open.map(f => ({ file: f.path.split('/').pop(), type: f.type, blob: !!f.url, readOnly: f.readOnly, error: f.error })),
  storeObjectUrls: storeUrls.length, revokedOfThem: storeUrls.filter(u => afterSecondClose.urls.revoked.includes(u)).length,
  openAfterClose: afterClose.open.length, openAfterSecondClose: afterSecondClose.open.length,
  createdTotal: afterSecondClose.urls.created.length, revokedTotal: afterSecondClose.urls.revoked.length,
  createdNotRevoked: afterSecondClose.urls.created.filter(u => !afterSecondClose.urls.revoked.includes(u)).length,
};
const bodyText = await win.locator('body').innerText();
return { results: r, reopened, lifecycle, requests, hostWorkspaceText: bodyText.includes('host workspace'), consoleErrors };
