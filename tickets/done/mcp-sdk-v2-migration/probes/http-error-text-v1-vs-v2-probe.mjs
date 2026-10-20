import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client as C2, StreamableHTTPClientTransport as T2 } from '@modelcontextprotocol/client';
import { createServer } from 'node:http';
for (const [label, mk] of [['v1', () => [new Client({name:'a',version:'1'}), T => new StreamableHTTPClientTransport(T)]], ['v2', () => [new C2({name:'a',version:'1'}), T => new T2(T)]]]) {
  for (const status of [401, 403, 404, 500]) {
    const srv = createServer((req, res) => { res.writeHead(status, {'content-type':'text/plain'}).end('nope-body'); });
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const [c, mt] = mk();
    try { await c.connect(mt(new URL(`http://127.0.0.1:${srv.address().port}/mcp`))); } catch (e) { console.log(label, status, `${e.constructor.name}: ${e.message}`, 'code=', e.code, 'status=', e.status); }
    srv.close();
  }
  // redirect cross-origin
  const b = createServer((req, res) => { res.writeHead(200).end(); }); await new Promise(r => b.listen(0, '127.0.0.1', r));
  const a = createServer((req, res) => { res.writeHead(307, { location: `http://localhost:${b.address().port}/mcp` }).end(); }); await new Promise(r => a.listen(0, '127.0.0.1', r));
  const [c, mt] = mk();
  try { await c.connect(mt(new URL(`http://127.0.0.1:${a.address().port}/mcp`))); } catch (e) { console.log(label, 'xorigin-redirect', `${e.constructor.name}: ${e.message}`); }
  a.close(); b.close();
  // connection refused
  const [c3, mt3] = mk();
  try { await c3.connect(mt3(new URL(`http://127.0.0.1:9/mcp`))); } catch (e) { console.log(label, 'refused', `${e.constructor.name}: ${e.message}`); }
}
