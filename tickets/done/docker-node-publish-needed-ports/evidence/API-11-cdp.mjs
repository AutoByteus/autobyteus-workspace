// Minimal CDP helper for the isolated instance (autobyteus-402 API-11).
// Usage: node cdp.mjs <ws package.json> <controlPort> list
//        node cdp.mjs <ws package.json> <controlPort> eval <targetIdOrUrlSubstring> <js expression (may return a Promise)>
//        node cdp.mjs <ws package.json> <controlPort> shot <targetIdOrUrlSubstring> <out.png>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [port, cmd, target, arg] = process.argv.slice(3);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
if (cmd === 'list') { console.log(JSON.stringify(targets.map(t => ({ id: t.id, type: t.type, title: t.title, url: t.url })), null, 2)); process.exit(0); }
const pages = targets.filter(t => t.type === 'page' && (t.id === target || t.url.includes(target)));
if (pages.length !== 1) { console.error('target match count', pages.length, JSON.stringify(targets.map(t => [t.id, t.url]))); process.exit(2); }
const ws = new WebSocket(pages[0].webSocketDebuggerUrl, { perMessageDeflate: false });
let id = 0; const pending = new Map();
ws.on('message', (m) => { const d = JSON.parse(m); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise((r) => ws.on('open', r));
if (cmd === 'eval') {
  const res = await send('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true, userGesture: true });
  console.log(JSON.stringify(res.result?.result?.value ?? res.result, null, 2));
} else if (cmd === 'shot') {
  const res = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(arg, Buffer.from(res.result.data, 'base64')); console.log('wrote', arg);
}
ws.close();
