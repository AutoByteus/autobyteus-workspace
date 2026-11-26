// Runs one step against the held stack: node view.mjs <worktree> <stack.json> <step.js> [width] [height]
// The step is an async function body with (page, stack, helpers); its return value is printed as JSON. Page errors and
// console errors are collected and printed too.
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [worktree, stackFile, stepFile, width = '1440', height = '900'] = process.argv.slice(2);
const webDir = path.join(worktree, 'autobyteus-web');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const stack = JSON.parse(await fs.readFile(stackFile, 'utf8'));
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: Number(width), height: Number(height) }, locale: 'en-GB', timezoneId: 'UTC', permissions: ['clipboard-read', 'clipboard-write'] });
  // The stack's own credential (its node's launch credential), standing in for the desktop's attacher.
  await context.setExtraHTTPHeaders({ authorization: `Bearer ${(await fs.readFile(path.join(path.dirname(stackFile), 'credential'), 'utf8')).trim()}` });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const goto = async (query) => { await page.goto(`${stack.frontendUrl}/memory${query}`, { waitUntil: 'domcontentloaded' }); };
  const box = async (selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) }; });
  const shot = async (name) => { await page.screenshot({ path: path.join(path.dirname(stackFile), 'shots', `${name}.png`) }); return name; };
  await fs.mkdir(path.join(path.dirname(stackFile), 'shots'), { recursive: true });
  const body = await fs.readFile(stepFile, 'utf8');
  const fn = new (Object.getPrototypeOf(async function () {}).constructor)('page', 'stack', 'h', body);
  const result = await fn(page, stack, { sleep, goto, box, shot, viewport: { width: Number(width), height: Number(height) } });
  console.log(JSON.stringify({ result, errors }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ failed: String(error.stack ?? error).slice(0, 1500), errors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
