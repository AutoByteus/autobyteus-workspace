// autobyteus-407: drive real touch input in the app WebView via CDP Input.dispatchTouchEvent.
// Usage: node cdp-touch.mjs <port> pinch <cx> <cy> <fromHalf> <toHalf>   (CSS px, horizontal pinch)
//        node cdp-touch.mjs <port> drag <x1> <y1> <x2> <y2>
//        node cdp-touch.mjs <port> doubletap <x> <y>
const [port, kind, ...raw] = process.argv.slice(2);
const n = raw.map(Number);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('/mobile'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  pending.get(message.id)?.(message);
});
const send = (method, params) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
const touch = (type, points) => send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const steps = 8;
if (kind === 'pinch') {
  const [cx, cy, from, to] = n;
  await touch('touchStart', [[cx - from, cy]]);
  await touch('touchStart', [[cx - from, cy], [cx + from, cy]]);
  for (let s = 1; s <= steps; s++) {
    const h = from + ((to - from) * s) / steps;
    await touch('touchMove', [[cx - h, cy], [cx + h, cy]]);
    await sleep(16);
  }
  await touch('touchEnd', []);
} else if (kind === 'drag') {
  const [x1, y1, x2, y2] = n;
  await touch('touchStart', [[x1, y1]]);
  for (let s = 1; s <= steps; s++) { await touch('touchMove', [[x1 + ((x2 - x1) * s) / steps, y1 + ((y2 - y1) * s) / steps]]); await sleep(16); }
  await touch('touchEnd', []);
} else if (kind === 'doubletap') {
  const [x, y] = n;
  for (let i = 0; i < 2; i++) { await touch('touchStart', [[x, y]]); await touch('touchEnd', []); await sleep(90); }
}
console.log('ok');
ws.close();
