import "reflect-metadata";
import { beforeEach, expect, it, vi } from "vitest";
import { buildSchema } from "type-graphql";
import { createRequire } from "node:module";
// Match type-graphql's native CommonJS GraphQL realm under Vitest.
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
import { AgentDefinition } from "../../../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentTeamDefinitionService } from "../../../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../../../../../src/agent-org-definition/services/agent-org-definition-service.js";
import type {
  AgentPackageDefinitionKind,
  KindDefinitionReadResult,
} from "../../../../../src/agent-package-definitions/domain/agent-package-definition-types.js";
import { createInMemoryPackageDefinitions } from "../../../../helpers/agent-package-definitions-test-support.js";

const state = vi.hoisted(() => ({
  teams: null as unknown,
  orgs: null as unknown,
  admitted: [] as Array<{ subjectKind: string; definition: unknown }>,
}));
vi.mock("../../../../../src/api/graphql/studio-application-api-services.js", () => ({
  getStudioAgentDefinitionService: () => ({}),
  getStudioAgentTeamDefinitionService: () => state.teams,
  getStudioAgentOrgDefinitionService: () => state.orgs,
  getStudioDefinitionAdmissionService: () => ({
    scan: async () => state.admitted.map((entry) => ({ status: "available", ...entry })),
    requireAvailable: async (kind: string, id: string) => {
      const found = state.admitted.find((entry) => entry.subjectKind === kind && (entry.definition as { id: string }).id === id);
      if (!found) throw new Error("unavailable");
      return found;
    },
  }),
}));
import { AgentTeamDefinitionResolver } from "../../../../../src/api/graphql/types/agent-team-definition.js";
import { AgentOrgDefinitionResolver } from "../../../../../src/api/graphql/types/agent-org-definition.js";

const ROOT = "/package";
const agent = (id: string, name = id) => new AgentDefinition({ id, name, description: "d", instructions: "i", toolNames: [] });
const team = (id: string, name = id) => new AgentTeamDefinition({
  id, name, description: "d", instructions: "i", coordinatorMemberName: "lead",
  nodes: [new TeamMember({ memberName: "lead", ref: "lead", refScope: "shared" })],
});
const org = (id: string, name = id) => new AgentOrgDefinition({
  id, name, description: "d", instructions: "i",
  members: [new AgentOrgMember({ memberName: "direct", ref: "direct", refType: "agent", refScope: "shared" })],
});

const valid = (kind: AgentPackageDefinitionKind, definition: { id?: string | null }, version = "v1"): KindDefinitionReadResult =>
  ({ kind, result: { status: "valid", definition, fingerprint: `${definition.id}-${version}` } }) as KindDefinitionReadResult;
const broken = (kind: AgentPackageDefinitionKind, file: string): KindDefinitionReadResult =>
  ({ kind, result: { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: `${file} is not valid JSON`, definitionPath: `${ROOT}/${file}` } });

let definitions: ReturnType<typeof createInMemoryPackageDefinitions>;
const applyUnit = (
  kind: AgentPackageDefinitionKind,
  folderId: string,
  root: KindDefinitionReadResult,
  nested: Array<[string, KindDefinitionReadResult]> = [],
) => definitions.store.apply(kind, folderId, {
  status: "read",
  location: { packageRoot: ROOT, folderDir: `${ROOT}/${kind}/${folderId}`, sourceClass: "registered_package" },
  root,
  nested: new Map(nested),
});

const ISSUES = "loadIssues { kind definitionId name code reason definitionPath packageRoot usingLastGood }";
const run = async (source: string) => {
  const schema = await buildSchema({ resolvers: [AgentTeamDefinitionResolver, AgentOrgDefinitionResolver], validate: false });
  const result = await graphql({ schema, source });
  expect(result.errors).toBeUndefined();
  return result.data as Record<string, any>;
};
const issueOf = (kind: string, definitionId: string, name: string | null, file: string, usingLastGood: boolean) => ({
  kind, definitionId, name, code: "DEFINITION_CONTRACT_INVALID", reason: `${file} is not valid JSON`,
  definitionPath: `${ROOT}/${file}`, packageRoot: ROOT, usingLastGood,
});

beforeEach(() => {
  definitions = createInMemoryPackageDefinitions();
  state.teams = new AgentTeamDefinitionService({
    packageDefinitions: definitions.packageDefinitions,
    fileStore: {} as never,
    agentDefinitionService: { getAgentDefinitionById: async () => null },
  });
  state.orgs = new AgentOrgDefinitionService({} as never, {} as never, {} as never, definitions.packageDefinitions);
  state.admitted = [];
});

it("lists every issue of a Team folder on the Team, root first then team-local agents, and none for a clean Team", async () => {
  applyUnit("agent_team", "t", valid("agent_team", team("t", "Team T")), [
    ["t-alpha", valid("agent", agent("t-alpha", "Alpha"))],
    ["t-beta", valid("agent", agent("t-beta", "Beta"))],
  ]);
  applyUnit("agent_team", "t", broken("agent_team", "agent-teams/t/team-config.json"), [
    ["t-alpha", broken("agent", "agent-teams/t/agents/alpha/agent-config.json")],
    ["t-beta", valid("agent", agent("t-beta", "Beta"))],
    ["t-gamma", broken("agent", "agent-teams/t/agents/gamma/agent-config.json")],
  ]);
  applyUnit("agent_team", "clean", valid("agent_team", team("clean")), [["clean-a", valid("agent", agent("clean-a"))]]);
  state.admitted = [
    { subjectKind: "agent_team", definition: team("t", "Team T") },
    { subjectKind: "agent_team", definition: team("clean") },
  ];

  const expected = [
    issueOf("AGENT_TEAM", "t", "Team T", "agent-teams/t/team-config.json", true),
    issueOf("AGENT", "t-alpha", "Alpha", "agent-teams/t/agents/alpha/agent-config.json", true),
    issueOf("AGENT", "t-gamma", null, "agent-teams/t/agents/gamma/agent-config.json", false),
  ];
  const listed = await run(`{ agentTeamDefinitions { id ${ISSUES} } }`);
  expect(listed.agentTeamDefinitions).toEqual([
    { id: "t", loadIssues: expected },
    { id: "clean", loadIssues: [] },
  ]);
  const single = await run(`{ agentTeamDefinition(id: "t") { ${ISSUES} } }`);
  expect(single.agentTeamDefinition.loadIssues).toEqual(expected);
  expect((await run(`{ agentTeamDefinition(id: "clean") { ${ISSUES} } }`)).agentTeamDefinition.loadIssues).toEqual([]);
});

it("lists org-owned agent, org-owned Team and its local agent issues on the owning Org", async () => {
  applyUnit("agent_org", "o", valid("agent_org", org("o", "Org O")), [
    ["o-agent", valid("agent", agent("o-agent", "Org Agent"))],
    ["o-team", valid("agent_team", team("o-team", "Org Team"))],
    ["o-team-local", valid("agent", agent("o-team-local", "Team Local"))],
  ]);
  applyUnit("agent_org", "o", valid("agent_org", org("o", "Org O")), [
    ["o-agent", broken("agent", "agent-orgs/o/agents/agent/agent-config.json")],
    ["o-team", broken("agent_team", "agent-orgs/o/agent-teams/team/team-config.json")],
    ["o-team-local", broken("agent", "agent-orgs/o/agent-teams/team/agents/local/agent-config.json")],
  ]);
  applyUnit("agent_org", "quiet", valid("agent_org", org("quiet")));
  state.admitted = [
    { subjectKind: "agent_org", definition: org("o", "Org O") },
    { subjectKind: "agent_org", definition: org("quiet") },
    { subjectKind: "agent_team", definition: team("o-team", "Org Team") },
  ];

  const expected = [
    issueOf("AGENT", "o-agent", "Org Agent", "agent-orgs/o/agents/agent/agent-config.json", true),
    issueOf("AGENT_TEAM", "o-team", "Org Team", "agent-orgs/o/agent-teams/team/team-config.json", true),
    issueOf("AGENT", "o-team-local", "Team Local", "agent-orgs/o/agent-teams/team/agents/local/agent-config.json", true),
  ];
  const listed = await run(`{ agentOrgDefinitions { id ${ISSUES} } }`);
  expect(listed.agentOrgDefinitions).toEqual([
    { id: "o", loadIssues: expected },
    { id: "quiet", loadIssues: [] },
  ]);
  expect((await run(`{ agentOrgDefinition(id: "o") { ${ISSUES} } }`)).agentOrgDefinition.loadIssues).toEqual(expected);
  // An org-owned Team read on its own carries only its own issue; the rest are on the Org's card.
  expect((await run(`{ agentTeamDefinition(id: "o-team") { ${ISSUES} } }`)).agentTeamDefinition.loadIssues)
    .toEqual([expected[1]]);
});
