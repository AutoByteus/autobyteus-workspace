import { describe, it, expect, beforeEach } from 'vitest';
import { McpServerInstanceManager } from '../../../../src/tools/mcp/server-instance-manager.js';
import { McpConfigService } from '../../../../src/tools/mcp/config-service.js';
import { WebsocketMcpServerConfig } from '../../../../src/tools/mcp/types.js';
import { WebsocketManagedMcpServer } from '../../../../src/tools/mcp/server/websocket-managed-mcp-server.js';

function resetSingletons(): void {
  (McpServerInstanceManager as any).instance = undefined;
  (McpConfigService as any).instance = undefined;
}

describe('McpServerInstanceManager', () => {
  beforeEach(() => {
    resetSingletons();
  });

  it('creates websocket server instances based on config transport', () => {
    const manager = McpServerInstanceManager.getInstance();
    const configService = McpConfigService.getInstance();
    configService.clearConfigs();

    const wsConfig = new WebsocketMcpServerConfig({
      server_id: 'ws_server',
      url: 'wss://localhost:8765/mcp'
    });
    configService.addConfig(wsConfig);

    const serverInstance = manager.getServerInstance('agent_a', 'ws_server');
    expect(serverInstance).toBeInstanceOf(WebsocketManagedMcpServer);
  });
});
