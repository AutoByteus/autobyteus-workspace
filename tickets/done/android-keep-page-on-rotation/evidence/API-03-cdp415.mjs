// autobyteus-415 API/E2E: the app WebView's /mobile page through WebView DevTools (adb-forwarded).
// Usage: node cdp415.mjs <port> state [mark <value>]       -> page state JSON (tokens redacted)
//        node cdp415.mjs <port> eval <expression>           -> value of an expression (may return a Promise)
//        node cdp415.mjs <port> watch <seconds> <out.jsonl> -> record Network WebSocket/request creations
//                                                              and page load events for <seconds>
// Node 22 built-in WebSocket.
import fs from 'node:fs';
const [port, cmd, ...rest] = process.argv.slice(2);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('/mobile'));
if (!page) throw new Error(`no /mobile page in ${JSON.stringify(pages.map((p) => p.url))}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let id = 0; const listeners = [];
ws.addEventListener('message', (event) => { const m = JSON.parse(event.data); if (!m.id) listeners.forEach((l) => l(m)); });
const send = (method, params = {}) => new Promise((resolve) => {
  const callId = ++id;
  const onMessage = (event) => { const m = JSON.parse(event.data); if (m.id !== callId) return; ws.removeEventListener('message', onMessage); resolve(m); };
  ws.addEventListener('message', onMessage);
  ws.send(JSON.stringify({ id: callId, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const redact = (u) => String(u).replace(/([?&](pairing|access_token)=)[^&#]+/g, '$1<redacted>');
if (cmd === 'state') {
  if (rest[0] === 'mark') await evaluate(`window.__abx415Marker = ${JSON.stringify(rest[1])}; true`);
  const state = await evaluate(`({
    href: location.href,
    marker: window.__abx415Marker ?? null,
    navigationStart: Math.round(performance.timeOrigin),
    viewport: innerWidth + 'x' + innerHeight,
    title: document.title,
    heading: document.querySelector('h1,h2')?.textContent?.trim() ?? null,
  })`);
  state.href = redact(state.href);
  console.log(JSON.stringify(state));
} else if (cmd === 'eval') {
  console.log(JSON.stringify(await evaluate(rest[0])));
} else if (cmd === 'watch') {
  const out = fs.createWriteStream(rest[1], { flags: 'a' });
  listeners.push((m) => {
    const t = new Date().toISOString();
    if (m.method === 'Network.webSocketCreated') out.write(JSON.stringify({ t, kind: 'websocket-created', url: redact(m.params.url) }) + '\n');
    if (m.method === 'Network.webSocketClosed') out.write(JSON.stringify({ t, kind: 'websocket-closed' }) + '\n');
    if (m.method === 'Network.requestWillBeSent' && m.params.type === 'Document') out.write(JSON.stringify({ t, kind: 'document-request', url: redact(m.params.request.url) }) + '\n');
    if (m.method === 'Page.loadEventFired') out.write(JSON.stringify({ t, kind: 'page-load' }) + '\n');
  });
  await send('Network.enable'); await send('Page.enable');
  out.write(JSON.stringify({ t: new Date().toISOString(), kind: 'watch-start' }) + '\n');
  await new Promise((r) => setTimeout(r, Number(rest[0]) * 1000));
  out.write(JSON.stringify({ t: new Date().toISOString(), kind: 'watch-end' }) + '\n');
  out.end();
}
ws.close();
