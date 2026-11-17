// autobyteus-522 API/E2E (temporary): RU-03 / R-001. With the app on a peer run's Settings, records every text the remote
// sentence (`mobile-run-settings-remote`) shows from the first frame of a reload (a script added before the document loads,
// over the WebView's DevTools socket, Page.addScriptToEvaluateOnNewDocument), then reloads the page and reads the record.
// Usage: node reload-sample.mjs [waitMs]   Prints JSON.
import { evaluate, adb, sleep } from './droid.mjs';
const PORT = 9522; const waitMs = Number(process.argv[2] ?? 15000);
const RECORDER = `(() => { const t0 = performance.now(); const log = []; const seen = new Set();
  const take = () => { const el = document.querySelector('[data-testid="mobile-run-settings-remote"]'); const text = el ? el.textContent.trim() : null;
    const key = String(text); if (!seen.has(key)) { seen.add(key); log.push({ at: Math.round(performance.now() - t0), text }); sessionStorage.setItem('__remoteLog', JSON.stringify(log)); } };
  new MutationObserver(take).observe(document, { subtree: true, childList: true, characterData: true }); take(); })()`;
await evaluate('1'); // forwards the socket
const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const target = list.find((t) => t.type === 'page' && t.url.includes('/mobile'));
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const call = (method, params = {}) => new Promise((r) => { const my = ++id; ws.addEventListener('message', function on(e) { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener('message', on); r(m); } }); ws.send(JSON.stringify({ id: my, method, params })); });
await call('Page.enable');
const added = await call('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
await call('Runtime.evaluate', { expression: "sessionStorage.removeItem('__remoteLog')" });
const before = (await call('Runtime.evaluate', { expression: "location.search.replace(/pairing=[^&]*/, 'pairing=…')", returnByValue: true })).result?.result?.value;
await call('Page.reload', {});
// The added script lives as long as this DevTools session: keep it open until the reload has been sampled.
await sleep(waitMs); ws.close();
const after = await evaluate(`({ url: location.search.replace(/pairing=[^&]*/, 'pairing=…'), log: JSON.parse(sessionStorage.getItem('__remoteLog') ?? '[]'),
  final: document.querySelector('[data-testid="mobile-run-settings-remote"]')?.textContent.trim() ?? null,
  chip: document.querySelector('[data-testid="mobile-run-settings"] [data-testid*="remote"]')?.getAttribute('data-testid') ?? null })`);
console.log(JSON.stringify({ before, identifier: added.result?.identifier ?? null, ...after }, null, 1));
