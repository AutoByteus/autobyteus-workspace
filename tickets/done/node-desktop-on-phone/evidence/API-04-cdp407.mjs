// autobyteus-407 API/E2E: the app WebView's /mobile page through WebView DevTools (adb-forwarded).
// Usage: node cdp407.mjs <port> eval <expression (may return a Promise)>
//        node cdp407.mjs <port> click <css selector>        -> real mouse click (Input.dispatchMouseEvent) at the element's centre
//        node cdp407.mjs <port> tap <x> <y>                  -> one touch tap at CSS px
//        node cdp407.mjs <port> rect <css selector>          -> element rect JSON
// Node 22 built-in WebSocket; tokens redacted in printed URLs.
const [port, cmd, ...rest] = process.argv.slice(2);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('/mobile'));
if (!page) throw new Error(`no /mobile page in ${JSON.stringify(pages.map((p) => p.url.replace(/(pairing|access_token)=[^&#]+/g, '$1=<r>')))}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const send = (method, params = {}) => new Promise((resolve) => {
  const callId = ++id;
  const onMessage = (event) => { const m = JSON.parse(event.data); if (m.id !== callId) return; ws.removeEventListener('message', onMessage); resolve(m); };
  ws.addEventListener('message', onMessage);
  ws.send(JSON.stringify({ id: callId, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description ?? null;
};
const rectOf = (sel) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (cmd === 'eval') {
  const v = await evaluate(rest[0]);
  console.log(typeof v === 'string' ? v.replace(/(pairing|access_token)=[^&#"]+/g, '$1=<redacted>') : JSON.stringify(v));
} else if (cmd === 'rect') {
  console.log(JSON.stringify(await rectOf(rest[0])));
} else if (cmd === 'click') {
  const r = await rectOf(rest[0]);
  if (!r) { console.log(`not found: ${rest[0]}`); process.exit(1); }
  const x = r.x + r.w / 2, y = r.y + r.h / 2;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  console.log(`clicked ${rest[0]} at ${Math.round(x)},${Math.round(y)}`);
} else if (cmd === 'tap') {
  const [x, y] = rest.map(Number);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await sleep(40);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  console.log(`tapped ${x},${y}`);
}
ws.close();
