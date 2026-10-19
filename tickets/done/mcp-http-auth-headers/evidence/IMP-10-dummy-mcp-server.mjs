// Dummy local MCP server requiring "Authorization: Bearer test-dummy" (ticket mcp-http-auth-headers render check).
import http from 'node:http';
const sdk = process.argv[2];
const { McpServer } = await import(`${sdk}/server/mcp.js`);
const { StreamableHTTPServerTransport } = await import(`${sdk}/server/streamableHttp.js`);
const srv = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const ok = req.headers['authorization'] === 'Bearer test-dummy';
  console.log(`${req.method} auth=${ok ? 'expected' : (req.headers['authorization'] ? 'other' : 'none')}`);
  if (!ok) { res.writeHead(401).end('unauthorized'); return; }
  const mcp = new McpServer({ name: 'render-check', version: '1' });
  mcp.tool('echo', 'Echo test tool', async () => ({ content: [{ type: 'text', text: 'pong' }] }));
  const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { t.close(); mcp.close(); });
  await mcp.connect(t);
  await t.handleRequest(req, res, body ? JSON.parse(body) : undefined);
});
srv.listen(0, '127.0.0.1', () => console.log(`LISTENING http://127.0.0.1:${srv.address().port}/mcp`));
