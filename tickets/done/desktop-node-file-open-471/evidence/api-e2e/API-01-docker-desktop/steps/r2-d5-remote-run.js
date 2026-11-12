// Round 2, D5–D6 recheck (F-1, F-2): in the Docker node's window, open the run A delegated to host-b-471 and click (1) the
// path attachment, (2) after a window reload, the link its own message names. Each from an empty status line. Expected:
// "This file is on host-b-471, where this run runs."; no Files drawer; no request to the node-file or workspace routes; no
// file added to the Files panel.
const NOTICE = 'This file is on host-b-471, where this run runs.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const requests = [];
const watch = w => w.on('request', q => { const u = new URL(q.url()); if (/\/rest\/(node-files|workspaces\/)/.test(u.pathname)) requests.push({ host: u.host, route: u.pathname.replace(/[0-9a-f_]{20,}/g, '…') }); });
watch(win);
const openRemote = async () => {
  await win.keyboard.press('Escape'); await sleep(300);
  await win.locator('[data-test="run-list-row"]').first().waitFor({ timeout: 60000 });
  // After a reload the window's run deep link may not resume; open A's run from the list first, as a user would.
  await win.locator(`[data-test="workspace-agent-run-row"][data-run-id="${state.run}"]`).click(); await sleep(3000);
  await win.locator('[data-test="workspace-team-transient-execution-row"]').filter({ hasText: 'host-b-471' }).first().click();
  for (let i = 0; i < 120 && !((await win.locator('main').innerText().catch(() => '')).includes('REMOTE-PATH-471')); i++) await sleep(250);
};
const status = async () => (await win.locator('[data-testid="event-monitor-file-preview-status"]').innerText({ timeout: 300 }).catch(() => '')).trim();
const openFiles = () => win.evaluate(() => {
  const fe = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('fileExplorer');
  return [...fe.fileExplorerStateByWorkspace.values()].flatMap(s => s.openFiles.map(f => f.path.split('/').pop()));
});
const click = async (label, target) => {
  const statusBefore = await status(); const from = requests.length; const filesBefore = await openFiles();
  await target.scrollIntoViewIfNeeded(); await target.click();
  let st = ''; const end = Date.now() + 8000; while (Date.now() < end && !(st = await status())) await sleep(200);
  await sleep(1500);
  await win.screenshot({ path: `/tmp/abtest471/r2-d5-${label}.png` });
  return { label, statusBefore, status: await status(), drawer: await win.locator('[data-test="workspace-right-tool-drawer"]').count(), requests: requests.slice(from), filesBefore, filesAfter: await openFiles() };
};
await win.reload(); await win.waitForLoadState('domcontentloaded'); await sleep(3000);
await openRemote();
const attachment = await click('attachment', win.locator('button.message-attachment-chip').filter({ hasText: 'b-notes-471.txt' }).last());
await win.reload(); await win.waitForLoadState('domcontentloaded'); await sleep(3000);
await openRemote();
const link = await click('link', win.locator(`[data-event-monitor-file-action-control="true"][title="${state.bNotes}"]`).last());
const body = await win.locator('body').innerText();
const passes = r => r.statusBefore === '' && r.status === NOTICE && r.drawer === 0 && r.requests.length === 0 && JSON.stringify(r.filesBefore) === JSON.stringify(r.filesAfter);
return { attachment, link, pass: { attachment: passes(attachment), link: passes(link) }, oldText: body.includes("open the run in that node's window"), hostWorkspaceText: body.includes('host workspace') };
