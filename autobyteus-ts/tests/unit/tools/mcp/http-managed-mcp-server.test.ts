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

/**
 * Starts a stateless MCP server with one `echo` tool. When `requiredHeader` is set,
 * every request without exactly that header value is answered with 401.
 */
const startLocalMcpServer = async (requiredHeader?: { name: string; value: string }): Promise<LocalMcpServer> => {
  const received: ReceivedRequest[] = [];
  const httpServer = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : undefined;
    received.push({ httpMethod: req.method ?? '', rpcMethod: rpcMethodOf(body), headers: req.headers });

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

  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/mcp`,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        httpServer.closeAllConnections();
        httpServer.close(() => resolve());
      })
  };
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
});
