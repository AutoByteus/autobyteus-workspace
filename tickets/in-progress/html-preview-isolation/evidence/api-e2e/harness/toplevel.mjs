// api417 API-14: the workspace static URL opened top-level in a real browser (as a tab or the in-app browser would).
import { createRequire } from 'node:module';
const require = createRequire(process.env.WEB_DIR + '/package.json');
const { chromium } = require('playwright-core');
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await (await browser.newContext()).newPage();
const responses = [];
page.on('response', r => responses.push({ url: r.url().replace(/agent_ws_[0-9a-f]+/, 'agent_ws_…').slice(0, 110), status: r.status(), csp: r.headers()['content-security-policy'] ?? null, type: r.headers()['content-type'] ?? null }));
await page.goto(url);
await page.waitForFunction(() => window.__report && window.__report.done, null, { timeout: 20000 });
await page.waitForTimeout(1000);
const report = await page.evaluate(() => window.__report);
await page.screenshot({ path: out + '.png' });
const result = { url: url.replace(/agent_ws_[0-9a-f]+/, 'agent_ws_…'), browser: browser.version(), report, responses };
require('node:fs').writeFileSync(out + '.json', JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ origin: report.checks.origin, localStorage: report.checks.localStorage, ws: report.checks['ws-terminal'], css: report.checks.css, img: report.checks['img-relative'], classic: report.checks['classic-script'], responses }, null, 1));
await browser.close();
