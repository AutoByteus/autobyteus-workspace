import { defaultToolRegistry, type ToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";

export type McpGatewayToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpGatewayToolResolution =
  | { ok: true; definition: ToolDefinition }
  | { ok: false; reason: "unknown_or_non_mcp_tool" };

type McpGatewayToolCatalogRegistry = Pick<ToolRegistry, "listTools" | "getToolDefinition" | "createTool">;

export class McpGatewayToolCatalog {
  private static instance: McpGatewayToolCatalog | null = null;
  private readonly registry: McpGatewayToolCatalogRegistry;

  static getInstance(): McpGatewayToolCatalog {
    if (!McpGatewayToolCatalog.instance) {
      McpGatewayToolCatalog.instance = new McpGatewayToolCatalog();
    }
    return McpGatewayToolCatalog.instance;
  }

  static resetInstance(): void {
    McpGatewayToolCatalog.instance = null;
  }

  constructor(deps: { registry?: McpGatewayToolCatalogRegistry } = {}) {
    this.registry = deps.registry ?? defaultToolRegistry;
  }

  listMcpGatewayTools(): McpGatewayToolDefinition[] {
    return this.registry.listTools()
      .filter((definition) => definition.origin === ToolOrigin.MCP)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((definition) => this.toGatewayToolDefinition(definition));
  }

  resolveMcpOriginTool(toolName: string): McpGatewayToolResolution {
    const definition = this.registry.getToolDefinition(toolName);
    if (!definition || definition.origin !== ToolOrigin.MCP) {
      return { ok: false, reason: "unknown_or_non_mcp_tool" };
    }
    return { ok: true, definition };
  }

  createCurrentMcpTool(toolName: string) {
    const resolution = this.resolveMcpOriginTool(toolName);
    if (!resolution.ok) {
      return null;
    }
    const tool = this.registry.createTool(toolName);
    if (tool.definition?.origin !== ToolOrigin.MCP) {
      return null;
    }
    return tool;
  }

  private toGatewayToolDefinition(definition: ToolDefinition): McpGatewayToolDefinition {
    return {
      name: definition.name,
      description: definition.description,
      inputSchema: normalizeObjectInputSchema(definition.argumentSchema),
    };
  }
}

export const getMcpGatewayToolCatalog = (): McpGatewayToolCatalog =>
  McpGatewayToolCatalog.getInstance();

export const resetMcpGatewayToolCatalogForTests = (): void => {
  McpGatewayToolCatalog.resetInstance();
};

const normalizeObjectInputSchema = (schemaSource: ParameterSchema | null): Record<string, unknown> => {
  const schema = schemaSource ? schemaSource.toJsonSchema() : {};
  const normalized = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  if (normalized.type === undefined) {
    normalized.type = "object";
  }
  if (normalized.type === "object" && normalized.additionalProperties === undefined) {
    normalized.additionalProperties = false;
  }
  if (normalized.type === "object" && normalized.properties === undefined) {
    normalized.properties = {};
  }
  if (normalized.type === "object" && normalized.required === undefined) {
    normalized.required = [];
  }
  return normalized;
};
