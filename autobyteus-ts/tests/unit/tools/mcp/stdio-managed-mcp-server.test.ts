/**
 * StdioManagedMcpServer against a real stdio MCP server.
 *
 * Purpose: prove that the stdio client starts the configured command with its `args`,
 * `env` and `cwd`, and can initialize, list tools and call a tool, using the real
 * `@modelcontextprotocol/sdk` client and the fixture server (no SDK mock).
 * Prerequisites: none. The fixture is `tests/fixtures/mcp-stdio-fixture-server.mjs`, run with
 * the current `node`.
 * Values: dummy only (`test-dummy`).
 * Command: pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { ServerState } from '../../../../src/tools/mcp/server/base-managed-mcp-server.js';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';

const fixtureServerPath = fileURLToPath(new URL('../../../fixtures/mcp-stdio-fixture-server.mjs', import.meta.url));

describe('StdioManagedMcpServer with a real stdio MCP server', () => {
  let workDir = '';
  let client: StdioManagedMcpServer | null = null;

  beforeEach(() => {
    workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-stdio-fixture-')));
  });

  afterEach(async () => {
    await client?.close();
    client = null;
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('starts the server with the configured env and cwd, lists its tools and calls one', async () => {
    client = new StdioManagedMcpServer(
      new StdioMcpServerConfig({
        server_id: 'stdio-fixture',
        command: process.execPath,
        args: [fixtureServerPath],
        env: { FIXTURE_DUMMY_VALUE: 'test-dummy' },
        cwd: workDir
      })
    );

    await client.connect();
    const tools = (await client.listRemoteTools()) as Array<{ name: string }>;
    const result = (await client.callTool('report_env_and_cwd', { name: 'FIXTURE_DUMMY_VALUE' })) as {
      content: Array<{ text: string }>;
    };

    expect(client.connectionState).toBe(ServerState.CONNECTED);
    expect(tools.map((tool) => tool.name).sort()).toEqual(['add', 'echo', 'fail', 'report_env_and_cwd', 'slow']);
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({ value: 'test-dummy', cwd: workDir });

    await client.close();
    expect(client.connectionState).toBe(ServerState.CLOSED);
  });

  it('fails to connect when the command does not exist', async () => {
    client = new StdioManagedMcpServer(
      new StdioMcpServerConfig({ server_id: 'missing-command', command: path.join(workDir, 'no-such-command') })
    );

    await expect(client.connect()).rejects.toThrow();
    expect(client.connectionState).toBe(ServerState.FAILED);
  });
});
