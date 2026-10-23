// Case: API-07 / FU-004 reproduction | Command: node evidence/API-07-pmu-probe/ws-close-while-connecting-repro.mjs (any cwd) | Commit: 1b83434652 (web deps of this worktree) | Env: macOS, headless Chrome | Date: 2026-10-23
// Observed output: {"closedWhileConnecting":["error","close 1006"],"closedAfterOpen":["open","close 1000"],"consoleErrors":[]}
// Reproduction (temporary diagnostic, not committed): does Chrome fire `error` on a WebSocket closed while CONNECTING?
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const { WebSocketServer } = require('ws');
const http = await import('node:http');
// A server that accepts the upgrade slowly (like a busy backend), so the client is still CONNECTING when it closes.
const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => setTimeout(() => wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws)), 300));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
const consoleErrors = []; page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
const out = await page.evaluate(async (url) => {
  const run = (closeAfterOpen) => new Promise((resolve) => {
    const events = []; const ws = new WebSocket(url);
    ws.onerror = () => events.push('error'); ws.onclose = (e) => { events.push(`close ${e.code}`); resolve(events); };
    ws.onopen = () => { events.push('open'); if (closeAfterOpen) ws.close(1000, 'Client disconnect'); };
    if (!closeAfterOpen) setTimeout(() => ws.close(1000, 'Client disconnect'), 20);
  });
  return { closedWhileConnecting: await run(false), closedAfterOpen: await run(true) };
}, `ws://127.0.0.1:${port}/`);
console.log(JSON.stringify({ ...out, consoleErrors }));
await browser.close(); server.close(); process.exit(0);
