// autobyteus-647 SR-003 in the packaged window (file://): the viewer's media probe (`Range: bytes=0-0`, no-store; on the
// desktop the request carries no credential header) against the node for a zero-byte file, cross-origin: what the page
// can read (status, ok, headers) and what the wire carried. Then the empty video opened from the Files tree.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const backend = process.env.BACKEND_URL;
const wire = [];
win.on('response', r => { if (r.url().includes('empty.mp4')) wire.push({ status: r.status(), contentRange: r.headers()['content-range'] ?? null, range: r.request().headers().range ?? null }); });
const page = await win.evaluate(async (backend) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const ws = pinia._s.get('workspace');
  const id = Object.keys(ws.workspaces).find(k => k.startsWith('agent_ws_') && JSON.stringify(ws.workspaces[k]).includes('emptyws'));
  const url = `${backend}/rest/workspaces/${id}/content?path=empty.mp4`;
  const probe = async (init) => { const r = await fetch(url, init); const out = { status: r.status, ok: r.ok, contentRange: r.headers.get('content-range'), readableHeaders: [...r.headers.keys()] }; await r.body?.cancel().catch(() => undefined); return out; };
  return {
    pageOrigin: location.origin,
    workspaceFound: Boolean(id),
    mediaProbe: await probe({ headers: { Range: 'bytes=0-0' }, cache: 'no-store' }),
    // What D-2 decides on in the viewer: streams (a video) && status === 416.
  };
}, backend);
page.d2EmptyMedia = page.mediaProbe.status === 416;
page.oldHeaderCheck = /^bytes \*\/0$/.test((page.mediaProbe.contentRange ?? '').trim());
const files = win.locator('[data-test="right-side-tab-list"] button', { hasText: 'Files' }).first();
if (await files.count()) await files.click();
await sleep(1500);
await win.locator('text="empty.mp4" >> visible=true').first().click();
const end = Date.now() + 20000; let shown = '';
while (Date.now() < end) { shown = await win.evaluate(() => document.body.innerText); if (/could not be played|Failed to fetch/i.test(shown)) break; await sleep(250); }
await sleep(800);
const viewer = await win.evaluate(() => ({ alerts: [...document.querySelectorAll('[role="alert"]')].map(a => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean), couldNotPlay: /This video could not be played/.test(document.body.innerText), retry: [...document.querySelectorAll('button')].some(b => /^\s*Retry\s*$/.test(b.textContent)), fetchError: /Failed to fetch/.test(document.body.innerText) }));
await win.screenshot({ path: '<tmp>/cdp/s9-empty-video.png' });
return { ...page, wire, filesViewer: viewer };
