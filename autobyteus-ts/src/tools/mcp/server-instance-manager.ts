import { Singleton } from '../../utils/singleton.js';
import { McpConfigService } from './config-service.js';
import {
  BaseMcpConfig,
  McpTransportType,
  StdioMcpServerConfig
} from './types.js';
import type { McpSecretResolver } from './mcp-secret-resolver.js';
import { BaseManagedMcpServer } from './server/base-managed-mcp-server.js';
import { StdioManagedMcpServer } from './server/stdio-managed-mcp-server.js';
import { HttpManagedMcpServer } from './server/http-managed-mcp-server.js';

export class McpServerInstanceManager extends Singleton {
  protected static instance?: McpServerInstanceManager;

  private configService!: McpConfigService;
  private activeServers: Map<string, Map<string, BaseManagedMcpServer>> = new Map();
  private secretResolver: McpSecretResolver | null = null;

  constructor(deps?: { configService?: McpConfigService }) {
    super();
    if (McpServerInstanceManager.instance) {
      return McpServerInstanceManager.instance;
    }
    this.configService = deps?.configService ?? McpConfigService.getInstance();
    McpServerInstanceManager.instance = this;
  }

  /** The resolver every managed server it creates uses for its secret references; set once at startup. */
  useSecretResolver(resolver: McpSecretResolver): void {
    this.secretResolver = resolver;
  }

  getServerInstance(agentId: string, serverId: string): BaseManagedMcpServer {
    const existing = this.activeServers.get(agentId)?.get(serverId);
    if (existing) {
      return existing;
    }

    const baseConfig = this.configService.getConfig(serverId);
    if (!baseConfig) {
      throw new Error(`No configuration found for server_id '${serverId}'.`);
    }

    const serverInstance = this.createServerInstance(baseConfig);

    let agentMap = this.activeServers.get(agentId);
    if (!agentMap) {
      agentMap = new Map();
      this.activeServers.set(agentId, agentMap);
    }
    agentMap.set(serverId, serverInstance);

    return serverInstance;
  }

  async managedDiscoverySession<T>(
    serverConfig: BaseMcpConfig,
    handler: (server: BaseManagedMcpServer) => Promise<T>
  ): Promise<T> {
    const serverInstance = this.createServerInstance(serverConfig);
    try {
      return await handler(serverInstance);
    } finally {
      await serverInstance.close();
    }
  }

  /**
   * Closes every MCP server instance of `agentId`. The entries are detached first, so a request for the agent's
   * instances while they close gets new ones. A failed close is logged with the agent and server ids.
   */
  async cleanupMcpServerInstancesForAgent(agentId: string): Promise<void> {
    const agentMap = this.activeServers.get(agentId);
    if (!agentMap) {
      return;
    }
    this.activeServers.delete(agentId);

    const entries = Array.from(agentMap.entries());
    const results = await Promise.allSettled(entries.map(([, server]) => server.close()));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(
          `Closing MCP server '${entries[index]![0]}' for agent '${agentId}' failed: ${String(result.reason)}`
        );
      }
    });
  }

  private createServerInstance(serverConfig: BaseMcpConfig): BaseManagedMcpServer {
    switch (serverConfig.transport_type) {
      case McpTransportType.STDIO:
        return new StdioManagedMcpServer(serverConfig as StdioMcpServerConfig, this.secretResolver);
      case McpTransportType.STREAMABLE_HTTP:
        return new HttpManagedMcpServer(serverConfig, this.secretResolver);
      default:
        throw new Error(
          `No ManagedMcpServer implementation for transport type '${serverConfig.transport_type}'.`
        );
    }
  }
}

export const defaultMcpServerInstanceManager = McpServerInstanceManager.getInstance();
