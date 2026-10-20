const base = process.argv[2];
const { Client } = await import(`${base}/node_modules/@modelcontextprotocol/client/dist/index.mjs`);
const { StdioClientTransport } = await import(`${base}/node_modules/@modelcontextprotocol/client/dist/stdio.mjs`);
for (const [label, bin] of [['fs-v1-2026.8.31', '/tmp/mcp-fs-v1/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js'], ['fs-v2-2.0.0', '/tmp/mcp-fs-v2/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js']]) {
  for (const mode of ['legacy', 'auto']) {
    const c = new Client({ name: 'autobyteus', version: '1.0.0' }, { versionNegotiation: { mode } });
    try {
      await c.connect(new StdioClientTransport({ command: process.execPath, args: [bin, '/tmp/mcp-fs-root'], stderr: 'ignore' }));
      const tools = (await c.listTools()).tools.length;
      const r = await c.callTool({ name: 'read_text_file', arguments: { path: '/tmp/mcp-fs-root/a.txt' } });
      console.log(JSON.stringify({ label, mode, era: c.getProtocolEra(), version: c.getNegotiatedProtocolVersion(), tools, text: r.content?.[0]?.text?.trim(), isError: r.isError ?? false }));
    } catch (e) { console.log(JSON.stringify({ label, mode, error: `${e.constructor.name}: ${e.message}` })); }
    await c.close().catch(() => {});
  }
}
