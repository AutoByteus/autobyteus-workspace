// D6 (API-02): after D5's attachment click in the remote run, what the Docker node's window holds: the Files panel's open
// files and errors (all workspaces), the active run, and the response the node-file request got.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const responses = [];
win.on('response', r => { const u = new URL(r.url()); if (u.pathname.endsWith('/rest/node-files/content')) responses.push({ host: u.host, file: (u.searchParams.get('path') ?? '').split('/').pop(), status: r.status() }); });
const panel = () => win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const fe = pinia._s.get('fileExplorer');
  const out = [];
  for (const [ws, st] of fe.fileExplorerStateByWorkspace) out.push({ ws: ws.slice(0, 18), active: st.activeFile?.split('/').pop() ?? null, open: st.openFiles.map(f => ({ file: f.path.split('/').pop(), error: f.error, readOnly: f.accessIntent?.readOnly ?? null })) });
  const target = pinia._s.get('activeContext')?.activeWorkspaceTarget;
  return { panels: out, activeRun: target?.context.state.runId ?? null, activeRoot: target?.workspaceRootPath ?? null };
});
const before = await panel();
// The same click again, with the response recorded, then the Files panel revealed as the user would look.
const chip = win.locator('button.message-attachment-chip').filter({ hasText: 'b-notes-471.txt' }).last();
await chip.click(); await sleep(3000);
const after = await panel();
const drawerAfterClick = await win.locator('[data-test="workspace-right-tool-drawer"]').count();
const status = (await win.locator('[data-testid="event-monitor-file-preview-status"]').innerText({ timeout: 300 }).catch(() => '')).trim();
await win.screenshot({ path: '/tmp/abtest471/d6-after-attachment.png' });
return { before, after, responses, drawerAfterClick, status };
