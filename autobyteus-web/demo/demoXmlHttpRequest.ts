/**
 * The page's `XMLHttpRequest` in the demo build (autobyteus-279), part of the network boundary (`demoTransport.ts`): the
 * phone's REST client (axios, `services/api.ts`) sends through it. A request to the demo origin is answered by the demo
 * node, with the events a browser sends (upload progress, `readystatechange`, `load`, `loadend`); the page's own origin,
 * `blob:` and `data:` are the real request; any other address fails as an offline request does (`error`, status 0).
 *
 * A subclass of the real class, so every request that is not the demo node's is the browser's own.
 */
import type { DemoNodeEndpoint } from './demoTransport';

type Mode = 'native' | 'demo' | 'refused';

export const createDemoXmlHttpRequestClass = (
  node: DemoNodeEndpoint,
  isDemoAddress: (url: URL) => boolean,
  RealXMLHttpRequest: typeof XMLHttpRequest,
) => class DemoXMLHttpRequest extends RealXMLHttpRequest {
  private mode: Mode = 'native';
  private method = 'GET';
  private url: URL | null = null;
  private readonly headers = new Headers();
  private demoState = 0;
  private answer: Response | null = null;
  private answerBody: unknown = null;
  private answerText = '';
  private aborted = false;

  override open(method: string, url: string | URL, async = true, username?: string | null, password?: string | null): void {
    const target = new URL(String(url), globalThis.location?.href);
    const native = target.origin === globalThis.location?.origin || target.protocol === 'blob:' || target.protocol === 'data:';
    this.mode = isDemoAddress(target) ? 'demo' : native ? 'native' : 'refused';
    if (this.mode === 'native') { super.open(method, url, async, username, password); return; }
    this.method = method.toUpperCase();
    this.url = target;
    this.setState(1);
  }

  override setRequestHeader(name: string, value: string): void {
    if (this.mode === 'native') super.setRequestHeader(name, value);
    else this.headers.set(name, value);
  }

  override send(body?: Document | XMLHttpRequestBodyInit | null): void {
    if (this.mode === 'native') { super.send(body); return; }
    if (this.mode === 'refused') {
      setTimeout(() => this.finish(['error', 'loadend']), 0);
      return;
    }
    void this.sendToDemo(body ?? null);
  }

  override abort(): void {
    if (this.mode === 'native') { super.abort(); return; }
    if (this.demoState === 4 || this.aborted) return;
    this.aborted = true;
    this.finish(['abort', 'loadend']);
  }

  override get readyState(): number { return this.mode === 'native' ? super.readyState : this.demoState; }
  override get status(): number { return this.mode === 'native' ? super.status : this.answer?.status ?? 0; }
  override get statusText(): string { return this.mode === 'native' ? super.statusText : this.answer?.statusText ?? ''; }
  override get responseURL(): string { return this.mode === 'native' ? super.responseURL : this.answer ? this.url!.href : ''; }
  override get response(): unknown { return this.mode === 'native' ? super.response : this.answerBody; }
  override get responseText(): string { return this.mode === 'native' ? super.responseText : this.answerText; }

  override getResponseHeader(name: string): string | null {
    return this.mode === 'native' ? super.getResponseHeader(name) : this.answer?.headers.get(name) ?? null;
  }

  override getAllResponseHeaders(): string {
    if (this.mode === 'native') return super.getAllResponseHeaders();
    if (!this.answer) return '';
    return [...this.answer.headers].map(([name, value]) => `${name}: ${value}\r\n`).join('');
  }

  private async sendToDemo(body: Document | XMLHttpRequestBodyInit | null): Promise<void> {
    const request = new Request(this.url!.href, {
      method: this.method, headers: this.headers,
      body: this.method === 'GET' || this.method === 'HEAD' ? null : (body as BodyInit | null),
    });
    const size = Number(request.headers.get('content-length')) || (body instanceof Blob ? body.size : 0);
    if (this.method !== 'GET' && this.method !== 'HEAD') {
      this.upload.dispatchEvent(new ProgressEvent('progress', { lengthComputable: size > 0, loaded: size, total: size }));
    }
    let answer: Response;
    try {
      answer = await node.http(request);
    } catch {
      if (!this.aborted) this.finish(['error', 'loadend']);
      return;
    }
    if (this.aborted) return;
    this.answer = answer;
    this.setState(2);
    const kind = this.responseType;
    if (kind === 'arraybuffer') this.answerBody = await answer.arrayBuffer();
    else if (kind === 'blob') this.answerBody = await answer.blob();
    else {
      this.answerText = await answer.text();
      this.answerBody = kind === 'json' ? JSON.parse(this.answerText || 'null') : this.answerText;
    }
    if (this.aborted) return;
    this.setState(3);
    this.finish(['load', 'loadend']);
  }

  private setState(state: number): void {
    this.demoState = state;
    this.dispatchEvent(new Event('readystatechange'));
  }

  /** The request ends: DONE, then its events (`load`, `error` or `abort`, then `loadend`). */
  private finish(events: string[]): void {
    this.setState(4);
    for (const type of events) this.dispatchEvent(new ProgressEvent(type));
  }
};
