/**
 * The demo node (autobyteus-279): answers the node's own protocol from the sample world inside the page.
 *
 * - GraphQL by operation name (`graphql/*`), each answer typed with its operation's generated result.
 * - REST by method and path (`rest/*`).
 * - WebSocket streams by route (`streams/*`).
 *
 * An operation, path or route without a handler is a loud error: it is logged and answered with a GraphQL error (or a
 * 404 / a closed socket), which the sweep and the contract tests catch. Never a silent empty answer.
 */
import type { DemoNodeEndpoint, DemoStreamSession } from './demoTransport';
import { DEMO_SESSION_TOKEN } from './demoIdentity';
import { demoGraphqlHandlers } from './graphql';
import type { DemoOperationName } from './graphql/operations';
import { demoRestRoutes } from './rest';
import { openDemoStream } from './streams';
import type { DemoWorld } from './world/DemoWorld';

type GraphqlBody = { operationName?: string | null; query?: string; variables?: Record<string, unknown> | null };

const operationNameOf = (body: GraphqlBody): string =>
  body.operationName || /\b(?:query|mutation|subscription)\s+([A-Za-z0-9_]+)/.exec(body.query ?? '')?.[1] || 'AnonymousOperation';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export class DemoNode implements DemoNodeEndpoint {
  private current: DemoWorld | null = null;

  /** The world the node answers from; a fresh one on each start of the demo. */
  start(world: DemoWorld): void { this.current = world; }

  get world(): DemoWorld {
    if (!this.current) throw new Error('[demo] the demo node has no world yet');
    return this.current;
  }

  async http(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // Only the demo session reaches the demo node; any other credential is refused as a node refuses it.
    if (url.pathname !== '/rest/health' && !this.authorized(request, url)) return json({ error: 'unauthorized' }, 401);
    if (url.pathname === '/graphql' && request.method === 'POST') return this.graphql(await request.json() as GraphqlBody);
    const route = demoRestRoutes.find((candidate) => candidate.method === request.method && candidate.match(url));
    if (!route) return this.unknown(`REST ${request.method} ${url.pathname}`, json({ error: 'not found' }, 404));
    return route.answer(url, request, this.world);
  }

  stream(url: URL, send: (data: string | Uint8Array) => void, close: (code: number, reason: string) => void): DemoStreamSession {
    if (url.searchParams.get('access_token') !== DEMO_SESSION_TOKEN) {
      setTimeout(() => close(4001, 'unauthorized'), 0);
      return { received: () => undefined };
    }
    const session = openDemoStream(url, this.world, send, close);
    if (session) return session;
    console.error(`[demo] no stream for ${url.pathname}`);
    setTimeout(() => close(1008, 'unknown demo route'), 0);
    return { received: () => undefined };
  }

  private authorized(request: Request, url: URL): boolean {
    // The phone sends its credential as a Bearer header (`authorizedTransport.ts`), or as `access_token` on a socket or
    // a resource URL (`websocketAuth.ts`).
    return request.headers.get('authorization') === `Bearer ${DEMO_SESSION_TOKEN}` || url.searchParams.get('access_token') === DEMO_SESSION_TOKEN;
  }

  private async graphql(body: GraphqlBody): Promise<Response> {
    const name = operationNameOf(body);
    const handler = (demoGraphqlHandlers as Partial<Record<string, (variables: unknown, world: DemoWorld) => unknown>>)[name as DemoOperationName];
    if (!handler) return this.unknown(`GraphQL ${name}`, json({ data: null, errors: [{ message: `The demo node has no answer for ${name}.` }] }));
    try {
      return json({ data: await handler(body.variables ?? {}, this.world) });
    } catch (error) {
      console.error(`[demo] GraphQL ${name} failed`, error);
      return json({ data: null, errors: [{ message: error instanceof Error ? error.message : String(error) }] });
    }
  }

  private unknown(what: string, response: Response): Response {
    console.error(`[demo] no handler for ${what}`);
    return response;
  }
}
