import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
// Two SVGs of different widths stand in for an image the agent rewrote; the route sends no cache or validator headers,
// like the node's /workspaces/:id/content route (sendUserFile).
let width = 10, hits = 0;
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/img')) { hits += 1; res.setHeader('content-type', 'image/svg+xml'); res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="5"></svg>`); return; }
  res.setHeader('content-type', 'text/html'); res.end('<html><body><div id="host"></div></body></html>');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.goto(base);
const mountImg = () => page.evaluate(async (src) => {
  const host = document.getElementById('host'); host.innerHTML = '';
  const img = document.createElement('img'); img.src = src; host.appendChild(img);
  await new Promise((r) => { img.onload = r; img.onerror = r; });
  return img.naturalWidth;
}, `${base}/img?path=chart.svg`);
const mountBlob = () => page.evaluate(async (src) => {
  const blob = await (await fetch(src, { cache: 'no-store' })).blob();
  const host = document.getElementById('host'); host.innerHTML = '';
  const img = document.createElement('img'); img.src = URL.createObjectURL(blob); host.appendChild(img);
  await new Promise((r) => { img.onload = r; img.onerror = r; });
  return img.naturalWidth;
}, `${base}/img?path=chart.svg`);
const first = await mountImg();
width = 40;
const remount = await mountImg();
const hitsBefore = hits;
const reloadThroughFetch = await mountBlob();
console.log(JSON.stringify({ first, afterRewriteRemountSameUrl: remount, hitsAfterRemount: hitsBefore, reloadThroughFetchNoStore: reloadThroughFetch, serverHits: hits }));
await browser.close(); server.close();
