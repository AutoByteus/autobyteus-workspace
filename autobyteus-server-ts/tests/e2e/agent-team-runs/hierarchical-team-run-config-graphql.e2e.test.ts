import fs from "node:fs";
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

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type DatabaseLocation = ReturnType<typeof resolveTestDatabaseLocation>;

const ownedServers = new Set<RunningTestServer>();
const ownedTargets: Array<{ runtimeRoot: string; database: DatabaseLocation }> = [];

const makeTarget = (label: string) => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  const isolatedHome = path.join(runtimeRoot, "isolated-home");
  fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });
  ownedTargets.push({ runtimeRoot, database });
  return { runtimeRoot, database, isolatedHome };
};

const startServer = async (target: ReturnType<typeof makeTarget>): Promise<RunningTestServer> => {
  const server = await startBuiltTestServer({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: target.isolatedHome }),
  });
  ownedServers.add(server);
  return server;
};

const stopServer = async (server: RunningTestServer): Promise<void> => {
  await server.stop();
  ownedServers.delete(server);
};

const createAgentDefinition = async (serverUrl: string, name: string): Promise<string> => {
  const result = await executeGraphql<{
    createAgentDefinition: { id: string };
  }>(serverUrl, `
    mutation CreateHierarchyAgent($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }
  `, {
    input: {
      name,
      role: "API/E2E hierarchy fixture",
      description: "Owned deterministic hierarchy fixture",
      instructions: "Do not perform work until explicitly messaged.",
      category: "api-e2e",
    },
  });
  return result.createAgentDefinition.id;
};

const createTeamDefinition = async (serverUrl: string, input: {
  name: string;
  coordinatorMemberName: string;
  nodes: Array<{ memberName: string; ref: string; refType: "AGENT" | "AGENT_TEAM"; refScope: "SHARED" }>;
}): Promise<string> => {
  const result = await executeGraphql<{
    createAgentTeamDefinition: { id: string };
  }>(serverUrl, `
    mutation CreateHierarchyTeam($input: CreateAgentTeamDefinitionInput!) {
      createAgentTeamDefinition(input: $input) { id }
    }
  `, {
    input: {
      ...input,
      description: "Owned deterministic hierarchy fixture",
      instructions: "Coordinate only after explicit user input.",
    },
  });
  return result.createAgentTeamDefinition.id;
};

const firstAutoByteusModel = async (serverUrl: string): Promise<string> => {
  const result = await executeGraphql<{
    providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }>;
  }>(serverUrl, `
    query HierarchyModels($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
        llmModels { modelIdentifier }
      }
    }
  `, { runtimeKind: "autobyteus" });
  const model = result.providerModelCatalogSnapshots
    .flatMap((snapshot) => snapshot.llmModels)
    .map(({ modelIdentifier }) => modelIdentifier.trim())
    .find(Boolean);
  if (!model) throw new Error("HIERARCHY_E2E_AUTOBYTEUS_MODEL_MISSING");
  return model;
};

const seedHierarchy = async (serverUrl: string, label: string) => {
  const coordinatorId = await createAgentDefinition(serverUrl, `${label}-coordinator`);
  const observerId = await createAgentDefinition(serverUrl, `${label}-observer`);
  const researchLeadId = await createAgentDefinition(serverUrl, `${label}-research-lead`);
  const reviewerId = await createAgentDefinition(serverUrl, `${label}-reviewer`);
  const researchTeamId = await createTeamDefinition(serverUrl, {
    name: `${label}-research-team`,
    coordinatorMemberName: "lead",
    nodes: [
      { memberName: "lead", ref: researchLeadId, refType: "AGENT", refScope: "SHARED" },
      { memberName: "reviewer", ref: reviewerId, refType: "AGENT", refScope: "SHARED" },
    ],
  });
  const rootTeamId = await createTeamDefinition(serverUrl, {
    name: `${label}-root-team`,
    coordinatorMemberName: "coordinator",
    nodes: [
      { memberName: "coordinator", ref: coordinatorId, refType: "AGENT", refScope: "SHARED" },
      { memberName: "observer", ref: observerId, refType: "AGENT", refScope: "SHARED" },
      { memberName: "Research", ref: researchTeamId, refType: "AGENT_TEAM", refScope: "SHARED" },
    ],
  });
  return { rootTeamId, coordinatorId, observerId, researchLeadId, reviewerId };
};

const createTeamRunMutation = `
  mutation CreateHierarchicalTeamRun($input: CreateAgentTeamRunInput!) {
    createAgentTeamRun(input: $input) { success message teamRunId }
  }
`;

const resumeConfig = (serverUrl: string, teamRunId: string) => executeGraphql<{
  getTeamRunResumeConfig: { teamRunId: string; isActive: boolean; executionTree: Record<string, unknown> };
}>(serverUrl, `
  query HierarchicalTeamRunResume($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree }
  }
`, { teamRunId }).then(({ getTeamRunResumeConfig }) => getTeamRunResumeConfig);

type CompleteLaunchConfiguration = {
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode: string;
  workspaceRootPath: string | null;
};

type ExactConfigurationNode = {
  address: string;
  agentDefinitionId?: string;
  launchConfiguration?: CompleteLaunchConfiguration;
  defaultLaunchConfiguration?: CompleteLaunchConfiguration;
  members?: ExactConfigurationNode[];
};

const normalizeLaunchConfiguration = (
  value: Record<string, unknown>,
  projection: "persisted" | "graphql",
): CompleteLaunchConfiguration => projection === "persisted"
  ? {
      runtimeKind: value.runtimeKind as string,
      llmModelIdentifier: value.llmModelIdentifier as string,
      llmConfig: value.llmConfig as Record<string, unknown> | null,
      autoExecuteTools: value.autoExecuteTools as boolean,
      skillAccessMode: value.skillAccessMode as string,
      workspaceRootPath: value.workspaceRootPath as string | null,
    }
  : {
      runtimeKind: value.runtime_kind as string,
      llmModelIdentifier: value.llm_model_identifier as string,
      llmConfig: value.llm_config as Record<string, unknown> | null,
      autoExecuteTools: value.auto_execute_tools as boolean,
      skillAccessMode: value.skill_access_mode as string,
      workspaceRootPath: value.workspace_root_path as string | null,
    };

const normalizeExactConfigurationTree = (
  root: Record<string, unknown>,
  projection: "persisted" | "graphql",
): ExactConfigurationNode => {
  const members = root.members as Array<Record<string, unknown>>;
  const defaultKey = projection === "persisted"
    ? "defaultLaunchConfiguration"
    : "default_launch_configuration";
  const definitionKey = projection === "persisted"
    ? "agentDefinitionId"
    : "agent_definition_id";
  const launchKey = projection === "persisted"
    ? "launchConfiguration"
    : "launch_configuration";
  return {
    address: root.address as string,
    defaultLaunchConfiguration: normalizeLaunchConfiguration(
      root[defaultKey] as Record<string, unknown>,
      projection,
    ),
    members: members.map((member): ExactConfigurationNode => {
      if (Array.isArray(member.members)) {
        return normalizeExactConfigurationTree(member, projection);
      }
      return {
        address: member.address as string,
        agentDefinitionId: member[definitionKey] as string,
        launchConfiguration: normalizeLaunchConfiguration(
          member[launchKey] as Record<string, unknown>,
          projection,
        ),
      };
    }),
  };
};

const assertExactConfigurationTree = (
  root: Record<string, unknown>,
  projection: "persisted" | "graphql",
  expected: ExactConfigurationNode,
): void => {
  expect(normalizeExactConfigurationTree(root, projection)).toEqual(expected);
};

afterEach(async () => {
  for (const server of [...ownedServers]) {
    if (server.child.exitCode === null) {
      await server.stop().catch(() => server.child.kill("SIGKILL"));
    }
    ownedServers.delete(server);
  }
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe("hierarchical TeamRun GraphQL and V2 lifecycle", () => {
  it("persists root, nested-Team, and exact-Agent configurations and restores them after process restart", async () => {
    const target = makeTarget("hierarchical-team-run-current");
    const first = await startServer(target);
    const fixture = await seedHierarchy(first.serverUrl, `hierarchy-${Date.now()}`);
    const model = await firstAutoByteusModel(first.serverUrl);
    const rootWorkspace = path.join(target.runtimeRoot, "workspaces", "root");
    const researchWorkspace = path.join(target.runtimeRoot, "workspaces", "research");
    for (const workspace of [rootWorkspace, researchWorkspace]) {
      fs.mkdirSync(workspace, { recursive: true, mode: 0o700 });
    }
    const rootTeamConfiguration: CompleteLaunchConfiguration = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: model,
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      workspaceRootPath: rootWorkspace,
    };
    const researchTeamConfiguration: CompleteLaunchConfiguration = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: model,
      llmConfig: { temperature: 0.2 },
      autoExecuteTools: true,
      skillAccessMode: "PRELOADED_ONLY",
      workspaceRootPath: researchWorkspace,
    };
    const coordinatorConfiguration = { ...rootTeamConfiguration };
    const observerConfiguration: CompleteLaunchConfiguration = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: model,
      llmConfig: { temperature: 0.1 },
      autoExecuteTools: true,
      skillAccessMode: "PRELOADED_ONLY",
      workspaceRootPath: rootWorkspace,
    };
    const leadConfiguration = { ...researchTeamConfiguration };
    const reviewerConfiguration: CompleteLaunchConfiguration = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: model,
      llmConfig: { temperature: 0.35 },
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      workspaceRootPath: researchWorkspace,
    };
    const expectedConfigurationTree: ExactConfigurationNode = {
      address: "/",
      defaultLaunchConfiguration: rootTeamConfiguration,
      members: [
        {
          address: "/coordinator",
          agentDefinitionId: fixture.coordinatorId,
          launchConfiguration: coordinatorConfiguration,
        },
        {
          address: "/observer",
          agentDefinitionId: fixture.observerId,
          launchConfiguration: observerConfiguration,
        },
        {
          address: "/Research",
          defaultLaunchConfiguration: researchTeamConfiguration,
          members: [
            {
              address: "/Research/lead",
              agentDefinitionId: fixture.researchLeadId,
              launchConfiguration: leadConfiguration,
            },
            {
              address: "/Research/reviewer",
              agentDefinitionId: fixture.reviewerId,
              launchConfiguration: reviewerConfiguration,
            },
          ],
        },
      ],
    };

    const created = await executeGraphql<{
      createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
    }>(first.serverUrl, createTeamRunMutation, {
      input: {
        teamDefinitionId: fixture.rootTeamId,
        teamConfigs: [
          {
            teamAddress: "/",
            ...rootTeamConfiguration,
          },
          {
            teamAddress: "/Research",
            ...researchTeamConfiguration,
          },
        ],
        memberConfigs: [
          {
            memberAddress: "/coordinator",
            agentDefinitionId: fixture.coordinatorId,
            ...coordinatorConfiguration,
          },
          {
            memberAddress: "/observer",
            agentDefinitionId: fixture.observerId,
            ...observerConfiguration,
          },
          {
            memberAddress: "/Research/lead",
            agentDefinitionId: fixture.researchLeadId,
            ...leadConfiguration,
          },
          {
            memberAddress: "/Research/reviewer",
            agentDefinitionId: fixture.reviewerId,
            ...reviewerConfiguration,
          },
        ],
      },
    });
    if (!created.createAgentTeamRun.success) {
      throw new Error(`HIERARCHICAL_TEAM_RUN_CREATE_FAILED: ${created.createAgentTeamRun.message}`);
    }
    expect(created.createAgentTeamRun).toMatchObject({ success: true, teamRunId: expect.any(String) });
    const teamRunId = created.createAgentTeamRun.teamRunId as string;
    const treePath = path.join(
      target.runtimeRoot,
      "memory",
      "agent_teams",
      teamRunId,
      "team_run_execution_tree.json",
    );
    const tree = JSON.parse(fs.readFileSync(treePath, "utf8")) as any;
    expect(tree.schemaVersion).toBe(2);
    assertExactConfigurationTree(tree.rootTeam, "persisted", expectedConfigurationTree);

    const activeResume = await resumeConfig(first.serverUrl, teamRunId);
    expect(activeResume).toMatchObject({ teamRunId, isActive: true });
    expect((activeResume.executionTree as any).schema_version).toBe(2);
    assertExactConfigurationTree(
      (activeResume.executionTree as any).root_team,
      "graphql",
      expectedConfigurationTree,
    );

    const terminated = await executeGraphql<{ terminateAgentTeamRun: { success: boolean } }>(first.serverUrl, `
      mutation TerminateHierarchicalTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) { success }
      }
    `, { teamRunId });
    expect(terminated.terminateAgentTeamRun.success).toBe(true);
    await stopServer(first);

    const second = await startServer(target);
    const restartedResume = await resumeConfig(second.serverUrl, teamRunId);
    expect(restartedResume).toMatchObject({ teamRunId, isActive: false });
    expect((restartedResume.executionTree as any).schema_version).toBe(2);
    assertExactConfigurationTree(
      (restartedResume.executionTree as any).root_team,
      "graphql",
      expectedConfigurationTree,
    );
    const restored = await executeGraphql<{
      restoreAgentTeamRun: { success: boolean; teamRunId: string | null };
    }>(second.serverUrl, `
      mutation RestoreHierarchicalTeamRun($teamRunId: String!) {
        restoreAgentTeamRun(teamRunId: $teamRunId) { success teamRunId }
      }
    `, { teamRunId });
    expect(restored.restoreAgentTeamRun).toEqual({ success: true, teamRunId });
    const restoredResume = await resumeConfig(second.serverUrl, teamRunId);
    expect(restoredResume).toMatchObject({ teamRunId, isActive: true });
    assertExactConfigurationTree(
      (restoredResume.executionTree as any).root_team,
      "graphql",
      expectedConfigurationTree,
    );
  }, 180_000);

  it.each([
    { subject: "Team", label: "missing", runtimeKind: undefined, graphqlRejected: true },
    { subject: "Team", label: "blank", runtimeKind: "   ", graphqlRejected: false },
    { subject: "Team", label: "unsupported", runtimeKind: "not-a-runtime", graphqlRejected: false },
    { subject: "Agent", label: "missing", runtimeKind: undefined, graphqlRejected: true },
    { subject: "Agent", label: "blank", runtimeKind: "   ", graphqlRejected: false },
    { subject: "Agent", label: "unsupported", runtimeKind: "not-a-runtime", graphqlRejected: false },
  ])("rejects a $label $subject runtime before workspace or run side effects", async ({
    subject,
    label,
    runtimeKind,
    graphqlRejected,
  }) => {
    const target = makeTarget(`hierarchical-team-run-invalid-${subject.toLowerCase()}-${label}`);
    const server = await startServer(target);
    const fixture = await seedHierarchy(server.serverUrl, `invalid-${label}-${Date.now()}`);
    const model = await firstAutoByteusModel(server.serverUrl);
    const rejectedWorkspace = path.join(target.runtimeRoot, "must-not-exist", label);
    const input = {
      teamDefinitionId: fixture.rootTeamId,
      teamConfigs: [
        {
          teamAddress: "/",
          llmModelIdentifier: model,
          autoExecuteTools: false,
          skillAccessMode: "NONE",
          ...(subject === "Team"
            ? (runtimeKind === undefined ? {} : { runtimeKind })
            : { runtimeKind: "autobyteus" }),
          workspaceRootPath: rejectedWorkspace,
        },
        {
          teamAddress: "/Research",
          llmModelIdentifier: model,
          autoExecuteTools: false,
          skillAccessMode: "NONE",
          runtimeKind: "autobyteus",
          workspaceRootPath: rejectedWorkspace,
        },
      ],
      memberConfigs: [
        ["/coordinator", fixture.coordinatorId],
        ["/observer", fixture.observerId],
        ["/Research/lead", fixture.researchLeadId],
        ["/Research/reviewer", fixture.reviewerId],
      ].map(([memberAddress, agentDefinitionId], index) => ({
        memberAddress,
        agentDefinitionId,
        llmModelIdentifier: model,
        autoExecuteTools: false,
        skillAccessMode: "NONE",
        ...(subject === "Agent" && index === 0
          ? (runtimeKind === undefined ? {} : { runtimeKind })
          : { runtimeKind: "autobyteus" }),
        workspaceRootPath: rejectedWorkspace,
      })),
    };

    if (graphqlRejected) {
      const response = await fetch(`${server.serverUrl}/graphql`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: createTeamRunMutation, variables: { input } }),
      });
      const payload = await response.json() as { errors?: Array<{ message: string }> };
      expect(payload.errors?.[0]?.message).toContain("runtimeKind");
    } else {
      const result = await executeGraphql<{
        createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(server.serverUrl, createTeamRunMutation, { input });
      expect(result.createAgentTeamRun).toMatchObject({
        success: false,
        message: expect.stringContaining(runtimeKind === "   " ? "runtimeKind is required" : "INVALID_RUNTIME_KIND"),
      });
    }
    expect(fs.existsSync(rejectedWorkspace)).toBe(false);
    const teamMemoryRoot = path.join(target.runtimeRoot, "memory", "agent_teams");
    expect(fs.existsSync(teamMemoryRoot) ? fs.readdirSync(teamMemoryRoot) : []).toEqual([]);
  }, 180_000);
});
