// D9: with D7's attachment-opened node file (notes-471.md) in the Files panel's editor, type at its last line and press Cmd+S,
// as a user would. Records the editor text, every request to the node, and toasts. The container's file is checked outside.
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const requests = [];
win.on('request', q => { const u = new URL(q.url()); if (/\/(rest|graphql)/.test(u.pathname) && !u.pathname.endsWith('/health')) { let op = null; try { op = JSON.parse(q.postData() ?? '{}').operationName ?? null; } catch {} requests.push({ method: q.method(), route: u.pathname.replace(/[0-9a-f_]{20,}/g, '…'), op }); } });
await win.keyboard.press('Escape'); await sleep(800);
// Open the Files panel from the right-hand tool rail (the icon button named "Files").
const railFiles = win.locator('button:visible').filter({ hasText: /^$/ }).and(win.locator('[aria-label="Files"], [title="Files"]'));
const railCount = await railFiles.count();
if (railCount) await railFiles.first().click(); else await win.getByRole('button', { name: 'Files', exact: true }).last().click();
await sleep(1500);
if (!(await win.locator('.monaco-editor:visible').count())) { await win.locator('[data-test="workspace-right-tool-drawer"]').getByText('Files', { exact: true }).first().click().catch(() => undefined); await sleep(1500); }
const editor = win.locator('.monaco-editor:visible').first();
const lines = () => win.locator('.monaco-editor:visible .view-lines').innerText({ timeout: 1000 }).catch(() => '');
const before = await lines();
await win.locator('.monaco-editor:visible .view-line').last().click();
await win.keyboard.press('End');
await win.keyboard.type('TYPED-ATTACH-471', { delay: 15 });
await sleep(500);
const typed = await lines();
await win.screenshot({ path: '/tmp/abtest471/d9-typed.png' });
await win.keyboard.press('Meta+s');
await sleep(3000);
const after = await lines();
const toast = (await win.locator('[data-testid="toast-container"]').innerText({ timeout: 300 }).catch(() => '')).trim();
const alert = (await win.locator('#contentViewer:visible [role="alert"]').innerText({ timeout: 300 }).catch(() => '')).trim();
await win.screenshot({ path: '/tmp/abtest471/d9-after-save.png' });
return { editorFound: await editor.count(), typedShown: typed.includes('TYPED-ATTACH-471') && !before.includes('TYPED-ATTACH-471'), afterSaveShown: after.includes('TYPED-ATTACH-471'), toast, alert, requests };
