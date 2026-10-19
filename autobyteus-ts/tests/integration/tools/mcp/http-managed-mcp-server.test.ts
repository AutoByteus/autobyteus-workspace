/**
 * HttpManagedMcpServer against the tiny real MCP test server, over streamable HTTP on a free port.
 *
 * Purpose: with the token, listing and calling work and the server saw `Authorization: Bearer <token>` on
 * every request (autobyteus-179); without the token, or with a wrong one, connecting fails with the server's
 * auth error. Implementations: Python via `uv` (skipped with the reason when `uv` cannot prepare it) and
 * Node (always). See `mcp-test-server-launcher.ts`.
 * Command: env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp
 * Values: dummy only (`test-dummy-token`); the server logs only whether auth was ok, missing or wrong.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { HttpManagedMcpServer } from '../../../../src/tools/mcp/server/http-managed-mcp-server.js';
import { ServerState } from '../../../../src/tools/mcp/server/base-managed-mcp-server.js';
import { StreamableHttpMcpServerConfig } from '../../../../src/tools/mcp/types.js';
import { prepareMcpTestServers, startHttpTestServer, type HttpTestServer } from './mcp-test-server-launcher.js';

type ToolResult = { content: Array<{ type: string; text: string }>; structuredContent?: unknown; isError?: boolean };

for (const { impl, available, reason } of prepareMcpTestServers()) {
  describe.skipIf(!available)(`HttpManagedMcpServer with the real MCP test server (${impl}${available ? '' : ` — skipped: ${reason}`})`, () => {
    let httpServer: HttpTestServer | null = null;
    let client: HttpManagedMcpServer | null = null;

    afterEach(async () => {
      await client?.close();
      client = null;
      await httpServer?.close();
      httpServer = null;
    });

    it('lists and calls tools with the token, which the server saw on every request', async () => {
      httpServer = await startHttpTestServer(impl);
      client = new HttpManagedMcpServer(
        new StreamableHttpMcpServerConfig({ server_id: `http-${impl}`, url: httpServer.url, token: httpServer.token })
      );

      const tools = (await client.listRemoteTools()) as Array<{ name: string }>;
      expect(tools.map((tool) => tool.name).sort()).toEqual(['add', 'echo', 'fail', 'report_env_and_cwd', 'slow']);
      const echo = (await client.callTool('echo', { text: 'hello' })) as ToolResult;
      expect(echo.content[0]?.text).toBe('hello');
      const add = (await client.callTool('add', { a: 2, b: 3 })) as ToolResult;
      expect(add.structuredContent).toEqual({ sum: 5 });
      const fail = (await client.callTool('fail', { message: 'dummy failure' })) as ToolResult;
      expect(fail.isError).toBe(true);

      const requests = httpServer.requests();
      expect(requests.length).toBeGreaterThanOrEqual(4);
      expect(requests.every((auth) => auth === 'ok')).toBe(true);
    });

    it.each([
      ['without a token', undefined, 'missing'],
      ['with a wrong token', 'test-wrong-token', 'wrong']
    ])('fails to connect %s', async (_label, token, expectedAuth) => {
      httpServer = await startHttpTestServer(impl);
      client = new HttpManagedMcpServer(
        new StreamableHttpMcpServerConfig({ server_id: `http-${impl}-denied`, url: httpServer.url, token })
      );

      const error = await client.connect().then(() => null, (caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(String((error as Error).message)).not.toContain('test-wrong-token');
      expect(client.connectionState).toBe(ServerState.FAILED);
      expect(httpServer.requests()[0]).toBe(expectedAuth);
    });
  });
}
