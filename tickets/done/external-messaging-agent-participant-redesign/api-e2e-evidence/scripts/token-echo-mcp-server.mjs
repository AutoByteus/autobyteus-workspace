// Temporary stdio MCP server for AC-118: proves env-token delivery and tool execution per runtime.
import { McpServer } from '/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import { StdioServerTransport } from '/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import { z } from '/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/node_modules/.pnpm/zod@4.3.6/node_modules/zod/index.js';
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
const server = new McpServer({ name: 'e2e-token-echo', version: '1.0.0' });
server.tool('verify_e2e_token', 'Reports whether the configured E2E token env var is present, echoing the given nonce.',
  { nonce: z.string().describe('Nonce to echo back') },
  async ({ nonce }) => {
    const token = process.env.E2E_MCP_TOKEN ?? '';
    const sha8 = token ? createHash('sha256').update(token).digest('hex').slice(0, 8) : 'none';
    const text = `TOKEN_PRESENT=${token.length > 0} TOKEN_SHA8=${sha8} NONCE=${nonce}`;
    appendFileSync('/private/tmp/emr-e2e/mcp/invocations.log', JSON.stringify({ at: new Date().toISOString(), pid: process.pid, ppid: process.ppid, text }) + '\n');
    return { content: [{ type: 'text', text }] };
  });
await server.connect(new StdioServerTransport());
