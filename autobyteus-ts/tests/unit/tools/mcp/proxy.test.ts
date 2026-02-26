import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerInstance: vi.fn(),
  getInstance: vi.fn()
}));

vi.mock('../../../../src/tools/mcp/server-instance-manager.js', () => ({
  McpServerInstanceManager: {
    getInstance: mocks.getInstance
  }
}));

import { McpServerProxy } from '../../../../src/tools/mcp/server/proxy.js';

describe('McpServerProxy', () => {
  beforeEach(() => {
    mocks.getServerInstance.mockReset();
    mocks.getInstance.mockClear();
  });

  it('requires agentId and serverId', () => {
    expect(() => new McpServerProxy('', 'server')).toThrowError(
      'McpServerProxy requires both agentId and serverId.'
    );
    expect(() => new McpServerProxy('agent', '')).toThrowError(
      'McpServerProxy requires both agentId and serverId.'
    );
  });

  it('delegates tool calls to server instance', async () => {
    const callTool = vi.fn().mockResolvedValue({ ok: true });
    mocks.getServerInstance.mockReturnValue({ callTool });
    mocks.getInstance.mockReturnValue({ getServerInstance: mocks.getServerInstance });

    const proxy = new McpServerProxy('agent-1', 'server-1');
    const result = await proxy.callTool('remote_tool', { foo: 'bar' });

    expect(mocks.getInstance).toHaveBeenCalledTimes(1);
    expect(mocks.getServerInstance).toHaveBeenCalledWith('agent-1', 'server-1');
    expect(callTool).toHaveBeenCalledWith('remote_tool', { foo: 'bar' });
    expect(result).toEqual({ ok: true });
  });
});
