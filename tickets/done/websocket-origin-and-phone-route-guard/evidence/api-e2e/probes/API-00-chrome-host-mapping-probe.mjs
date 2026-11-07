// Does Chrome's --host-resolver-rules MAP an IP literal and a ts.net-shaped name, with real Host/Origin and a real WebSocket?
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/package.json');
const { chromium } = require('playwright-core');
const { WebSocketServer } = require(process.argv[3] + '/node_modules/ws');
const seen = [];
const server = http.createServer((req, res) => {
  seen.push({ method: req.method, url: req.url, host: req.headers.host, origin: req.headers.origin ?? '(none)' });
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<html><body>x</body></html>'); return; }
  res.setHeader('content-type', 'application/json'); res.end('{"ok":true}');
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => { seen.push({ method: 'UPGRADE', url: req.url, host: req.headers.host, origin: req.headers.origin ?? '(none)' }); wss.handleUpgrade(req, socket, head, ws => ws.close()); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--host-resolver-rules=MAP 192.168.77.10 127.0.0.1, MAP node.tail-probe.ts.net 127.0.0.1'] });
const page = await (await browser.newContext()).newPage();
for (const host of ['192.168.77.10', 'node.tail-probe.ts.net']) {
  await page.goto(`http://${host}:${port}/`);
  await page.evaluate(async () => { await fetch('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await new Promise(r => { const ws = new WebSocket(location.origin.replace('http', 'ws') + '/ws/x'); ws.onclose = r; ws.onerror = r; }); });
}
await browser.close(); server.close();
console.log(JSON.stringify(seen, null, 1));
