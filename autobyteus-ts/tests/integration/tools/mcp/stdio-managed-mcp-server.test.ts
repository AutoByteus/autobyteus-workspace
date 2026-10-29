/**
 * StdioManagedMcpServer against the tiny real MCP test server, over stdio.
 *
 * Purpose: list tools; call echo, add (structured content), fail (tool error) and slow; deliver env and cwd;
 * a server that exits at start gives a connect error; a server that hangs at start does not connect within
 * a short bound and closing it ends its process; closing a connected server ends its process.
 * Implementations: Python via `uv` (skipped with the reason when `uv` cannot prepare it) and Node (always).
 * See `mcp-test-server-launcher.ts`.
 * Command: env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp
 * Values: dummy only.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { ServerState } from '../../../../src/tools/mcp/server/base-managed-mcp-server.js';
import { isAlive, prepareMcpTestServers, readPidFile, stdioServerConfig, waitForExit } from './mcp-test-server-launcher.js';

type ToolResult = { content: Array<{ type: string; text: string }>; structuredContent?: unknown; isError?: boolean };

const HANG_BOUND_MS = 3_000;

for (const { impl, available, reason } of prepareMcpTestServers()) {
  describe.skipIf(!available)(`StdioManagedMcpServer with the real MCP test server (${impl}${available ? '' : ` — skipped: ${reason}`})`, () => {
    let workDir = '';
    let pidFile = '';
    let client: StdioManagedMcpServer | null = null;

    beforeEach(() => {
      workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `mcp-stdio-${impl}-`)));
      pidFile = path.join(workDir, 'server.pid');
    });

    afterEach(async () => {
      await client?.close();
      client = null;
      fs.rmSync(workDir, { recursive: true, force: true });
    });

    const start = (mode: 'normal' | 'exit-at-start' | 'hang-at-start' = 'normal', env?: Record<string, string>) => {
      client = new StdioManagedMcpServer(stdioServerConfig(impl, { serverId: `stdio-${impl}`, mode, env, cwd: workDir, pidFile }));
      return client;
    };

    it('lists the tools and calls echo, add, fail and slow', async () => {
      const server = start();
      const tools = (await server.listRemoteTools()) as Array<{ name: string }>;
      expect(tools.map((tool) => tool.name).sort()).toEqual(['add', 'echo', 'fail', 'report_env_and_cwd', 'slow']);

      const echo = (await server.callTool('echo', { text: 'hello' })) as ToolResult;
      expect(echo.content[0]?.text).toBe('hello');
      expect(echo.isError ?? false).toBe(false);

      const add = (await server.callTool('add', { a: 2, b: 3 })) as ToolResult;
      expect(add.structuredContent).toEqual({ sum: 5 });
      expect(add.isError ?? false).toBe(false);

      const fail = (await server.callTool('fail', { message: 'dummy failure' })) as ToolResult;
      expect(fail.isError).toBe(true);
      expect(fail.content[0]?.text).toContain('dummy failure');
      expect(server.connectionState).toBe(ServerState.CONNECTED);

      const startedAt = Date.now();
      const slow = (await server.callTool('slow', { ms: 300 })) as ToolResult;
      expect(slow.content[0]?.text).toBe('slept 300 ms');
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(300);
    });

    it('delivers the configured env and cwd to the server', async () => {
      const server = start('normal', { MCP_TEST_DUMMY_VALUE: 'test-dummy' });
      const result = (await server.callTool('report_env_and_cwd', { name: 'MCP_TEST_DUMMY_VALUE' })) as ToolResult;
      expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({ value: 'test-dummy', cwd: workDir });
    });

    it('ends the server process when a connected server is closed', async () => {
      const server = start();
      await server.connect();
      const pid = await readPidFile(pidFile);
      expect(isAlive(pid)).toBe(true);

      await server.close();
      expect(server.connectionState).toBe(ServerState.CLOSED);
      expect(await waitForExit(pid)).toBe(true);
    });

    it('fails to connect, with an error, when the server exits at start', async () => {
      const server = start('exit-at-start');
      await expect(server.connect()).rejects.toThrow();
      expect(server.connectionState).toBe(ServerState.FAILED);
    });

    it('does not connect to a server that hangs at start, and closing it ends its process', async () => {
      const server = start('hang-at-start');
      let settled = false;
      const connecting = server.connect().then(
        () => { settled = true; },
        () => { settled = true; }
      );
      const pid = await readPidFile(pidFile);
      await new Promise((resolve) => setTimeout(resolve, HANG_BOUND_MS));
      expect(settled).toBe(false);
      expect(server.connectionState).toBe(ServerState.CONNECTING);

      await server.close();
      await connecting;
      expect(await waitForExit(pid)).toBe(true);
    });
  });
}
