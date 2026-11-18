// RU-02 check: the `pnpm dev` window (http://127.0.0.1:3000) in headless Chrome: warm up, then load and record WebSockets.
import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++) { if (await fetch('http://127.0.0.1:3000/rest/health').then(r => r.ok).catch(() => false)) break; await sleep(1000); }
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await (await browser.newContext()).newPage();
for (let i = 0; i < 2; i++) { await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 240000 }).catch(() => {}); await sleep(5000); }
const events = []; const t0 = Date.now();
const cdp = await page.context().newCDPSession(page); await cdp.send('Network.enable');
cdp.on('Network.webSocketCreated', e => events.push({ ev: 'created', url: e.url, at: Date.now() - t0 }));
cdp.on('Network.webSocketHandshakeResponseReceived', e => events.push({ ev: 'handshake', status: e.response.status, at: Date.now() - t0 }));
cdp.on('Network.webSocketFrameError', e => events.push({ ev: 'error', msg: e.errorMessage, at: Date.now() - t0 }));
cdp.on('Network.webSocketClosed', e => events.push({ ev: 'closed', at: Date.now() - t0 }));
const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
let gql = []; page.on('response', r => { if (r.url().includes('/graphql')) gql.push(r.status()); });
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
await sleep(15000);
const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 300);
console.log(JSON.stringify({ text, gqlStatuses: [...new Set(gql)], gqlCount: gql.length, events: events.slice(0, 20), errors: errors.slice(0, 10) }, null, 1));
await browser.close();
