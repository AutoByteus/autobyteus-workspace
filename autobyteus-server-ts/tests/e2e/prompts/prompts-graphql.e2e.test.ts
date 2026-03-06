import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

describe("Prompts GraphQL removal e2e", () => {
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

  it("rejects prompt-engineering GraphQL operations after md-centric migration", async () => {
    const result = await graphql({
      schema,
      source: `
        mutation CreatePrompt($input: CreatePromptInput!) {
          createPrompt(input: $input) {
            id
          }
        }
      `,
      variableValues: {
        input: {
          name: "legacy-prompt",
          category: "legacy",
          promptContent: "legacy",
        },
      },
    });

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    const combined = (result.errors ?? []).map((error) => error.message).join(" | ");
    expect(combined).toContain('Unknown type "CreatePromptInput"');
  });
});
