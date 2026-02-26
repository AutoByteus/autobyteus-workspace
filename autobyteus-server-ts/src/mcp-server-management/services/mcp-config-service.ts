import { McpConfigService as CoreMcpConfigService, McpToolRegistrar } from "autobyteus-ts";
import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { CachedMcpServerConfigProvider } from "../providers/cached-provider.js";
import { McpServerPersistenceProvider } from "../providers/persistence-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

type ApplyResult = {
  summary: { total_processed: number; successful: number; failed: number };
  results: Record<string, { status: string; message: string; registered_tools?: ToolDefinition[] }>;
};

export class McpConfigService {
  private static instance: McpConfigService | null = null;

  static getInstance(): McpConfigService {
    if (!McpConfigService.instance) {
      McpConfigService.instance = new McpConfigService();
    }
    return McpConfigService.instance;
  }

  static resetInstance(): void {
    McpConfigService.instance = null;
  }

  private provider: CachedMcpServerConfigProvider;
  private coreConfigService: CoreMcpConfigService;
  private toolRegistrar: McpToolRegistrar;

  constructor() {
    const persistenceProvider = new McpServerPersistenceProvider();
    this.provider = new CachedMcpServerConfigProvider(persistenceProvider);

    this.coreConfigService = CoreMcpConfigService.getInstance();
    this.toolRegistrar = McpToolRegistrar.getInstance();
  }

  async loadAllAndRegister(): Promise<void> {
    logger.info("Loading and registering all MCP server configurations from database...");
    try {
      const allDbConfigs = await this.provider.getAll();
      logger.info(`Found ${allDbConfigs.length} total MCP server configs.`);

      this.coreConfigService.clearConfigs();
      for (const config of allDbConfigs) {
        this.coreConfigService.addConfig(config);
      }
      logger.info("Synchronized cached configurations with the core MCP config service.");

      await this.toolRegistrar.reloadAllMcpTools();
      logger.info("Finished loading and registering all MCP server configurations.");
    } catch (error) {
      logger.error(`An error occurred during MCP configuration loading: ${String(error)}`);
    }
  }

  async getAllMcpServers(): Promise<BaseMcpConfig[]> {
    logger.debug("Fetching all MCP server configurations.");
    return this.provider.getAll();
  }

  async getMcpServerById(serverId: string): Promise<BaseMcpConfig | null> {
    logger.debug(`Fetching MCP server configuration for server_id: ${serverId}`);
    return this.provider.getByServerId(serverId);
  }

  async configureMcpServer(configObj: BaseMcpConfig): Promise<BaseMcpConfig> {
    logger.info(`Configuring MCP server with ID: ${configObj.server_id}`);

    const existingConfig = await this.provider.getByServerId(configObj.server_id);
    const savedConfig = existingConfig
      ? await this.provider.update(configObj)
      : await this.provider.create(configObj);

    this.coreConfigService.addConfig(savedConfig);

    if (!savedConfig.enabled && this.toolRegistrar.isServerRegistered(savedConfig.server_id)) {
      this.toolRegistrar.unregisterToolsFromServer(savedConfig.server_id);
      logger.info(`Unregistered tools for disabled server: ${savedConfig.server_id}`);
    }

    return savedConfig;
  }

  async discoverAndRegisterToolsForServer(serverId: string): Promise<ToolDefinition[]> {
    logger.info(`Attempting to discover and register tools for server ID: ${serverId}`);
    const config = await this.getMcpServerById(serverId);
    if (!config) {
      throw new Error(`No configuration found for server ID: ${serverId}`);
    }

    if (!config.enabled) {
      logger.warn(`Server ${serverId} is disabled. Skipping tool discovery.`);
      if (this.toolRegistrar.isServerRegistered(serverId)) {
        this.toolRegistrar.unregisterToolsFromServer(serverId);
      }
      return [];
    }

    const discovered = await this.toolRegistrar.registerServer(config);
    logger.info(`Successfully discovered and registered ${discovered.length} tools for server ID: ${serverId}`);
    return discovered;
  }

  async previewMcpServerTools(configObj: BaseMcpConfig): Promise<ToolDefinition[]> {
    logger.info(`Previewing tools for server configuration: ${configObj.server_id}`);
    return this.toolRegistrar.listRemoteTools(configObj);
  }

  async deleteMcpServer(serverId: string): Promise<boolean> {
    logger.info(`Deleting MCP server with ID: ${serverId}`);

    if (this.toolRegistrar.isServerRegistered(serverId)) {
      this.toolRegistrar.unregisterToolsFromServer(serverId);
      logger.info(`Unregistered tools for server ID: ${serverId} before deletion.`);
    }

    this.coreConfigService.removeConfig(serverId);
    logger.info(`Removed config for server ID: ${serverId} from core service.`);

    const success = await this.provider.deleteByServerId(serverId);
    if (success) {
      logger.info(`Successfully deleted configuration for server ID: ${serverId}`);
    } else {
      logger.warn(`Failed to delete configuration for server ID: ${serverId}. It might have already been removed.`);
    }

    return success;
  }

  async importConfigsFromJson(jsonString: string): Promise<{ imported_count: number; failed_count: number }> {
    logger.info("Starting bulk import of MCP server configurations from JSON.");
    const data = JSON.parse(jsonString) as Record<string, unknown>;

    const configs = data?.mcpServers;
    if (!configs || typeof configs !== "object" || Array.isArray(configs)) {
      throw new Error("JSON must contain a top-level 'mcpServers' object.");
    }

    let importedCount = 0;
    let failedCount = 0;

    for (const [serverId, configDetails] of Object.entries(configs as Record<string, unknown>)) {
      try {
        const fullConfigDict = { server_id: serverId, ...(configDetails as Record<string, unknown>) };
        const configObj = CoreMcpConfigService.parseMcpConfigDict({
          [serverId]: fullConfigDict,
        });
        await this.configureMcpServer(configObj);
        importedCount += 1;
      } catch (error) {
        logger.error(`Failed to import configuration for server '${serverId}': ${String(error)}`);
        failedCount += 1;
      }
    }

    logger.info(`Bulk import complete. Imported: ${importedCount}, Failed: ${failedCount}`);
    return { imported_count: importedCount, failed_count: failedCount };
  }

  async applyAndRegisterConfigsFromJson(jsonString: string): Promise<ApplyResult> {
    logger.info("Starting async bulk apply-and-register of MCP server configurations from JSON.");
    const data = JSON.parse(jsonString) as Record<string, unknown>;

    const configs = data?.mcpServers;
    if (!configs || typeof configs !== "object" || Array.isArray(configs)) {
      throw new Error("JSON must contain a top-level 'mcpServers' object.");
    }

    const results: ApplyResult["results"] = {};
    let successCount = 0;
    let failCount = 0;

    for (const [serverId, configDetails] of Object.entries(configs as Record<string, unknown>)) {
      try {
        const fullConfigDict = { server_id: serverId, ...(configDetails as Record<string, unknown>) };
        const configObj = CoreMcpConfigService.parseMcpConfigDict({
          [serverId]: fullConfigDict,
        });

        const savedConfig = await this.configureMcpServer(configObj);

        if (savedConfig.enabled) {
          const discoveredTools = await this.discoverAndRegisterToolsForServer(serverId);
          results[serverId] = {
            status: "success",
            message: `Configuration saved and ${discoveredTools.length} tools registered.`,
            registered_tools: discoveredTools,
          };
        } else {
          results[serverId] = {
            status: "success",
            message: "Configuration saved. Server is disabled, tool registration skipped.",
            registered_tools: [],
          };
        }
        successCount += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to apply and register configuration for server '${serverId}': ${errorMessage}`);
        results[serverId] = {
          status: "error",
          message: errorMessage,
        };
        failCount += 1;
      }
    }

    const summary = {
      total_processed: Object.keys(configs).length,
      successful: successCount,
      failed: failCount,
    };

    logger.info(`Bulk apply-and-register complete. Summary: ${JSON.stringify(summary)}`);
    return { summary, results };
  }
}

export const getMcpConfigService = (): McpConfigService => McpConfigService.getInstance();
