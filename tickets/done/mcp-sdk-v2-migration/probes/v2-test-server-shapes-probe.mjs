import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, Server } from '@modelcontextprotocol/server';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { createServer } from 'node:http';

const listen = async (handler) => { const s = createServer(handler); await new Promise(r => s.listen(0, '127.0.0.1', r)); return { s, url: new URL(`http://127.0.0.1:${s.address().port}/mcp`) }; };
const readBody = async (req) => { let b = ''; for await (const c of req) b += c; return b ? JSON.parse(b) : undefined; };

// 1. v2 McpServer + Node transport, stateless
{
  const { s, url } = await listen(async (req, res) => {
    const body = await readBody(req);
    const mcp = new McpServer({ name: 'v2-http', version: '1.0.0' });
    mcp.registerTool('echo', { description: 'echo', inputSchema: z.object({ text: z.string() }) }, async ({ text }) => ({ content: [{ type: 'text', text }] }));
    mcp.registerTool('add', { description: 'add', inputSchema: z.object({ a: z.number(), b: z.number() }), outputSchema: z.object({ sum: z.number() }) }, async ({ a, b }) => ({ content: [{ type: 'text', text: String(a + b) }], structuredContent: { sum: a + b } }));
    const t = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { void t.close(); void mcp.close(); });
    await mcp.connect(t); await t.handleRequest(req, res, body);
  });
  const c = new Client({ name: 'autobyteus', version: '1.0.0' });
  await c.connect(new StreamableHTTPClientTransport(url));
  const tools = (await c.listTools()).tools.map(t => t.name);
  const r = await c.callTool({ name: 'add', arguments: { a: 2, b: 3 } });
  console.log('1 v2-server', JSON.stringify({ tools, sc: r.structuredContent, era: c.getProtocolEra() }));
  await c.close(); s.close();
}
// 2. paginated tools/list via low-level Server over stdio-less in-memory? use HTTP
{
  const { s, url } = await listen(async (req, res) => {
    const body = await readBody(req);
    const srv = new Server({ name: 'paged', version: '1.0.0' }, { capabilities: { tools: {} } });
    srv.setRequestHandler('tools/list', async (request) => {
      const cursor = request.params?.cursor;
      const page = cursor === 'p2' ? 2 : 1;
      const tools = [0, 1].map(i => ({ name: `tool_p${page}_${i}`, inputSchema: { type: 'object' } }));
      return page === 1 ? { tools, nextCursor: 'p2' } : { tools };
    });
    const t = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { void t.close(); void srv.close(); });
    await srv.connect(t); await t.handleRequest(req, res, body);
  });
  const c = new Client({ name: 'autobyteus', version: '1.0.0' });
  await c.connect(new StreamableHTTPClientTransport(url));
  console.log('2 paged', JSON.stringify((await c.listTools()).tools.map(t => t.name)));
  await c.close(); s.close();
}
// 3. hand-written JSON-RPC server like ours: -32601 for unknown methods (server/discover), auto mode
{
  const seen = [];
  const { s, url } = await listen(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); seen.push(req.method); return; }
    const body = await readBody(req);
    seen.push(body.method);
    if (body.id === undefined) { res.writeHead(202).end(); return; }
    const reply = (obj) => { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: body.id, ...obj })); };
    if (body.method === 'initialize') return reply({ result: { protocolVersion: body.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'own', version: '1' } } });
    if (body.method === 'tools/list') return reply({ result: { tools: [{ name: 'own_tool', inputSchema: { type: 'object' } }] } });
    return reply({ error: { code: -32601, message: 'Method not found' } });
  });
  for (const mode of ['legacy', 'auto']) {
    seen.length = 0;
    const c = new Client({ name: 'x', version: '1' }, { versionNegotiation: { mode } });
    try { await c.connect(new StreamableHTTPClientTransport(url)); console.log('3 own-like', mode, JSON.stringify({ era: c.getProtocolEra(), tools: (await c.listTools()).tools.map(t => t.name), seen })); }
    catch (e) { console.log('3 own-like', mode, 'ERROR', e.constructor.name, e.message, JSON.stringify(seen)); }
    await c.close().catch(() => {});
  }
  s.close();
}
