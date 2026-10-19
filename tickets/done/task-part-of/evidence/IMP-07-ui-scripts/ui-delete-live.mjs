import { createRequire } from 'node:module';
import path from 'node:path';
const [base, projectId, outDir] = process.argv.slice(2);
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const board = await ctx.newPage(); const errors = [];
for (const p of [board]) p.on('pageerror', (e) => errors.push(String(e)));
await board.goto(`${base}/projects/${projectId}`); await board.getByTestId('project-task-row-text').first().waitFor();
const partLines = () => board.$$eval('[data-testid="project-task-row-text"]', (els) => els.filter((el) => ['Welcome screen copy', 'Sign-in illustration'].includes(el.textContent.trim()))
  .map((el) => Boolean(el.parentElement.querySelector('[data-testid="task-part-of-marker"]'))));
const before = await partLines();
const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}/projects/${projectId}/tasks/autobyteus-8`); await page.getByTestId('task-page-delete').click();
const note = await page.getByTestId('task-page-delete-parts-note').innerText();
await page.getByTestId('task-page-delete-confirm').click(); await page.waitForURL(/notice=task-deleted/);
await board.bringToFront(); const deadline = Date.now() + 15000; let after = await partLines();
while (after.some(Boolean) && Date.now() < deadline) { await board.waitForTimeout(300); after = await partLines(); }
await board.screenshot({ path: path.join(outDir, 'board-after-parent-delete-1440.png') });
console.log(JSON.stringify({ note, before, after, errors }));
await browser.close();
