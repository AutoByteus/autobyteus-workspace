/**
 * Probe (mcp-http-error-status, 2026-10-20): what message does the preview path produce for an HTTP error?
 * Real path: McpToolRegistrar.listRemoteTools -> McpServerInstanceManager.managedDiscoverySession ->
 * HttpManagedMcpServer (real @modelcontextprotocol/client 2.3.1) against a local node:http server answering
 * every request with the given status, then the resolver's `Failed to preview tools for MCP server: ${String(error)}`.
 * Command (from the worktree root):
 *   pnpm -C autobyteus-ts exec vitest run --root ../tickets/in-progress/mcp-http-error-status/probes --no-watch
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { it } from 'vitest';
import { McpToolRegistrar } from '../../../../autobyteus-ts/src/tools/mcp/tool-registrar.js';
import { StreamableHttpMcpServerConfig } from '../../../../autobyteus-ts/src/tools/mcp/types.js';

it('prints the preview message for 401/403/404/500 and a cross-origin redirect', async () => {
  const cases: Array<[string, (res: import('node:http').ServerResponse) => void]> = [
    ['401', (res) => res.writeHead(401, { 'content-type': 'text/plain' }).end('unauthorized')],
    ['403', (res) => res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden')],
    ['404', (res) => res.writeHead(404, { 'content-type': 'text/plain' }).end('Not Found')],
    ['404-empty', (res) => res.writeHead(404).end()],
    ['500', (res) => res.writeHead(500, { 'content-type': 'text/plain' }).end('Internal Server Error')],
    ['307-xorigin', (res) => res.writeHead(307, { location: 'http://localhost:9/mcp' }).end()]
  ];
  for (const [label, answer] of cases) {
    const srv = createServer((_req, res) => answer(res));
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/mcp`;
    try {
      await McpToolRegistrar.getInstance().listRemoteTools(
        new StreamableHttpMcpServerConfig({ server_id: `probe-${label}`, url, token: 'dummy' })
      );
      console.log(label, 'NO ERROR');
    } catch (error) {
      const e = error as { name?: string; code?: unknown; status?: unknown; statusText?: unknown };
      console.log(JSON.stringify({ label, name: e.name, code: e.code, status: e.status, statusText: e.statusText,
        graphqlMessage: `Failed to preview tools for MCP server: ${String(error)}` }));
    } finally {
      srv.close();
    }
  }
  // connection refused: no HTTP status exists
  try {
    await McpToolRegistrar.getInstance().listRemoteTools(
      new StreamableHttpMcpServerConfig({ server_id: 'probe-refused', url: 'http://127.0.0.1:9/mcp' })
    );
  } catch (error) {
    console.log(JSON.stringify({ label: 'refused', status: (error as { status?: unknown }).status,
      graphqlMessage: `Failed to preview tools for MCP server: ${String(error)}` }));
  }
}, 30000);
