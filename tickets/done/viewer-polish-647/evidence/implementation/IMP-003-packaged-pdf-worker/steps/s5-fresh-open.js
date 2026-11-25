const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
win.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0].slice(0, 140)); });
const closeAll = () => win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = Object.keys(pinia._s.get('workspace').workspaces).find(k => k.startsWith('agent_ws_2f3b'));
  pinia._s.get('fileExplorer').closeAllFiles(id);
});
const rounds = [];
for (let round = 0; round < 4; round++) {
  await closeAll(); await sleep(1500);
  const out = [];
  for (const name of ['alpha.pdf', 'beta.pdf', 'gamma.pdf']) {
    const before = errs.length;
    await win.locator(`text="${name}" >> visible=true`).first().click();
    await sleep(3000);
    out.push(`${name}:${await win.evaluate(() => [...document.querySelectorAll('canvas')].filter(c => c.width > 0).length)}${errs.slice(before).some(e => /PDF load error/.test(e)) ? ':LOAD-ERROR' : ''}`);
  }
  rounds.push(out.join(' '));
}
const rec = await win.evaluate(() => ({ workers: window.__ie647.workers.length, jsBlobs: window.__ie647.blobs.filter(b => /javascript/.test(b.type)).length, workerErrors: window.__ie647.workerErrors }));
return { rounds, rec, distinctErrors: [...new Set(errs)].slice(0, 5) };
