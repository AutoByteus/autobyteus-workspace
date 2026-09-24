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
    // The live CLI lists Opus as `opus` or `opus[1m]` depending on version/account.
    const opusModel = models.find(
      (model) => model.model_identifier === "opus" || model.model_identifier.startsWith("opus["),
    );
    expect(opusModel, "missing live Claude Opus alias row").toBeTruthy();
    const requiredAliases = ["default", "sonnet", "haiku", opusModel!.model_identifier];
    for (const identifier of requiredAliases) {
      const model = modelsByIdentifier.get(identifier);
      expect(model, `missing live Claude alias '${identifier}'`).toBeTruthy();
      expect(model?.value).toBe(identifier);
      expect(model?.canonical_name).toEqual(expect.any(String));
      expect(model?.canonical_name.length).toBeGreaterThan(0);
      expect(model?.description).toEqual(expect.any(String));
      expect(model?.description?.length).toBeGreaterThan(0);
      expect(model?.description).toBe(model?.description?.trim());
    }

    const defaultModel = modelsByIdentifier.get("default");
    const haikuModel = modelsByIdentifier.get("haiku");
    // Canonical name is the SDK-resolved model ID, not the alias the row is selected by.
    expect(defaultModel?.canonical_name).not.toBe("default");
    expect(defaultModel?.canonical_name).toMatch(/^claude-/);

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
              selectionPresentation { recommended aliasOfModelIdentifier }
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
          selectionPresentation: {
            recommended: boolean;
            aliasOfModelIdentifier: string | null;
          } | null;
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
        canonicalName: catalogModel.canonical_name,
        providerId: catalogModel.provider_id,
        runtime: catalogModel.runtime,
      });
    }

    // Picker presentation: every row keeps its identity; exactly one row is recommended,
    // and `default` either is that row or folds into the listed row with the same canonical ID.
    expect(graphQlModels.every((model) => model.selectionPresentation !== null)).toBe(true);
    const recommendedModels = graphQlModels.filter(
      (model) => model.selectionPresentation?.recommended,
    );
    expect(recommendedModels).toHaveLength(1);
    const graphQlDefault = graphQlModelsByIdentifier.get("default")!;
    const defaultAliasTarget = graphQlDefault.selectionPresentation?.aliasOfModelIdentifier ?? null;
    if (defaultAliasTarget === null) {
      expect(recommendedModels[0]!.modelIdentifier).toBe("default");
    } else {
      const target = graphQlModelsByIdentifier.get(defaultAliasTarget);
      expect(target, `alias target '${defaultAliasTarget}' is not a listed row`).toBeTruthy();
      expect(target?.canonicalName).toBe(graphQlDefault.canonicalName);
      expect(target?.selectionPresentation).toEqual({
        recommended: true,
        aliasOfModelIdentifier: null,
      });
    }
    expect(
      graphQlModels
        .filter((model) => model.modelIdentifier !== "default")
        .every((model) => model.selectionPresentation?.aliasOfModelIdentifier === null),
    ).toBe(true);
  });
});
