import { Singleton } from '../../utils/singleton.js';
import { McpConfigService } from './config-service.js';
import {
  BaseMcpConfig,
  McpTransportType,
  StdioMcpServerConfig
} from './types.js';
import { BaseManagedMcpServer } from './server/base-managed-mcp-server.js';
import { StdioManagedMcpServer } from './server/stdio-managed-mcp-server.js';
import { HttpManagedMcpServer } from './server/http-managed-mcp-server.js';
import { WebsocketManagedMcpServer } from './server/websocket-managed-mcp-server.js';

type WorkspacePathProvider = (agentId: string) => string | null;

export class McpServerInstanceManager extends Singleton {
  protected static instance?: McpServerInstanceManager;

  private configService!: McpConfigService;
  private activeServers: Map<string, Map<string, BaseManagedMcpServer>> = new Map();
  private workspacePathProvider: WorkspacePathProvider | null = null;

  constructor(deps?: { configService?: McpConfigService }) {
    super();
    if (McpServerInstanceManager.instance) {
      return McpServerInstanceManager.instance;
    }
    this.configService = deps?.configService ?? McpConfigService.getInstance();
    McpServerInstanceManager.instance = this;
  }

  setWorkspacePathProvider(provider: WorkspacePathProvider | null): void {
    this.workspacePathProvider = provider;
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

    const finalConfig = this.applyWorkspaceEnv(baseConfig, agentId);
    const serverInstance = this.createServerInstance(finalConfig);

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

  async cleanupMcpServerInstancesForAgent(agentId: string): Promise<void> {
    const agentMap = this.activeServers.get(agentId);
    if (!agentMap) {
      return;
    }

    const servers = Array.from(agentMap.values());
    for (const server of servers) {
      try {
        await server.close();
      } catch {
        // ignore close errors
      }
    }

    this.activeServers.delete(agentId);
  }

  async cleanupAllMcpServerInstances(): Promise<void> {
    const agentIds = Array.from(this.activeServers.keys());
    for (const agentId of agentIds) {
      await this.cleanupMcpServerInstancesForAgent(agentId);
    }
  }

  private createServerInstance(serverConfig: BaseMcpConfig): BaseManagedMcpServer {
    switch (serverConfig.transport_type) {
      case McpTransportType.STDIO:
        return new StdioManagedMcpServer(serverConfig as StdioMcpServerConfig);
      case McpTransportType.STREAMABLE_HTTP:
        return new HttpManagedMcpServer(serverConfig);
      case McpTransportType.WEBSOCKET:
        return new WebsocketManagedMcpServer(serverConfig);
      default:
        throw new Error(
          `No ManagedMcpServer implementation for transport type '${serverConfig.transport_type}'.`
        );
    }
  }

  private applyWorkspaceEnv(baseConfig: BaseMcpConfig, agentId: string): BaseMcpConfig {
    if (!(baseConfig instanceof StdioMcpServerConfig)) {
      return baseConfig;
    }

    const workspacePath = this.workspacePathProvider?.(agentId);
    if (!workspacePath) {
      return baseConfig;
    }

    const env = { ...(baseConfig.env ?? {}) };
    env.AUTOBYTEUS_AGENT_WORKSPACE = workspacePath;

    return new StdioMcpServerConfig({
      server_id: baseConfig.server_id,
      enabled: baseConfig.enabled,
      tool_name_prefix: baseConfig.tool_name_prefix ?? undefined,
      command: baseConfig.command,
      args: baseConfig.args,
      env,
      cwd: baseConfig.cwd
    });
  }
}

export const defaultMcpServerInstanceManager = McpServerInstanceManager.getInstance();
