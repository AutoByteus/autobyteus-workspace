import "reflect-metadata";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env["RUN_CODEX_E2E"] === "1";
const describeCodexModelCatalogIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

type JsonObject = Record<string, unknown>;

type RawModelCapabilities = {
  modelIdentifier: string;
  selectableReasoningEfforts: string[];
  advertisesFast: boolean;
};

type ModelSchemaView = {
  modelIdentifier: string;
  configSchema?: {
    parameters?: Array<{
      name?: string;
      type?: string;
      enum_values?: string[];
    }>;
  } | null;
};

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const appendUnique = (values: string[], value: string | null): void => {
  if (value && !values.includes(value)) {
    values.push(value);
  }
};

const toRawModelCapabilities = (rowValue: unknown): RawModelCapabilities | null => {
  const row = asObject(rowValue);
  const modelIdentifier =
    asTrimmedString(row?.["model"]) ?? asTrimmedString(row?.["id"]);
  if (!row || !modelIdentifier) {
    return null;
  }

  const selectableReasoningEfforts: string[] = [];
  const supportedReasoningEfforts =
    row["supportedReasoningEfforts"] ?? row["supported_reasoning_efforts"];
  if (Array.isArray(supportedReasoningEfforts)) {
    for (const entryValue of supportedReasoningEfforts) {
      const entry = asObject(entryValue);
      appendUnique(
        selectableReasoningEfforts,
        asTrimmedString(
          entry?.["reasoningEffort"] ??
            entry?.["reasoning_effort"] ??
            entry?.["effort"] ??
            entryValue,
        ),
      );
    }
  }

  appendUnique(
    selectableReasoningEfforts,
    asTrimmedString(
      row["defaultReasoningEffort"] ?? row["default_reasoning_effort"],
    ),
  );

  const serviceTiers = row["serviceTiers"];
  const advertisesFast = Array.isArray(serviceTiers)
    ? serviceTiers.some(
        (value) =>
          asTrimmedString(asObject(value)?.["id"])?.toLowerCase() ===
          "priority",
      )
    : false;

  return {
    modelIdentifier,
    selectableReasoningEfforts,
    advertisesFast,
  };
};

const collectRawModelCapabilities = async (): Promise<RawModelCapabilities[]> => {
  const clientManager = getCodexAppServerClientManager();
  const client = await clientManager.acquireClient(process.cwd());
  const results: RawModelCapabilities[] = [];
  try {
    let cursor: string | null = null;
    do {
      const response = asObject(
        await client.request<unknown>("model/list", {
          cursor,
          includeHidden: false,
        }),
      );
      const rows = Array.isArray(response?.["data"]) ? response["data"] : [];
      for (const row of rows) {
        const capabilities = toRawModelCapabilities(row);
        if (capabilities) {
          results.push(capabilities);
        }
      }
      cursor = asTrimmedString(response?.["nextCursor"]);
    } while (cursor);
    return results;
  } finally {
    await clientManager.releaseClient(process.cwd());
  }
};

const parameterByName = (
  schema: ModelSchemaView["configSchema"] | undefined,
  name: string,
) => schema?.parameters?.find((parameter) => parameter.name === name) ?? null;

const assertSchemaParity = (
  rawModels: RawModelCapabilities[],
  models: ModelSchemaView[],
): void => {
  const modelById = new Map(models.map((model) => [model.modelIdentifier, model]));

  for (const rawModel of rawModels) {
    const model = modelById.get(rawModel.modelIdentifier);
    expect(model, `missing model '${rawModel.modelIdentifier}'`).toBeTruthy();

    const reasoningParam = parameterByName(model?.configSchema, "reasoning_effort");
    if (rawModel.selectableReasoningEfforts.length === 0) {
      expect(reasoningParam).toBeNull();
    } else {
      expect(reasoningParam?.type).toBe("enum");
      expect(reasoningParam?.enum_values).toEqual(
        rawModel.selectableReasoningEfforts,
      );
    }

    const serviceTierParam = parameterByName(model?.configSchema, "service_tier");
    if (rawModel.advertisesFast) {
      expect(serviceTierParam).toMatchObject({
        type: "enum",
        enum_values: ["fast"],
      });
    } else {
      expect(serviceTierParam).toBeNull();
    }
  }
};

describeCodexModelCatalogIntegration(
  "Codex model catalog and GraphQL integration (live transport)",
  () => {
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;

    beforeAll(async () => {
      schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", {
        paths: [typeGraphqlRoot],
      });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;
    });

    afterAll(async () => {
      await getCodexAppServerClientManager().close();
    });

    it("preserves each live model's advertised reasoning sequence through catalog and GraphQL", async () => {
      const rawModels = await collectRawModelCapabilities();
      expect(rawModels.length).toBeGreaterThan(0);
      expect(rawModels.some((model) => model.advertisesFast)).toBe(true);

      const catalogModels = await new CodexModelCatalog().listModels();
      expect(catalogModels.length).toBeGreaterThan(0);
      assertSchemaParity(
        rawModels,
        catalogModels.map((model) => ({
          modelIdentifier: model.model_identifier,
          configSchema: model.config_schema as ModelSchemaView["configSchema"],
        })),
      );

      const result = await graphql({
        schema,
        source: `
          query CodexModelSchemas($runtimeKind: String) {
            providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
              llmModels {
                modelIdentifier
                configSchema
              }
            }
          }
        `,
        variableValues: {
          runtimeKind: "codex_app_server",
        },
      });
      if (result.errors?.length) {
        throw result.errors[0];
      }

      const providers = (result.data as {
        providerModelCatalogSnapshots: Array<{
          llmModels: ModelSchemaView[];
        }>;
      }).providerModelCatalogSnapshots;
      const graphQlModels = providers.flatMap((provider) => provider.llmModels);
      assertSchemaParity(rawModels, graphQlModels);
    });
  },
);
