import "reflect-metadata";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { ClaudeModelCatalog } from "../../../src/llm-management/services/claude-model-catalog.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeModelCatalogIntegration =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

const KNOWN_REASONING_EFFORT_LEVELS: readonly string[] = [
  "high",
  "low",
  "max",
  "medium",
  "xhigh",
];

const expectReasoningEffortLevels = (
  actualLevels: string[],
  requiredLevels: string[],
): void => {
  expect(actualLevels).toEqual(expect.arrayContaining(requiredLevels));
  expect(actualLevels.every((level) => KNOWN_REASONING_EFFORT_LEVELS.includes(level))).toBe(
    true,
  );
};

const getReasoningEffortLevels = (
  configSchema: unknown,
): string[] => [
  ...(((configSchema as { properties?: Record<string, { enum?: string[] }> } | undefined)
    ?.properties?.reasoning_effort?.enum) ?? []),
].sort();

describeClaudeModelCatalogIntegration("ClaudeModelCatalog integration (live transport)", () => {
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

  it("preserves live descriptions and identifiers through the catalog and GraphQL", async () => {
    const catalog = new ClaudeModelCatalog();

    const models = await catalog.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(
      models.every(
        (model) =>
          typeof model.model_identifier === "string" && model.model_identifier.length > 0,
      ),
    ).toBe(true);
    const modelsByIdentifier = new Map(models.map((model) => [model.model_identifier, model]));
    const requiredAliases = ["default", "sonnet", "opus", "haiku"] as const;
    for (const identifier of requiredAliases) {
      const model = modelsByIdentifier.get(identifier);
      expect(model, `missing live Claude alias '${identifier}'`).toBeTruthy();
      expect(model?.value).toBe(identifier);
      expect(model?.canonical_name).toBe(identifier);
      expect(model?.description).toEqual(expect.any(String));
      expect(model?.description?.length).toBeGreaterThan(0);
      expect(model?.description).toBe(model?.description?.trim());
    }

    const defaultModel = modelsByIdentifier.get("default");
    const opusModel = modelsByIdentifier.get("opus");
    const haikuModel = modelsByIdentifier.get("haiku");

    expect(
      (defaultModel?.config_schema as { properties?: Record<string, unknown> } | undefined)?.properties
        ?.thinking_enabled,
    ).toBeTruthy();
    expectReasoningEffortLevels(
      getReasoningEffortLevels(defaultModel?.config_schema),
      ["high", "low", "medium"],
    );

    expectReasoningEffortLevels(
      getReasoningEffortLevels(opusModel?.config_schema),
      ["high", "low", "max", "medium"],
    );

    if (haikuModel?.config_schema) {
      expectReasoningEffortLevels(
        getReasoningEffortLevels(haikuModel.config_schema),
        ["high", "low", "medium"],
      );
    }

    const result = await graphql({
      schema,
      source: `
        query ClaudeModelDescriptions($runtimeKind: String) {
          providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
            llmModels {
              modelIdentifier
              name
              description
              value
              canonicalName
              providerId
              runtime
            }
          }
        }
      `,
      variableValues: {
        runtimeKind: "claude_agent_sdk",
      },
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }

    const graphQlModels = (result.data as {
      providerModelCatalogSnapshots: Array<{
        llmModels: Array<{
          modelIdentifier: string;
          name: string;
          description: string | null;
          value: string;
          canonicalName: string;
          providerId: string;
          runtime: string;
        }>;
      }>;
    }).providerModelCatalogSnapshots.flatMap((provider) => provider.llmModels);
    const graphQlModelsByIdentifier = new Map(
      graphQlModels.map((model) => [model.modelIdentifier, model]),
    );

    for (const identifier of requiredAliases) {
      const catalogModel = modelsByIdentifier.get(identifier)!;
      expect(graphQlModelsByIdentifier.get(identifier)).toMatchObject({
        modelIdentifier: identifier,
        name: catalogModel.display_name,
        description: catalogModel.description,
        value: identifier,
        canonicalName: identifier,
        providerId: catalogModel.provider_id,
        runtime: catalogModel.runtime,
      });
    }
  });
});
