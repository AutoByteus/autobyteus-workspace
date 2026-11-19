/**
 * The network boundary of the demo build (autobyteus-279): the only place that touches the page's network primitives.
 *
 * - `fetch` to the demo origin goes to the demo node; the page's own origin (the bundled build and Nuxt's app manifest),
 *   `blob:` and `data:` go to the real `fetch`; every other origin is refused with a `TypeError`, as an offline fetch is.
 * - `WebSocket` to the demo origin is a socket the demo node serves; any other address is refused.
 *
 * Installed before the Apollo plugin, whose `HttpLink` captures `globalThis.fetch` when it is created.
 */
import { DEMO_ORIGIN } from './demoIdentity';

/** What the demo node serves through the transport. */
export type DemoNodeEndpoint = {
  http(request: Request): Promise<Response>;
  /** A stream session for one socket: `received` is called with each client message, `send` delivers to the page. */
  stream(url: URL, send: (data: string | Uint8Array) => void, close: (code: number, reason: string) => void): DemoStreamSession;
};
export type DemoStreamSession = {
  opened?(): void;
  received(data: string | ArrayBuffer | ArrayBufferView | Blob): void;
  closed?(): void;
};

const targetUrl = (input: RequestInfo | URL): URL => new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, globalThis.location?.href);
const isDemoAddress = (url: URL): boolean => url.origin.replace(/^ws/, 'http') === DEMO_ORIGIN;

type Listener = ((event: Event) => void) | null;

/**
 * A WebSocket the demo node answers, with the browser's events and `on*` handlers. It is installed as
 * `globalThis.WebSocket` itself, not a subclass of it: noVNC's `Websock.attach` looks for `send`, `close`, `binaryType`,
 * `on*`, `protocol` and `readyState` among a socket's own keys and its immediate prototype only (R-002 check).
 */
export const createDemoSocketClass = (node: DemoNodeEndpoint) => class DemoSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readonly url: string;
  readyState = 0;
  binaryType: BinaryType = 'blob';
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  onopen: Listener = null;
  onmessage: Listener = null;
  onerror: Listener = null;
  onclose: Listener = null;
  private readonly session: DemoStreamSession;

  constructor(url: string | URL, _protocols?: string | string[]) {
    super();
    const parsed = targetUrl(url);
    if (!isDemoAddress(parsed)) throw new DOMException(`The demo has no network: ${parsed.origin}`, 'SecurityError');
    this.url = parsed.href;
    this.session = node.stream(parsed, (data) => this.deliver(data), (code, reason) => this.finish(code, reason));
    setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.emit('open', new Event('open'));
      this.session.opened?.();
    }, 0);
  }

  send(data: string | ArrayBuffer | ArrayBufferView | Blob): void {
    if (this.readyState !== 1) throw new DOMException('The socket is not open', 'InvalidStateError');
    this.session.received(data);
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState >= 2) return;
    this.readyState = 2;
    this.session.closed?.();
    this.finish(code, reason);
  }

  private emit(type: 'open' | 'message' | 'error' | 'close', event: Event): void {
    this.dispatchEvent(event);
    const handler = this[`on${type}`];
    if (handler) handler.call(this, event);
  }

  private deliver(data: string | Uint8Array): void {
    if (this.readyState !== 1) return;
    const payload = typeof data === 'string' ? data
      : this.binaryType === 'arraybuffer' ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      : new Blob([new Uint8Array(data)]);
    setTimeout(() => { if (this.readyState === 1) this.emit('message', new MessageEvent('message', { data: payload })); }, 0);
  }

  private finish(code: number, reason: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    setTimeout(() => this.emit('close', new CloseEvent('close', { code, reason, wasClean: true })), 0);
  }
};

/** Replaces the page's `fetch` and `WebSocket` with the demo's (see the module comment). */
export const installDemoTransport = (node: DemoNodeEndpoint): void => {
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = targetUrl(input);
    if (isDemoAddress(url)) return node.http(new Request(input, init));
    if (url.origin === globalThis.location?.origin || url.protocol === 'blob:' || url.protocol === 'data:') return realFetch(input, init);
    return Promise.reject(new TypeError(`The demo has no network: ${url.origin}`));
  };
  globalThis.WebSocket = createDemoSocketClass(node) as unknown as typeof WebSocket;
};
