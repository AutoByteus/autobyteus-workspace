import "reflect-metadata";
import { beforeEach, expect, it, vi } from "vitest";
import { buildSchema } from "type-graphql";
import { createRequire } from "node:module";
import type { GraphQLObjectType } from "graphql";
// Match type-graphql's native CommonJS GraphQL realm under Vitest.
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
const services = vi.hoisted(() => ({
  scan: vi.fn(),
  agentIssues: vi.fn(),
  teamIssues: vi.fn(),
  orgIssues: vi.fn(),
}));
vi.mock("../../../../../src/api/graphql/studio-application-api-services.js", () => ({
  getStudioDefinitionAdmissionService: () => ({ scan: services.scan }),
  getStudioAgentDefinitionService: () => ({ listLoadIssues: services.agentIssues }),
  getStudioAgentTeamDefinitionService: () => ({ listLoadIssues: services.teamIssues }),
  getStudioAgentOrgDefinitionService: () => ({ listLoadIssues: services.orgIssues }),
}));
import { DefinitionProblemsResolver } from "../../../../../src/api/graphql/types/definition-problems.js";

const issue = (code: string, path: string) => ({ code, reason: `${code} reason`, definitionPath: path, packageRoot: "/package" });
const query = `query Q($kind: DefinitionKind!) { definitionProblems(kind: $kind) {
  kind definitionId code reason definitionPath packageRoot usingLastGood dependencyChain } }`;

beforeEach(() => {
  Object.values(services).forEach((mock) => mock.mockReset());
});

it("exposes one definition problems query per kind with an explicit kind enum", async () => {
  const schema = await buildSchema({ resolvers: [DefinitionProblemsResolver], validate: false });
  const fields = (schema.getType("DefinitionProblem") as GraphQLObjectType).getFields();
  expect(Object.keys(fields).sort()).toEqual([
    "kind", "definitionId", "code", "reason", "definitionPath", "packageRoot", "usingLastGood", "dependencyChain",
  ].sort());
  expect(schema.getQueryType()?.getFields()).not.toHaveProperty("definitionAdmissionDiagnostics");
});

it("lists agent load issues, last good or not", async () => {
  services.agentIssues.mockResolvedValue([
    { definitionId: "writer", issue: issue("DEFINITION_CONTRACT_INVALID", "/package/agents/writer/agent-config.json"), usingLastGood: true },
    { definitionId: "draft", issue: issue("DEFINITION_CONTRACT_INVALID", "/package/agents/draft/agent.md"), usingLastGood: false },
  ]);
  const schema = await buildSchema({ resolvers: [DefinitionProblemsResolver], validate: false });
  const response = await graphql({ schema, source: query, variableValues: { kind: "AGENT" } });
  expect(response.errors).toBeUndefined();
  expect(response.data?.definitionProblems).toEqual([
    { kind: "AGENT", definitionId: "writer", code: "DEFINITION_CONTRACT_INVALID", reason: "DEFINITION_CONTRACT_INVALID reason",
      definitionPath: "/package/agents/writer/agent-config.json", packageRoot: "/package", usingLastGood: true, dependencyChain: [] },
    { kind: "AGENT", definitionId: "draft", code: "DEFINITION_CONTRACT_INVALID", reason: "DEFINITION_CONTRACT_INVALID reason",
      definitionPath: "/package/agents/draft/agent.md", packageRoot: "/package", usingLastGood: false, dependencyChain: [] },
  ]);
});

it("combines admission unavailability with last-good issues for Teams, without double-listing", async () => {
  services.scan.mockResolvedValue([
    { status: "unavailable", subjectKind: "agent_team", definitionId: "crew", code: "DEFINITION_REFERENCE_UNRESOLVED",
      reason: "member 'lead' references missing Agent", definitionPath: "/package/agent-teams/crew", packageRoot: "/package", dependencyChain: [] },
    { status: "unavailable", subjectKind: "agent_org", definitionId: "org", code: "DEFINITION_DEPENDENCY_UNAVAILABLE",
      reason: "x", definitionPath: "/package/agent-orgs/org", packageRoot: "/package", dependencyChain: ["agent_org:org"] },
    { status: "available", subjectKind: "agent_team", definitionId: "ok", definition: {} },
  ]);
  services.teamIssues.mockResolvedValue([
    { definitionId: "ok", issue: issue("DEFINITION_CONTRACT_INVALID", "/package/agent-teams/ok/team-config.json"), usingLastGood: true },
    { definitionId: "broken", issue: issue("DEFINITION_CONTRACT_INVALID", "/package/agent-teams/broken/team.md"), usingLastGood: false },
  ]);
  const schema = await buildSchema({ resolvers: [DefinitionProblemsResolver], validate: false });
  const response = await graphql({ schema, source: query, variableValues: { kind: "AGENT_TEAM" } });
  expect(response.errors).toBeUndefined();
  expect((response.data?.definitionProblems as Array<{ definitionId: string; usingLastGood: boolean }>)
    .map((entry) => [entry.definitionId, entry.usingLastGood])).toEqual([["crew", false], ["ok", true]]);
});
