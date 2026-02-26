import { Arg, Mutation, Query, Resolver } from "type-graphql";
import {
  BaseMcpConfig,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
} from "autobyteus-ts";
import { ToolDefinitionConverter } from "../converters/tool-definition-converter.js";
import { McpServerConverter } from "../converters/mcp-server-converter.js";
import { getMcpConfigService } from "../../../mcp-server-management/services/mcp-config-service.js";
import {
  ConfigureMcpServerResult,
  DeleteMcpServerResult,
  DiscoverAndRegisterMcpServerToolsResult,
  ImportMcpServerConfigsResult,
  McpServerConfigUnion,
  McpServerInput,
  McpTransportTypeEnum,
  StdioMcpServerConfig as StdioMcpServerConfigGraphql,
  StreamableHttpMcpServerConfig as StreamableHttpMcpServerConfigGraphql,
} from "./mcp-server-config.js";
import { ToolDefinitionDetail } from "./tool-definition.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const toStringRecord = (
  value: Record<string, unknown> | null | undefined,
): Record<string, string> | undefined => {
  if (!value) {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = typeof val === "string" ? val : String(val);
  }
  return result;
};

const createDomainConfigFromInput = (input: McpServerInput): BaseMcpConfig => {
  if (input.transportType === McpTransportTypeEnum.STDIO) {
    if (!input.stdioConfig) {
      throw new Error("stdioConfig must be provided for STDIO transport type.");
    }
    return new StdioMcpServerConfig({
      server_id: input.serverId,
      enabled: input.enabled ?? true,
      tool_name_prefix: input.toolNamePrefix ?? null,
      command: input.stdioConfig.command,
      args: input.stdioConfig.args ?? undefined,
      env: toStringRecord(input.stdioConfig.env),
      cwd: input.stdioConfig.cwd ?? null,
    });
  }

  if (input.transportType === McpTransportTypeEnum.STREAMABLE_HTTP) {
    if (!input.streamableHttpConfig) {
      throw new Error("streamableHttpConfig must be provided for STREAMABLE_HTTP transport type.");
    }
    return new StreamableHttpMcpServerConfig({
      server_id: input.serverId,
      enabled: input.enabled ?? true,
      tool_name_prefix: input.toolNamePrefix ?? null,
      url: input.streamableHttpConfig.url,
      token: input.streamableHttpConfig.token ?? null,
      headers: toStringRecord(input.streamableHttpConfig.headers),
    });
  }

  throw new Error(`Unsupported transport type: ${input.transportType}`);
};

const toToolDefinitions = (tools: ToolDefinition[]): ReturnType<typeof ToolDefinitionConverter.toGraphql>[] =>
  tools.map((tool) => ToolDefinitionConverter.toGraphql(tool));

@Resolver()
export class McpServerResolver {
  private get mcpConfigService() {
    return getMcpConfigService();
  }

  @Query(() => [McpServerConfigUnion])
  async mcpServers(): Promise<Array<StdioMcpServerConfigGraphql | StreamableHttpMcpServerConfigGraphql>> {
    try {
      const domainConfigs = await this.mcpConfigService.getAllMcpServers();
      return domainConfigs.map((config) => McpServerConverter.toGraphql(config));
    } catch (error) {
      logger.error(`Error fetching MCP server configurations: ${String(error)}`);
      throw new Error("Unable to fetch MCP server configurations.");
    }
  }

  @Query(() => [ToolDefinitionDetail])
  async previewMcpServerTools(
    @Arg("input", () => McpServerInput) input: McpServerInput,
  ): Promise<ReturnType<typeof ToolDefinitionConverter.toGraphql>[]> {
    try {
      const configObj = createDomainConfigFromInput(input);
      const toolDefs = await this.mcpConfigService.previewMcpServerTools(configObj);
      return toToolDefinitions(toolDefs);
    } catch (error) {
      logger.error(`Error previewing tools for MCP server config '${input.serverId}': ${String(error)}`);
      throw new Error(`Failed to preview tools for MCP server: ${String(error)}`);
    }
  }

  @Mutation(() => ConfigureMcpServerResult)
  async configureMcpServer(
    @Arg("input", () => McpServerInput) input: McpServerInput,
  ): Promise<ConfigureMcpServerResult> {
    try {
      const configObj = createDomainConfigFromInput(input);
      const savedConfig = await this.mcpConfigService.configureMcpServer(configObj);
      return {
        savedConfig: McpServerConverter.toGraphql(savedConfig),
      };
    } catch (error) {
      logger.error(`Error configuring MCP server '${input.serverId}': ${String(error)}`);
      throw new Error(`Failed to configure MCP server: ${String(error)}`);
    }
  }

  @Mutation(() => DeleteMcpServerResult)
  async deleteMcpServer(
    @Arg("serverId", () => String) serverId: string,
  ): Promise<DeleteMcpServerResult> {
    try {
      const success = await this.mcpConfigService.deleteMcpServer(serverId);
      const message = success
        ? "MCP server configuration deleted successfully."
        : "Failed to delete MCP server configuration.";
      return { success, message };
    } catch (error) {
      logger.error(`Error deleting MCP server '${serverId}': ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => DiscoverAndRegisterMcpServerToolsResult)
  async discoverAndRegisterMcpServerTools(
    @Arg("serverId", () => String) serverId: string,
  ): Promise<DiscoverAndRegisterMcpServerToolsResult> {
    try {
      const discovered = await this.mcpConfigService.discoverAndRegisterToolsForServer(serverId);
      return {
        success: true,
        message: `Successfully discovered and registered ${discovered.length} tools.`,
        discoveredTools: toToolDefinitions(discovered),
      };
    } catch (error) {
      logger.error(`Error discovering tools for MCP server '${serverId}': ${String(error)}`);
      return {
        success: false,
        message: String(error),
        discoveredTools: [],
      };
    }
  }

  @Mutation(() => ImportMcpServerConfigsResult)
  async importMcpServerConfigs(
    @Arg("jsonString", () => String) jsonString: string,
  ): Promise<ImportMcpServerConfigsResult> {
    try {
      const result = await this.mcpConfigService.importConfigsFromJson(jsonString);
      const success = result.failed_count === 0;
      return {
        success,
        message: `Import complete. Imported: ${result.imported_count}, Failed: ${result.failed_count}`,
        importedCount: result.imported_count,
        failedCount: result.failed_count,
      };
    } catch (error) {
      logger.error(`Error during bulk import of MCP servers: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        importedCount: 0,
        failedCount: 0,
      };
    }
  }
}
