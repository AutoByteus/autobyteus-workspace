// autobyteus-435 API/E2E: evaluate one expression in the isolated instance's window (CDP). Usage: node electron-eval.mjs <controlPort> '<expr>'
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [port, expr] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('file:'));
console.log(JSON.stringify(await page.evaluate(expr)));
await browser.close();
