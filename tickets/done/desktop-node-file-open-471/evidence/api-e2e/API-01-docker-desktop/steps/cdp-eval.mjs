// Usage: node cdp-eval.mjs <controlEndpoint> <file-with-async-fn-body>   (temporary step runner, autobyteus-471 API/E2E)
// Attaches to the isolated instance's CDP control port and runs one step (an async function body with `pages`, `browser`,
// `state`; `state` is /tmp/abtest471/state.json without its credential). Prints the step's JSON result.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [endpoint, file] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(endpoint);
const pages = browser.contexts().flatMap(c => c.pages());
const { owner: _secret, ...state } = fs.existsSync('/tmp/abtest471/state.json') ? JSON.parse(fs.readFileSync('/tmp/abtest471/state.json', 'utf8')) : {};
const body = fs.readFileSync(file, 'utf8');
const fn = new (Object.getPrototypeOf(async function () {}).constructor)('pages', 'browser', 'state', body);
try { const r = await fn(pages, browser, state); console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2)); }
catch (e) { console.error('ERR', e.message); process.exitCode = 1; }
finally { await browser.close().catch(() => {}); }
