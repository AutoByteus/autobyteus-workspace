import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

type Json = Record<string, any>;
type Server = Awaited<ReturnType<typeof startBuiltTestServer>>;
const targets: Array<{ runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> }> = [];
const servers = new Set<Server>();
afterEach(async () => {
  try { for (const server of servers) await server.stop(); }
  finally {
    servers.clear();
    for (const target of targets.splice(0)) await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

const readConfig = async (server: Server, orgRunId: string) =>
  (await executeGraphql<{ getAgentOrgRunConfig: Json }>(server.serverUrl, `
    query Config($orgRunId: String!) {
      getAgentOrgRunConfig(orgRunId: $orgRunId) { orgRunId executionTree isActive editability { editable reason } }
    }`, { orgRunId })).getAgentOrgRunConfig;

const updateConfig = async (server: Server, input: Json) =>
  (await executeGraphql<{ updateStoppedAgentOrgRunConfig: Json }>(server.serverUrl, `
    mutation Update($input: UpdateStoppedAgentOrgRunConfigInput!) {
      updateStoppedAgentOrgRunConfig(input: $input) {
        success outcome canonical isActive editability { editable reason } fieldErrors { path message }
      }
    }`, { input })).updateStoppedAgentOrgRunConfig;

// Real process + HTTP + current production composition, not an in-process resolver mock.
// No model turn is requested: this suite proves configuration without requiring credentials.
describe("stopped Org workspace real GraphQL lifecycle", () => {
  it("atomically saves every configured child, preserves other scopes, and reads the same current (version-less Org tree) package after restart", async () => {
    const suffix = `stopped-org-workspace-${process.pid}-${Date.now()}`;
    const target = {
      runtimeRoot: path.join(testRuntimeRoot, suffix),
      database: resolveTestDatabaseLocation(`file:./db/${suffix}.db`),
    };
    targets.push(target);
    const isolatedHome = path.join(target.runtimeRoot, "isolated-home");
    const [a, b, c] = ["A", "B", "C"].map(name => path.join(target.runtimeRoot, "workspaces", name));
    await Promise.all([isolatedHome, a!, b!, c!].map(p => fs.mkdir(p, { recursive: true, mode: 0o700 })));
    await fs.writeFile(path.join(a!, "retained.txt"), "A project file must not move\n");
    await fs.writeFile(path.join(b!, "destination.txt"), "B already exists\n");
    const start = async () => {
      const server = await startBuiltTestServer({
        runtimeRoot: target.runtimeRoot, databaseUrlOverride: target.database.databaseUrl,
        environment: createSanitizedTestEnvironment({ HOME: isolatedHome }),
      });
      servers.add(server);
      return server;
    };
    const first = await start();
    const gql = <T = Json>(query: string, variables = {}) => executeGraphql<T>(first.serverUrl, query, variables);
    const catalog = await gql(`query { providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
      llmModels { modelIdentifier canonicalName configSchema }
    } }`);
    const model = catalog.providerModelCatalogSnapshots.flatMap((s: Json) => s.llmModels)
      .find((m: Json) => m.canonicalName === "gpt-5.6-luna" && m.configSchema?.properties?.reasoning_effort);
    expect(model, "Repository reasoning model is required for deterministic model-config preservation").toBeTruthy();
    const agent = await gql(`mutation($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }`, { input: { name: suffix, role: "API/E2E fixture", description: "Owned workspace validation",
      instructions: "Do not act until messaged.", category: "api-e2e" } });
    const team = await gql(`mutation($input: CreateAgentTeamDefinitionInput!) {
      createAgentTeamDefinition(input: $input) { id }
    }`, { input: { name: suffix, description: "Owned flat Team", instructions: "Wait for explicit input.",
      coordinatorMemberName: "lead", nodes: ["lead", "unused"].map(memberName => ({
        memberName, ref: agent.createAgentDefinition.id, refScope: "SHARED",
      })) } });
    const org = await gql(`mutation($input: CreateAgentOrgDefinitionInput!) {
      createAgentOrgDefinition(input: $input) { id }
    }`, { input: { name: suffix, description: "Owned Org", instructions: "Wait for explicit input.",
      members: [
        { memberName: "direct", ref: agent.createAgentDefinition.id, refType: "AGENT", refScope: "SHARED" },
        ...["team", "sibling"].map(memberName => ({ memberName, ref: team.createAgentTeamDefinition.id,
          refType: "AGENT_TEAM", refScope: "SHARED" })),
      ], handoffs: [] } });
    const created = await gql(`mutation($input: CreateAgentOrgRunInput!) {
      createAgentOrgRun(input: $input) { success message agentOrgRunId }
    }`, { input: {
      agentOrgDefinitionId: org.createAgentOrgDefinition.id,
      rootConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: model.modelIdentifier,
        llmConfig: { reasoning_effort: "low" }, autoExecuteTools: false,
        workspaceRootPath: a },
      agentOverrides: [{ address: "/team/unused", configuration: {
        llmConfig: { reasoning_effort: "high" }, workspaceRootPath: c,
      } }],
    } });
    expect(created.createAgentOrgRun, JSON.stringify(created)).toMatchObject({ success: true });
    const orgRunId = created.createAgentOrgRun.agentOrgRunId;
    const input = { orgRunId, selectionPatches: [], teamWorkspacePatches: [{ teamAddress: "/team", workspaceRootPath: b }] };
    const active = await readConfig(first, orgRunId);
    await expect(updateConfig(first, input)).resolves.toMatchObject({ success: false, outcome: "RUN_ACTIVE" });
    expect((await readConfig(first, orgRunId)).executionTree).toEqual(active.executionTree);
    expect((await gql(`mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }`,
      { id: orgRunId })).terminateAgentOrgRun.success).toBe(true);
    const before = await readConfig(first, orgRunId);
    expect(before).toMatchObject({ isActive: false, editability: { editable: true } });
    const treeFile = path.join(target.runtimeRoot, "memory", "agent_orgs", orgRunId, "agent_org_run_execution_tree.json");
    const bytes = await fs.readFile(treeFile, "utf8");
    // org-teams-follow-definition (autobyteus-29): the Org file is the container (its units by run ID); each Team unit's
    // launch settings live in its own Team run's file, which a refused update must not change either.
    const unitFile = (address: string) => {
      const unit = (JSON.parse(bytes).rootOrg.units as Json[]).find((entry) => entry.address === address)!;
      return path.join(target.runtimeRoot, "memory", "agent_teams", unit.runId, "team_run_execution_tree.json");
    };
    const teamFile = unitFile("/team");
    const siblingFile = unitFile("/sibling");
    const teamBytes = await fs.readFile(teamFile, "utf8");
    const siblingBytes = await fs.readFile(siblingFile, "utf8");
    for (const patches of [
      [{ teamAddress: "/", workspaceRootPath: b }],
      [{ teamAddress: "/direct", workspaceRootPath: b }],
      [{ teamAddress: "/team/lead", workspaceRootPath: b }],
      [{ teamAddress: "/team", workspaceRootPath: " " }],
      [{ teamAddress: "/team", workspaceRootPath: b }, { teamAddress: "/team", workspaceRootPath: c }],
    ]) {
      await expect(updateConfig(first, { ...input, teamWorkspacePatches: patches }))
        .resolves.toMatchObject({ success: false, outcome: "VALIDATION_FAILED" });
      expect(await fs.readFile(treeFile, "utf8")).toBe(bytes);
      expect(await fs.readFile(teamFile, "utf8")).toBe(teamBytes);
    }
    const modelPatch = { scopeKind: "CONFIGURED_AGENT", scopeAddress: "/team/lead", runtimeKind: "autobyteus",
      llmModelIdentifier: model.modelIdentifier, llmConfig: { reasoning_effort: "not-a-level" } };
    await expect(updateConfig(first, { ...input, selectionPatches: [modelPatch] }))
      .resolves.toMatchObject({ success: false, outcome: "VALIDATION_FAILED" });
    expect(await fs.readFile(treeFile, "utf8")).toBe(bytes);
    // Option preview is read-only and uses the same candidate Team intent.
    await gql(`query($id: String!, $patches: [AgentOrgTeamWorkspacePatchInput!]!) {
      agentOrgRunModelOptions(orgRunId: $id, teamWorkspacePatches: $patches) { scopeAddress unavailableReason }
    }`, { id: orgRunId, patches: input.teamWorkspacePatches });
    expect(await fs.readFile(treeFile, "utf8")).toBe(bytes);

    const saved = await updateConfig(first, input);
    expect(saved).toMatchObject({ success: true, outcome: "UPDATED", isActive: false });
    const expected = structuredClone(before.executionTree);
    const affected = expected.rootOrg.members.find((member: Json) => member.address === "/team");
    affected.defaultLaunchConfiguration.workspaceRootPath = b;
    for (const member of affected.members) member.launchConfiguration.workspaceRootPath = b;
    // autobyteus-461 contract §6: the stored tree has no `taskExecutions` (each run's delegations are its Task entries); the
    // config read keeps base's view shape (rule 1) with its rows. Every other field is compared exactly.
    const stored = <T>(value: T): T => JSON.parse(JSON.stringify(value, (key, inner) => key === "taskExecutions" ? undefined : inner));
    expect(JSON.stringify(JSON.parse(await fs.readFile(treeFile, "utf8")))).not.toContain("taskExecutions");
    expect(stored(saved.canonical)).toEqual(stored(expected)); // Protect every field except approved Team/child paths.
    expect(stored((await readConfig(first, orgRunId)).executionTree)).toEqual(stored(expected));
    const containerAfter = JSON.parse(await fs.readFile(treeFile, "utf8"));
    expect(containerAfter.rootOrg).not.toHaveProperty("members");
    expect((containerAfter.rootOrg.units as Json[]).map((unit) => [unit.address, unit.kind])).toEqual([["/direct", "agent"], ["/team", "agent_team"], ["/sibling", "agent_team"]]);
    const teamAfter = JSON.parse(await fs.readFile(teamFile, "utf8"));
    expect(teamAfter.rootTeam.defaultLaunchConfiguration.workspaceRootPath).toBe(b);
    expect((teamAfter.rootTeam.members as Json[]).map((member) => member.launchConfiguration.workspaceRootPath)).toEqual([b, b]);
    expect(await fs.readFile(siblingFile, "utf8"), "the other Team unit is unchanged").toBe(siblingBytes);
    expect(expected).not.toHaveProperty("schemaVersion");
    for (const member of expected.rootOrg.members) {
      for (const agent of member.members ?? [member]) expect(agent.platformAgentRunId).toBeNull();
    }
    await expect(updateConfig(first, input)).resolves.toMatchObject({ success: true, outcome: "UNCHANGED" });
    // Existing model edits compose with a second workspace edit in one command.
    const mixed = await updateConfig(first, { ...input,
      teamWorkspacePatches: [{ teamAddress: "/team", workspaceRootPath: c }],
      selectionPatches: [{ ...modelPatch, llmConfig: { reasoning_effort: "high" } }],
    });
    affected.defaultLaunchConfiguration.workspaceRootPath = c;
    for (const member of affected.members) member.launchConfiguration.workspaceRootPath = c;
    affected.members.find((member: Json) => member.address === "/team/lead").launchConfiguration.llmConfig = { reasoning_effort: "high" };
    expect(mixed, JSON.stringify({ mixed, expected: stored(expected) })).toMatchObject({ success: true, outcome: "UPDATED" });
    expect(stored(mixed.canonical)).toEqual(stored(expected));

    await first.stop(); servers.delete(first);
    const second = await start();
    const reread = await readConfig(second, orgRunId);
    expect(reread).toMatchObject({ isActive: false, editability: { editable: true } });
    expect(stored(reread.executionTree)).toEqual(stored(expected));
    expect(await fs.readFile(path.join(a!, "retained.txt"), "utf8")).toBe("A project file must not move\n");
    expect(await fs.readdir(b!)).toEqual(["destination.txt"]);
    expect(await fs.readdir(c!)).toEqual([]);
    const schema = await executeGraphql<Json>(second.serverUrl, `query {
      __schema { queryType { fields { name } } mutationType { fields { name } } }
    }`);
    expect(schema.__schema.queryType.fields.map((f: Json) => f.name)).not.toContain("getAgentOrgRunModelConfig");
    expect(schema.__schema.mutationType.fields.map((f: Json) => f.name)).not.toContain("updateStoppedAgentOrgRunModelConfigs");
  }, 180_000);
});
