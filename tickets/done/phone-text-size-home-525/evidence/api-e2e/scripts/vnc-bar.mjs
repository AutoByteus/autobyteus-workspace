// autobyteus-525 API/E2E API-10 (temporary, ticket-owned): the phone VNC Viewer's top bar at each Text size, with the
// production phone bundle's CSS and fonts. No node desktop is available to the probe stacks, so the bar is rebuilt in the
// real phone page from the exact markup of `MobileScreenBar.vue` + `MobileNodeDesktop.vue` (#actions, same classes and
// English labels; the iconify icons as same-size boxes). Modes: View only (Fit hidden at scale 1: "View only" + full
// screen) and Control while connected ("Keyboard", "Clipboard", "Control" + full screen).
// The page: `autobyteus-web/dist/public` served at /mobile/ by a small static server (no node: the setup page appears;
// plugin 06 applies the stored step before mount, as on a paired phone).
// Usage: node vnc-bar.mjs <outDir> <dist/public path>
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
const bar = (mode) => `
<section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-node-desktop" data-api10="1">
  <header class="flex h-12 flex-shrink-0 items-center border-b border-slate-200 bg-white pl-1 pr-1" data-testid="mobile-screen-bar">
    <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600" data-testid="mobile-screen-back"><span class="h-6 w-6 bg-slate-400"></span></button>
    <h1 class="min-w-0 flex-1 truncate px-2 text-base font-semibold text-slate-900" data-testid="mobile-screen-title">VNC Viewer</h1>
    ${mode === 'control' ? `
    <button type="button" class="h-9 flex-shrink-0 rounded-lg px-3 text-sm font-medium text-slate-700" data-testid="mobile-node-desktop-keyboard">Keyboard</button>
    <button type="button" class="h-9 flex-shrink-0 rounded-lg px-3 text-sm font-medium text-slate-700" data-testid="mobile-node-desktop-clipboard-open">Clipboard</button>
    <button type="button" class="h-9 flex-shrink-0 rounded-lg px-3 text-sm font-medium text-slate-700 bg-amber-100 text-amber-900" data-testid="mobile-node-desktop-mode">Control</button>` : `
    <button type="button" class="h-9 flex-shrink-0 rounded-lg px-3 text-sm font-medium text-slate-700 bg-emerald-50 text-emerald-800" data-testid="mobile-node-desktop-mode">View only</button>`}
    <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600" data-testid="mobile-node-desktop-full-screen"><span class="h-5 w-5 bg-slate-400"></span></button>
  </header>
  <div class="flex min-h-[2.5rem] flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-1" data-testid="mobile-node-desktop-status-bar">
    <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500"></span>
    <span class="min-w-0 flex-1 truncate text-sm text-slate-600" data-testid="mobile-node-desktop-status">Connected</span>
  </div>
  <div class="relative min-h-0 flex-1 bg-slate-800"></div>
</section>`;
const results = [];
try {
  for (const width of [360, 412]) for (const step of ['standard', 'large', 'largest']) for (const mode of ['view', 'control']) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
    await context.addInitScript((s) => localStorage.setItem('autobyteus.phone.textSize', s), step);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-phone-text-size'), null, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', html), bar(mode));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const box = (id) => { const e = document.querySelector(`[data-api10] [data-testid="${id}"]`); if (!e) return null; const b = e.getBoundingClientRect(); return { left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1) }; };
      const header = document.querySelector('[data-api10] header');
      return { root: getComputedStyle(document.documentElement).fontSize, step: document.documentElement.getAttribute('data-phone-text-size'), viewport: innerWidth,
        headerScrollWidth: header.scrollWidth, title: box('mobile-screen-title'), mode: box('mobile-node-desktop-mode'), keyboard: box('mobile-node-desktop-keyboard'),
        clipboard: box('mobile-node-desktop-clipboard-open'), fullScreen: box('mobile-node-desktop-full-screen') };
    });
    r.fullScreenPastEdge = r.fullScreen.right > r.viewport + 1;
    r.clean = !r.fullScreenPastEdge && r.headerScrollWidth <= r.viewport + 1 && r.title.w >= 1;
    const name = `API-10-${width}-${step}-${mode}.png`;
    await page.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width, height: 120 } });
    results.push({ width, step: r.step, mode, root: r.root, headerScrollWidth: r.headerScrollWidth, titleWidth: r.title.w, fullScreenRight: r.fullScreen.right, fullScreenPastEdge: r.fullScreenPastEdge, clean: r.clean, shot: name });
    await context.close();
  }
} finally { await browser.close(); server.close(); }
fs.writeFileSync(path.join(out, 'API-10-vnc-bar.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(JSON.stringify(r));
