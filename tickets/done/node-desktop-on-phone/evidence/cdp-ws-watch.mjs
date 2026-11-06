// autobyteus-407: run an expression in the /mobile page and report the WebSockets it opens (token redacted).
// Usage: node cdp-ws-watch.mjs <port> '<expression>' <watch ms> '<status expression>'
const [port, expression, watchMs, statusExpression] = process.argv.slice(2);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('/mobile'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const events = [];
const redact = (url) => url.replace(/(access_token|token|credential)=[^&]+/gi, '$1=<redacted>');
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id) return pending.get(message.id)?.(message);
  const t = Date.now();
  if (message.method === 'Network.webSocketCreated') events.push({ t, event: 'created', url: redact(message.params.url) });
  if (message.method === 'Network.webSocketHandshakeResponseReceived') events.push({ t, event: 'handshake', status: message.params.response.status });
  if (message.method === 'Network.webSocketClosed') events.push({ t, event: 'closed' });
  if (message.method === 'Network.webSocketFrameError') events.push({ t, event: 'frame-error', message: message.params.errorMessage });
});
const send = (method, params) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Network.enable', {});
const started = Date.now();
await send('Runtime.evaluate', { expression, awaitPromise: true });
await new Promise((resolve) => setTimeout(resolve, Number(watchMs)));
const status = await send('Runtime.evaluate', { expression: statusExpression, returnByValue: true });
console.log(JSON.stringify({ events: events.map((e) => ({ ...e, t: e.t - started })), status: status.result?.result?.value }, null, 1));
ws.close();
