import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { GraphQLError, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import {
  E2E_TEAM_MEMBER_RUN_MEMORY_VIEW_DOCUMENT,
  E2E_TEAM_MEMBER_RUN_PROJECTION_DOCUMENT,
  E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT,
} from "../helpers/team-run-graphql-documents.js";

describe("current Team runtime GraphQL document contracts", () => {
  it("validates the provider-gated live Team resume and member projection documents", async () => {
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", {
      paths: [typeGraphqlRoot],
    });
    const graphqlModule = await import(graphqlPath) as {
      parse(source: string): unknown;
      validate(schema: GraphQLSchema, document: unknown): readonly GraphQLError[];
    };
    const schema = await buildGraphqlSchema();

    for (const source of [
      E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT,
      E2E_TEAM_MEMBER_RUN_PROJECTION_DOCUMENT,
      E2E_TEAM_MEMBER_RUN_MEMORY_VIEW_DOCUMENT,
    ]) {
      expect(graphqlModule.validate(schema, graphqlModule.parse(source))).toEqual([]);
    }
  });
});
