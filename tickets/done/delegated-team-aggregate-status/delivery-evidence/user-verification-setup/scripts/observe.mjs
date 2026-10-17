import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [port, shotPath, action] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('index.html'));
if (action === 'open') {
  const ws = page.locator('[data-test="workspace-row"]').first(); if (await ws.count()) await ws.click().catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('[data-test="workspace-agent-row"]', { hasText: 'Project Task Manager' }).first().click();
  await page.waitForTimeout(800);
  await page.locator('[data-test="workspace-agent-run-row"]').first().click();
  await page.waitForTimeout(2500);
}
const dots = await page.evaluate(() => [...document.querySelectorAll('[data-test="team-aggregate-status-dot"], [data-status]')]
  .filter((e) => e.closest('[data-test]')).slice(0, 40).map((e) => {
    const row = e.closest('[role="treeitem"], li, [data-test$="-row"]');
    return { test: e.getAttribute('data-test'), status: e.getAttribute('data-status'), cls: e.className?.toString().slice(0, 80),
      row: (row?.getAttribute('aria-label') || row?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90) };
  }));
console.log(JSON.stringify(dots, null, 1));
if (shotPath) await page.screenshot({ path: shotPath });
await browser.close().catch(() => {});
