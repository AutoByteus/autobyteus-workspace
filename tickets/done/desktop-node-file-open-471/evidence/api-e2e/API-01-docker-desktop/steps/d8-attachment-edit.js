// D8: reveal the Files panel (its tab in the right-side tools) after D7's attachment click; look for edit controls, type into
// the editor and press Cmd+S, as a user would. The container's file is compared afterwards (outside this step).
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html') && !p.url().includes('#/nodes'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const responses = [];
win.on('response', r => { const u = new URL(r.url()); if (/\/(rest|graphql)/.test(u.pathname)) responses.push({ route: u.pathname.replace(/[0-9a-f_]{20,}/g, '…'), method: r.request().method(), op: (() => { try { return JSON.parse(r.request().postData() ?? '{}').operationName ?? null; } catch { return null; } })(), status: r.status() }); });
// The right-hand tool rail's Files button (an icon; its accessible name is read here).
const rail = await win.locator('button:visible').evaluateAll(bs => bs.filter(b => b.getBoundingClientRect().left > window.innerWidth - 80).map(b => ({ label: b.getAttribute('aria-label') ?? b.getAttribute('title') ?? b.innerText.trim(), test: b.getAttribute('data-test') ?? b.getAttribute('data-testid') })));
const filesButton = win.locator('button:visible').filter({ has: win.locator('xpath=.') }).and(win.locator('[aria-label="Files"], [title="Files"]')).first();
const tabs = JSON.stringify(rail);
if (await filesButton.count()) await filesButton.click();
await sleep(1500);
const viewer = win.locator('#contentViewer:visible').first();
const facts = { tabs: tabs?.replace(/\s+/g, ' ') ?? null, drawer: await win.locator('[data-test="workspace-right-tool-drawer"]').count(),
  text: (await viewer.innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').slice(0, 200),
  buttons: (await win.locator('button:visible').allInnerTexts()).map(t => t.trim()).filter(t => /^(Edit|Save|Preview|Saved)$/.test(t)),
  editMode: await win.locator('[title="Edit Mode"]:visible').count(), monaco: await win.locator('.monaco-editor:visible').count() };
await win.screenshot({ path: '/tmp/abtest471/d8-before-typing.png' });
const editor = win.locator('.monaco-editor:visible').first();
if (await editor.count()) {
  await editor.click({ position: { x: 60, y: 20 } }); await win.keyboard.type('TYPED-ATTACH-471 ', { delay: 10 }); await sleep(400);
  facts.typedShown = (await viewer.innerText({ timeout: 1000 }).catch(() => '')).includes('TYPED-ATTACH-471');
  await win.keyboard.press('Meta+s'); await sleep(2500);
  facts.afterSave = { text: (await viewer.innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').slice(0, 200), toast: (await win.locator('[data-testid="toast-container"]').innerText({ timeout: 300 }).catch(() => '')).trim().slice(0, 200) };
}
await win.screenshot({ path: '/tmp/abtest471/d8-after-save.png' });
facts.responses = responses;
return facts;
