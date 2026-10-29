/**
 * HttpManagedMcpServer against a real streamable HTTP MCP server.
 *
 * Purpose: prove that the configured credentials (headers, or the token sent as
 * `Authorization: Bearer <token>`) reach the remote server on every request, that the
 * client keeps the 2025 `initialize` handshake (no `server/discover` probe), and that a
 * server paging `tools/list` has all its tools listed, and that a connect the server answers
 * with an HTTP error fails with the status first in the message (`HTTP 401 Unauthorized: …`),
 * using the real `@modelcontextprotocol/client` and the `@modelcontextprotocol/server`/`node`
 * packages (no SDK mock).
 * Prerequisites: none. The server is in-process on 127.0.0.1 with an OS-assigned port.
 * Values: dummy only (`test-dummy`).
 * Command: pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/http-managed-mcp-server.test.ts
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { SdkHttpError } from '@modelcontextprotocol/client';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer, Server } from '@modelcontextprotocol/server';
import { HttpManagedMcpServer } from '../../../../src/tools/mcp/server/http-managed-mcp-server.js';
import { ServerState } from '../../../../src/tools/mcp/server/base-managed-mcp-server.js';
import { StreamableHttpMcpServerConfig } from '../../../../src/tools/mcp/types.js';

type ReceivedRequest = {
  httpMethod: string;
  rpcMethod: string | null;
  headers: http.IncomingHttpHeaders;
};

type LocalMcpServer = {
  url: string;
  received: ReceivedRequest[];
  close: () => Promise<void>;
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const rpcMethodOf = (body: unknown): string | null =>
  body && typeof body === 'object' && 'method' in body && typeof (body as { method: unknown }).method === 'string'
    ? (body as { method: string }).method
    : null;

const listenOnLocalPort = async (httpServer: http.Server): Promise<{ origin: string; close: () => Promise<void> }> => {
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.closeAllConnections();
        httpServer.close(() => resolve());
      })
  };
};

/**
 * Starts a stateless MCP server with one `echo` tool. When `requiredHeader` is set,
 * every request without exactly that header value is answered with 401. A request
 * whose path is a key of `redirects` is answered with a 307 to the mapped location.
 */
const startLocalMcpServer = async (
  requiredHeader?: { name: string; value: string },
  redirects: Record<string, string> = {}
): Promise<LocalMcpServer> => {
  const received: ReceivedRequest[] = [];
  const httpServer = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : undefined;
    received.push({ httpMethod: req.method ?? '', rpcMethod: rpcMethodOf(body), headers: req.headers });

    const redirectTo = redirects[req.url ?? ''];
    if (redirectTo) {
      res.writeHead(307, { location: redirectTo }).end();
      return;
    }

    if (requiredHeader && req.headers[requiredHeader.name.toLowerCase()] !== requiredHeader.value) {
      res.writeHead(401, { 'content-type': 'text/plain' }).end('unauthorized');
      return;
    }

    const mcp = new McpServer({ name: 'local-test-server', version: '1.0.0' });
    mcp.registerTool('echo', { description: 'Answers pong.' }, async () => ({ content: [{ type: 'text', text: 'pong' }] }));
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void mcp.close();
    });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, body);
  });

  const { origin, close } = await listenOnLocalPort(httpServer);
  return { url: `${origin}/mcp`, received, close };
};

/**
 * Starts a stateless MCP server (the SDK's low-level `Server`) whose `tools/list` answers in
 * two pages: `page_one_*` with a `nextCursor`, then `page_two_*` for that cursor.
 */
const startPagingMcpServer = async (): Promise<LocalMcpServer> => {
  const received: ReceivedRequest[] = [];
  const httpServer = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : undefined;
    received.push({ httpMethod: req.method ?? '', rpcMethod: rpcMethodOf(body), headers: req.headers });

    const server = new Server({ name: 'paging-test-server', version: '1.0.0' }, { capabilities: { tools: {} } });
    server.setRequestHandler('tools/list', async (request) => {
      const tool = (name: string) => ({ name, inputSchema: { type: 'object' as const } });
      return request.params?.cursor === 'page-two'
        ? { tools: [tool('page_two_a'), tool('page_two_b')] }
        : { tools: [tool('page_one_a'), tool('page_one_b')], nextCursor: 'page-two' };
    });
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  });

  const { origin, close } = await listenOnLocalPort(httpServer);
  return { url: `${origin}/mcp`, received, close };
};

/** Starts a plain HTTP server that answers every request with a 307 to `target`. */
const startRedirector = async (target: string): Promise<LocalMcpServer> => {
  const received: ReceivedRequest[] = [];
  const httpServer = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    received.push({ httpMethod: req.method ?? '', rpcMethod: rpcMethodOf(rawBody ? JSON.parse(rawBody) : undefined), headers: req.headers });
    res.writeHead(307, { location: target }).end();
  });
  const { origin, close } = await listenOnLocalPort(httpServer);
  return { url: `${origin}/mcp`, received, close };
};

/** Starts a plain HTTP server that answers every request with `status` and, when given, a text `body`. */
const startStatusServer = async (status: number, body?: string): Promise<LocalMcpServer> => {
  const received: ReceivedRequest[] = [];
  const httpServer = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    received.push({ httpMethod: req.method ?? '', rpcMethod: rpcMethodOf(rawBody ? JSON.parse(rawBody) : undefined), headers: req.headers });
    if (body === undefined) {
      res.writeHead(status).end();
    } else {
      res.writeHead(status, { 'content-type': 'text/plain' }).end(body);
    }
  });
  const { origin, close } = await listenOnLocalPort(httpServer);
  return { url: `${origin}/mcp`, received, close };
};

/** A loopback URL on a port that was free a moment ago, so nothing listens there. */
const unusedLocalUrl = async (): Promise<string> => {
  const { origin, close } = await listenOnLocalPort(http.createServer());
  await close();
  return `${origin}/mcp`;
};

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (caught: unknown) => caught
  );

const rpcMethods = (received: ReceivedRequest[]): string[] =>
  received.map((request) => request.rpcMethod).filter((method): method is string => method !== null);

describe('HttpManagedMcpServer with a real streamable HTTP MCP server', () => {
  let localServer: LocalMcpServer | null = null;
  let client: HttpManagedMcpServer | null = null;

  afterEach(async () => {
    await client?.close();
    client = null;
    await localServer?.close();
    localServer = null;
  });

  const connectListAndCall = async (managed: HttpManagedMcpServer) => {
    await managed.connect();
    const tools = (await managed.listRemoteTools()) as Array<{ name: string }>;
    const result = (await managed.callTool('echo', {})) as { content: Array<{ text: string }> };
    return { tools, result };
  };

  it('sends configured headers on initialize, tool listing and tool call', async () => {
    localServer = await startLocalMcpServer({ name: 'Authorization', value: 'Basic test-dummy' });
    client = new HttpManagedMcpServer(
      new StreamableHttpMcpServerConfig({
        server_id: 'header-server',
        url: localServer.url,
        headers: { Authorization: 'Basic test-dummy', 'X-Test-Tenant': 'test-tenant' }
      })
    );

    const { tools, result } = await connectListAndCall(client);

    expect(tools.map((tool) => tool.name)).toEqual(['echo']);
    expect(result.content[0]?.text).toBe('pong');
    expect(rpcMethods(localServer.received)).toEqual(
      expect.arrayContaining(['initialize', 'tools/list', 'tools/call'])
    );
    for (const request of localServer.received) {
      expect(request.headers.authorization).toBe('Basic test-dummy');
      expect(request.headers['x-test-tenant']).toBe('test-tenant');
    }
  });

  it('sends the token as a Bearer Authorization header on every request', async () => {
    localServer = await startLocalMcpServer({ name: 'Authorization', value: 'Bearer test-dummy' });
    client = new HttpManagedMcpServer(
      new StreamableHttpMcpServerConfig({ server_id: 'token-server', url: localServer.url, token: 'test-dummy' })
    );

    const { tools, result } = await connectListAndCall(client);

    expect(tools.map((tool) => tool.name)).toEqual(['echo']);
    expect(result.content[0]?.text).toBe('pong');
    expect(rpcMethods(localServer.received)).toEqual(
      expect.arrayContaining(['initialize', 'tools/list', 'tools/call'])
    );
    for (const request of localServer.received) {
      expect(request.headers.authorization).toBe('Bearer test-dummy');
    }
  });

  it('connects to an unauthenticated server without sending an Authorization header', async () => {
    localServer = await startLocalMcpServer();
    client = new HttpManagedMcpServer(
      new StreamableHttpMcpServerConfig({ server_id: 'open-server', url: localServer.url, token: '   ' })
    );

    const { tools, result } = await connectListAndCall(client);

    expect(tools.map((tool) => tool.name)).toEqual(['echo']);
    expect(result.content[0]?.text).toBe('pong');
    expect(localServer.received.length).toBeGreaterThan(0);
    for (const request of localServer.received) {
      expect(request.headers.authorization).toBeUndefined();
    }
  });

  it('fails to connect when the server rejects the configured credential', async () => {
    localServer = await startLocalMcpServer({ name: 'Authorization', value: 'Bearer test-dummy' });
    client = new HttpManagedMcpServer(
      new StreamableHttpMcpServerConfig({ server_id: 'wrong-token-server', url: localServer.url, token: 'test-wrong' })
    );

    const error = await rejectionOf(client.connect());

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized');
    expect((error as Error).message).not.toContain('test-wrong');
    expect(client.connectionState).toBe(ServerState.FAILED);
    expect(localServer.received[0]?.headers.authorization).toBe('Bearer test-wrong');
  });

  it('connects with the 2025 initialize handshake and no server/discover probe', async () => {
    localServer = await startLocalMcpServer();
    client = new HttpManagedMcpServer(new StreamableHttpMcpServerConfig({ server_id: 'handshake-server', url: localServer.url }));

    await connectListAndCall(client);

    const methods = rpcMethods(localServer.received);
    expect(methods[0]).toBe('initialize');
    expect(methods).not.toContain('server/discover');
    const afterInitialize = localServer.received.filter((request) => request.rpcMethod !== 'initialize');
    expect(afterInitialize.length).toBeGreaterThan(0);
    for (const request of afterInitialize) {
      expect(request.headers['mcp-protocol-version']).toBe('2025-11-25');
    }
  });

  it('lists the tools of every page when the server pages tools/list', async () => {
    localServer = await startPagingMcpServer();
    client = new HttpManagedMcpServer(new StreamableHttpMcpServerConfig({ server_id: 'paging-server', url: localServer.url }));

    await client.connect();
    const tools = (await client.listRemoteTools()) as Array<{ name: string }>;

    expect(tools.map((tool) => tool.name)).toEqual(['page_one_a', 'page_one_b', 'page_two_a', 'page_two_b']);
    expect(rpcMethods(localServer.received).filter((method) => method === 'tools/list')).toHaveLength(2);
  });

  describe('HTTP error answers', () => {
    const connectFailure = async (url: string, serverId: string) => {
      client = new HttpManagedMcpServer(new StreamableHttpMcpServerConfig({ server_id: serverId, url, token: 'test-dummy' }));
      return await rejectionOf(client.connect());
    };

    it.each([
      [401, 'unauthorized', 'HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized'],
      [403, 'forbidden', 'HTTP 403 Forbidden: Error POSTing to endpoint: forbidden'],
      [404, 'Not Found', 'HTTP 404 Not Found: Error POSTing to endpoint: Not Found'],
      [500, 'Internal Server Error', 'HTTP 500 Internal Server Error: Error POSTing to endpoint: Internal Server Error']
    ])('fails to connect with the status first in the message when the server answers %i', async (status, body, expected) => {
      localServer = await startStatusServer(status, body);

      const error = await connectFailure(localServer.url, `status-${status}`);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(expected);
      expect((error as Error).message).not.toContain('test-dummy');
      const cause = (error as Error).cause;
      expect(SdkHttpError.isInstance(cause)).toBe(true);
      expect((cause as SdkHttpError).status).toBe(status);
      expect(client!.connectionState).toBe(ServerState.FAILED);
      expect(localServer.received[0]?.rpcMethod).toBe('initialize');
    });

    it('names the status of a 404 whose body is empty', async () => {
      localServer = await startStatusServer(404);

      const error = await connectFailure(localServer.url, 'status-404-empty');

      expect((error as Error).message).toBe('HTTP 404 Not Found: Error POSTing to endpoint: ');
    });

    it('keeps the message of a failure without an HTTP answer', async () => {
      const error = await connectFailure(await unusedLocalUrl(), 'refused');

      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toBe('fetch failed');
      expect(client!.connectionState).toBe(ServerState.FAILED);
    });

    it('fails a tool call that has to connect with the status in the message', async () => {
      localServer = await startStatusServer(401, 'unauthorized');
      client = new HttpManagedMcpServer(
        new StreamableHttpMcpServerConfig({ server_id: 'tool-call-401', url: localServer.url, token: 'test-dummy' })
      );

      const error = await rejectionOf(client.callTool('echo', {}));

      expect((error as Error).message).toBe('HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized');
      expect(client.connectionState).toBe(ServerState.FAILED);
    });
  });

  describe('redirects', () => {
    let redirector: LocalMcpServer | null = null;

    afterEach(async () => {
      await redirector?.close();
      redirector = null;
    });

    it('does not follow a redirect to another origin, so the credential never reaches it', async () => {
      // Server B is a working MCP server on a different port, so a different origin.
      localServer = await startLocalMcpServer();
      redirector = await startRedirector(localServer.url);
      client = new HttpManagedMcpServer(
        new StreamableHttpMcpServerConfig({ server_id: 'cross-origin', url: redirector.url, token: 'test-dummy' })
      );

      const error = await rejectionOf(client.connect());

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/^HTTP 307 Temporary Redirect: /);
      expect((error as Error).message).toContain(`Redirect to ${localServer.url} not followed`);
      expect((error as Error).message).toContain("(redirectPolicy: 'same-origin')");
      expect((error as Error).message).not.toContain('test-dummy');
      expect(client.connectionState).toBe(ServerState.FAILED);
      expect(redirector.received.length).toBeGreaterThan(0);
      expect(localServer.received).toHaveLength(0);
    });

    it('follows a redirect within the same origin', async () => {
      localServer = await startLocalMcpServer(
        { name: 'Authorization', value: 'Bearer test-dummy' },
        { '/old': '/mcp' }
      );
      client = new HttpManagedMcpServer(
        new StreamableHttpMcpServerConfig({
          server_id: 'same-origin',
          url: localServer.url.replace(/\/mcp$/, '/old'),
          token: 'test-dummy'
        })
      );

      const { tools, result } = await connectListAndCall(client);

      expect(tools.map((tool) => tool.name)).toEqual(['echo']);
      expect(result.content[0]?.text).toBe('pong');
      expect(rpcMethods(localServer.received)).toEqual(
        expect.arrayContaining(['initialize', 'tools/list', 'tools/call'])
      );
    });
  });
});
