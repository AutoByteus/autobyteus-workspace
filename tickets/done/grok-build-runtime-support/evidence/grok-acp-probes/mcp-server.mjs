import { McpServer } from '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import { StreamableHTTPServerTransport } from '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/@modelcontextprotocol+sdk@1.30.0_zod@4.3.6/node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js';
import { z } from '/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/zod@4.3.6/node_modules/zod/index.js';
import http from 'node:http';
import fs from 'node:fs';
const log = (s) => fs.appendFileSync('/tmp/grok-acp-exp/mcp-server.log', new Date().toISOString() + ' ' + s + '\n');
const server = new McpServer({ name: 'autobyteus_probe_tools', version: '0.0.1' });
server.tool('echo', 'Echo back the given message.', { message: z.string().describe('Text to echo') }, async ({ message }) => { log('echo called: ' + message); return { content: [{ type: 'text', text: 'ECHO:' + message }] }; });
server.tool('get_handoff_rules', 'Return the current handoff rules for this agent.', {}, async () => { log('get_handoff_rules called'); return { content: [{ type: 'text', text: JSON.stringify({ rules: [{ when: 'always', recipient_address: '/probe_reviewer' }] }) }] }; });
const httpServer = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/mcp')) { res.statusCode = 404; res.end(); return; }
  log('http ' + req.method + ' ' + req.url + ' accept=' + req.headers['accept'] + ' session=' + req.headers['mcp-session-id']);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close());
  await server.connect(transport);
  let body = '';
  for await (const chunk of req) body += chunk;
  await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
});
httpServer.listen(3917, '127.0.0.1', () => log('listening 3917'));
