#!/usr/bin/env node
// API-08 helper (autobyteus-403): attaches to an isolated desktop instance's CDP control port and records, for every
// window (existing and new), every WebSocket the renderer opens: URL (credentials redacted), the handshake's Origin and
// Host, the handshake status, close/error, and every HTTP request the renderer sends to a node with its Origin header.
// Writes one JSON line per event to <out.jsonl>. Runs until SIGINT/SIGTERM.
// Usage: node abx403-desktop-ws-recorder.mjs <worktree> <controlPort> <out.jsonl>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [worktree, controlPort, outFile] = process.argv.slice(2);
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/access_token=[^&\s"']+/g, 'access_token=…');
const out = fs.createWriteStream(outFile, { flags: 'a' });
const write = entry => out.write(`${redact(JSON.stringify({ at: new Date().toISOString(), ...entry }))}\n`);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const attached = new WeakSet();
const attach = async (page) => {
  if (attached.has(page)) return; attached.add(page);
  const window = page.url();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const urls = new Map();
  cdp.on('Network.webSocketCreated', e => { urls.set(e.requestId, e.url); write({ kind: 'ws-created', window, url: e.url }); });
  cdp.on('Network.webSocketWillSendHandshakeRequest', e => write({ kind: 'ws-handshake', window, url: urls.get(e.requestId), origin: e.request.headers.Origin ?? e.request.headers.origin ?? null, host: e.request.headers.Host ?? null }));
  cdp.on('Network.webSocketHandshakeResponseReceived', e => write({ kind: 'ws-response', window, url: urls.get(e.requestId), status: e.response.status }));
  cdp.on('Network.webSocketClosed', e => write({ kind: 'ws-closed', window, url: urls.get(e.requestId) }));
  cdp.on('Network.webSocketFrameError', e => write({ kind: 'ws-error', window, url: urls.get(e.requestId), error: e.errorMessage }));
  const httpById = new Map();
  cdp.on('Network.requestWillBeSent', e => { if (/^https?:\/\/(127\.0\.0\.1|localhost)/.test(e.request.url) && !e.request.url.includes('/_nuxt/')) httpById.set(e.requestId, { method: e.request.method, url: e.request.url.split('?')[0], origin: e.request.headers.Origin ?? null }); });
  // The headers actually sent (Chrome adds Origin after requestWillBeSent).
  cdp.on('Network.requestWillBeSentExtraInfo', e => { const r = httpById.get(e.requestId); if (!r) return; httpById.delete(e.requestId); write({ kind: 'http', window, ...r, sentOrigin: e.headers.Origin ?? e.headers.origin ?? null }); });
  cdp.on('Network.responseReceived', e => { if (e.response.status >= 400 && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(e.response.url)) write({ kind: 'http-error', window, url: e.response.url.split('?')[0], status: e.response.status }); });
  write({ kind: 'attached', window });
};
for (const context of browser.contexts()) {
  for (const page of context.pages()) await attach(page);
  context.on('page', page => { attach(page).catch(error => write({ kind: 'attach-error', error: String(error) })); });
}
write({ kind: 'recorder-ready', contexts: browser.contexts().length });
const stop = async () => { write({ kind: 'recorder-stop' }); out.end(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
setInterval(async () => { for (const context of browser.contexts()) for (const page of context.pages()) await attach(page).catch(() => {}); }, 2000);
