// TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
// The node row's three container layouts (363): the window is emulated at several widths; for the named node's row it
// reports the card's width (the container), the server cell's box, whether the "Update automatically" switch sits inside
// the server cell, the cell's and the row notice's text, and a screenshot per width. The emulation is cleared afterwards.
// Usage (cwd = clean checkout): node API-356-layouts.mjs <controlPort> <node name> <out prefix> <width,...>
import { createRequire } from 'node:module';
import path from 'node:path';

const [port, nodeName, prefix, widthsArg] = process.argv.slice(2);
const { chromium } = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'))('playwright-core');
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('index.html'));
const cdp = await page.context().newCDPSession(page);
const out = [];
for (const width of widthsArg.split(',').map(Number)) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.evaluate(() => { location.hash = '#/nodes'; });
  await page.waitForTimeout(2500);
  const r = await page.evaluate((name) => {
    const li = [...document.querySelectorAll('[data-testid="node-list"] li')].find((l) => l.innerText.includes(name));
    const card = document.querySelector('.nodes-card');
    const cell = li?.querySelector('.nr-server');
    const toggle = li?.querySelector('[data-testid^="node-auto-update-toggle-"]');
    const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const cardW = card ? Math.round(card.getBoundingClientRect().width) : null;
    li?.scrollIntoView({ block: 'center' });
    return {
      cardWidth: cardW, layout: cardW == null ? null : cardW >= 1024 ? 'wide (>=64rem: 16rem server column)' : cardW >= 608 ? 'medium (>=38rem)' : 'narrow (<38rem)',
      cellBox: box(cell), toggleInCell: !!(cell && toggle && cell.contains(toggle)), toggleBox: box(toggle),
      cellText: cell?.innerText.replace(/\n+/g, ' | ') ?? null,
      notice: li?.querySelector('[data-testid^="node-server-notice-"]')?.innerText ?? null,
      gridColumns: li ? getComputedStyle(li.querySelector('.nr-grid') ?? li).gridTemplateColumns : null,
    };
  }, nodeName);
  await page.screenshot({ path: `${prefix}-${width}.png` });
  out.push({ window: width, ...r });
}
await cdp.send('Emulation.clearDeviceMetricsOverride');
console.log(JSON.stringify(out, null, 2));
await browser.close().catch(() => undefined);
