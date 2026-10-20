// Stand-in for our Agent Tools / gateway routes INCLUDING their first check: mcp-protocol-version
// (missing -> 2025-03-26; not in {2025-03-26, 2025-06-18, 2025-11-25} -> HTTP 400 + JSON-RPC -32600, id null),
// then the dispatcher (-32601 for unknown methods). Mirrors agent-tools-mcp-routes.ts L87-90, L139-149.
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createServer } from 'node:http';
const SUPPORTED = new Set(['2025-03-26', '2025-06-18', '2025-11-25']);
const seen = [];
const s = createServer(async (req, res) => {
  const pv = (req.headers['mcp-protocol-version'] ?? '').trim() || '2025-03-26';
  let b = ''; for await (const c of req) b += c; const body = b ? JSON.parse(b) : undefined;
  const json = (status, obj) => res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(obj));
  if (!SUPPORTED.has(pv)) { seen.push(`${req.method} ${body?.method ?? '-'} pv=${pv} -> 400/-32600`); return json(400, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Unsupported MCP protocol version' } }); }
  seen.push(`${req.method} ${body?.method ?? '-'} pv=${pv}`);
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  if (body.id === undefined) { res.writeHead(202).end(); return; }
  if (body.method === 'initialize') return json(200, { jsonrpc: '2.0', id: body.id, result: { protocolVersion: body.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'own', version: '1' } } });
  if (body.method === 'tools/list') return json(200, { jsonrpc: '2.0', id: body.id, result: { tools: [{ name: 'own_tool', inputSchema: { type: 'object' } }] } });
  if (body.method === 'tools/call') return json(200, { jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: 'called' }] } });
  return json(200, { jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } });
});
await new Promise(r => s.listen(0, '127.0.0.1', r));
for (const mode of ['legacy', 'auto']) {
  seen.length = 0;
  const c = new Client({ name: 'x', version: '1' }, { versionNegotiation: { mode } });
  try {
    await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${s.address().port}/mcp`)));
    const tools = (await c.listTools()).tools.map(t => t.name);
    const r = await c.callTool({ name: 'own_tool', arguments: {} });
    console.log(mode, JSON.stringify({ era: c.getProtocolEra(), version: c.getNegotiatedProtocolVersion(), tools, call: r.content[0].text, seen }));
  } catch (e) { console.log(mode, 'ERROR', `${e.constructor.name}: ${e.message}`, JSON.stringify(seen)); }
  await c.close().catch(() => {});
}
s.close();
