import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { ToolDefinitionConverter } from "../converters/tool-definition-converter.js";
import { McpServerConverter } from "../converters/mcp-server-converter.js";
import { McpServerInputMapper } from "../converters/mcp-server-input-mapper.js";
import { getMcpConfigService } from "../../../mcp-server-management/services/mcp-config-service.js";
import { McpSecretSuggestionRule as SuggestionRule } from "../../../mcp-server-management/services/mcp-secret-suggestion-rule.js";
import {
  ConfigureMcpServerResult,
  DeleteMcpServerResult,
  DiscoverAndRegisterMcpServerToolsResult,
  ImportMcpServerConfigsResult,
  McpSecretMatchEnum,
  McpSecretMoveCandidate,
  McpSecretSuggestionRule,
  McpServerConfigUnion,
  McpServerFieldInput,
  McpServerInput,
  MoveMcpSecretsToVaultResult,
  StdioMcpServerConfig as StdioMcpServerConfigGraphql,
  StreamableHttpMcpServerConfig as StreamableHttpMcpServerConfigGraphql,
} from "./mcp-server-config.js";
import { ToolDefinitionDetail } from "./tool-definition.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
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
      const views = await this.mcpConfigService.listMcpServerViews();
      return views.map((view) => McpServerConverter.toGraphql(view));
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
      const draft = McpServerInputMapper.toDraft(input);
      const toolDefs = await this.mcpConfigService.previewMcpServerTools(draft);
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
      const draft = McpServerInputMapper.toDraft(input);
      const savedView = await this.mcpConfigService.configureMcpServer(draft);
      return {
        savedConfig: McpServerConverter.toGraphql(savedView),
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
      const result = await this.mcpConfigService.importMcpServerConfigs(jsonString);
      const success = result.failed_count === 0;
      return {
        success,
        message: `Import complete. Imported: ${result.imported_count}, Failed: ${result.failed_count}`,
        importedCount: result.imported_count,
        failedCount: result.failed_count,
        failures: result.failures.map((failure) => ({ serverId: failure.server_id, reason: failure.reason })),
        storedSecrets: result.stored_secrets.map(({ serverId, field }) => ({ serverId, field })),
        needsSecret: result.needs_secret.map(({ serverId, field }) => ({ serverId, field })),
      };
    } catch (error) {
      logger.error(`Error during bulk import of MCP servers: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        importedCount: 0,
        failedCount: 0,
        failures: [],
        storedSecrets: [],
        needsSecret: [],
      };
    }
  }

  @Query(() => McpSecretSuggestionRule)
  mcpSecretSuggestionRule(): McpSecretSuggestionRule {
    const rule = SuggestionRule.data;
    return {
      nameKeywords: [...rule.nameKeywords],
      valuePrefixes: [...rule.valuePrefixes],
      alwaysSecretFields: [...rule.alwaysSecretFields],
    };
  }

  @Query(() => [McpSecretMoveCandidate])
  async mcpSecretMoveCandidates(): Promise<McpSecretMoveCandidate[]> {
    const candidates = await this.mcpConfigService.listSecretMoveCandidates();
    return candidates.map(({ serverId, field, matchedBy }) => ({ serverId, field, matchedBy: McpSecretMatchEnum[matchedBy] }));
  }

  @Mutation(() => MoveMcpSecretsToVaultResult)
  async moveMcpSecretsToVault(
    @Arg("selection", () => [McpServerFieldInput]) selection: McpServerFieldInput[],
  ): Promise<MoveMcpSecretsToVaultResult> {
    try {
      const result = await this.mcpConfigService.moveSecretsToVault(McpServerInputMapper.toFields(selection));
      return {
        backupPath: result.backupPath,
        moved: [...result.moved],
        skipped: [...result.skipped],
        serversFailingAfterMove: [...result.serversFailingAfterMove],
      };
    } catch (error) {
      logger.error(`Error moving MCP values to the vault: ${String(error)}`);
      throw new Error(`Failed to move MCP values to the vault: ${String(error)}`);
    }
  }
}
