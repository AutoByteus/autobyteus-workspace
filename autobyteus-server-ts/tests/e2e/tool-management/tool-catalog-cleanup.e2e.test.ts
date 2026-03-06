import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

describe("Tool catalog cleanup GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  it("does not expose MCP wrapper management tools in LOCAL runtime catalog", async () => {
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
    const removedWrapperTools = [
      "apply_mcp_server_configurations",
      "delete_mcp_server_configuration",
      "discover_mcp_server_tools",
      "get_mcp_server_configuration",
      "list_mcp_server_configurations",
      "preview_mcp_server_tools",
    ];
    for (const toolName of removedWrapperTools) {
      expect(allToolNames).not.toContain(toolName);
    }
  });
});
