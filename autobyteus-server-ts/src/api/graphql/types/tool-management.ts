import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { ToolOrigin } from "autobyteus-ts";
import {
  ToolCategoryGroup,
  ToolDefinitionDetail,
  ToolOriginEnum,
  ReloadToolSchemaResult,
} from "./tool-definition.js";
import { ToolDefinitionConverter } from "../converters/tool-definition-converter.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const toCoreOrigin = (origin: ToolOriginEnum): ToolOrigin =>
  origin === ToolOriginEnum.MCP ? ToolOrigin.MCP : ToolOrigin.LOCAL;

@Resolver()
export class ToolManagementResolver {
  @Query(() => [ToolDefinitionDetail])
  async tools(
    @Arg("origin", () => ToolOriginEnum, { nullable: true }) origin?: ToolOriginEnum | null,
    @Arg("sourceServerId", () => String, { nullable: true }) sourceServerId?: string | null,
  ): Promise<ToolDefinitionDetail[]> {
    try {
      if (origin) {
        const coreOrigin = toCoreOrigin(origin);
        return defaultToolRegistry
          .listTools()
          .filter((tool) => tool.origin === coreOrigin)
          .map((tool) => ToolDefinitionConverter.toGraphql(tool));
      }

      if (sourceServerId) {
        return defaultToolRegistry
          .getToolsByMcpServer(sourceServerId)
          .map((tool) => ToolDefinitionConverter.toGraphql(tool));
      }

      return defaultToolRegistry.listTools().map((tool) => ToolDefinitionConverter.toGraphql(tool));
    } catch (error) {
      logger.error(`Error fetching tools: ${String(error)}`);
      throw new Error("Unable to fetch tools at this time.");
    }
  }

  @Query(() => [ToolCategoryGroup])
  async toolsGroupedByCategory(
    @Arg("origin", () => ToolOriginEnum) origin: ToolOriginEnum,
  ): Promise<ToolCategoryGroup[]> {
    try {
      const grouped = defaultToolRegistry.getToolsGroupedByCategory(toCoreOrigin(origin));
      return Object.entries(grouped).map(([categoryName, tools]) => ({
        categoryName,
        tools: tools.map((tool) => ToolDefinitionConverter.toGraphql(tool)),
      }));
    } catch (error) {
      logger.error(`Error fetching tools grouped by category: ${String(error)}`);
      throw new Error("Unable to fetch grouped tools at this time.");
    }
  }

  @Mutation(() => ReloadToolSchemaResult)
  async reloadToolSchema(
    @Arg("name", () => String) name: string,
  ): Promise<ReloadToolSchemaResult> {
    try {
      logger.info(`Received request to reload schema for tool: '${name}'`);
      const success = defaultToolRegistry.reloadToolSchema(name);
      if (success) {
        const updatedDefinition = defaultToolRegistry.getToolDefinition(name);
        if (updatedDefinition) {
          return {
            success: true,
            message: `Schema for tool '${name}' reloaded successfully.`,
            tool: ToolDefinitionConverter.toGraphql(updatedDefinition),
          };
        }
        return {
          success: false,
          message: `Schema for tool '${name}' was reloaded, but the definition could not be retrieved.`,
          tool: null,
        };
      }
      return {
        success: false,
        message: `Tool '${name}' not found. Cannot reload schema.`,
        tool: null,
      };
    } catch (error) {
      logger.error(`An unexpected error occurred while reloading schema for tool '${name}': ${String(error)}`);
      return {
        success: false,
        message: `An unexpected error occurred: ${String(error)}`,
        tool: null,
      };
    }
  }
}
