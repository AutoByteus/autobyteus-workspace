// R-002 premise check (autobyteus-279, design-spec Risks R-002, widened by ARCH-REV-001 R-1). Test harness only, not
// product code. The page runs inside the harness app's WKWebView on `autobyteus-demo://app/` (a WKURLSchemeHandler over
// the bundled build, a non-persistent data store, a content rule list blocking http(s)/ws(s)) and reports each check to
// the app (`webkit.messageHandlers.r002`).
//
// Checks: the secure context and crypto.randomUUID on the custom scheme; module scripts and a dynamic import (JavaScript
// MIME types from the handler); the deep-path fallback to 200.html; the page's own origin, blob: and data: through the
// real fetch after the transport is installed; any other network origin refused; Apollo's HttpLink (fetch captured at
// creation, as plugins/30.apollo.client.ts does) answered by the demo node; a stream socket (`new WebSocket`, events and
// on* handlers); noVNC's RFB over a socket the page built itself (as composables/useVncSession.ts does); localStorage in the
// non-persistent store, and empty again in a new store.
const DEMO_ORIGIN = 'https://demo.autobyteus.invalid';
const results = { location: location.href, userAgent: navigator.userAgent, checks: {} };
const run = new URLSearchParams(location.search).get('run') ?? '1';
const record = (name, ok, detail = null) => { results.checks[name] = { ok: Boolean(ok), detail }; };
const attempt = async (name, fn) => {
  try { const { ok, detail } = await fn(); record(name, ok, detail); }
  catch (error) { record(name, false, `${error?.name}: ${error?.message}`); }
};
const withTimeout = (promise, ms, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: no answer in ${ms} ms`)), ms))]);

// --- The demo node, as small as the checks need ---------------------------------------------------------------------
const demoHttp = async (request) => {
  const url = new URL(request.url);
  if (url.pathname === '/graphql' && request.method === 'POST') {
    const body = await request.json();
    if (body.operationName !== 'Ping') return Response.json({ errors: [{ message: `unknown operation ${body.operationName}` }] });
    return Response.json({ data: { ping: { __typename: 'Ping', id: '1', message: 'pong' } } });
  }
  return new Response('not found', { status: 404 });
};

const bytes = (data) => (data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new TextEncoder().encode(String(data)));

/** A WebSocket the demo node answers: EventTarget events and the on* handlers, as browsers deliver both. */
class DemoSocket extends EventTarget {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  CONNECTING = 0; OPEN = 1; CLOSING = 2; CLOSED = 3;
  constructor(url) {
    super();
    // The demo origin only: any other socket address is refused (no network from the demo).
    const parsed = new URL(String(url), location.href);
    if (parsed.origin.replace(/^ws/, 'http') !== DEMO_ORIGIN) throw new DOMException('Offline', 'SecurityError');
    this.url = parsed.href;
    this.readyState = 0; this.binaryType = 'blob'; this.protocol = ''; this.extensions = ''; this.bufferedAmount = 0;
    this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null;
    this.session = demoStream(new URL(this.url), (data) => this.deliver(data));
    setTimeout(() => { this.readyState = 1; this.emit('open', new Event('open')); this.session.opened?.(); }, 0);
  }
  emit(type, event) { this.dispatchEvent(event); this[`on${type}`]?.(event); }
  deliver(data) {
    if (this.readyState !== 1) return;
    const payload = typeof data === 'string' ? data : this.binaryType === 'arraybuffer' ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : new Blob([data]);
    setTimeout(() => this.emit('message', new MessageEvent('message', { data: payload })), 0);
  }
  send(data) { if (this.readyState === 1) this.session.received(data); }
  close(code = 1000, reason = '') {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    setTimeout(() => this.emit('close', new CloseEvent('close', { code, reason, wasClean: true })), 0);
  }
}

/** Streams by route: an echo of the stream protocol's shape, and a minimal RFB 3.8 server for the node desktop. */
const demoStream = (url, send) => {
  if (url.pathname.startsWith('/ws/node-desktop')) return rfbServer(send);
  return {
    received: (data) => {
      const message = JSON.parse(data);
      send(JSON.stringify({ type: 'SEND_MESSAGE_ACK', payload: { accepted: true, client_message_id: message.payload?.client_message_id } }));
    },
  };
};

const rfbServer = (send) => {
  const width = 64, height = 40;
  let state = 'version', buffered = new Uint8Array(0), framesSent = 0;
  const take = (count) => { const head = buffered.slice(0, count); buffered = buffered.slice(count); return head; };
  const serverInit = () => {
    const name = new TextEncoder().encode('Demo desktop');
    const message = new Uint8Array(24 + name.length);
    const view = new DataView(message.buffer);
    view.setUint16(0, width); view.setUint16(2, height);
    message.set([32, 24, 0, 1], 4); view.setUint16(8, 255); view.setUint16(10, 255); view.setUint16(12, 255); message.set([16, 8, 0], 14);
    view.setUint32(20, name.length); message.set(name, 24);
    return message;
  };
  const frame = () => {
    const message = new Uint8Array(4 + 12 + width * height * 4);
    const view = new DataView(message.buffer);
    message[0] = 0; view.setUint16(2, 1); view.setUint16(8, width); view.setUint16(10, height); view.setInt32(12, 0);
    for (let pixel = 0; pixel < width * height; pixel += 1) message.set([0xe0, 0x7a, 0x3c, 0], 16 + pixel * 4);
    return message;
  };
  return {
    opened: () => send(new TextEncoder().encode('RFB 003.008\n')),
    received: (data) => {
      const next = bytes(data);
      const joined = new Uint8Array(buffered.length + next.length); joined.set(buffered); joined.set(next, buffered.length); buffered = joined;
      for (;;) {
        if (state === 'version' && buffered.length >= 12) { take(12); state = 'security'; send(new Uint8Array([1, 1])); continue; }
        if (state === 'security' && buffered.length >= 1) { take(1); state = 'init'; send(new Uint8Array([0, 0, 0, 0])); continue; }
        if (state === 'init' && buffered.length >= 1) { take(1); state = 'normal'; send(serverInit()); continue; }
        if (state === 'normal' && buffered.length >= 1) {
          const type = buffered[0];
          const size = type === 0 ? 20 : type === 2 ? (buffered.length >= 4 ? 4 + 4 * new DataView(buffered.buffer, buffered.byteOffset).getUint16(2) : Infinity)
            : type === 3 ? 10 : type === 4 ? 8 : type === 5 ? 6 : type === 6 ? (buffered.length >= 8 ? 8 + new DataView(buffered.buffer, buffered.byteOffset).getUint32(4) : Infinity) : buffered.length;
          if (buffered.length < size) break;
          take(size);
          if (type === 3 && framesSent === 0) { framesSent += 1; send(frame()); }
          continue;
        }
        break;
      }
    },
  };
};

/** The adapter at the page's network boundary (demoTransport): the demo origin to the demo node; the page's own origin,
 *  blob: and data: to the real fetch; any other origin refused as an offline fetch is. */
const installDemoTransport = () => {
  const realFetch = globalThis.fetch.bind(globalThis);
  const target = (input) => new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href);
  globalThis.fetch = (input, init) => {
    const url = target(input);
    if (url.origin === DEMO_ORIGIN) return demoHttp(new Request(input, init));
    if (url.origin === location.origin || url.protocol === 'blob:' || url.protocol === 'data:') return realFetch(input, init);
    return Promise.reject(new TypeError('Offline'));
  };
  const RealWebSocket = globalThis.WebSocket;
  // The class itself, not a subclass: noVNC's Websock.attach checks `send`, `close`, ... among the socket's own keys and
  // its immediate prototype only (core/websock.js attach), so the methods must be on that prototype.
  globalThis.WebSocket = DemoSocket;
  return { realFetch, RealWebSocket };
};

// --- The checks -----------------------------------------------------------------------------------------------------
const main = async () => {
  record('moduleScript', true, 'this module ran');
  record('isSecureContext', window.isSecureContext, String(window.isSecureContext));
  await attempt('randomUUID', async () => { const id = crypto.randomUUID(); return { ok: /^[0-9a-f-]{36}$/.test(id), detail: id }; });
  await attempt('dynamicImport', async () => { const lazy = await import('./lazy.js'); return { ok: lazy.value === 'lazy', detail: lazy.value }; });
  record('deepPathFallback', run !== '1' || location.pathname === '/deep/path/run', location.pathname);

  if (run === '1') {
    await attempt('localStorageWrite', async () => { localStorage.setItem('r002', 'kept'); return { ok: localStorage.getItem('r002') === 'kept', detail: localStorage.getItem('r002') }; });
  } else {
    await attempt('localStorageFreshInNewStore', async () => ({ ok: localStorage.getItem('r002') === null, detail: localStorage.getItem('r002') }));
  }

  const { realFetch } = installDemoTransport();
  await attempt('ownOriginFetchThroughTransport', async () => {
    const response = await fetch('/meta/latest.json');
    const body = await response.json();
    return { ok: response.ok && body.id === 'r002-own-origin', detail: { status: response.status, type: response.headers.get('content-type'), body } };
  });
  await attempt('blobFetch', async () => { const text = await (await fetch(URL.createObjectURL(new Blob(['blob-ok'])))).text(); return { ok: text === 'blob-ok', detail: text }; });
  await attempt('dataFetch', async () => { const text = await (await fetch('data:text/plain,data-ok')).text(); return { ok: text === 'data-ok', detail: text }; });
  await attempt('externalFetchRefused', async () => {
    try { await fetch('https://example.com/'); return { ok: false, detail: 'answered' }; }
    catch (error) { return { ok: error instanceof TypeError, detail: `${error.name}: ${error.message}` }; }
  });
  await attempt('externalBlockedBelowTransport', async () => {
    // The real fetch, behind the transport: the content rule list (the second guard) must stop it.
    try { await withTimeout(realFetch('https://example.com/'), 8000, 'real fetch'); return { ok: false, detail: 'answered' }; }
    catch (error) { return { ok: true, detail: `${error.name}: ${error.message}` }; }
  });

  await attempt('apolloThroughReplacedFetch', async () => {
    const { ApolloClient, HttpLink, InMemoryCache, gql } = await import('@apollo/client/core');
    const client = new ApolloClient({ link: new HttpLink({ uri: `${DEMO_ORIGIN}/graphql`, fetch: globalThis.fetch }), cache: new InMemoryCache() });
    const { data } = await withTimeout(client.query({ query: gql`query Ping { ping { id message } }` }), 5000, 'Apollo');
    return { ok: data?.ping?.message === 'pong', detail: data };
  });

  await attempt('streamSocket', async () => {
    const socket = new WebSocket('wss://demo.autobyteus.invalid/ws/agent/demo-run');
    const viaListener = new Promise((resolve) => socket.addEventListener('message', (event) => resolve(JSON.parse(event.data))));
    const viaHandler = new Promise((resolve) => { socket.onmessage = (event) => resolve(JSON.parse(event.data)); });
    await withTimeout(new Promise((resolve) => socket.addEventListener('open', resolve)), 3000, 'open');
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { client_message_id: 'm-1', content: 'hi' } }));
    const [a, b] = await withTimeout(Promise.all([viaListener, viaHandler]), 3000, 'message');
    socket.close();
    return { ok: a.type === 'SEND_MESSAGE_ACK' && b.payload.client_message_id === 'm-1', detail: a };
  });

  await attempt('noVncThroughReplacedWebSocket', async () => {
    const { default: RFB } = await import('@novnc/novnc');
    const socket = new WebSocket('wss://demo.autobyteus.invalid/ws/node-desktop?mode=view');
    let lastClose = null;
    socket.addEventListener('close', (event) => { lastClose = { code: event.code, reason: event.reason }; });
    const rfb = new RFB(document.getElementById('vnc'), socket, { shared: true });
    rfb.viewOnly = true;
    await withTimeout(new Promise((resolve, reject) => {
      rfb.addEventListener('connect', resolve);
      rfb.addEventListener('disconnect', (event) => reject(new Error(`disconnect ${JSON.stringify(event.detail)} ${JSON.stringify(lastClose)}`)));
    }), 5000, 'RFB connect');
    await new Promise((resolve) => setTimeout(resolve, 500));
    const canvas = document.querySelector('#vnc canvas');
    const pixel = canvas?.getContext('2d')?.getImageData(5, 5, 1, 1).data;
    rfb.disconnect();
    return { ok: Boolean(canvas) && pixel?.[0] > 150, detail: { canvas: canvas ? `${canvas.width}x${canvas.height}` : null, pixel: pixel ? Array.from(pixel) : null } };
  });

  results.allOk = Object.values(results.checks).every((check) => check.ok);
  document.getElementById('out').textContent = JSON.stringify(results, null, 2);
  window.webkit?.messageHandlers?.r002?.postMessage(JSON.stringify({ run, ...results }));
};

main().catch((error) => window.webkit?.messageHandlers?.r002?.postMessage(JSON.stringify({ run, fatal: `${error?.name}: ${error?.message}`, ...results })));
