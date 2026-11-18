// api417: attach to the isolated instance window over CDP and run one step (an async function body from a file).
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(process.env.WEB_DIR + '/package.json');
const { chromium } = require('playwright-core');
const [port, stepFile, ...args] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('index.html'));
const body = await fs.readFile(stepFile, 'utf8');
const fn = new Function('page', 'args', 'require', `return (async () => { ${body} })()`);
try { const result = await fn(page, args, require); console.log(JSON.stringify(result, null, 1)); }
catch (e) { console.error('STEP FAILED', e.stack); process.exitCode = 1; }
await browser.close().catch(() => {});
