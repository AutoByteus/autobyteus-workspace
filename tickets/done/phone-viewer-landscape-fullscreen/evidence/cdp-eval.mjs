// autobyteus-407: evaluate one expression in the app WebView's /mobile page (Node 22 built-in WebSocket).
// Usage: node cdp-eval.mjs <devtools http port> '<expression>'
const [port, expression] = process.argv.slice(2);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('/mobile'));
if (!page) throw new Error(`no /mobile page in ${JSON.stringify(pages.map((p) => p.url))}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
const result = await new Promise((resolve) => {
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id === 1) resolve(message.result);
  });
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
});
console.log(JSON.stringify(result?.result?.value ?? result));
ws.close();
