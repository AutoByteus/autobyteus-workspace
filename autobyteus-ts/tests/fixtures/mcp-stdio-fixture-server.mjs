/**
 * Stdio MCP fixture server for the StdioManagedMcpServer tests.
 *
 * Purpose: a real MCP server over stdio (the `@modelcontextprotocol/sdk` server, no mock)
 * with one tool, `report_env_and_cwd`, that reports the value of the environment variable
 * named in its `name` argument and the process's working directory, so a test can prove the
 * configured `env` and `cwd` reached the spawned server.
 * Prerequisites: none; started by the test as `node <this file>`.
 * Values: the tests pass dummy values only.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'stdio-fixture-server', version: '1.0.0' });

server.registerTool(
  'report_env_and_cwd',
  {
    description: 'Reports one environment variable and the working directory of this server.',
    inputSchema: { name: z.string() }
  },
  async ({ name }) => ({
    content: [{ type: 'text', text: JSON.stringify({ value: process.env[name] ?? null, cwd: process.cwd() }) }]
  })
);

await server.connect(new StdioServerTransport());
