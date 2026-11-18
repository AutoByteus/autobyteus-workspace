// Usage: node cdp-eval.mjs <controlEndpoint> <file-with-async-fn-body>   (temporary exploration helper, autobyteus-437 API/E2E)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [endpoint, file] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(endpoint);
const pages = browser.contexts().flatMap(c => c.pages());
const app = pages.find(p => p.url().includes('/renderer/index.html'));
const body = fs.readFileSync(file, 'utf8');
const fn = new (Object.getPrototypeOf(async function () {}).constructor)('app', 'pages', 'browser', body);
try { const r = await fn(app, pages, browser); console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2)); }
catch (e) { console.error('ERR', e.message); }
finally { await browser.close().catch(() => {}); }
