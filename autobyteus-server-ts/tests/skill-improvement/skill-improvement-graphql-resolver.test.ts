import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../src/api/graphql/schema.js";
import { SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY } from "../../src/skill-improvement/domain/settings.js";
import { SkillImprovementCapabilityService } from "../../src/skill-improvement/services/skill-improvement-capability-service.js";
import { SkillImprovementService } from "../../src/skill-improvement/services/skill-improvement-service.js";

const getInputFieldNames = (schema: GraphQLSchema, typeName: string): string[] => {
  const type = schema.getType(typeName);
  const fields = typeof (type as { getFields?: unknown } | null)?.getFields === "function"
    ? (type as { getFields: () => Record<string, unknown> }).getFields()
    : {};
  return Object.keys(fields);
};

describe("SkillImprovementResolver GraphQL boundary", () => {
  const originalCapabilityEnv = process.env[SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY];
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeEach(async () => {
    process.env[SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY] = "false";
    SkillImprovementCapabilityService.resetInstance();
    SkillImprovementService.resetInstance();
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(() => {
    if (originalCapabilityEnv === undefined) {
      delete process.env[SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY];
    } else {
      process.env[SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY] = originalCapabilityEnv;
    }
    SkillImprovementCapabilityService.resetInstance();
    SkillImprovementService.resetInstance();
  });

  it("exposes explicit skill-improvement API fields only at capability/run boundaries", () => {
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    const mutationFields = schema.getMutationType()?.getFields() ?? {};

    expect(queryFields).toHaveProperty("skillImprovementCapability");
    expect(queryFields).toHaveProperty("skillImprovementStrategyCatalog");
    expect(queryFields).toHaveProperty("getAgentRunSkillImprovementEligibility");
    expect(queryFields).toHaveProperty("getTeamMemberSkillImprovementEligibility");
    expect(queryFields).toHaveProperty("getSkillImprovementRunRecord");
    expect(queryFields).not.toHaveProperty("getSkillImprovementMetricsReport");
    expect(mutationFields).toHaveProperty("setSkillImprovementEnabled");
    expect(mutationFields).toHaveProperty("startAgentRunSkillImprovement");
    expect(mutationFields).toHaveProperty("startTeamMemberSkillImprovement");

    expect(getInputFieldNames(schema, "CreateAgentRunInput")).not.toContain("skillImprovement");
    expect(getInputFieldNames(schema, "CreateAgentTeamRunInput")).not.toContain("skillImprovement");
    expect(getInputFieldNames(schema, "TeamMemberConfigInput")).not.toContain("skillImprovement");
    expect(getInputFieldNames(schema, "StartAgentRunSkillImprovementInput")).toEqual(["runId"]);
    expect(getInputFieldNames(schema, "StartTeamMemberSkillImprovementInput")).toEqual(["teamRunId", "memberRunId"]);

    for (const definitionInput of [
      "CreateAgentDefinitionInput",
      "UpdateAgentDefinitionInput",
      "CreateAgentTeamDefinitionInput",
      "UpdateAgentTeamDefinitionInput",
      "TeamMemberInput",
    ]) {
      expect(getInputFieldNames(schema, definitionInput)).not.toContain("skillImprovement");
    }
  });

  it("returns strategy placeholders through GraphQL without making future strategies executable", async () => {
    const result = await graphql({
      schema,
      source: `
        query SkillImprovementStrategyCatalog {
          skillImprovementStrategyCatalog {
            defaultTriggerStrategy
            defaultImproverStrategy
            triggerStrategies { name status }
            improverStrategies { name status }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    const catalog = (result.data as any).skillImprovementStrategyCatalog;
    const triggerStatuses = Object.fromEntries(
      catalog.triggerStrategies.map((entry: { name: string; status: string }) => [entry.name, entry.status]),
    );
    const improverStatuses = Object.fromEntries(
      catalog.improverStrategies.map((entry: { name: string; status: string }) => [entry.name, entry.status]),
    );

    expect(catalog.defaultTriggerStrategy).toBe("manual_only");
    expect(catalog.defaultImproverStrategy).toBe("single_agent");
    expect(triggerStatuses).toMatchObject({
      manual_only: "implemented",
      scheduled: "not_implemented",
      signal_based: "not_implemented",
    });
    expect(improverStatuses).toMatchObject({
      single_agent: "implemented",
      agent_team: "not_implemented",
    });
  });

  it("enforces the disabled global capability gate before a manual start mutation resolves a target", async () => {
    const capabilityResult = await graphql({
      schema,
      source: `
        query SkillImprovementCapability {
          skillImprovementCapability { enabled settingKey source }
        }
      `,
    });
    expect(capabilityResult.errors).toBeUndefined();
    expect((capabilityResult.data as any).skillImprovementCapability).toMatchObject({
      enabled: false,
      settingKey: SKILL_IMPROVEMENT_CAPABILITY_SETTING_KEY,
      source: "SERVER_SETTING",
    });

    const startResult = await graphql({
      schema,
      source: `
        mutation StartAgentRunSkillImprovement($input: StartAgentRunSkillImprovementInput!) {
          startAgentRunSkillImprovement(input: $input) {
            improvementRunId
          }
        }
      `,
      variableValues: { input: { runId: "missing-run-for-disabled-gate-test" } },
    });

    expect(startResult.errors?.[0]?.message).toContain("Skill Improvement is disabled for this server");
    expect(JSON.stringify(startResult.errors?.[0] ?? {})).not.toContain("metadata was not found");
  });
});
