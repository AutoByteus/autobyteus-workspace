import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.SPAWN_LOG, `spawn ${process.pid}\n`);
const s = new McpServer({ name: 'v1-stdio', version: '1.0.0' });
s.registerTool('echo', { description: 'echo', inputSchema: { text: z.string() } }, async ({ text }) => ({ content: [{ type: 'text', text: `echo:${text}` }] }));
s.registerTool('env', { description: 'env', inputSchema: { name: z.string() } }, async ({ name }) => ({ content: [{ type: 'text', text: `${process.env[name]}|${process.cwd()}` }] }));
await s.connect(new StdioServerTransport());
