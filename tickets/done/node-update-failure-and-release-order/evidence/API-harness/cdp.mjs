// autobyteus-412 API/E2E harness: minimal Chrome DevTools Protocol driver for the isolated instance's window.
// Usage:
//   node cdp.mjs <controlPort> eval '<js expression (may return a promise)>'
//   node cdp.mjs <controlPort> shot <out.png>
import fs from 'node:fs';

const [port, command, arg] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === 'page' && t.url.includes('/renderer/index.html')) ?? targets.find((t) => t.type === 'page');
if (!page) { console.error('no page target', JSON.stringify(targets)); process.exit(3); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
};
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });

if (command === 'eval') {
  const result = await send('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.result?.exceptionDetails) { console.error(JSON.stringify(result.result.exceptionDetails, null, 1)); process.exitCode = 1; }
  else console.log(JSON.stringify(result.result?.result?.value ?? null, null, 1));
} else if (command === 'shot') {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(arg, Buffer.from(result.result.data, 'base64'));
  console.log(`wrote ${arg}`);
} else {
  console.error('unknown command'); process.exitCode = 2;
}
ws.close();
