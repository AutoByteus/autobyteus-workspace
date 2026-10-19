import { describe, it, expect, beforeEach } from 'vitest';
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
});
