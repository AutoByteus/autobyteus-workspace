import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServerInstanceManager } from '../../../../src/tools/mcp/server-instance-manager.js';
import { McpConfigService } from '../../../../src/tools/mcp/config-service.js';
import { StdioMcpServerConfig, StreamableHttpMcpServerConfig } from '../../../../src/tools/mcp/types.js';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { HttpManagedMcpServer } from '../../../../src/tools/mcp/server/http-managed-mcp-server.js';

function resetSingletons(): void {
  (McpServerInstanceManager as any).instance = undefined;
  (McpConfigService as any).instance = undefined;
}

describe('McpServerInstanceManager', () => {
  beforeEach(() => {
    resetSingletons();
  });

  it('creates server instances based on config transport', () => {
    const manager = McpServerInstanceManager.getInstance();
    const configService = McpConfigService.getInstance();
    configService.clearConfigs();

    configService.addConfig(new StdioMcpServerConfig({ server_id: 'stdio_server', command: 'node' }));
    configService.addConfig(
      new StreamableHttpMcpServerConfig({ server_id: 'http_server', url: 'http://127.0.0.1:9000/mcp' })
    );

    expect(manager.getServerInstance('agent_a', 'stdio_server')).toBeInstanceOf(StdioManagedMcpServer);
    expect(manager.getServerInstance('agent_a', 'http_server')).toBeInstanceOf(HttpManagedMcpServer);
  });

  const configured = () => {
    const manager = McpServerInstanceManager.getInstance();
    const configService = McpConfigService.getInstance();
    configService.clearConfigs();
    configService.addConfig(new StdioMcpServerConfig({ server_id: 'stdio_server', command: 'node' }));
    configService.addConfig(
      new StreamableHttpMcpServerConfig({ server_id: 'http_server', url: 'http://127.0.0.1:9000/mcp' })
    );
    return manager;
  };

  it("detaches an agent's instances before closing them, so a request during the close gets new ones", async () => {
    const manager = configured();
    const closing = manager.getServerInstance('agent_a', 'stdio_server');
    const other = manager.getServerInstance('agent_b', 'stdio_server');
    let finishClose!: () => void;
    const close = vi.spyOn(closing, 'close').mockReturnValue(new Promise<void>((resolve) => { finishClose = resolve; }));

    const cleanup = manager.cleanupMcpServerInstancesForAgent('agent_a');
    const fresh = manager.getServerInstance('agent_a', 'stdio_server');

    expect(close).toHaveBeenCalledTimes(1);
    expect(fresh).not.toBe(closing);
    expect(manager.getServerInstance('agent_b', 'stdio_server')).toBe(other);
    finishClose();
    await cleanup;
    expect(manager.getServerInstance('agent_a', 'stdio_server')).toBe(fresh);
  });

  it('closes every instance of the agent and logs a failed close with the agent and server ids', async () => {
    const manager = configured();
    const failing = manager.getServerInstance('agent_a', 'stdio_server');
    const healthy = manager.getServerInstance('agent_a', 'http_server');
    vi.spyOn(failing, 'close').mockRejectedValue(new Error('dummy close failure'));
    const healthyClose = vi.spyOn(healthy, 'close').mockResolvedValue();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(manager.cleanupMcpServerInstancesForAgent('agent_a')).resolves.toBeUndefined();

    expect(healthyClose).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "Closing MCP server 'stdio_server' for agent 'agent_a' failed: Error: dummy close failure"
    );
    expect(manager.getServerInstance('agent_a', 'http_server')).not.toBe(healthy);
    warn.mockRestore();
  });
});
