import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { registerTools } from "autobyteus-ts";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { loadAllAgentTools } from "../../../src/startup/agent-tool-loader.js";

describe("Tool catalog cleanup GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let registrySnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  beforeEach(async () => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
    registerTools();
    await loadAllAgentTools();
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
  });

  it("does not expose removed local tools in LOCAL runtime catalog", async () => {
    const result = await graphql({
      schema,
      source: `
        query ToolsGroupedByCategory($origin: ToolOriginEnum!) {
          toolsGroupedByCategory(origin: $origin) {
            categoryName
            tools {
              name
            }
          }
        }
      `,
      variableValues: { origin: "LOCAL" },
    });

    if (result.errors?.length) {
      throw result.errors[0];
    }

    const data = result.data as {
      toolsGroupedByCategory: Array<{
        categoryName: string;
        tools: Array<{ name: string }>;
      }>;
    };

    expect(
      data.toolsGroupedByCategory.some((group) => group.categoryName === "MCP Server Management"),
    ).toBe(false);

    const allToolNames = data.toolsGroupedByCategory.flatMap((group) =>
      group.tools.map((tool) => tool.name),
    );
    const removedToolNames = [
      "apply_mcp_server_configurations",
      "delete_mcp_server_configuration",
      "discover_mcp_server_tools",
      "get_mcp_server_configuration",
      "list_mcp_server_configurations",
      "preview_mcp_server_tools",
      ["list", "available", "tools"].join("_"),
      ["list", "input", "processors"].join("_"),
      ["list", "lifecycle", "processors"].join("_"),
      ["list", "llm", "response", "processors"].join("_"),
      ["list", "tool", "result", "processors"].join("_"),
      ["create", "skill", "version"].join("_"),
      "get_available_skills",
      "get_skill_content",
      ["load", "skill"].join("_"),
    ];
    for (const toolName of removedToolNames) {
      expect(allToolNames).not.toContain(toolName);
    }

    expect(
      data.toolsGroupedByCategory.some((group) => group.categoryName === ["Tool", "Management"].join(" ")),
    ).toBe(false);
    expect(
      data.toolsGroupedByCategory.some((group) => group.categoryName === "Skills"),
    ).toBe(false);

    const generalGroup = data.toolsGroupedByCategory.find(
      (group) => group.categoryName === "General",
    );
    expect(generalGroup?.tools.map((tool) => tool.name) ?? []).not.toContain(
      ["load", "skill"].join("_"),
    );
    expect(allToolNames).toEqual(expect.arrayContaining(["read_file", "generate_image"]));
    expect(defaultToolRegistry.listToolNames()).toEqual(
      expect.arrayContaining(["read_file", "generate_image"]),
    );
    for (const toolName of removedToolNames) {
      expect(defaultToolRegistry.listToolNames()).not.toContain(toolName);
      expect(defaultToolRegistry.getToolDefinition(toolName)).toBeUndefined();
    }
  });
});
