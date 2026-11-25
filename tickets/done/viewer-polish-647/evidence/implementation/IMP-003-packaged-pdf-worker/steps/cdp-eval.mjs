// Usage: node cdp-eval.mjs <controlEndpoint> <step.js>  (autobyteus-647 implementation probe runner)
// Attaches to my isolated instance's CDP control port and runs one step: an async function body with `win` (the app window) and `browser`.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.env.WEB_PKG);
const { chromium } = require('playwright-core');
const [endpoint, file] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(endpoint);
const pages = browser.contexts().flatMap(c => c.pages());
const win = pages.find(p => p.url().includes('renderer/index.html')) ?? pages[0];
const body = fs.readFileSync(file, 'utf8');
const fn = new (Object.getPrototypeOf(async function () {}).constructor)('win', 'browser', 'pages', body);
try { const r = await fn(win, browser, pages); console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2)); }
catch (e) { console.error('ERR', e.message); process.exitCode = 1; }
finally { await browser.close().catch(() => {}); }
