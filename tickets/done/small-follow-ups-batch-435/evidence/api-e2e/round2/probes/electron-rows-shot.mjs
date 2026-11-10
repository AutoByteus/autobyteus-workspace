// autobyteus-435 API/E2E API-13: element screenshots of the Nodes page rows (each row's line), in the isolated instance.
// Usage: node electron-rows-shot.mjs <controlPort> <outDir>
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [port, outDir] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('file:'));
for (const handle of await page.locator('[data-testid^="node-line-"]').all()) {
  const key = (await handle.getAttribute('data-testid')).slice('node-line-'.length);
  const row = page.locator(`[data-testid="node-row-${key}"]`).first();
  const name = (await page.locator(`[data-testid="node-name-${key}"]`).first().innerText()).trim();
  await row.scrollIntoViewIfNeeded();
  await row.screenshot({ path: `${outDir}/API-13-r2-row-${name}.png` });
  console.log(name, '|', (await handle.innerText()).replace(/\s+/g, ' ').trim());
}
await browser.close();
