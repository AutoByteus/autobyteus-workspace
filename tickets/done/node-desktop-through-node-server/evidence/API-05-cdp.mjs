// CDP helper for the isolated desktop instance (autobyteus-405 API-05).
// Usage: node cdp.mjs <ws package.json> <controlPort> <command> [args]
//   list
//   eval <target> <js expression, may return a Promise>
//   shot <target> <out.png>
//   window <target> minimized|normal|maximized   (Browser.setWindowBounds on the target's window)
//   keys <target> <text>                          (Input.dispatchKeyEvent keyDown/keyUp per character; Enter for \n)
//   move <target> <x> <y>                         (Input.dispatchMouseEvent mouseMoved, viewport CSS px)
//   click <target> <x> <y>
//   netcapture <target> <out.jsonl> <seconds>     (Network.enable; logs request and WebSocket URLs)
// <target> is a target id or a substring of its URL.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [port, cmd, target, ...rest] = process.argv.slice(3);
const base = `http://127.0.0.1:${port}`;
const targets = await (await fetch(`${base}/json/list`)).json();
if (cmd === 'list') { console.log(JSON.stringify(targets.map((t) => ({ id: t.id, type: t.type, url: t.url })), null, 2)); process.exit(0); }
const pages = targets.filter((t) => t.type === 'page' && (t.id === target || t.url.includes(target)));
if (pages.length !== 1) { console.error('target match count', pages.length); process.exit(2); }
const page = pages[0];

const session = (url) => new Promise((resolve) => {
  const ws = new WebSocket(url, { perMessageDeflate: false });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.on('message', (m) => { const d = JSON.parse(m); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) listeners.forEach((l) => l(d)); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.on('open', () => resolve({ ws, send, on: (l) => listeners.push(l) }));
});

const s = await session(page.webSocketDebuggerUrl);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (cmd === 'eval') {
  const res = await s.send('Runtime.evaluate', { expression: rest[0], awaitPromise: true, returnByValue: true, userGesture: true });
  console.log(JSON.stringify(res.result?.result?.value ?? res.result?.exceptionDetails ?? res, null, 2));
} else if (cmd === 'shot') {
  const res = await s.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(rest[0], Buffer.from(res.result.data, 'base64')); console.log('wrote', rest[0]);
} else if (cmd === 'window') {
  const version = await (await fetch(`${base}/json/version`)).json();
  const b = await session(version.webSocketDebuggerUrl);
  const w = await b.send('Browser.getWindowForTarget', { targetId: page.id });
  if (!w.result) { console.log(JSON.stringify(w)); process.exit(3); }
  const r = await b.send('Browser.setWindowBounds', { windowId: w.result.windowId, bounds: { windowState: rest[0] } });
  await sleep(300);
  const after = await b.send('Browser.getWindowBounds', { windowId: w.result.windowId });
  console.log(JSON.stringify({ windowId: w.result.windowId, set: r.error ?? 'ok', bounds: after.result?.bounds }));
  b.ws.close();
} else if (cmd === 'keys') {
  for (const ch of rest[0]) {
    const isEnter = ch === '\n';
    const key = isEnter ? 'Enter' : ch;
    const code = isEnter ? 'Enter' : (/[a-z]/i.test(ch) ? `Key${ch.toUpperCase()}` : (/[0-9]/.test(ch) ? `Digit${ch}` : (ch === '-' ? 'Minus' : '')));
    const vk = isEnter ? 13 : (/[a-z]/i.test(ch) ? ch.toUpperCase().charCodeAt(0) : (/[0-9]/.test(ch) ? ch.charCodeAt(0) : (ch === '-' ? 189 : 0)));
    await s.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, text: isEnter ? '\r' : ch, unmodifiedText: isEnter ? '\r' : ch });
    await s.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
    await sleep(40);
  }
  console.log('typed', JSON.stringify(rest[0]));
} else if (cmd === 'move' || cmd === 'click') {
  const [x, y] = rest.map(Number);
  await s.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  if (cmd === 'click') {
    await s.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await s.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  console.log(cmd, x, y);
} else if (cmd === 'netcapture') {
  const out = fs.createWriteStream(rest[0], { flags: 'a' });
  s.on((d) => {
    const t = new Date().toISOString();
    if (d.method === 'Network.requestWillBeSent') out.write(JSON.stringify({ t, kind: 'request', method: d.params.request.method, url: d.params.request.url }) + '\n');
    if (d.method === 'Network.webSocketCreated') out.write(JSON.stringify({ t, kind: 'websocket', url: d.params.url }) + '\n');
    if (d.method === 'Network.webSocketClosed') out.write(JSON.stringify({ t, kind: 'websocket-closed', requestId: d.params.requestId }) + '\n');
  });
  await s.send('Network.enable');
  await sleep(Number(rest[1]) * 1000);
  out.end();
}
s.ws.close();
