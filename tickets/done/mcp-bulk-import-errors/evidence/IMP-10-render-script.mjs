// Throwaway render check for McpBulkImportView (ticket mcp-bulk-import-errors). Drives the running dev stack.
import { createRequire } from 'node:module';
const [webDir, outDir] = process.argv.slice(2);
const require = createRequire(`${webDir}/package.json`);
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:3000/settings', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'MCP Servers', exact: true }).click();
await page.getByRole('button', { name: 'Bulk Import', exact: true }).click();
const json = { mcpServers: { render_ok_en2: { command: 'node', args: ['server.js'] }, render_bad_en2: { transport_type: 'websocket', url: 'ws://127.0.0.1:8765/mcp' }, render_empty_en2: {} } };
await page.fill('#bulk-json-input', JSON.stringify(json, null, 2));
await page.getByRole('button', { name: 'Import Configurations' }).click();
await page.waitForSelector('#bulk-import-failures');
await page.waitForTimeout(1000);
const facts = await page.evaluate(() => {
  const list = document.querySelector('#bulk-import-failures');
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Import Configurations'));
  const card = list.parentElement;
  const r = (el) => el.getBoundingClientRect();
  return { listText: list.innerText, listBelowButton: r(list).top >= r(button).bottom,
    listInsideCard: r(list).left >= r(card).left && r(list).right <= r(card).right,
    itemsOverflowing: [...list.querySelectorAll('li')].filter((li) => li.scrollWidth > li.clientWidth + 1).length,
    toastText: document.body.innerText.match(/Imported 1; 1 failed[^\n]*|Imported 1; 2 failed[^\n]*/)?.[0] ?? null,
    stillOnView: Boolean(document.querySelector('#bulk-json-input')),
    listInViewport: r(list).top >= 0 && r(list).bottom <= window.innerHeight };
});
await page.screenshot({ path: `${outDir}/IMP-10-render-partial-import-en.png` });
await page.locator('#bulk-import-failures').screenshot({ path: `${outDir}/IMP-10-render-failure-list-en.png` });
// Full success returns to the server list.
await page.fill('#bulk-json-input', JSON.stringify({ mcpServers: { render_full_en2: { url: 'http://127.0.0.1:9000/mcp' } } }));
await page.getByRole('button', { name: 'Import Configurations' }).click();
await page.waitForTimeout(1500);
const afterFull = await page.evaluate(() => ({ onView: Boolean(document.querySelector('#bulk-json-input')),
  listShowsServer: document.body.innerText.includes('render_full_en2'), toast: document.body.innerText.match(/MCP server configurations imported: 1\./)?.[0] ?? null }));
await page.screenshot({ path: `${outDir}/IMP-10-render-full-import-en.png` });
console.log(JSON.stringify({ facts, afterFull, pageErrors: errors }, null, 2));
await browser.close();
