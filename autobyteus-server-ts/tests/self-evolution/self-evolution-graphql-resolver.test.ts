import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../src/api/graphql/schema.js";
import { SELF_EVOLUTION_CAPABILITY_SETTING_KEY } from "../../src/self-evolution/domain/settings.js";
import { SelfEvolutionCapabilityService } from "../../src/self-evolution/services/self-evolution-capability-service.js";
import { SelfEvolutionService } from "../../src/self-evolution/services/self-evolution-service.js";

const getInputFieldNames = (schema: GraphQLSchema, typeName: string): string[] => {
  const type = schema.getType(typeName);
  const fields = typeof (type as { getFields?: unknown } | null)?.getFields === "function"
    ? (type as { getFields: () => Record<string, unknown> }).getFields()
    : {};
  return Object.keys(fields);
};

describe("SelfEvolutionResolver GraphQL boundary", () => {
  const originalCapabilityEnv = process.env[SELF_EVOLUTION_CAPABILITY_SETTING_KEY];
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeEach(async () => {
    process.env[SELF_EVOLUTION_CAPABILITY_SETTING_KEY] = "false";
    SelfEvolutionCapabilityService.resetInstance();
    SelfEvolutionService.resetInstance();
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(() => {
    if (originalCapabilityEnv === undefined) {
      delete process.env[SELF_EVOLUTION_CAPABILITY_SETTING_KEY];
    } else {
      process.env[SELF_EVOLUTION_CAPABILITY_SETTING_KEY] = originalCapabilityEnv;
    }
    SelfEvolutionCapabilityService.resetInstance();
    SelfEvolutionService.resetInstance();
  });

  it("exposes explicit self-evolution API fields only at capability/run boundaries", () => {
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    const mutationFields = schema.getMutationType()?.getFields() ?? {};

    expect(queryFields).toHaveProperty("selfEvolutionCapability");
    expect(queryFields).toHaveProperty("selfEvolutionStrategyCatalog");
    expect(queryFields).toHaveProperty("getAgentRunSelfEvolutionEligibility");
    expect(queryFields).toHaveProperty("getTeamMemberSelfEvolutionEligibility");
    expect(queryFields).toHaveProperty("getSelfEvolutionRunRecord");
    expect(queryFields).not.toHaveProperty("getSelfEvolutionMetricsReport");
    expect(mutationFields).toHaveProperty("setSelfEvolutionEnabled");
    expect(mutationFields).toHaveProperty("startAgentRunSelfEvolution");
    expect(mutationFields).toHaveProperty("startTeamMemberSelfEvolution");

    expect(getInputFieldNames(schema, "CreateAgentRunInput")).toContain("selfEvolution");
    expect(getInputFieldNames(schema, "CreateAgentTeamRunInput")).toContain("selfEvolution");
    expect(getInputFieldNames(schema, "TeamMemberConfigInput")).toContain("selfEvolution");
    expect(getInputFieldNames(schema, "StartAgentRunSelfEvolutionInput")).toEqual(["runId"]);
    expect(getInputFieldNames(schema, "StartTeamMemberSelfEvolutionInput")).toEqual(["teamRunId", "memberRunId"]);

    for (const definitionInput of [
      "CreateAgentDefinitionInput",
      "UpdateAgentDefinitionInput",
      "CreateAgentTeamDefinitionInput",
      "UpdateAgentTeamDefinitionInput",
      "TeamMemberInput",
    ]) {
      expect(getInputFieldNames(schema, definitionInput)).not.toContain("selfEvolution");
    }
  });

  it("returns strategy placeholders through GraphQL without making future strategies executable", async () => {
    const result = await graphql({
      schema,
      source: `
        query SelfEvolutionStrategyCatalog {
          selfEvolutionStrategyCatalog {
            defaultTriggerStrategy
            defaultEvolverStrategy
            triggerStrategies { name status }
            evolverStrategies { name status }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const catalog = (result.data as any).selfEvolutionStrategyCatalog;
    const triggerStatuses = Object.fromEntries(
      catalog.triggerStrategies.map((entry: { name: string; status: string }) => [entry.name, entry.status]),
    );
    const evolverStatuses = Object.fromEntries(
      catalog.evolverStrategies.map((entry: { name: string; status: string }) => [entry.name, entry.status]),
    );

    expect(catalog.defaultTriggerStrategy).toBe("manual_only");
    expect(catalog.defaultEvolverStrategy).toBe("single_agent");
    expect(triggerStatuses).toMatchObject({
      manual_only: "implemented",
      scheduled: "not_implemented",
      signal_based: "not_implemented",
    });
    expect(evolverStatuses).toMatchObject({
      single_agent: "implemented",
      agent_team: "not_implemented",
    });
  });

  it("enforces the disabled global capability gate before a manual start mutation resolves a target", async () => {
    const capabilityResult = await graphql({
      schema,
      source: `
        query SelfEvolutionCapability {
          selfEvolutionCapability { enabled settingKey source }
        }
      `,
    });
    expect(capabilityResult.errors).toBeUndefined();
    expect((capabilityResult.data as any).selfEvolutionCapability).toMatchObject({
      enabled: false,
      settingKey: SELF_EVOLUTION_CAPABILITY_SETTING_KEY,
      source: "SERVER_SETTING",
    });

    const startResult = await graphql({
      schema,
      source: `
        mutation StartAgentRunSelfEvolution($input: StartAgentRunSelfEvolutionInput!) {
          startAgentRunSelfEvolution(input: $input) {
            evolutionRunId
          }
        }
      `,
      variableValues: { input: { runId: "missing-run-for-disabled-gate-test" } },
    });

    expect(startResult.errors?.[0]?.message).toContain("Self-evolution is disabled for this server");
    expect(JSON.stringify(startResult.errors?.[0] ?? {})).not.toContain("metadata was not found");
  });
});
