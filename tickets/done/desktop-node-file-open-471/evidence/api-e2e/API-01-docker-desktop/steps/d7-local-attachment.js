// D7: in the Docker node's window, A's own run: click the path attachment notes-471.md (outside the run's folder, on A).
// Facts: the Files panel's content, read-only intent, edit controls, typing, the request made.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const responses = [];
win.on('response', r => { const u = new URL(r.url()); if (/\/rest\/(node-files|workspaces\/)/.test(u.pathname)) responses.push({ route: u.pathname.replace(/[0-9a-f_]{20,}/g, '…'), status: r.status() }); });
await win.keyboard.press('Escape'); await sleep(300);
await win.locator(`[data-test="workspace-agent-run-row"][data-run-id="${state.run}"]`).click();
await sleep(4000);
const chip = win.locator('button.message-attachment-chip').filter({ hasText: 'notes-471.md' }).last();
await chip.waitFor({ timeout: 30000 }); await chip.scrollIntoViewIfNeeded(); await chip.click();
await sleep(3000);
const viewer = win.locator('#contentViewer:visible').first();
const drawer = await win.locator('[data-test="workspace-right-tool-drawer"]').count();
const fileState = await win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = pinia._s.get('activeContext').activeWorkspaceTarget.context.config.workspaceId;
  const d = pinia._s.get('fileExplorer').getActiveFileData(id);
  return d ? { file: d.path.split('/').pop(), type: d.type, mode: d.mode, accessIntent: d.accessIntent ?? null, error: d.error, hasContent: !!d.content } : null;
});
const facts = {
  drawer, fileState, responses,
  text: (await viewer.innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').slice(0, 160),
  editControls: await win.locator('#contentViewer:visible').getByRole('button', { name: /^(Edit|Save)$/ }).count() + await win.locator('[title="Edit Mode"]:visible').count(),
  editButtons: await win.locator('button:visible').filter({ hasText: /^(Edit|Save|Preview)$/ }).allInnerTexts(),
};
await win.screenshot({ path: '/tmp/abtest471/d7-local-attachment.png' });
return facts;
