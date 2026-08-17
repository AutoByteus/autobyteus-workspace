import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';

const root = process.cwd();
const require = createRequire(pathToFileURL(path.join(root, 'autobyteus-web/package.json')));
const { chromium } = require('playwright-core');
const out = path.resolve('tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-001/live/browser');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleMessages = [];
  page.on('console', m => consoleMessages.push({type:m.type(), text:m.text()}));
  page.on('pageerror', e => consoleMessages.push({type:'pageerror', text:e.message}));
  await page.goto('http://127.0.0.1:31418/workspace', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({path:path.join(out,'classroom-codex-refresh-unselected.png'),fullPage:true});
  const body = await page.locator('body').innerText();
  await page.getByRole('button', { name: 'Open runs/history', exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Temp Workspace', { exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Classroom Simulation Team', { exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Reply with exactly CODEX_TEAM_VISIBLE_API_REV_001_20260817 and no other text.', { exact: true }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(out,'classroom-codex-history-open.png'),fullPage:true});
  const historyBody = await page.locator('body').innerText();
  await fs.writeFile(path.join(out,'classroom-codex-refresh-unselected.txt'), body+'\n');
  await fs.writeFile(path.join(out,'classroom-codex-history-open.txt'), historyBody+'\n');
  await fs.writeFile(path.join(out,'classroom-codex-refresh-unselected-console.json'), JSON.stringify(consoleMessages,null,2)+'\n');
  console.log(historyBody);
} finally { await browser.close(); }
