/**
 * Tiny MCP test server (Node, `@modelcontextprotocol/server` and `@modelcontextprotocol/node`): the
 * fallback twin of the Python server in `./mcp-test-server/server.py`, with the same tools, modes and
 * output lines, so tests are implementation-agnostic. Also used as-is (`node <this file>`, stdio) by the autobyteus-ts stdio unit
 * test and by the autobyteus-server-ts runtime × MCP matrix suite, which rely on `report_env_and_cwd`.
 *
 * Tools: echo(text) -> text | add(a, b) -> structured {"sum"} | fail(message) -> tool error
 *        slow(ms) -> "slept <ms> ms" | report_env_and_cwd(name) -> {"value", "cwd"} as JSON text
 * Modes: --mode normal (default) | exit-at-start (exit 1) | hang-at-start (never answers).
 * Transports: --transport stdio (default) | http --port N [--require-token T] (streamable HTTP at /mcp;
 *   every request without "Authorization: Bearer T" gets 401). HTTP prints "MCP_TEST_SERVER_READY <url>"
 *   and one "MCP_TEST_SERVER_REQUEST auth=ok|missing|wrong method=<M>" line per request to stderr.
 * Env: MCP_TEST_SERVER_PID_FILE=<path> makes the server write its pid there first.
 *      MCP_TEST_SERVER_START_LOG=<path> makes every start (any mode) append "<pid>\n" there, so a test
 *      can count how often the server was started.
 * Prerequisites: none. Values: the tests pass dummy values only.
 */
import fs from 'node:fs';
import http from 'node:http';
import { parseArgs } from 'node:util';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const { values: args } = parseArgs({
  options: {
    transport: { type: 'string', default: 'stdio' },
    port: { type: 'string', default: '0' },
    'require-token': { type: 'string' },
    mode: { type: 'string', default: 'normal' }
  }
});

const text = (value) => ({ content: [{ type: 'text', text: value }] });

const createServer = () => {
  const server = new McpServer({ name: 'autobyteus-mcp-test-server', version: '1.0.0' });
  server.registerTool('echo', { description: 'Returns the given text.', inputSchema: z.object({ text: z.string() }) },
    async ({ text: value }) => text(value));
  server.registerTool('add', {
    description: 'Adds two numbers and returns the sum as structured content.',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.object({ sum: z.number() })
  }, async ({ a, b }) => ({ ...text(JSON.stringify({ sum: a + b })), structuredContent: { sum: a + b } }));
  server.registerTool('fail', { description: 'Always fails with the given message as a tool error.', inputSchema: z.object({ message: z.string() }) },
    async ({ message }) => ({ ...text(message), isError: true }));
  server.registerTool('slow', { description: 'Waits the given number of milliseconds, then answers.', inputSchema: z.object({ ms: z.number().int() }) },
    async ({ ms }) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return text(`slept ${ms} ms`);
    });
  server.registerTool('report_env_and_cwd', {
    description: 'Reports one environment variable and the working directory of this server.',
    inputSchema: z.object({ name: z.string() })
  }, async ({ name }) => text(JSON.stringify({ value: process.env[name] ?? null, cwd: process.cwd() })));
  return server;
};

const serveHttp = (port, token) => {
  const httpServer = http.createServer(async (req, res) => {
    const value = req.headers.authorization ?? '';
    const auth = token === undefined ? (value ? 'unexpected' : 'ok') : value === `Bearer ${token}` ? 'ok' : value ? 'wrong' : 'missing';
    process.stderr.write(`MCP_TEST_SERVER_REQUEST auth=${auth} method=${req.method}\n`);
    if (token !== undefined && auth !== 'ok') {
      res.writeHead(401, { 'content-type': 'text/plain' }).end('unauthorized');
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const server = createServer();
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
  });
  httpServer.listen(port, '127.0.0.1', () => {
    process.stderr.write(`MCP_TEST_SERVER_READY http://127.0.0.1:${httpServer.address().port}/mcp\n`);
  });
};

if (process.env.MCP_TEST_SERVER_START_LOG) {
  fs.appendFileSync(process.env.MCP_TEST_SERVER_START_LOG, `${process.pid}\n`);
}
if (process.env.MCP_TEST_SERVER_PID_FILE) {
  fs.writeFileSync(process.env.MCP_TEST_SERVER_PID_FILE, String(process.pid));
}
if (args.mode === 'exit-at-start') {
  process.stderr.write('mcp test server: exiting at start (mode exit-at-start)\n');
  process.exit(1);
} else if (args.mode === 'hang-at-start') {
  setInterval(() => {}, 3_600_000);
} else if (args.transport === 'http') {
  serveHttp(Number(args.port), args['require-token']);
} else {
  await createServer().connect(new StdioServerTransport());
}
