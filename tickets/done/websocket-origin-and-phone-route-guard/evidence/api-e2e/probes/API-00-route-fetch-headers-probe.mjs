// Does Playwright route.fetch({url}) forward the browser's Origin, and what Host does the target see?
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/package.json');
const { chromium } = require('playwright-core');
const seen = [];
const server = http.createServer((req, res) => {
  seen.push({ method: req.method, url: req.url, host: req.headers.host, origin: req.headers.origin ?? '(none)' });
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<html><body>x</body></html>'); return; }
  res.setHeader('content-type', 'application/json'); res.end('{"ok":true}');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const phone = `http://192.168.77.10:${port}`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext();
await context.route(`${phone}/**`, async route => {
  const response = await route.fetch({ url: route.request().url().replace(phone, `http://127.0.0.1:${port}`), ...(process.argv[3] === "forward-host" ? { headers: { ...route.request().headers(), host: new URL(phone).host } } : {}) });
  await route.fulfill({ response });
});
const page = await context.newPage();
await page.goto(`${phone}/`);
await page.evaluate(async () => { await fetch('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); });
await browser.close(); server.close();
console.log(JSON.stringify(seen, null, 1));
