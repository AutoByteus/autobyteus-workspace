// IMP-003 after SR-002: the fresh-open sequence (all files closed, then alpha, beta, gamma one after another) for several
// rounds, then switching between open tabs; one worker and at most one text/javascript blob for the whole session.
const sleep = ms => new Promise(r => setTimeout(r, ms));
await win.evaluate(() => {
  if (window.__ie647) return;
  const rec = { blobs: [], workers: [], workerErrors: 0 };
  const c = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); rec.blobs.push({ type: o?.type ?? typeof o, size: o?.size ?? null }); return u; };
  const W = window.Worker;
  window.Worker = function (url, opts) { const w = new W(url, opts); rec.workers.push({ scheme: String(url).split(':')[0], type: opts?.type ?? 'classic' }); w.addEventListener('error', () => rec.workerErrors++); return w; };
  window.Worker.prototype = W.prototype;
  window.__ie647 = rec;
});
const errs = [];
win.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0].slice(0, 160)); });
win.on('pageerror', e => errs.push(`pageerror: ${String(e.message).slice(0, 160)}`));
const files = await win.locator('[data-test="right-side-tab-list"] button', { hasText: 'Files' }).first();
if (await files.count()) await files.click();
await sleep(1500);
const closeAll = () => win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = Object.keys(pinia._s.get('workspace').workspaces).find(k => pinia._s.get('workspace').workspaces[k]?.absolutePath?.includes?.('pdfws') || k.startsWith('agent_ws_'));
  pinia._s.get('fileExplorer').closeAllFiles(id);
});
const open = async (name) => {
  const before = errs.length;
  await win.locator(`text="${name}" >> visible=true`).first().click();
  const end = Date.now() + 15000; let painted = 0;
  while (Date.now() < end) { painted = await win.evaluate(() => [...document.querySelectorAll('canvas')].filter(c => c.width > 0).length); if (painted > 0) break; await sleep(250); }
  await sleep(1500);
  painted = await win.evaluate(() => [...document.querySelectorAll('canvas')].filter(c => c.width > 0).length);
  return `${name}:${painted}${errs.slice(before).some(e => /PDF load error|PDFWorker/.test(e)) ? ':LOAD-ERROR' : ''}`;
};
const rounds = [];
for (let round = 0; round < 5; round++) {
  await closeAll(); await sleep(1500);
  const out = [];
  for (const name of ['alpha.pdf', 'beta.pdf', 'gamma.pdf']) out.push(await open(name));
  rounds.push(out.join(' '));
  if (round === 0) await win.screenshot({ path: '<tmp>/cdp/s8-gamma.png' });
}
const switches = [];
for (const name of ['alpha.pdf', 'beta.pdf', 'alpha.pdf', 'gamma.pdf', 'beta.pdf']) switches.push(await open(name));
const rec = await win.evaluate(() => ({ workers: window.__ie647.workers, jsBlobs: window.__ie647.blobs.filter(b => /javascript/.test(b.type)).length, allBlobs: window.__ie647.blobs.map(b => b.type), workerErrors: window.__ie647.workerErrors, globalWorkerOptions: { workerPort: !!globalThis.pdfjsLib?.GlobalWorkerOptions?.workerPort, workerSrc: globalThis.pdfjsLib?.GlobalWorkerOptions?.workerSrc ?? null } }));
return { url: win.url().replace(/^file:\/\/.*\/AutoByteus\.app/, 'file://…/AutoByteus.app'), rounds, switches, ...rec, distinctErrors: [...new Set(errs)].slice(0, 8) };
