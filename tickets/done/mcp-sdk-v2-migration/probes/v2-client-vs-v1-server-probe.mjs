import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';

const log = '/tmp/mcp-v2-probe/spawn.log';
async function stdio(mode) {
  writeFileSync(log, '');
  const c = new Client({ name: 'autobyteus', version: '1.0.0' }, mode ? { versionNegotiation: { mode } } : undefined);
  const t = new StdioClientTransport({ command: process.execPath, args: ['/tmp/mcp-v2-probe/v1-stdio-server.mjs'], env: { SPAWN_LOG: log, PROBE_SECRET: 'dummy-123' }, cwd: '/tmp' });
  const t0 = Date.now();
  await c.connect(t);
  const ms = Date.now() - t0;
  const tools = (await c.listTools()).tools.map(x => x.name);
  const r1 = await c.callTool({ name: 'echo', arguments: { text: 'hi' } }, { timeout: 5000 });
  const r2 = await c.callTool({ name: 'env', arguments: { name: 'PROBE_SECRET' } });
  await c.close();
  console.log(JSON.stringify({ transport: 'stdio', mode: mode ?? 'default', connectMs: ms, era: c.getProtocolEra?.(), version: c.getNegotiatedProtocolVersion?.(), tools, r1: r1.content[0].text, r2: r2.content[0].text, spawns: readFileSync(log, 'utf8').trim().split('\n').length }));
}
async function http(mode) {
  const seen = [];
  const srv = createServer(async (req, res) => {
    seen.push(`${req.method} auth=${req.headers.authorization ?? '-'} pv=${req.headers['mcp-protocol-version'] ?? '-'}`);
    if (req.headers.authorization !== 'Bearer dummy-token') { res.writeHead(401).end(); return; }
    let body = ''; for await (const ch of req) body += ch;
    const mcp = new McpServer({ name: 'v1-http', version: '1.0.0' });
    mcp.tool('ping_tool', async () => ({ content: [{ type: 'text', text: 'pong' }] }));
    const tr = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await mcp.connect(tr);
    await tr.handleRequest(req, res, body ? JSON.parse(body) : undefined);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = new URL(`http://127.0.0.1:${srv.address().port}/mcp`);
  const c = new Client({ name: 'autobyteus', version: '1.0.0' }, mode ? { versionNegotiation: { mode } } : undefined);
  const t = new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: 'Bearer dummy-token' } } });
  let out;
  try {
    await c.connect(t);
    const tools = (await c.listTools()).tools.map(x => x.name);
    const r = await c.callTool({ name: 'ping_tool', arguments: {} });
    out = { tools, r: r.content[0].text, era: c.getProtocolEra?.(), version: c.getNegotiatedProtocolVersion?.() };
  } catch (e) { out = { error: `${e.constructor.name}: ${e.message}` }; }
  await c.close().catch(() => {});
  srv.close();
  console.log(JSON.stringify({ transport: 'http', mode: mode ?? 'default', ...out, requests: seen }));
}
async function noAuth() {
  const srv = createServer((req, res) => { res.writeHead(401).end(); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const c = new Client({ name: 'autobyteus', version: '1.0.0' });
  try { await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${srv.address().port}/mcp`))); } catch (e) { console.log(JSON.stringify({ case: '401', error: `${e.constructor.name}: ${e.message}` })); }
  srv.close();
}
await stdio(undefined); await stdio('auto'); await http(undefined); await http('auto'); await noAuth();
