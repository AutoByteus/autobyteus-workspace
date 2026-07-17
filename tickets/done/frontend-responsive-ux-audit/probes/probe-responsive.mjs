import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(new URL('../../../autobyteus-web/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const outDir = path.resolve('tickets/frontend-responsive-ux-audit/probes');
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1024x768', width: 1024, height: 768 },
  { name: 'narrow-desktop-800x700', width: 800, height: 700 },
  { name: 'gap-760x700', width: 760, height: 700 },
  { name: 'gap-700x700', width: 700, height: 700 },
  { name: 'mobile-639x700', width: 639, height: 700 },
  { name: 'mobile-500x700', width: 500, height: 700 },
  { name: 'short-1024x480', width: 1024, height: 480 },
  { name: 'short-800x420', width: 800, height: 420 },
];
const results = [];
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (/error|warn|Workspace|Failed|GraphQL|Apollo/i.test(text)) consoleMessages.push(`${msg.type()}: ${text}`);
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  await page.goto('http://127.0.0.1:13002/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  const screenshot = path.join(outDir, `${vp.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const data = await page.evaluate(() => {
    const q = (selector) => document.querySelector(selector);
    const allText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const info = (selector) => {
      const el = q(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        selector,
        exists: true,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        className: el.getAttribute('class'),
        text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
      };
    };
    const byData = (test) => info(`[data-test="${test}"]`);
    const visibleNodeSummaries = Array.from(document.body.querySelectorAll('header, aside, main, [data-test], button')).slice(0, 80).map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        test: el.getAttribute('data-test'),
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        display: cs.display,
        visibility: cs.visibility,
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        className: (el.getAttribute('class') || '').slice(0, 160),
      };
    });
    return {
      href: location.href,
      innerWidth,
      innerHeight,
      mediaMin640: matchMedia('(min-width: 640px)').matches,
      mediaMin768: matchMedia('(min-width: 768px)').matches,
      bodyText: allText.slice(0, 1200),
      header: info('header'),
      aside: info('aside'),
      main: info('main'),
      desktopLayout: byData('workspace-desktop-layout'),
      mobileNavTextPresent: allText.includes('Running') && allText.includes('Agent'),
      rightPanel: byData('workspace-right-panel'),
      centerShell: byData('workspace-center-content-shell'),
      visibleNodeSummaries,
    };
  });
  results.push({ viewport: vp, screenshot, consoleMessages, pageErrors, data });
  await page.close();
}
await browser.close();
await fs.writeFile(path.join(outDir, 'responsive-probe-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(r => ({
  viewport: r.viewport,
  screenshot: r.screenshot,
  min640: r.data.mediaMin640,
  min768: r.data.mediaMin768,
  header: r.data.header?.rect,
  aside: r.data.aside?.rect,
  main: r.data.main?.rect,
  desktopLayout: r.data.desktopLayout && {display:r.data.desktopLayout.display, rect:r.data.desktopLayout.rect, text:r.data.desktopLayout.text},
  rightPanel: r.data.rightPanel && {display:r.data.rightPanel.display, rect:r.data.rightPanel.rect},
  centerShell: r.data.centerShell && {display:r.data.centerShell.display, rect:r.data.centerShell.rect, text:r.data.centerShell.text},
  bodyText: r.data.bodyText.slice(0, 250),
  consoleMessages: r.consoleMessages.slice(0,3),
  pageErrors: r.pageErrors,
})), null, 2));
