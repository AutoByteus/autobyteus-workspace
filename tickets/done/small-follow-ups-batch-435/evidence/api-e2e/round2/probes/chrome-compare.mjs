// autobyteus-435 API/E2E API-13 comparison: the same two requests from headless Chrome pages (an http page and a file:// page).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
const probe = () => page.evaluate(async () => {
  const url = 'http://127-0-0-1.nip.io:52498/rest/remote-access/status';
  const readable = await fetch(url).then(r => ({ status: r.status, type: r.type }), e => ({ error: String(e) }));
  const opaque = await fetch(url, { mode: 'no-cors' }).then(r => ({ type: r.type }), e => ({ error: String(e) }));
  return { origin: location.origin, readable, opaque };
});
fs.writeFileSync('/private/tmp/abx435-api2/blank.html', '<html><body>file page</body></html>');
await page.goto('file:///private/tmp/abx435-api2/blank.html'); console.log('chrome file:// page', JSON.stringify(await probe()));
await page.goto('http://127.0.0.1:52498/rest/health'); console.log('chrome http page   ', JSON.stringify(await probe()));
await browser.close();
