import { Singleton } from '../../utils/singleton.js';
import { McpConfigService } from './config-service.js';
import { McpToolFactory } from './factory.js';
import { McpSchemaMapper } from './schema-mapper.js';
import { McpServerInstanceManager } from './server-instance-manager.js';
import { BaseMcpConfig } from './types.js';
import { ToolRegistry } from '../registry/tool-registry.js';
import { ToolDefinition } from '../registry/tool-definition.js';
import { ToolOrigin } from '../tool-origin.js';

type McpToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type RegistrarDependencies = {
  configService?: McpConfigService;
  toolRegistry?: ToolRegistry;
  instanceManager?: McpServerInstanceManager;
};

export class McpToolRegistrar extends Singleton {
  protected static instance?: McpToolRegistrar;

  private configService!: McpConfigService;
  private toolRegistry!: ToolRegistry;
  private instanceManager!: McpServerInstanceManager;
  private _registeredToolsByServer: Map<string, ToolDefinition[]> = new Map();

  constructor(deps?: RegistrarDependencies) {
    super();
    if (McpToolRegistrar.instance) {
      return McpToolRegistrar.instance;
    }

    this.configService = deps?.configService ?? McpConfigService.getInstance();
    this.toolRegistry = deps?.toolRegistry ?? ToolRegistry.getInstance();
    this.instanceManager = deps?.instanceManager ?? McpServerInstanceManager.getInstance();

    McpToolRegistrar.instance = this;
  }

  protected async fetchToolsFromServer(serverConfig: BaseMcpConfig): Promise<McpToolDescriptor[]> {
    return this.instanceManager.managedDiscoverySession(serverConfig, async (server) => {
      return (await server.listRemoteTools()) as McpToolDescriptor[];
    });
  }

  private createToolDefinitionFromRemote(
    remoteTool: McpToolDescriptor,
    serverConfig: BaseMcpConfig,
    schemaMapper: McpSchemaMapper
  ): ToolDefinition {
    const actualArgSchema = schemaMapper.mapToAutobyteusSchema(remoteTool.inputSchema);
    const actualDesc = remoteTool.description;

    let registeredName = remoteTool.name;
    if (serverConfig.tool_name_prefix) {
      const prefix = serverConfig.tool_name_prefix.replace(/_+$/u, '');
      registeredName = `${prefix}_${remoteTool.name}`;
    }

    const toolFactory = new McpToolFactory(
      serverConfig.server_id,
      remoteTool.name,
      registeredName,
      actualDesc,
      actualArgSchema
    );

    return new ToolDefinition(
      registeredName,
      actualDesc,
      ToolOrigin.MCP,
      serverConfig.server_id,
      () => actualArgSchema,
      () => null,
      {
        customFactory: toolFactory.createTool.bind(toolFactory),
        metadata: { mcp_server_id: serverConfig.server_id }
      }
    );
  }

  private async discoverAndRegisterFromConfig(
    serverConfig: BaseMcpConfig,
    schemaMapper: McpSchemaMapper
  ): Promise<ToolDefinition[]> {
    const registered: ToolDefinition[] = [];
    if (!serverConfig.enabled) {
      return registered;
    }

    const remoteTools = await this.fetchToolsFromServer(serverConfig);
    for (const remoteTool of remoteTools) {
      const toolDef = this.createToolDefinitionFromRemote(remoteTool, serverConfig, schemaMapper);
      this.toolRegistry.registerTool(toolDef);
      if (!this._registeredToolsByServer.has(serverConfig.server_id)) {
        this._registeredToolsByServer.set(serverConfig.server_id, []);
      }
      this._registeredToolsByServer.get(serverConfig.server_id)?.push(toolDef);
      registered.push(toolDef);
    }

    return registered;
  }

  async registerServer(configObject: BaseMcpConfig): Promise<ToolDefinition[]> {
    if (!(configObject instanceof BaseMcpConfig)) {
      throw new TypeError(`config_object must be a BaseMcpConfig object, not ${typeof configObject}.`);
    }

    this.configService.addConfig(configObject);
    this.unregisterToolsFromServer(configObject.server_id);

    const schemaMapper = new McpSchemaMapper();
    return await this.discoverAndRegisterFromConfig(configObject, schemaMapper);
  }

  async loadAndRegisterServer(configDict: Record<string, unknown>): Promise<ToolDefinition[]> {
    const validatedConfig = this.configService.loadConfigFromDict(configDict);
    return await this.registerServer(validatedConfig);
  }

  async reloadAllMcpTools(): Promise<ToolDefinition[]> {
    const serverIds = Array.from(this._registeredToolsByServer.keys());
    for (const serverId of serverIds) {
      this.unregisterToolsFromServer(serverId);
    }

    const configsToProcess = this.configService.getAllConfigs();
    if (!configsToProcess.length) {
      return [];
    }

    const schemaMapper = new McpSchemaMapper();
    const allRegistered: ToolDefinition[] = [];

    for (const serverConfig of configsToProcess) {
      try {
        const newlyRegistered = await this.discoverAndRegisterFromConfig(serverConfig, schemaMapper);
        allRegistered.push(...newlyRegistered);
      } catch {
        // skip failures and keep processing other servers
      }
    }

    return allRegistered;
  }

  async listRemoteTools(mcpConfig: BaseMcpConfig | Record<string, unknown>): Promise<ToolDefinition[]> {
    const validatedConfig =
      mcpConfig instanceof BaseMcpConfig
        ? mcpConfig
        : McpConfigService.parseMcpConfigDict(mcpConfig);

    const schemaMapper = new McpSchemaMapper();
    const toolDefinitions: ToolDefinition[] = [];

    const remoteTools = await this.fetchToolsFromServer(validatedConfig);
    for (const remoteTool of remoteTools) {
      toolDefinitions.push(this.createToolDefinitionFromRemote(remoteTool, validatedConfig, schemaMapper));
    }

    return toolDefinitions;
  }

  unregisterToolsFromServer(serverId: string): boolean {
    const tools = this._registeredToolsByServer.get(serverId);
    if (!tools) {
      return false;
    }

    for (const toolDef of tools) {
      this.toolRegistry.unregisterTool(toolDef.name);
    }

    this._registeredToolsByServer.delete(serverId);
    return true;
  }

  isServerRegistered(serverId: string): boolean {
    return this._registeredToolsByServer.has(serverId);
  }
}

export const defaultMcpToolRegistrar = McpToolRegistrar.getInstance();
