import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

describe("Runtime capability GraphQL e2e", () => {
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

  it("returns backend-owned runtime capability metadata", async () => {
    const result = await graphql({
      schema,
      source: `
        query RuntimeCapabilities {
          runtimeCapabilities {
            runtimeKind
            enabled
            reason
          }
        }
      `,
    });

    if (result.errors?.length) {
      throw result.errors[0];
    }

    const capabilities = (result.data as any)?.runtimeCapabilities as Array<{
      runtimeKind: string;
      enabled: boolean;
      reason: string | null;
    }>;
    expect(Array.isArray(capabilities)).toBe(true);
    const runtimeKinds = new Set(capabilities.map((capability) => capability.runtimeKind));
    expect(runtimeKinds.has("autobyteus")).toBe(true);
    expect(runtimeKinds.has("codex_app_server")).toBe(true);
    expect(runtimeKinds.has("claude_agent_sdk")).toBe(true);
  });
});
