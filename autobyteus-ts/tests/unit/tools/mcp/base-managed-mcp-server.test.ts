import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaseManagedMcpServer,
  DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS,
  ServerState
} from '../../../../src/tools/mcp/server/base-managed-mcp-server.js';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';

class TestManagedServer extends BaseManagedMcpServer {
  createSessionMock = vi.fn();
  cleanupCount = 0;

  protected async createClientSession() {
    const session = await this.createSessionMock();
    this.registerCleanup(() => {
      this.cleanupCount += 1;
    });
    return session;
  }
}

describe('BaseManagedMcpServer', () => {
  let server: TestManagedServer;

  beforeEach(() => {
    const config = new StdioMcpServerConfig({ server_id: 'server-1', command: 'node' });
    server = new TestManagedServer(config);
  });

  it('connects and caches the client session', async () => {
    const listTools = vi.fn().mockResolvedValue({ tools: [] });
    const callTool = vi.fn().mockResolvedValue({ ok: true });

    server.createSessionMock.mockResolvedValue({ listTools, callTool, close: vi.fn() });

    await server.connect();
    expect(server.connectionState).toBe(ServerState.CONNECTED);
    expect(server.createSessionMock).toHaveBeenCalledTimes(1);

    await server.connect();
    expect(server.createSessionMock).toHaveBeenCalledTimes(1);
  });

  it('lists remote tools via the client session', async () => {
    const listTools = vi.fn().mockResolvedValue({ tools: [{ name: 'tool-a' }] });
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    server.createSessionMock.mockResolvedValue({ listTools, callTool, close: vi.fn() });

    const tools = await server.listRemoteTools();
    expect(tools).toEqual([{ name: 'tool-a' }]);
    expect(listTools).toHaveBeenCalledTimes(1);
  });

  it('calls a tool using the client session', async () => {
    const listTools = vi.fn().mockResolvedValue({ tools: [] });
    const callTool = vi.fn().mockResolvedValue({ result: 'done' });
    server.createSessionMock.mockResolvedValue({ listTools, callTool, close: vi.fn() });

    const result = await server.callTool('tool-x', { value: 1 });
    expect(callTool).toHaveBeenCalledWith(
      { name: 'tool-x', arguments: { value: 1 } },
      { timeout: DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS }
    );
    expect(result).toEqual({ result: 'done' });
  });

  it('passes the caller signal with the timeout in the SDK request options', async () => {
    const listTools = vi.fn().mockResolvedValue({ tools: [] });
    const callTool = vi.fn().mockResolvedValue({ result: 'done' });
    server.createSessionMock.mockResolvedValue({ listTools, callTool, close: vi.fn() });
    const controller = new AbortController();

    await server.callTool('tool-x', { value: 1 }, { signal: controller.signal });

    expect(callTool).toHaveBeenCalledWith(
      { name: 'tool-x', arguments: { value: 1 } },
      { timeout: DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS, signal: controller.signal }
    );
  });

  it('runs cleanup on close', async () => {
    const listTools = vi.fn().mockResolvedValue({ tools: [] });
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    const close = vi.fn();
    server.createSessionMock.mockResolvedValue({ listTools, callTool, close });

    await server.connect();
    await server.close();

    expect(server.cleanupCount).toBe(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(server.connectionState).toBe(ServerState.CLOSED);
  });

  it('marks failed state on connect error', async () => {
    server.createSessionMock.mockRejectedValue(new Error('boom'));

    await expect(server.connect()).rejects.toThrowError('boom');
    expect(server.connectionState).toBe(ServerState.FAILED);
  });
});
