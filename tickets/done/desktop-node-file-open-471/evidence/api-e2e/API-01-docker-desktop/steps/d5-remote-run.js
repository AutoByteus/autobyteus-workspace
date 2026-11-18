// D5 (API-02, AC-003 desktop): in the Docker node's window, open the run A delegated to host-b-471 (shown under A's run) and
// click the path its own message names, and the path attached to a message. Expected: the status line says
// "This file is on host-b-471, where this run runs."; no Files panel opens; no node-file request; no "host workspace" text.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const requests = [];
win.on('request', q => { const u = new URL(q.url()); if (/\/rest\/(node-files|workspaces\/)/.test(u.pathname)) requests.push(u.pathname); });
await win.keyboard.press('Escape'); await sleep(500);
const row = win.locator('[data-test="workspace-team-transient-execution-row"]').filter({ hasText: 'host-b-471' }).first();
await row.click();
await sleep(5000);
const conversation = async () => (await win.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ');
const shown = { hash: await win.evaluate(() => location.hash.slice(0, 200)), hasMarker: (await conversation()).includes('REMOTE-PATH-471') };
const status = () => win.locator('[data-testid="event-monitor-file-preview-status"]').innerText({ timeout: 300 }).catch(() => '');
const toast = () => win.locator('[data-testid="toast-container"]').innerText({ timeout: 300 }).catch(() => '');
const drawer = () => win.locator('[data-test="workspace-right-tool-drawer"]').count();
const click = async (label, target) => {
  const before = requests.length;
  if (!(await target.count())) return { label, found: false };
  await target.scrollIntoViewIfNeeded(); await target.click();
  let s = '', t = ''; const end = Date.now() + 8000;
  while (Date.now() < end) { s = (await status()).trim(); t = (await toast()).trim(); if (s || t) break; await sleep(200); }
  await win.screenshot({ path: `/tmp/abtest471/d5-${label}.png` });
  return { label, found: true, status: s, toast: t.slice(0, 200), filesDrawer: await drawer(), requests: requests.slice(before) };
};
const linkResult = await click('link', win.locator(`[data-event-monitor-file-action-control="true"][title="${state.bNotes}"]`).last());
await sleep(1500);
const chip = win.locator('button.message-attachment-chip').filter({ hasText: 'b-notes-471.txt' }).last();
const chipResult = await click('attachment', chip);
const bodyText = await win.locator('body').innerText();
return { shown, link: linkResult, attachment: chipResult, hostWorkspaceText: bodyText.includes('host workspace'),
  links: await win.locator('[data-event-monitor-file-action-control="true"]').evaluateAll(es => es.map(e => e.getAttribute('title'))) };
