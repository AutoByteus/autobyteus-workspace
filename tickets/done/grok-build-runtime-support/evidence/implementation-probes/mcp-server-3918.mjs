// Minimal streamable-HTTP MCP server for zero-cost Grok readiness probes (port 3918).
import { McpServer } from '/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import { StreamableHTTPServerTransport } from '/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js';
import { z } from '/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/node_modules/.pnpm/zod@4.3.6/node_modules/zod/index.js';
import http from 'node:http';
const server = new McpServer({ name: 'autobyteus_agent_tools', version: '0.0.1' });
server.tool('echo', 'Echo back the given message.', { message: z.string() }, async ({ message }) => ({ content: [{ type: 'text', text: 'ECHO:' + message }] }));
http.createServer(async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  await server.connect(transport);
  let body = ''; for await (const c of req) body += c;
  await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
}).listen(3918, '127.0.0.1');
