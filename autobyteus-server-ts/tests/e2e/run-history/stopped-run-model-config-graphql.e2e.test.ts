import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { WorkingContextFinalizer } from "autobyteus-ts/memory/working-context-finalizer.js";
import { WorkingContextSnapshotSerializer } from "autobyteus-ts/memory/working-context-snapshot-serializer.js";
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
type JsonRecord = Record<string, any>;

const INITIAL_CONFIG = {
  reasoning_effort: "low",
  reasoning_summary: "none",
};
const UPDATED_CONFIG = {
  reasoning_effort: "high",
  reasoning_summary: "auto",
};

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

const readJson = (filePath: string): JsonRecord =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as JsonRecord;

const createAgentDefinition = async (serverUrl: string, name: string): Promise<string> => {
  const result = await executeGraphql<{ createAgentDefinition: { id: string } }>(serverUrl, `
    mutation CreateStoppedConfigAgent($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }
  `, {
    input: {
      name,
      role: "Stopped model-config API/E2E fixture",
      description: "Owned deterministic stopped model-config fixture",
      instructions: "Do not perform work until explicitly messaged.",
      category: "api-e2e",
    },
  });
  return result.createAgentDefinition.id;
};

const createTeamDefinition = async (serverUrl: string, input: {
  name: string;
  coordinatorMemberName: string;
  nodes: Array<{
    memberName: string;
    ref: string;
    refType: "AGENT" | "AGENT_TEAM";
    refScope: "SHARED";
  }>;
}): Promise<string> => {
  const result = await executeGraphql<{ createAgentTeamDefinition: { id: string } }>(serverUrl, `
    mutation CreateStoppedConfigTeam($input: CreateAgentTeamDefinitionInput!) {
      createAgentTeamDefinition(input: $input) { id }
    }
  `, {
    input: {
      ...input,
      description: "Owned deterministic stopped model-config fixture",
      instructions: "Coordinate only after explicit input.",
    },
  });
  return result.createAgentTeamDefinition.id;
};

const autoByteusReasoningModel = async (serverUrl: string): Promise<string> => {
  const result = await executeGraphql<{
    providerModelCatalogSnapshots: Array<{
      llmModels: Array<{
        modelIdentifier: string;
        canonicalName: string;
        configSchema: JsonRecord | null;
      }>;
    }>;
  }>(serverUrl, `
    query StoppedConfigModels($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
        llmModels { modelIdentifier canonicalName configSchema }
      }
    }
  `, { runtimeKind: "autobyteus" });
  const model = result.providerModelCatalogSnapshots
    .flatMap((snapshot) => snapshot.llmModels)
    .find((candidate) =>
      candidate.canonicalName === "gpt-5.6-luna" &&
      Array.isArray((candidate.configSchema?.properties?.reasoning_effort as JsonRecord | undefined)?.enum));
  if (!model) throw new Error("STOPPED_CONFIG_E2E_REASONING_MODEL_MISSING");
  return model.modelIdentifier;
};

const updateAgent = (serverUrl: string, input: {
  agentRunId: string;
  llmConfig: JsonRecord | null;
}) => executeGraphql<{
  updateStoppedAgentRunModelConfig: {
    success: boolean;
    outcome: string;
    isActive: boolean;
    editability: { editable: boolean; reason: string | null };
    canonicalLlmConfig: JsonRecord | null;
    fieldErrors: Array<{ path: string; message: string }>;
  };
}>(serverUrl, `
  mutation UpdateStoppedAgent($input: UpdateStoppedAgentRunModelConfigInput!) {
    updateStoppedAgentRunModelConfig(input: $input) {
      success outcome isActive
      editability { editable reason }
      canonicalLlmConfig
      fieldErrors { path message }
    }
  }
`, { input }).then((result) => result.updateStoppedAgentRunModelConfig);

const updateTeam = (serverUrl: string, input: {
  teamRunId: string;
  patches: Array<{
    scopeKind: "CONFIGURED_TEAM" | "CONFIGURED_AGENT";
    scopeAddress: string;
    llmConfig: JsonRecord | null;
  }>;
}) => executeGraphql<{
  updateStoppedTeamRunModelConfigs: {
    success: boolean;
    outcome: string;
    isActive: boolean;
    editability: { editable: boolean; reason: string | null };
    canonicalExecutionTree: JsonRecord | null;
    fieldErrors: Array<{ path: string; message: string }>;
  };
}>(serverUrl, `
  mutation UpdateStoppedTeam($input: UpdateStoppedTeamRunModelConfigsInput!) {
    updateStoppedTeamRunModelConfigs(input: $input) {
      success outcome isActive
      editability { editable reason }
      canonicalExecutionTree
      fieldErrors { path message }
    }
  }
`, { input }).then((result) => result.updateStoppedTeamRunModelConfigs);

const agentResume = (serverUrl: string, runId: string) => executeGraphql<{
  getAgentRunResumeConfig: {
    runId: string;
    isActive: boolean;
    metadataConfig: JsonRecord;
    modelConfigEditability: { editable: boolean; reason: string | null };
  };
}>(serverUrl, `
  query StoppedAgentResume($runId: String!) {
    getAgentRunResumeConfig(runId: $runId) {
      runId isActive
      metadataConfig {
        agentDefinitionId workspaceRootPath llmModelIdentifier llmConfig
        autoExecuteTools skillAccessMode runtimeKind
        runtimeReference { runtimeKind sessionId threadId metadata }
      }
      modelConfigEditability { editable reason }
    }
  }
`, { runId }).then((result) => result.getAgentRunResumeConfig);

const teamResume = (serverUrl: string, teamRunId: string) => executeGraphql<{
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    executionTree: JsonRecord;
    modelConfigEditability: { editable: boolean; reason: string | null };
  };
}>(serverUrl, `
  query StoppedTeamResume($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId isActive executionTree
      modelConfigEditability { editable reason }
    }
  }
`, { teamRunId }).then((result) => result.getTeamRunResumeConfig);

const withoutAgentLlmConfig = (metadata: JsonRecord): JsonRecord => {
  const clone = structuredClone(metadata);
  delete clone.llmConfig;
  return clone;
};

const withoutSelectedTeamLlmConfigs = (
  tree: JsonRecord,
  addresses: readonly string[],
): JsonRecord => {
  const clone = structuredClone(tree);
  const targets = new Set(addresses);
  const visit = (team: JsonRecord): void => {
    if (targets.has(team.address)) delete team.defaultLaunchConfiguration.llmConfig;
    for (const member of team.members as JsonRecord[]) {
      if (Array.isArray(member.members)) {
        visit(member);
      } else if (targets.has(member.address)) {
        delete member.launchConfiguration.llmConfig;
      }
    }
  };
  visit(clone.rootTeam);
  return clone;
};

const findPersistedScopeConfig = (tree: JsonRecord, address: string): JsonRecord | null => {
  const visit = (team: JsonRecord): JsonRecord | null => {
    if (team.address === address) return team.defaultLaunchConfiguration.llmConfig;
    for (const member of team.members as JsonRecord[]) {
      if (Array.isArray(member.members)) {
        const nested = visit(member);
        if (nested !== null) return nested;
      } else if (member.address === address) {
        return member.launchConfiguration.llmConfig;
      }
    }
    return null;
  };
  return visit(tree.rootTeam);
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

describe("stopped run model-config GraphQL lifecycle", () => {
  it("updates only a stopped standalone run config and restores the same current package after restart", async () => {
    const target = makeTarget("stopped-agent-model-config");
    const first = await startServer(target);
    const definitionId = await createAgentDefinition(first.serverUrl, `stopped-agent-${Date.now()}`);
    const model = await autoByteusReasoningModel(first.serverUrl);
    const workspaceRootPath = path.join(target.runtimeRoot, "workspaces", "agent");
    fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });

    const created = await executeGraphql<{
      createAgentRun: { success: boolean; message: string; runId: string | null };
    }>(first.serverUrl, `
      mutation CreateStoppedConfigAgentRun($input: CreateAgentRunInput!) {
        createAgentRun(input: $input) { success message runId }
      }
    `, {
      input: {
        agentDefinitionId: definitionId,
        workspaceRootPath,
        llmModelIdentifier: model,
        llmConfig: INITIAL_CONFIG,
        autoExecuteTools: false,
        skillAccessMode: "PRELOADED_ONLY",
        runtimeKind: "autobyteus",
      },
    });
    if (!created.createAgentRun.success || !created.createAgentRun.runId) {
      throw new Error(`STOPPED_AGENT_CREATE_FAILED: ${created.createAgentRun.message}`);
    }
    const runId = created.createAgentRun.runId;
    const metadataPath = path.join(
      target.runtimeRoot,
      "memory",
      "agents",
      runId,
      "run_metadata.json",
    );
    const snapshot = new WorkingContextFinalizer().finalize({
      messages: [new Message(MessageRole.SYSTEM, { content: "Owned current-v5 API/E2E snapshot" })],
    });
    fs.writeFileSync(
      path.join(path.dirname(metadataPath), "working_context_snapshot.json"),
      JSON.stringify(WorkingContextSnapshotSerializer.serialize(snapshot, { agent_id: runId })),
      "utf8",
    );
    const activeFile = fs.readFileSync(metadataPath, "utf8");

    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmConfig: UPDATED_CONFIG,
    })).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
      canonicalLlmConfig: INITIAL_CONFIG,
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(activeFile);

    const terminated = await executeGraphql<{
      terminateAgentRun: { success: boolean };
    }>(first.serverUrl, `
      mutation StopAgentForConfig($runId: String!) {
        terminateAgentRun(agentRunId: $runId) { success }
      }
    `, { runId });
    expect(terminated.terminateAgentRun.success).toBe(true);
    const fresh = await agentResume(first.serverUrl, runId);
    expect(fresh).toMatchObject({
      runId,
      isActive: false,
      metadataConfig: {
        agentDefinitionId: definitionId,
        workspaceRootPath,
        llmModelIdentifier: model,
        llmConfig: INITIAL_CONFIG,
        runtimeKind: "autobyteus",
      },
      modelConfigEditability: { editable: true, reason: null },
    });

    const stoppedFile = fs.readFileSync(metadataPath, "utf8");
    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmConfig: INITIAL_CONFIG,
    })).resolves.toMatchObject({
      success: true,
      outcome: "UNCHANGED",
      canonicalLlmConfig: INITIAL_CONFIG,
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedFile);

    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmConfig: { unsupported_setting: true },
    })).resolves.toMatchObject({
      success: false,
      outcome: "VALIDATION_FAILED",
      fieldErrors: [{ path: "llmConfig.unsupported_setting" }],
      canonicalLlmConfig: INITIAL_CONFIG,
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedFile);

    const beforeUpdate = readJson(metadataPath);
    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmConfig: UPDATED_CONFIG,
    })).resolves.toMatchObject({
      success: true,
      outcome: "UPDATED",
      isActive: false,
      canonicalLlmConfig: UPDATED_CONFIG,
      editability: { editable: true, reason: null },
    });
    const afterUpdate = readJson(metadataPath);
    expect(afterUpdate.llmConfig).toEqual(UPDATED_CONFIG);
    expect(withoutAgentLlmConfig(afterUpdate)).toEqual(withoutAgentLlmConfig(beforeUpdate));

    const schema = await executeGraphql<{
      agentInput: { inputFields: Array<{ name: string }> };
      agentResult: { fields: Array<{ name: string }> };
      teamInput: { inputFields: Array<{ name: string }> };
    }>(first.serverUrl, `
      query StoppedConfigSchema {
        agentInput: __type(name: "UpdateStoppedAgentRunModelConfigInput") {
          inputFields { name }
        }
        agentResult: __type(name: "UpdateStoppedAgentRunModelConfigResult") {
          fields { name }
        }
        teamInput: __type(name: "UpdateStoppedTeamRunModelConfigsInput") {
          inputFields { name }
        }
      }
    `);
    expect(schema.agentInput.inputFields.map(({ name }) => name).sort()).toEqual([
      "agentRunId",
      "llmConfig",
    ]);
    expect(schema.teamInput.inputFields.map(({ name }) => name).sort()).toEqual([
      "patches",
      "teamRunId",
    ]);
    expect(schema.agentResult.fields.map(({ name }) => name)).not.toContain("configurationRevision");

    await stopServer(first);
    const second = await startServer(target);
    await expect(agentResume(second.serverUrl, runId)).resolves.toMatchObject({
      runId,
      isActive: false,
      metadataConfig: {
        llmConfig: UPDATED_CONFIG,
        agentDefinitionId: definitionId,
        llmModelIdentifier: model,
        workspaceRootPath,
      },
    });
    const restored = await executeGraphql<{
      restoreAgentRun: { success: boolean; message: string; runId: string | null };
    }>(second.serverUrl, `
      mutation RestoreStoppedConfigAgent($runId: String!) {
        restoreAgentRun(agentRunId: $runId) { success message runId }
      }
    `, { runId });
    expect(restored.restoreAgentRun, second.output()).toMatchObject({ success: true, runId });
    await expect(agentResume(second.serverUrl, runId)).resolves.toMatchObject({
      runId,
      isActive: true,
      metadataConfig: { llmConfig: UPDATED_CONFIG },
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
    });
  }, 180_000);

  it("updates exact stopped Team scopes and preserves the current V2 package across restart", async () => {
    const target = makeTarget("stopped-team-model-config");
    const first = await startServer(target);
    const label = `stopped-team-${Date.now()}`;
    const coordinatorId = await createAgentDefinition(first.serverUrl, `${label}-coordinator`);
    const leadId = await createAgentDefinition(first.serverUrl, `${label}-lead`);
    const reviewerId = await createAgentDefinition(first.serverUrl, `${label}-reviewer`);
    const nestedTeamId = await createTeamDefinition(first.serverUrl, {
      name: `${label}-nested`,
      coordinatorMemberName: "lead",
      nodes: [
        { memberName: "lead", ref: leadId, refType: "AGENT", refScope: "SHARED" },
        { memberName: "reviewer", ref: reviewerId, refType: "AGENT", refScope: "SHARED" },
      ],
    });
    const rootTeamId = await createTeamDefinition(first.serverUrl, {
      name: `${label}-root`,
      coordinatorMemberName: "coordinator",
      nodes: [
        { memberName: "coordinator", ref: coordinatorId, refType: "AGENT", refScope: "SHARED" },
        { memberName: "Nested", ref: nestedTeamId, refType: "AGENT_TEAM", refScope: "SHARED" },
      ],
    });
    const model = await autoByteusReasoningModel(first.serverUrl);
    const workspaceRootPath = path.join(target.runtimeRoot, "workspaces", "team");
    fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });
    const launch = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: model,
      llmConfig: INITIAL_CONFIG,
      autoExecuteTools: false,
      skillAccessMode: "PRELOADED_ONLY",
      workspaceRootPath,
    };

    const created = await executeGraphql<{
      createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
    }>(first.serverUrl, `
      mutation CreateStoppedConfigTeamRun($input: CreateAgentTeamRunInput!) {
        createAgentTeamRun(input: $input) { success message teamRunId }
      }
    `, {
      input: {
        teamDefinitionId: rootTeamId,
        teamConfigs: [
          { teamAddress: "/", ...launch },
          { teamAddress: "/Nested", ...launch },
        ],
        memberConfigs: [
          { memberAddress: "/coordinator", agentDefinitionId: coordinatorId, ...launch },
          { memberAddress: "/Nested/lead", agentDefinitionId: leadId, ...launch },
          { memberAddress: "/Nested/reviewer", agentDefinitionId: reviewerId, ...launch },
        ],
      },
    });
    if (!created.createAgentTeamRun.success || !created.createAgentTeamRun.teamRunId) {
      throw new Error(`STOPPED_TEAM_CREATE_FAILED: ${created.createAgentTeamRun.message}`);
    }
    const teamRunId = created.createAgentTeamRun.teamRunId;
    const treePath = path.join(
      target.runtimeRoot,
      "memory",
      "agent_teams",
      teamRunId,
      "team_run_execution_tree.json",
    );
    const activeFile = fs.readFileSync(treePath, "utf8");
    const patches = [
      { scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: "/", llmConfig: UPDATED_CONFIG },
      { scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: "/Nested", llmConfig: UPDATED_CONFIG },
      {
        scopeKind: "CONFIGURED_AGENT" as const,
        scopeAddress: "/Nested/reviewer",
        llmConfig: UPDATED_CONFIG,
      },
    ];

    await expect(updateTeam(first.serverUrl, { teamRunId, patches })).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
    });
    expect(fs.readFileSync(treePath, "utf8")).toBe(activeFile);

    const terminated = await executeGraphql<{
      terminateAgentTeamRun: { success: boolean };
    }>(first.serverUrl, `
      mutation StopTeamForConfig($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) { success }
      }
    `, { teamRunId });
    expect(terminated.terminateAgentTeamRun.success).toBe(true);
    await expect(teamResume(first.serverUrl, teamRunId)).resolves.toMatchObject({
      teamRunId,
      isActive: false,
      modelConfigEditability: { editable: true, reason: null },
    });

    const stoppedFile = fs.readFileSync(treePath, "utf8");
    await expect(updateTeam(first.serverUrl, {
      teamRunId,
      patches: [{ scopeKind: "CONFIGURED_TEAM", scopeAddress: "/", llmConfig: INITIAL_CONFIG }],
    })).resolves.toMatchObject({ success: true, outcome: "UNCHANGED" });
    expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedFile);

    await expect(updateTeam(first.serverUrl, {
      teamRunId,
      patches: [{
        scopeKind: "CONFIGURED_AGENT",
        scopeAddress: "/Nested/reviewer",
        llmConfig: { unsupported_setting: true },
      }],
    })).resolves.toMatchObject({
      success: false,
      outcome: "VALIDATION_FAILED",
      fieldErrors: [{ path: "patches[/Nested/reviewer].llmConfig.unsupported_setting" }],
    });
    expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedFile);

    const beforeUpdate = readJson(treePath);
    await expect(updateTeam(first.serverUrl, { teamRunId, patches })).resolves.toMatchObject({
      success: true,
      outcome: "UPDATED",
      isActive: false,
      editability: { editable: true, reason: null },
    });
    const afterUpdate = readJson(treePath);
    expect(findPersistedScopeConfig(afterUpdate, "/")).toEqual(UPDATED_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/Nested")).toEqual(UPDATED_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/Nested/reviewer")).toEqual(UPDATED_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/coordinator")).toEqual(INITIAL_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/Nested/lead")).toEqual(INITIAL_CONFIG);
    expect(withoutSelectedTeamLlmConfigs(afterUpdate, [
      "/",
      "/Nested",
      "/Nested/reviewer",
    ])).toEqual(withoutSelectedTeamLlmConfigs(beforeUpdate, [
      "/",
      "/Nested",
      "/Nested/reviewer",
    ]));

    await stopServer(first);
    const second = await startServer(target);
    const restarted = await teamResume(second.serverUrl, teamRunId);
    expect(restarted).toMatchObject({
      teamRunId,
      isActive: false,
      modelConfigEditability: { editable: true, reason: null },
    });
    const projectedRoot = restarted.executionTree.root_team as JsonRecord;
    expect(projectedRoot.team_run_id).toBe(teamRunId);
    expect(projectedRoot.default_launch_configuration.llm_config).toEqual(UPDATED_CONFIG);

    const restored = await executeGraphql<{
      restoreAgentTeamRun: { success: boolean; teamRunId: string | null };
    }>(second.serverUrl, `
      mutation RestoreStoppedConfigTeam($teamRunId: String!) {
        restoreAgentTeamRun(teamRunId: $teamRunId) { success teamRunId }
      }
    `, { teamRunId });
    expect(restored.restoreAgentTeamRun).toEqual({ success: true, teamRunId });
    await expect(teamResume(second.serverUrl, teamRunId)).resolves.toMatchObject({
      teamRunId,
      isActive: true,
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
    });
  }, 180_000);
});
