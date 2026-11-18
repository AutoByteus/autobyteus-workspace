// IMP-05 (autobyteus-525 IR-002, temporary): the phone VNC Viewer's bars after DEC-008, in the production phone bundle's
// CSS and fonts, rebuilt from the markup of MobileScreenBar.vue + MobileNodeDesktop.vue (icons as same-size boxes), at the
// four steps x 360/412 px, View only and Control (connected), en and zh-CN labels. Usage: node vnc-bar-ir2.mjs <out> <public>
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [out, root] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/mobile\/?/, '');
  let f = path.join(root, p || 'index.html'); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/mobile/`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const L = { en: { title: 'VNC Viewer', view: 'View only', control: 'Control', keyboard: 'Keyboard', clipboard: 'Clipboard', sv: 'Connected · View only', sc: 'Connected · Control' },
  zh: { title: 'VNC 查看器', view: '仅查看', control: '控制', keyboard: '键盘', clipboard: '剪贴板', sv: '已连接 · 仅查看', sc: '已连接 · 控制' } };
const btn = 'h-9 flex-shrink-0 rounded-lg px-3 text-sm font-medium text-slate-700 active:bg-slate-100 disabled:opacity-40';
const bar = (mode, l) => `
<section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-x="1">
  <header class="flex h-12 flex-shrink-0 items-center border-b border-slate-200 bg-white pl-1 pr-1" data-testid="mobile-screen-bar">
    <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600" data-testid="mobile-screen-back"><span class="h-6 w-6 bg-slate-400"></span></button>
    <h1 class="min-w-0 flex-1 truncate px-2 text-base font-semibold text-slate-900" data-testid="mobile-screen-title">${l.title}</h1>
    <button type="button" class="${btn} ${mode === 'control' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}" data-testid="mobile-node-desktop-mode">${mode === 'control' ? l.control : l.view}</button>
    <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600" data-testid="mobile-node-desktop-full-screen"><span class="h-5 w-5 bg-slate-400"></span></button>
  </header>
  <div class="flex min-h-[2.5rem] flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-1" data-testid="mobile-node-desktop-status-bar">
    <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500"></span>
    <span class="min-w-0 flex-1 truncate text-sm text-slate-600" data-testid="mobile-node-desktop-status">${mode === 'control' ? l.sc : l.sv}</span>
    ${mode === 'control' ? `<button type="button" class="${btn}" data-testid="mobile-node-desktop-keyboard">${l.keyboard}</button>
    <button type="button" class="${btn}" data-testid="mobile-node-desktop-clipboard-open">${l.clipboard}</button>` : ''}
  </div>
  <div class="relative min-h-0 flex-1 bg-slate-800"></div>
</section>`;
const results = [];
try {
  for (const lang of ['en', 'zh']) for (const width of [360, 412]) for (const step of ['small', 'standard', 'large', 'largest']) for (const mode of ['view', 'control']) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: lang === 'zh' ? 'zh-CN' : 'en-US' });
    await context.addInitScript((s) => localStorage.setItem('autobyteus.phone.textSize', s), step);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-phone-text-size'), null, { timeout: 60_000 });
    await page.waitForTimeout(1200);
    await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', html), bar(mode, L[lang]));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const q = (id) => document.querySelector(`[data-x] [data-testid="${id}"]`);
      const box = (id) => { const e = q(id); if (!e) return null; const b = e.getBoundingClientRect(); return { left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
      const header = document.querySelector('[data-x] header'); const row = q('mobile-node-desktop-status-bar'); const title = q('mobile-screen-title'); const status = q('mobile-node-desktop-status');
      return { root: getComputedStyle(document.documentElement).fontSize, viewport: innerWidth, headerScroll: header.scrollWidth, rowScroll: row.scrollWidth,
        title: box('mobile-screen-title'), titleCut: title.scrollWidth > title.clientWidth, fullScreen: box('mobile-node-desktop-full-screen'), mode: box('mobile-node-desktop-mode'),
        status: box('mobile-node-desktop-status'), statusEllipsis: status.scrollWidth > status.clientWidth, keyboard: box('mobile-node-desktop-keyboard'), clipboard: box('mobile-node-desktop-clipboard-open') };
    });
    const inside = (b) => !b || (b.left >= -0.5 && b.right <= r.viewport + 0.5);
    r.clean = r.headerScroll <= r.viewport + 1 && r.rowScroll <= r.viewport + 1 && [r.fullScreen, r.mode, r.keyboard, r.clipboard, r.status].every(inside) && r.title.w > 40 && (!r.status || r.status.w > 20);
    const name = `IMP-05-${lang}-${width}-${step}-${mode}.png`;
    await page.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width, height: 120 } });
    results.push({ lang, width, step, mode, ...r, shot: name });
    await context.close();
  }
} finally { await browser.close(); server.close(); }
fs.writeFileSync(path.join(out, 'IMP-05-vnc-bars.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(r.clean ? 'clean' : 'NOT CLEAN', r.lang, r.width, r.step, r.mode, 'title', r.title.w, 'status', r.status?.w, 'fs.right', r.fullScreen.right, 'clip.right', r.clipboard?.right ?? '-');
