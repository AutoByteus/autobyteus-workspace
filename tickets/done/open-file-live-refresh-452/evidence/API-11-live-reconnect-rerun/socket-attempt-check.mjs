import net from 'node:net';
import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/package.json');
const { chromium } = require('playwright-core');
const server = net.createServer(socket => socket.destroy());
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] });
const context = await browser.newContext();
const attempts = [];
await context.exposeBinding('__probeSocketAttempt', (_s, url, at) => { attempts.push({ url, at }); });
await context.addInitScript(() => {
  const Native = window.WebSocket;
  window.WebSocket = class extends Native {
    constructor(...args) { const at = Date.now(); super(...args); Promise.resolve(window.__probeSocketAttempt?.(String(args[0]), at)).catch(() => undefined); }
  };
});
const page = await context.newPage();
const events = [];
const errors = { reset: 0, notConnected: 0, other: 0 };
page.on('websocket', ws => events.push(ws.url()));
page.on('console', m => { const t = m.text(); if (!t.includes('WebSocket connection')) return; if (t.includes('ERR_CONNECTION_RESET')) errors.reset++; else if (t.includes('ERR_SOCKET_NOT_CONNECTED')) errors.notConnected++; else errors.other++; });
await page.goto('about:blank');
const checks = await page.evaluate(async (port) => {
  const out = { instanceOf: false, openConst: null, closeEvents: 0 };
  for (let i = 0; i < 30; i++) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/agent-team/t${i}`);
    out.instanceOf = ws instanceof WebSocket; out.openConst = WebSocket.OPEN;
    await new Promise(r => { ws.onclose = () => { out.closeEvents++; r(); }; });
  }
  return out;
}, port);
await new Promise(r => setTimeout(r, 500));
console.log(JSON.stringify({ attempts: attempts.length, websocketEvents: events.length, consoleFailures: errors, page: checks }));
await browser.close(); server.close();
