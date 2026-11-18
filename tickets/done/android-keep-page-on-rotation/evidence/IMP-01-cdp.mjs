// autobyteus-415: read (and optionally set) the app WebView page's state through DevTools.
// Usage: node cdp.mjs <devtools http port> [mark <value>]   (Node 22 built-in WebSocket)
const [port, action, value] = process.argv.slice(2);

const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('/mobile'));
if (!page) throw new Error(`no /mobile page in ${JSON.stringify(pages.map((p) => p.url))}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const evaluate = (expression) => new Promise((resolve) => {
  const callId = ++id;
  const onMessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== callId) return;
    ws.removeEventListener('message', onMessage);
    resolve(message.result?.result?.value);
  };
  ws.addEventListener('message', onMessage);
  ws.send(JSON.stringify({ id: callId, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
});
if (action === 'mark') await evaluate(`window.__abx415Marker = ${JSON.stringify(value)}; true`);
const state = await evaluate(`({
  href: location.href.replace(/([?&](pairing|access_token)=)[^&#]+/g, '$1<redacted>'),
  marker: window.__abx415Marker ?? null,
  navigationStart: Math.round(performance.timeOrigin),
  navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null,
  viewport: innerWidth + 'x' + innerHeight,
  heading: document.querySelector('h1,h2')?.textContent?.trim() ?? null,
})`);
console.log(JSON.stringify(state));
ws.close();
