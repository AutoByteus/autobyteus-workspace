// Temporary exploration helper: runs a step file against the owned live env.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const front = process.env.FRONT ?? 'http://127.0.0.1:18732';
const out = process.env.OUT ?? '/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-evidence/explore';
await fs.mkdir(out, { recursive: true });
const stepFile = path.resolve(process.argv[2]);
const { default: step } = await import(stepFile);
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: Number(process.env.W ?? 1440), height: Number(process.env.H ?? 900) }, locale: 'en-US' });
if (process.env.STATE) {
  try { await context.addCookies([]); } catch {}
}
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console: ${m.text().slice(0, 300)}`); });
try {
  const result = await step({ page, front, out, context });
  console.log(JSON.stringify({ result, errors: errors.slice(0, 20) }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  console.log(JSON.stringify({ error: String(error?.stack ?? error), url: page.url(), errors: errors.slice(0, 20) }, null, 2));
} finally {
  await browser.close();
}
