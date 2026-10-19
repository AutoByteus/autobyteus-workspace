/**
 * HttpManagedMcpServer against a real streamable HTTP MCP server.
 *
 * Purpose: prove that the configured credentials (headers, or the token sent as
 * `Authorization: Bearer <token>`) reach the remote server on every request, using
 * the real `@modelcontextprotocol/sdk` client and server (no SDK mock).
 * Prerequisites: none. The server is in-process on 127.0.0.1 with an OS-assigned port.
 * Values: dummy only (`test-dummy`).
 * Command: pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/http-managed-mcp-server.test.ts
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
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
    mcp.tool('echo', async () => ({ content: [{ type: 'text', text: 'pong' }] }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
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

    const error = await client.connect().then(
      () => null,
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain('test-wrong');
    expect(client.connectionState).toBe(ServerState.FAILED);
    expect(localServer.received[0]?.headers.authorization).toBe('Bearer test-wrong');
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

      const error = await client.connect().then(
        () => null,
        (caught: unknown) => caught
      );

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/redirect/i);
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
