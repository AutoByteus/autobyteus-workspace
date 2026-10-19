import "reflect-metadata";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../../../src/agent-org-definition/services/agent-org-definition-service.js";
import { DefinitionSourceRegistry } from "../../../src/collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../../../src/collaboration-definition-admission/services/definition-admission-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";

// Team (and Org) definitions through the app-data GraphQL surface, in the flat model: a Team's members are Agents
// (shared, or team-local to the Team's own folder), never Teams; a save carries the revision it loaded. Nested Teams were
// removed by the flat Teams/Orgs change (37d05c7f71). Registered-package Team/Org saves are covered by
// registered-package-definition-edit.e2e.test.ts, so this file stays on app-data definitions.
//   TDG-001 create → files on disk → update → default kept when omitted → invalid handoff rejected with nothing written →
//           default cleared → template listing → delete.
//   TDG-002 a file-authored Team with a team-local member is read, and a save swaps members between team-local and shared.
//   TDG-003 the GraphQL contract of the flat model (no `refType`; update requires the revision).
//   TDG-004 a coordinator that is not a member is refused with its message.
//   TDG-005 a Team cannot be a member of a Team.
//   TDG-006 an Org of Agents and Teams: create → update with its revision → delete.

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const agentMd = (name: string, description: string, instructions: string) =>
  ["---", `name: ${name}`, `description: ${description}`, "role: assistant", "---", "", instructions].join("\n");

async function writeSharedAgentFixture(dataDir: string, agentId: string, name = agentId) {
  const agentDir = path.join(dataDir, "agents", agentId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(path.join(agentDir, "agent.md"), agentMd(name, "GraphQL e2e fixture agent", "Support team-definition GraphQL validation."), "utf-8");
  await fs.writeFile(path.join(agentDir, "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }, null, 2), "utf-8");
  return agentDir;
}

async function writeRootTeamFixture(input: {
  dataDir: string;
  teamId: string;
  name: string;
  description?: string;
  instructions?: string;
  coordinatorMemberName: string;
  members: Array<{ memberName: string; ref: string; refScope: "shared" | "team_local" }>;
}) {
  const teamDir = path.join(input.dataDir, "agent-teams", input.teamId);
  await fs.mkdir(teamDir, { recursive: true });
  await fs.writeFile(
    path.join(teamDir, "team.md"),
    ["---", `name: ${input.name}`, `description: ${input.description ?? "GraphQL e2e fixture team"}`, "---", "", input.instructions ?? "Coordinate fixture work."].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(teamDir, "team-config.json"),
    JSON.stringify({ coordinatorMemberName: input.coordinatorMemberName, members: input.members, handoffs: [], avatarUrl: null }, null, 2),
    "utf-8",
  );
  return teamDir;
}

async function writeLocalAgentFixture(input: { ownerTeamDir: string; agentId: string; name: string }) {
  const agentDir = path.join(input.ownerTeamDir, "agents", input.agentId);
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(path.join(agentDir, "agent.md"), agentMd(input.name, "Local fixture agent", "Handle local fixture work."), "utf-8");
  await fs.writeFile(path.join(agentDir, "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }, null, 2), "utf-8");
  return agentDir;
}

type Launch = { llmModelIdentifier: string | null; runtimeKind: string | null; llmConfig: Record<string, unknown> | null };
type Node = { memberName: string; ref: string; refScope: string };
type TeamResult = {
  id: string;
  name: string;
  description: string;
  category: string | null;
  instructions: string;
  avatarUrl: string | null;
  coordinatorMemberName: string;
  revision: string;
  defaultLaunchConfig: Launch | null;
  nodes: Node[];
  handoffs: Array<{ from: string; to: string; rules: string[] }>;
};
const TEAM_FIELDS = `id name description category instructions avatarUrl coordinatorMemberName revision
  defaultLaunchConfig { llmModelIdentifier runtimeKind llmConfig } nodes { memberName ref refScope } handoffs { from to rules }`;
const CREATE_TEAM = `mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { ${TEAM_FIELDS} } }`;
const UPDATE_TEAM = `mutation UpdateTeam($input: UpdateAgentTeamDefinitionInput!) { updateAgentTeamDefinition(input: $input) { ${TEAM_FIELDS} } }`;
const GET_TEAM = `query GetTeam($id: String!) { agentTeamDefinition(id: $id) { ${TEAM_FIELDS} } }`;
const DELETE_TEAM = `mutation DeleteTeam($id: String!) { deleteAgentTeamDefinition(id: $id) { success message } }`;

describe("Agent team definitions GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let agentDefinitionService: AgentDefinitionService;
  let agentTeamDefinitionService: AgentTeamDefinitionService;
  let closeStudioServices: (() => void) | null = null;
  const cleanupPaths = new Set<string>();

  beforeAll(async () => {
    agentDefinitionService = AgentDefinitionService.getInstance();
    agentTeamDefinitionService = AgentTeamDefinitionService.getInstance({ agentDefinitionService });
    // The same concrete Org and admission authorities as the host composition, over this process's app data.
    const agentOrgDefinitionService = new AgentOrgDefinitionService(undefined, agentDefinitionService, agentTeamDefinitionService);
    const definitionAdmissionService = new DefinitionAdmissionService({
      registry: new DefinitionSourceRegistry({ listImplementationOwnedTeamSources: async () => [] }),
      agents: agentDefinitionService, teams: agentTeamDefinitionService, orgs: agentOrgDefinitionService,
    });
    closeStudioServices = configureE2eStudioApplicationApiServices({
      agentDefinitionService, agentTeamDefinitionService, agentOrgDefinitionService, definitionAdmissionService,
    }).close;
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(() => closeStudioServices?.());

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
    await agentDefinitionService.reloadAgentPackageDefinitions();
    await agentTeamDefinitionService.reloadAgentPackageDefinitions();
  });

  const runGraphql = async (query: string, variables?: Record<string, unknown>) => graphql({ schema, source: query, variableValues: variables });
  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await runGraphql(query, variables);
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };
  const readConfig = async (teamDir: string) => JSON.parse(await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8")) as Record<string, any>;
  const reload = async () => {
    await agentDefinitionService.reloadAgentPackageDefinitions();
    await agentTeamDefinitionService.reloadAgentPackageDefinitions();
  };

  it("TDG-001 creates, updates, keeps and clears the default, lists templates and deletes a Team", async () => {
    const unique = uniqueId("team_def");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const leaderId = `agent_a_${unique}`;
    const helperId = `agent_b_${unique}`;
    cleanupPaths.add(await writeSharedAgentFixture(dataDir, leaderId, `Agent A ${unique}`));
    cleanupPaths.add(await writeSharedAgentFixture(dataDir, helperId, `Agent B ${unique}`));

    const created = (await execGraphql<{ createAgentTeamDefinition: TeamResult }>(CREATE_TEAM, { input: {
      name: `team_${unique}`,
      description: "Team definition for e2e",
      category: "software-engineering",
      instructions: "You coordinate the md-centric team.",
      avatarUrl: "http://localhost:8000/rest/files/images/e2e-team-avatar.png",
      coordinatorMemberName: "leader",
      defaultLaunchConfig: { runtimeKind: "autobyteus", llmModelIdentifier: "gpt-5.4-mini", llmConfig: { reasoning_effort: "medium" } },
      nodes: [
        { memberName: "leader", ref: leaderId, refScope: "SHARED" },
        { memberName: "helper", ref: helperId, refScope: "SHARED" },
      ],
      handoffs: [{ from: "/leader", to: "/helper", rules: ["When implementation support is required.", "After the plan is approved."] }],
    } })).createAgentTeamDefinition;
    const teamId = created.id;
    const teamDir = path.join(dataDir, "agent-teams", teamId);
    cleanupPaths.add(teamDir);

    expect(created.category).toBe("software-engineering");
    expect(created.instructions).toContain("md-centric team");
    expect(created.revision).toEqual(expect.any(String));
    expect(created.defaultLaunchConfig).toEqual({ runtimeKind: "autobyteus", llmModelIdentifier: "gpt-5.4-mini", llmConfig: { reasoning_effort: "medium" } });
    expect(created.nodes).toEqual([
      { memberName: "leader", ref: leaderId, refScope: "SHARED" },
      { memberName: "helper", ref: helperId, refScope: "SHARED" },
    ]);
    expect(created.handoffs).toEqual([{ from: "/leader", to: "/helper", rules: ["When implementation support is required.", "After the plan is approved."] }]);
    const teamMd = await fs.readFile(path.join(teamDir, "team.md"), "utf-8");
    expect(teamMd).toContain(`name: team_${unique}`);
    expect(teamMd).toContain("category: software-engineering");
    expect(teamMd).toContain("You coordinate the md-centric team.");
    expect(await readConfig(teamDir)).toMatchObject({
      coordinatorMemberName: "leader",
      defaultLaunchConfig: { runtimeKind: "autobyteus", llmModelIdentifier: "gpt-5.4-mini", llmConfig: { reasoning_effort: "medium" } },
      members: [
        { memberName: "leader", ref: leaderId, refScope: "shared" },
        { memberName: "helper", ref: helperId, refScope: "shared" },
      ],
      handoffs: [{ from: "/leader", to: "/helper", rules: ["When implementation support is required.", "After the plan is approved."] }],
    });
    expect((await readConfig(teamDir)).members.every((member: Rec) => !("refType" in member))).toBe(true);

    const updated = (await execGraphql<{ updateAgentTeamDefinition: TeamResult }>(UPDATE_TEAM, { input: {
      id: teamId,
      expectedRevision: created.revision,
      description: "Updated team description",
      category: "platform",
      instructions: "You coordinate the updated md-centric team.",
      avatarUrl: "",
      coordinatorMemberName: "helper",
      defaultLaunchConfig: { runtimeKind: "codex", llmModelIdentifier: "gpt-5.4", llmConfig: { reasoning_effort: "high" } },
      nodes: [{ memberName: "helper", ref: helperId, refScope: "SHARED" }, { memberName: "second", ref: leaderId, refScope: "SHARED" }],
      handoffs: [{ from: "/helper", to: "/second", rules: ["When the second member must execute."] }],
    } })).updateAgentTeamDefinition;
    expect(updated.description).toBe("Updated team description");
    expect(updated.category).toBe("platform");
    expect(updated.avatarUrl).toBeNull();
    expect(updated.coordinatorMemberName).toBe("helper");
    expect(updated.revision).not.toBe(created.revision);
    const high = { runtimeKind: "codex", llmModelIdentifier: "gpt-5.4", llmConfig: { reasoning_effort: "high" } };
    expect(updated.defaultLaunchConfig).toEqual(high);
    expect(updated.handoffs).toEqual([{ from: "/helper", to: "/second", rules: ["When the second member must execute."] }]);
    expect((await readConfig(teamDir)).defaultLaunchConfig).toEqual(high);

    // A field left out of an update keeps its value, the default launch configuration included.
    const preserved = (await execGraphql<{ updateAgentTeamDefinition: TeamResult }>(UPDATE_TEAM, { input: {
      id: teamId, expectedRevision: updated.revision, description: "Updated without clearing launch defaults" } })).updateAgentTeamDefinition;
    expect(preserved.description).toBe("Updated without clearing launch defaults");
    expect(preserved.defaultLaunchConfig).toEqual(high);
    expect((await readConfig(teamDir)).defaultLaunchConfig).toEqual(high);

    // An invalid handoff is refused and nothing is written.
    const before = await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8");
    const rejected = await runGraphql(UPDATE_TEAM, { input: {
      id: teamId, expectedRevision: preserved.revision, handoffs: [{ from: "/missing", to: "/helper", rules: ["This invalid update must not persist."] }] } });
    expect(rejected.errors?.[0]?.extensions?.code).toBe("COLLABORATION_TARGET_NOT_FOUND");
    expect(await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8")).toBe(before);
    expect((await execGraphql<{ agentTeamDefinition: TeamResult }>(GET_TEAM, { id: teamId })).agentTeamDefinition.revision).toBe(preserved.revision);

    const cleared = (await execGraphql<{ updateAgentTeamDefinition: TeamResult }>(UPDATE_TEAM, { input: {
      id: teamId, expectedRevision: preserved.revision, defaultLaunchConfig: null, handoffs: [] } })).updateAgentTeamDefinition;
    expect(cleared.defaultLaunchConfig).toBeNull();
    const clearedConfig = await readConfig(teamDir);
    expect(clearedConfig.defaultLaunchConfig).toBeNull();
    expect(clearedConfig.handoffs).toEqual([]);

    // A folder named with a leading underscore is a template, not a Team.
    const templateId = `_template_${unique}`;
    const templateDir = path.join(dataDir, "agent-teams", templateId);
    cleanupPaths.add(templateDir);
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(path.join(templateDir, "team.md"), ["---", "name: Template Team", "description: Template team description", "category: template", "---", "", "Template team instructions"].join("\n"), "utf-8");
    await fs.writeFile(path.join(templateDir, "team-config.json"), JSON.stringify({
      coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "template-agent", refScope: "shared" }], handoffs: [], avatarUrl: null }, null, 2), "utf-8");
    const listed = await execGraphql<{
      agentTeamDefinitions: Array<{ id: string }>;
      agentTeamTemplates: Array<{ id: string; name: string; category: string | null; instructions: string }>;
    }>(`query TeamLists { agentTeamDefinitions { id } agentTeamTemplates { id name description category instructions } }`);
    expect(listed.agentTeamDefinitions.some((entry) => entry.id === templateId)).toBe(false);
    expect(listed.agentTeamDefinitions.some((entry) => entry.id === teamId)).toBe(true);
    expect(listed.agentTeamTemplates.find((entry) => entry.id === templateId)).toMatchObject({
      name: "Template Team", category: "template", instructions: "Template team instructions" });

    const deleted = await execGraphql<{ deleteAgentTeamDefinition: { success: boolean } }>(DELETE_TEAM, { id: teamId });
    expect(deleted.deleteAgentTeamDefinition.success).toBe(true);
    await expect(fs.access(teamDir)).rejects.toThrow();
    expect((await execGraphql<{ agentTeamDefinition: TeamResult | null }>(GET_TEAM, { id: teamId })).agentTeamDefinition).toBeNull();
  });

  it("TDG-002 reads a file-authored Team with a team-local member and saves a swap between team-local and shared members", async () => {
    const unique = uniqueId("team_local_graphql");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const teamId = `team_local_${unique}`;
    const teamDir = await writeRootTeamFixture({
      dataDir, teamId, name: `Team Local ${unique}`, description: "team-local persistence",
      instructions: "Use the team-local reviewer when coordinating work.", coordinatorMemberName: "local_reviewer",
      members: [{ memberName: "local_reviewer", ref: "reviewer", refScope: "team_local" }],
    });
    cleanupPaths.add(teamDir);
    await writeLocalAgentFixture({ ownerTeamDir: teamDir, agentId: "reviewer", name: `Local Reviewer ${unique}` });
    await writeLocalAgentFixture({ ownerTeamDir: teamDir, agentId: "reviewer_v2", name: `Local Reviewer V2 ${unique}` });
    const sharedLeadAgentId = `shared_lead_${unique}`;
    cleanupPaths.add(await writeSharedAgentFixture(dataDir, sharedLeadAgentId, `Shared Lead ${unique}`));
    await reload();

    const fetched = (await execGraphql<{ agentTeamDefinition: TeamResult }>(GET_TEAM, { id: teamId })).agentTeamDefinition;
    expect(fetched.nodes).toEqual([{ memberName: "local_reviewer", ref: "reviewer", refScope: "TEAM_LOCAL" }]);

    const updated = (await execGraphql<{ updateAgentTeamDefinition: TeamResult }>(UPDATE_TEAM, { input: {
      id: teamId,
      expectedRevision: fetched.revision,
      coordinatorMemberName: "shared_lead",
      nodes: [
        { memberName: "shared_lead", ref: sharedLeadAgentId, refScope: "SHARED" },
        { memberName: "local_reviewer", ref: "reviewer_v2", refScope: "TEAM_LOCAL" },
      ],
      handoffs: [{ from: "/shared_lead", to: "/local_reviewer", rules: ["When local review is required."] }],
    } })).updateAgentTeamDefinition;
    expect(updated.coordinatorMemberName).toBe("shared_lead");
    expect(updated.nodes).toEqual([
      { memberName: "shared_lead", ref: sharedLeadAgentId, refScope: "SHARED" },
      { memberName: "local_reviewer", ref: "reviewer_v2", refScope: "TEAM_LOCAL" },
    ]);
    expect(updated.handoffs).toEqual([{ from: "/shared_lead", to: "/local_reviewer", rules: ["When local review is required."] }]);
    expect(await readConfig(teamDir)).toMatchObject({
      coordinatorMemberName: "shared_lead",
      members: [
        { memberName: "shared_lead", ref: sharedLeadAgentId, refScope: "shared" },
        { memberName: "local_reviewer", ref: "reviewer_v2", refScope: "team_local" },
      ],
      handoffs: [{ from: "/shared_lead", to: "/local_reviewer", rules: ["When local review is required."] }],
    });
    // Both team-local Agents stay in the Team folder.
    await expect(fs.access(path.join(teamDir, "agents", "reviewer", "agent.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(teamDir, "agents", "reviewer_v2", "agent.md"))).resolves.toBeUndefined();
  });

  it("TDG-003 exposes the flat md-centric Team contract: members without refType, updates that carry a revision", async () => {
    const introspection = await execGraphql<{
      teamType: { fields: Array<{ name: string; type: { kind: string; name: string | null; ofType?: { kind: string; name: string | null } | null } }> } | null;
      memberType: { fields: Array<{ name: string }> } | null;
      memberInput: { inputFields: Array<{ name: string }> } | null;
      updateInput: { inputFields: Array<{ name: string; type: { kind: string; ofType?: { name: string | null } | null } }> } | null;
    }>(`
      query TeamSchemaContract {
        teamType: __type(name: "AgentTeamDefinition") { fields { name type { kind name ofType { kind name } } } }
        memberType: __type(name: "TeamMember") { fields { name } }
        memberInput: __type(name: "TeamMemberInput") { inputFields { name } }
        updateInput: __type(name: "UpdateAgentTeamDefinitionInput") { inputFields { name type { kind ofType { name } } } }
      }
    `);
    const fields = introspection.teamType?.fields ?? [];
    const instructions = fields.find((field) => field.name === "instructions");
    const category = fields.find((field) => field.name === "category");
    const nodes = fields.find((field) => field.name === "nodes");
    const coordinator = fields.find((field) => field.name === "coordinatorMemberName");
    const role = fields.find((field) => field.name === "role");
    expect(instructions?.type.kind).toBe("NON_NULL");
    expect(instructions?.type.ofType?.name).toBe("String");
    expect(category?.type.kind).toBe("SCALAR");
    expect(category?.type.name).toBe("String");
    expect(nodes?.type.kind).toBe("NON_NULL");
    expect(nodes?.type.ofType?.kind).toBe("LIST");
    expect(coordinator?.type.kind).toBe("NON_NULL");
    expect(coordinator?.type.ofType?.name).toBe("String");
    // REQ-014 permits role removal or optional retention.
    if (role) expect(role.type.kind).not.toBe("NON_NULL");

    // Flat model: a member names an Agent and a scope; there is no member type.
    expect(introspection.memberType?.fields.map((field) => field.name).sort()).toEqual(["memberName", "ref", "refScope"]);
    expect(introspection.memberInput?.inputFields.map((field) => field.name).sort()).toEqual(["memberName", "ref", "refScope"]);
    const revision = introspection.updateInput?.inputFields.find((field) => field.name === "expectedRevision");
    expect(revision?.type.kind).toBe("NON_NULL");
    expect(revision?.type.ofType?.name).toBe("String");
  });

  it("TDG-004 refuses a coordinator that is not a member", async () => {
    const unique = uniqueId("team_invalid_coordinator");
    const result = await runGraphql(CREATE_TEAM, { input: {
      name: `team_${unique}`,
      description: "invalid coordinator test",
      instructions: "team instructions",
      coordinatorMemberName: "missing_leader",
      nodes: [{ memberName: "helper", ref: "agent-1", refScope: "SHARED" }],
    } });
    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain("Coordinator member name must match");
  });

  it("TDG-005 refuses a Team member that names a Team: the flat model has no member type", async () => {
    const unique = uniqueId("team_nested");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const result = await runGraphql(CREATE_TEAM, { input: {
      name: `team_${unique}`,
      description: "nested team test",
      instructions: "team instructions",
      coordinatorMemberName: "lead",
      nodes: [{ memberName: "lead", ref: "some-team", refType: "AGENT_TEAM", refScope: "SHARED" }],
    } });
    expect(result.errors?.[0]?.message).toMatch(/refType/);
    expect((await fs.readdir(path.join(dataDir, "agent-teams")).catch(() => [])).filter((entry) => entry.includes(unique))).toEqual([]);
  });

  it("TDG-006 creates, updates with its revision and deletes an Org of an Agent and a Team", async () => {
    const unique = uniqueId("org_def");
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = `org_agent_${unique}`;
    cleanupPaths.add(await writeSharedAgentFixture(dataDir, agentId, `Org Agent ${unique}`));
    const teamDir = await writeRootTeamFixture({
      dataDir, teamId: `org_team_${unique}`, name: `Org Team ${unique}`, coordinatorMemberName: "lead",
      members: [{ memberName: "lead", ref: agentId, refScope: "shared" }],
    });
    cleanupPaths.add(teamDir);
    await reload();
    const orgFields = `id name description revision members { memberName ref refType refScope } defaultLaunchConfig { runtimeKind llmModelIdentifier }`;

    const created = (await execGraphql<{ createAgentOrgDefinition: { id: string; revision: string; members: Array<Record<string, string>> } }>(
      `mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { ${orgFields} } }`, { input: {
        name: `Org ${unique}`, description: "Org definition for e2e", instructions: "Coordinate the Org.",
        members: [
          { memberName: "lead", ref: agentId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "squad", ref: path.basename(teamDir), refType: "AGENT_TEAM", refScope: "SHARED" },
        ],
      } })).createAgentOrgDefinition;
    const orgDir = path.join(dataDir, "agent-orgs", created.id);
    cleanupPaths.add(orgDir);
    expect(created.members.map((member) => `${member.memberName}:${member.refType}`)).toEqual(["lead:AGENT", "squad:AGENT_TEAM"]);
    expect(JSON.parse(await fs.readFile(path.join(orgDir, "org-config.json"), "utf-8")).members).toHaveLength(2);

    const updated = (await execGraphql<{ updateAgentOrgDefinition: { description: string; revision: string; defaultLaunchConfig: Record<string, string> | null } }>(
      `mutation($input: UpdateAgentOrgDefinitionInput!) { updateAgentOrgDefinition(input: $input) { ${orgFields} } }`, { input: {
        id: created.id, expectedRevision: created.revision, description: "Org edited",
        defaultLaunchConfig: { runtimeKind: "autobyteus", llmModelIdentifier: "gpt-5.4-mini" },
      } })).updateAgentOrgDefinition;
    expect(updated.description).toBe("Org edited");
    expect(updated.revision).not.toBe(created.revision);
    expect(updated.defaultLaunchConfig).toMatchObject({ runtimeKind: "autobyteus", llmModelIdentifier: "gpt-5.4-mini" });
    expect(JSON.parse(await fs.readFile(path.join(orgDir, "org-config.json"), "utf-8")).defaultLaunchConfig).toMatchObject({ llmModelIdentifier: "gpt-5.4-mini" });

    const stale = await runGraphql(`mutation($input: UpdateAgentOrgDefinitionInput!) { updateAgentOrgDefinition(input: $input) { id } }`,
      { input: { id: created.id, expectedRevision: created.revision, description: "Concurrent edit" } });
    expect(stale.errors?.[0]?.extensions?.code).toBe("DEFINITION_REVISION_CONFLICT");

    const deleted = await execGraphql<{ deleteAgentOrgDefinition: boolean }>(`mutation($id: String!) { deleteAgentOrgDefinition(id: $id) }`, { id: created.id });
    expect(deleted.deleteAgentOrgDefinition).toBe(true);
    await expect(fs.access(orgDir)).rejects.toThrow();
  });
});

type Rec = Record<string, unknown>;
