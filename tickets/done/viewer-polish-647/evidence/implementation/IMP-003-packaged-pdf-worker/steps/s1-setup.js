const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = await win.evaluate(async () => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const ws = pinia._s.get('workspace');
  const workspaceId = await ws.createWorkspace({ root_path: '<tmp>/pdfws' });
  pinia._s.get('chatDraft').setWorkspace({ kind: 'existing', workspaceId });
  return workspaceId;
});
await sleep(1000);
const toggle = win.locator('[data-test="right-side-panel-toggle"]');
const tabs = await win.locator('[data-test="right-side-tab-list"]').count();
if (!tabs && await toggle.count()) await toggle.first().click();
await sleep(1000);
await win.screenshot({ path: '<tmp>/cdp/s1.png' });
return { id, tabs, files: await win.locator('[data-test="right-side-files-panel"]').count() };
