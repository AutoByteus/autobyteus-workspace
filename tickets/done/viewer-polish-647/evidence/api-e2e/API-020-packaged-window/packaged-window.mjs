// API/E2E autobyteus-647, temporary: the packaged window (`file://`) of my isolated instance, over its CDP control port.
// Usage: node packaged-window.mjs <controlEndpoint> <outDir> <workspaceDir>
// AC-005: three PDFs opened one after another from the Files tree, all files closed before each round (five rounds), then
// switches; `URL.createObjectURL` and `Worker` counted from the document's start (the window reloaded once with the script
// registered). AC-001: a JSON file in the editor at 1440×900: line numbers, fold controls, glyph margin, margin width, the
// first character's offset; then an edit and Cmd+S, checked on disk.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(process.env.WEB_PKG ?? '<worktree>/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [endpoint, out, ws] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PDFS = { 'alpha-647.pdf': 3, 'beta-647.pdf': 2, 'gamma-647.pdf': 4 };
const result = { steps: [] };
const log = (step, data) => { result.steps.push({ step, ...data }); console.log(step, JSON.stringify(data).slice(0, 400)); };

const instrument = `(() => { try {
  if (window.__vp647) return;
  const rec = { blobs: [], workers: [], workerErrors: 0 };
  const c = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (o) => { const u = c(o); rec.blobs.push({ type: o && o.type !== undefined ? o.type : typeof o, size: o && o.size !== undefined ? o.size : null }); return u; };
  const W = window.Worker;
  if (W) { const P = function (url, opts) { const w = new W(url, opts); rec.workers.push({ scheme: String(url).split(':')[0], type: (opts && opts.type) || 'classic' }); w.addEventListener('error', () => { rec.workerErrors += 1; }); return w; }; P.prototype = W.prototype; window.Worker = P; }
  window.__vp647 = rec;
} catch (e) {} })();`;

const browser = await chromium.connectOverCDP(endpoint);
const win = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('renderer/index.html'));
if (!win) throw new Error('no app window');
const errors = [];
win.on('console', m => { if (m.type() === 'error') errors.push(m.text().split('\n')[0].slice(0, 200)); });
win.on('pageerror', e => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
const cdp = await win.context().newCDPSession(win);
try {
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1440, height: 900 } });
} catch (e) { log('window-bounds-error', { message: e.message }); }
await cdp.send('Page.enable');
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: instrument });
await win.reload({ waitUntil: 'load' });
await sleep(6000);
log('window', { url: win.url().replace(/^file:\/\/.*\/AutoByteus\.app/, 'file://…/AutoByteus.app'), viewport: await win.evaluate(() => ({ w: innerWidth, h: innerHeight })), instrumented: await win.evaluate(() => Boolean(window.__vp647)) });

// The workspace (a native folder dialog in real use): through the app's own store, as the chat's folder.
const workspaceId = await win.evaluate(async (root) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const id = await pinia._s.get('workspace').createWorkspace({ root_path: root });
  pinia._s.get('chatDraft').setWorkspace({ kind: 'existing', workspaceId: id });
  return id;
}, ws);
await sleep(1500);
const tabs = win.locator('[data-test="right-side-tab-list"]');
// The right panel's toggle: the top-right button of the window (it has no test id).
if (!(await tabs.count())) { const vp = await win.evaluate(() => ({ w: innerWidth })); await win.mouse.click(vp.w - 22, 21); await sleep(1200); }
await win.locator('[data-test="right-side-tab-list"]').getByText('Files', { exact: true }).first().click();
await sleep(1500);
const files = win.locator('[data-test="right-side-files-panel"]');
const treeName = name => files.locator('.file-item span.select-none').filter({ hasText: new RegExp(`^${name.replace(/[.]/g, '\\.')}$`) }).first();
await treeName('alpha-647.pdf').waitFor({ timeout: 30000 });
log('workspace', { workspaceId: Boolean(workspaceId) });
const viewer = win.locator('#contentViewer:visible').first();
const pdfState = () => viewer.evaluate((scope) => {
  const canvases = [...scope.querySelectorAll('.vue-pdf-embed__page canvas')].filter(c => c.width > 0 && c.getBoundingClientRect().width > 0);
  const alert = scope.querySelector('[data-testid="pdf-viewer-scroller"] [role="alert"]');
  return { pages: canvases.length, error: alert ? alert.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null };
});
const open = async (name) => {
  const before = errors.length;
  await treeName(name).click();
  let s = { pages: 0, error: null };
  const end = Date.now() + 30000;
  while (Date.now() < end) { s = await pdfState().catch(() => s); if (s.pages >= PDFS[name] || s.error) break; await sleep(250); }
  await sleep(800);
  s = await pdfState();
  const pdfErrors = errors.slice(before).filter(e => /PDF|pdf\.js|PDFWorker|workerSrc/i.test(e));
  return `${name}:${s.pages}/${PDFS[name]}${s.error || pdfErrors.length ? ':ERROR' : ''}`;
};
const closeAll = async () => { const b = win.locator('button[title="Close all files"]:visible').first(); if (await b.count()) { await b.click(); await sleep(1200); } };
const rounds = [];
for (let round = 0; round < 5; round += 1) {
  await closeAll();
  const o = [];
  for (const name of Object.keys(PDFS)) o.push(await open(name));
  rounds.push(o.join(' '));
  if (round === 0) await win.screenshot({ path: path.join(out, 'packaged-gamma-after-alpha-beta.png') });
}
const switches = [];
for (const name of ['alpha-647.pdf', 'beta-647.pdf', 'alpha-647.pdf', 'gamma-647.pdf', 'beta-647.pdf']) switches.push(await open(name));
const session = await win.evaluate(() => ({ workers: window.__vp647.workers, workerErrors: window.__vp647.workerErrors, jsBlobs: window.__vp647.blobs.filter(b => /javascript/.test(b.type)).length, blobTypes: window.__vp647.blobs.map(b => b.type),
  globalWorkerOptions: { workerPort: Boolean(globalThis.pdfjsLib?.GlobalWorkerOptions?.workerPort), workerSrc: globalThis.pdfjsLib?.GlobalWorkerOptions?.workerSrc ?? null } }));
log('AC-005', { rounds, switches, session, pdfConsoleErrors: errors.filter(e => /PDF|pdf\.js|PDFWorker|workerSrc/i.test(e)) });

// AC-001: the JSON file in the editor.
await closeAll();
await treeName('sample-647.json').click();
await sleep(1200);
if (!(await viewer.locator('.monaco-editor:visible').count())) await viewer.locator('[title="Edit Mode"]:visible').first().click().catch(() => undefined);
const editor = viewer.locator('.monaco-editor:visible').first();
await editor.waitFor({ timeout: 30000 });
await sleep(1000);
const measure = () => editor.evaluate((el) => {
  const left = el.getBoundingClientRect().left;
  const vis = e => (e && getComputedStyle(e).display !== 'none' ? Math.round(e.getBoundingClientRect().width) : 0);
  const first = el.querySelector('.view-lines .view-line');
  let firstChar = null;
  if (first) { const w = document.createTreeWalker(first, NodeFilter.SHOW_TEXT); const n = w.nextNode(); if (n) { const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, 1); firstChar = { ch: n.nodeValue[0], offset: Math.round(r.getBoundingClientRect().left - left) }; } }
  return { editorWidth: Math.round(el.getBoundingClientRect().width), lineNumbers: [...el.querySelectorAll('.margin .line-numbers')].map(e => e.textContent.trim()).filter(Boolean).length,
    foldControls: el.querySelectorAll('.margin [class*="folding"]').length, glyphMarginWidth: vis(el.querySelector('.margin .glyph-margin')), marginWidth: vis(el.querySelector('.margin')), firstChar,
    tokenClasses: [...new Set([...el.querySelectorAll('.view-lines span[class*="mtk"]')].flatMap(e => [...e.classList].filter(c => /^mtk\d+$/.test(c))))].length };
});
const gutter = await measure();
await win.screenshot({ path: path.join(out, 'packaged-json-editor.png') });
// Edit: the end of the last line ("}"), a new key before it would change JSON; type after the closing brace on a new line.
const file = path.join(ws, 'sample-647.json');
const original = await fs.readFile(file, 'utf8');
await editor.locator('.view-lines').click({ position: { x: 200, y: 4 } });
await win.keyboard.press('Meta+ArrowDown');
await win.keyboard.press('End');
await win.keyboard.press('Enter');
await win.keyboard.type('EDITED-647.', { delay: 10 });
await sleep(400);
await win.keyboard.press('Meta+S');
let saved = '';
const end = Date.now() + 15000;
while (Date.now() < end) { saved = await fs.readFile(file, 'utf8'); if (saved.includes('EDITED-647.')) break; await sleep(300); }
const savedShown = await win.getByText('Changes saved').first().isVisible().catch(() => false);
const after = await measure();
await win.screenshot({ path: path.join(out, 'packaged-json-after-save.png') });
log('AC-001', { gutter, after, savedOnDisk: saved.includes('EDITED-647.'), savedIsOriginalPlusEdit: saved.replace(/\s+$/, '') === `${original.replace(/\s+$/, '')}\nEDITED-647.`, savedShown });
log('errors', { distinct: [...new Set(errors)].slice(0, 12) });
await fs.writeFile(path.join(out, 'packaged-window-result.json'), JSON.stringify(result, null, 2));
await browser.close().catch(() => undefined);
