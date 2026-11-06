// autobyteus-407 API/E2E: CDP eval/screenshot/list on an isolated desktop instance (Node 22 WebSocket).
// Usage: node ecdp.mjs <controlPort> list | eval <targetId|url-part> <expr> | shot <targetId|url-part> <out.png>
import fs from 'node:fs';
const [port, cmd, target, arg] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
if (cmd === 'list') { console.log(JSON.stringify(targets.filter((t) => t.type === 'page').map((t) => ({ id: t.id, url: t.url.slice(-40) })))); process.exit(0); }
const page = targets.find((t) => t.type === 'page' && (t.id === target || t.url.includes(target)));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); resolve(m); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method, params })); });
if (cmd === 'eval') { const r = await send('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true, userGesture: true }); console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description)); }
if (cmd === 'shot') { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(arg, Buffer.from(r.result.data, 'base64')); console.log('wrote', arg); }
ws.close();
