// Round 2, D7–D9 recheck (F-3): in the Docker node's window, A's own run, click the path attachment notes-471.md (outside the
// run's folder); open Files from the tool rail; then as a user: look for the Edit/Preview toggle, click into the shown file,
// type and press Cmd+S. Expected: read-only intent, preview, no Edit Mode control, no edit, no WriteFileContent.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const requests = [];
win.on('request', q => { const u = new URL(q.url()); if (/\/(rest|graphql)/.test(u.pathname) && !u.pathname.endsWith('/health')) { let op = null; try { op = JSON.parse(q.postData() ?? '{}').operationName ?? null; } catch {} requests.push({ method: q.method(), route: u.pathname.replace(/[0-9a-f_]{20,}/g, '…'), op }); } });
await win.keyboard.press('Escape'); await sleep(300);
await win.locator(`[data-test="workspace-agent-run-row"][data-run-id="${state.run}"]`).click();
await sleep(4000);
const chip = win.locator('button.message-attachment-chip').filter({ hasText: 'notes-471.md' }).last();
await chip.waitFor({ timeout: 30000 }); await chip.scrollIntoViewIfNeeded(); await chip.click();
await sleep(2500);
const fileState = await win.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = pinia._s.get('activeContext').activeWorkspaceTarget.context.config.workspaceId;
  const d = pinia._s.get('fileExplorer').getActiveFileData(id);
  return d ? { file: d.path.split('/').pop(), type: d.type, mode: d.mode, accessIntent: d.accessIntent ?? null, error: d.error, hasContent: !!d.content } : null;
});
await win.keyboard.press('Escape'); await sleep(600);
const railFiles = win.locator('button:visible[aria-label="Files"], button:visible[title="Files"]');
if (await railFiles.count()) await railFiles.first().click();
await sleep(1500);
const viewer = win.locator('#contentViewer:visible').first();
const before = { text: (await viewer.innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').slice(0, 200),
  editModeControl: await win.locator('[title="Edit Mode"]:visible').count(), monaco: await win.locator('.monaco-editor:visible').count() };
await win.screenshot({ path: '/tmp/abtest471/r2-d9-before.png' });
const body = viewer.locator('.monaco-editor, .markdown-body, [data-testid="markdown-preview"]').first();
if (await body.count()) { await body.click({ position: { x: 60, y: 30 } }).catch(() => undefined); }
await win.keyboard.type('TYPED-R2-471', { delay: 15 }); await sleep(400);
const typedShown = (await viewer.innerText({ timeout: 1000 }).catch(() => '')).includes('TYPED-R2-471');
await win.keyboard.press('Meta+s'); await sleep(2500);
await win.screenshot({ path: '/tmp/abtest471/r2-d9-after-save.png' });
return { fileState, before, typedShown, writes: requests.filter(r => r.op === 'WriteFileContent' || r.method !== 'GET' && /node-files/.test(r.route)), requests };
