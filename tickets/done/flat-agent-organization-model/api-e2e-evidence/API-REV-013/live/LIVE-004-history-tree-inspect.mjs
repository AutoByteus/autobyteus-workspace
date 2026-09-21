import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';

const out = new URL('./', import.meta.url);
const browser = await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('127.0.0.1:3592'));
if (!page) throw new Error('open_tab page missing');
await page.setViewportSize({ width: 1502, height: 844 });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
for (const name of ['workspace', 'workspace-default']) {
  const candidate = page.getByRole('button', { name, exact: true }).first();
  if (await candidate.count() && await candidate.getAttribute('aria-expanded') === 'false') await candidate.click();
}
await page.waitForTimeout(1800);
const result = await page.evaluate(() => ({
  at: new Date().toISOString(),
  url: location.href,
  body: document.body.innerText,
  tests: [...document.querySelectorAll('[data-test]')].map((element) => ({
    test: element.getAttribute('data-test'),
    text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
    expanded: element.getAttribute('aria-expanded'),
    selected: element.getAttribute('aria-selected'),
    current: element.getAttribute('aria-current'),
  })),
  treeitems: [...document.querySelectorAll('[role="treeitem"]')].map((element) => ({
    text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
    test: element.getAttribute('data-test'),
    expanded: element.getAttribute('aria-expanded'),
    selected: element.getAttribute('aria-selected'),
    current: element.getAttribute('aria-current'),
  })),
}));
await fs.writeFile(new URL('LIVE-004-history-tree-inspect.json', out), `${JSON.stringify(result, null, 2)}\n`);
await page.screenshot({ path: new URL('screenshots/LIVE-004-history-tree-inspect.png', out).pathname, fullPage: true });
console.log(JSON.stringify({ url: result.url, tests: result.tests, treeitems: result.treeitems }, null, 2));
await browser.close();
