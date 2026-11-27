const sleep = ms => new Promise(r => setTimeout(r, ms));
await win.evaluate(() => {
  if (window.__ie647) return;
  const rec = { blobs: [], workers: [], posts: 0, workerErrors: 0 };
  const c = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); rec.blobs.push({ type: o?.type ?? typeof o, size: o?.size ?? null }); return u; };
  const W = window.Worker;
  window.Worker = function (url, opts) { const w = new W(url, opts); rec.workers.push({ scheme: String(url).split(':')[0], type: opts?.type ?? 'classic' }); const p = w.postMessage.bind(w); w.postMessage = (...a) => { rec.posts++; return p(...a); }; w.addEventListener('error', () => rec.workerErrors++); return w; };
  window.Worker.prototype = W.prototype;
  window.__ie647 = rec;
});
const errors = [];
win.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
win.on('console', m => { if (m.type() === 'error' || /pdf|worker/i.test(m.text())) errors.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
await win.locator('[data-test="right-side-tab-list"] button', { hasText: 'Files' }).first().click();
await sleep(1500);
const results = [];
for (const name of ['alpha.pdf', 'beta.pdf', 'gamma.pdf']) {
  await win.locator(`text="${name}" >> visible=true`).first().click();
  const end = Date.now() + 20000; let canvases = 0;
  while (Date.now() < end) { canvases = await win.locator('.vue-pdf-embed canvas, canvas').count(); if (canvases > 0) break; await sleep(250); }
  await sleep(1500);
  const state = await win.evaluate(() => ({ ...window.__ie647, canvases: document.querySelectorAll('canvas').length, painted: [...document.querySelectorAll('canvas')].filter(c => c.width > 0 && c.height > 0).length, text: [...document.querySelectorAll('.textLayer, .vue-pdf-embed')].map(e => (e.textContent || '').trim().slice(0, 40)).filter(Boolean).slice(0, 2), error: document.querySelector('[data-test*="error"], .text-red-500, .text-red-600')?.textContent?.trim()?.slice(0, 120) ?? null }));
  await win.screenshot({ path: `<tmp>/cdp/s3-${name}.png` });
  results.push({ name, ...state, blobs: state.blobs.length, blobTypes: state.blobs.map(b => b.type), workers: state.workers });
}
return { results, errors: errors.slice(0, 20) };
