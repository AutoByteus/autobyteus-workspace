const sleep = ms => new Promise(r => setTimeout(r, ms));
await win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = Object.keys(pinia._s.get('workspace').workspaces).find(k => k.startsWith('agent_ws_2f3b'));
  pinia._s.get('fileExplorer').closeAllFiles(id);
});
await sleep(2000);
return await win.evaluate(async () => {
  const lib = globalThis.pdfjsLib;
  const port = lib.GlobalWorkerOptions.workerPort;
  const id = Object.keys(document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('workspace').workspaces).find(k => k.startsWith('agent_ws_2f3b'));
  const url = n => `${location.protocol === 'file:' ? 'http://127.0.0.1:50956' : ''}/rest/workspaces/${id}/content?path=${n}.pdf`;
  const pages = async (task) => (await task.promise).numPages;
  const run = async (extra) => {
    const out = [];
    for (const n of ['alpha', 'beta', 'gamma', 'alpha', 'beta']) {
      try { const t = lib.getDocument({ url: url(n), ...extra }); out.push(`${n}:${await pages(t)}`); t.destroy(); }   // destroy not awaited, as vue-pdf-embed does
      catch (e) { out.push(`${n}:ERR ${String(e.message).split('\n')[0]}`); }
    }
    return out;
  };
  const control = await run({});
  await new Promise(r => setTimeout(r, 1500));
  const shared = new lib.PDFWorker({ port });
  const fixed = await run({ worker: shared });
  await new Promise(r => setTimeout(r, 1500));
  // After every document is destroyed, the shared wrapper and its port still serve a new one.
  const after = { destroyed: shared.destroyed, port: shared.port === port };
  const t = lib.getDocument({ url: url('gamma'), worker: shared }); const again = await pages(t); await t.destroy();
  return { file: location.protocol, hasPDFWorker: typeof lib.PDFWorker, control, fixed, after, again, workers: window.__ie647.workers.length, jsBlobs: window.__ie647.blobs.filter(b => /javascript/.test(b.type)).length };
});
