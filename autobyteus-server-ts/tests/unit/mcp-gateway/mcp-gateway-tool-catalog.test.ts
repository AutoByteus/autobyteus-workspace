import { describe, expect, it } from "vitest";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { McpGatewayToolCatalog } from "../../../src/mcp-gateway/mcp-gateway-tool-catalog.js";

class FakeTool extends BaseTool {
  static getDescription(): string { return "Fake tool"; }
  static getArgumentSchema(): ParameterSchema | null { return new ParameterSchema(); }
  protected async _execute(): Promise<unknown> { return { content: [{ type: "text", text: "ok" }] }; }
}

class FakeToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();
  register(definition: ToolDefinition): void { this.definitions.set(definition.name, definition); }
  listTools(): ToolDefinition[] { return Array.from(this.definitions.values()); }
  getToolDefinition(name: string): ToolDefinition | undefined { return this.definitions.get(name); }
  createTool(name: string): BaseTool {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new Error(`No definition for ${name}`);
    }
    const tool = definition.customFactory!();
    tool.definition = definition;
    return tool;
  }
}

const buildDefinition = (name: string, origin: ToolOrigin, metadata: Record<string, unknown> = {}) => new ToolDefinition(
  name,
  `Description for ${name}`,
  origin,
  origin === ToolOrigin.MCP ? "MCP" : "Local",
  () => new ParameterSchema(),
  () => null,
  { customFactory: () => new FakeTool(), metadata },
);

describe("McpGatewayToolCatalog", () => {
  it("lists only registered MCP-origin tools and sorts by name", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildDefinition("local_send_message", ToolOrigin.LOCAL));
    registry.register(buildDefinition("z_query", ToolOrigin.MCP, { mcp_server_id: "db" }));
    registry.register(buildDefinition("a_search", ToolOrigin.MCP, { mcp_server_id: "search" }));
    const catalog = new McpGatewayToolCatalog({ registry: registry as any });

    expect(catalog.listMcpGatewayTools()).toEqual([
      {
        name: "a_search",
        description: "Description for a_search",
        inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
      {
        name: "z_query",
        description: "Description for z_query",
        inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
    ]);
  });

  it("fails closed when a tool is missing or is no longer MCP-origin", () => {
    const registry = new FakeToolRegistry();
    registry.register(buildDefinition("db_query", ToolOrigin.MCP, { mcp_server_id: "db" }));
    const catalog = new McpGatewayToolCatalog({ registry: registry as any });

    expect(catalog.resolveMcpOriginTool("db_query")).toMatchObject({ ok: true });
    expect(catalog.resolveMcpOriginTool("missing")).toEqual({ ok: false, reason: "unknown_or_non_mcp_tool" });

    registry.register(buildDefinition("db_query", ToolOrigin.LOCAL));
    expect(catalog.resolveMcpOriginTool("db_query")).toEqual({ ok: false, reason: "unknown_or_non_mcp_tool" });
    expect(catalog.createCurrentMcpTool("db_query")).toBeNull();
  });
});
