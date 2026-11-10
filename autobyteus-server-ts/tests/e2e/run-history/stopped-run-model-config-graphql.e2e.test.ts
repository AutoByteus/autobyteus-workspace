import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const startServer = async (
  target: ReturnType<typeof makeTarget>,
  extraEnvironment: Record<string, string> = {},
): Promise<RunningTestServer> => {
  const server = await startBuiltTestServer({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: target.isolatedHome, ...extraEnvironment }),
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
  runtimeKind?: string;
  llmModelIdentifier: string;
  llmConfig: JsonRecord | null;
}) => executeGraphql<{
  updateStoppedAgentRunSelection: {
    success: boolean;
    outcome: string;
    message: string;
    isActive: boolean;
    editability: { editable: boolean; reason: string | null };
    canonicalSelection: { llmModelIdentifier: string; llmConfig: JsonRecord | null } | null;
    fieldErrors: Array<{ path: string; message: string }>;
  };
}>(serverUrl, `
  mutation UpdateStoppedAgent($input: UpdateStoppedAgentRunSelectionInput!) {
    updateStoppedAgentRunSelection(input: $input) {
      success outcome message isActive
      editability { editable reason }
      canonicalSelection { llmModelIdentifier llmConfig }
      fieldErrors { path message }
    }
  }
`, { input: { runtimeKind: "autobyteus", ...input } }).then((result) => result.updateStoppedAgentRunSelection);

const updateTeam = (serverUrl: string, input: {
  teamRunId: string;
  selectionPatches: Array<{
    scopeKind: "CONFIGURED_TEAM" | "CONFIGURED_AGENT";
    scopeAddress: string;
    runtimeKind: string;
    llmModelIdentifier: string;
    llmConfig: JsonRecord | null;
  }>;
}) => executeGraphql<{
  updateStoppedTeamRunSelections: {
    success: boolean;
    outcome: string;
    message: string;
    isActive: boolean;
    editability: { editable: boolean; reason: string | null };
    canonicalExecutionTree: JsonRecord | null;
    fieldErrors: Array<{ path: string; message: string }>;
  };
}>(serverUrl, `
  mutation UpdateStoppedTeam($input: UpdateStoppedTeamRunSelectionsInput!) {
    updateStoppedTeamRunSelections(input: $input) {
      success outcome message isActive
      editability { editable reason }
      canonicalExecutionTree
      fieldErrors { path message }
    }
  }
`, { input }).then((result) => result.updateStoppedTeamRunSelections);

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
        autoExecuteTools runtimeKind
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
  if (targets.has(clone.rootTeam.address)) delete clone.rootTeam.defaultLaunchConfiguration.llmConfig;
  for (const member of clone.rootTeam.members as JsonRecord[]) {
    if (targets.has(member.address)) delete member.launchConfiguration.llmConfig;
  }
  return clone;
};

const findPersistedScopeConfig = (tree: JsonRecord, address: string): JsonRecord | null => {
  if (tree.rootTeam.address === address) return tree.rootTeam.defaultLaunchConfiguration.llmConfig;
  return tree.rootTeam.members.find((member: JsonRecord) => member.address === address)
    ?.launchConfiguration.llmConfig ?? null;
};

const FAKE_RUNTIME_CLI = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/agent-runtimes-fake-cli.mjs",
);
const CLAUDE_SDK = "claude_agent_sdk";

/**
 * A scripted Claude Code CLI (`agent-runtimes-fake-cli.mjs` linked as `claude`) whose offered models the test changes
 * while the server runs: the `claude-models` state file holds comma-separated model ids, `none` makes it offer no model.
 * `CLAUDE_CODE_EXECUTABLE_PATH` points the server's Claude Agent SDK runtime at it; no account or network is involved.
 */
const makeFakeClaude = (target: ReturnType<typeof makeTarget>) => {
  const stateDir = path.join(target.runtimeRoot, "fake-claude");
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const executable = path.join(stateDir, "claude");
  fs.symlinkSync(FAKE_RUNTIME_CLI, executable);
  return {
    environment: { CLAUDE_CODE_EXECUTABLE_PATH: executable, FAKE_RUNTIME_STATE_DIR: stateDir },
    offer: (models: string) => fs.writeFileSync(path.join(stateDir, "claude-models"), models),
  };
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
      llmModelIdentifier: model,
      llmConfig: UPDATED_CONFIG,
    })).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
      canonicalSelection: { llmModelIdentifier: model, llmConfig: INITIAL_CONFIG },
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
    // AC-004/007: the current contract requires both fields, even for settings-only Save.
    // Use raw HTTP so omission is exercised through GraphQL coercion and the resolver.
    for (const [input, expectedError] of [
      [{ agentRunId: runId, runtimeKind: "autobyteus", llmConfig: null }, "llmModelIdentifier"],
      [{ agentRunId: runId, runtimeKind: "autobyteus", llmModelIdentifier: model }, null],
    ] as const) {
      const response = await fetch(`${first.serverUrl}/graphql`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: `mutation RequiredAgentPair($input: UpdateStoppedAgentRunSelectionInput!) {
            updateStoppedAgentRunSelection(input: $input) { success outcome message }
          }`,
          variables: { input },
        }),
      });
      const payload = await response.json();
      // A missing nullable config is rejected as a failed result;
      // missing non-null model is rejected by GraphQL before reaching the owner.
      if (expectedError) expect(JSON.stringify(payload)).toContain(expectedError);
      else expect(payload.data.updateStoppedAgentRunSelection.success).toBe(false);
      expect(payload.data?.updateStoppedAgentRunSelection?.success ?? false).toBe(false);
      expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedFile);
    }
    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmModelIdentifier: "api-e2e-unavailable-model",
      llmConfig: null,
    })).resolves.toMatchObject({
      success: false,
      outcome: "MODEL_UNAVAILABLE",
      canonicalSelection: { llmModelIdentifier: model, llmConfig: INITIAL_CONFIG },
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedFile);
    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmModelIdentifier: model,
      llmConfig: INITIAL_CONFIG,
    })).resolves.toMatchObject({
      success: true,
      outcome: "UNCHANGED",
      canonicalSelection: { llmModelIdentifier: model, llmConfig: INITIAL_CONFIG },
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedFile);

    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmModelIdentifier: model,
      llmConfig: { reasoning_effort: "not-a-level" },
    })).resolves.toMatchObject({
      success: false,
      outcome: "VALIDATION_FAILED",
      fieldErrors: [{ path: "llmConfig.reasoning_effort" }],
      canonicalSelection: { llmModelIdentifier: model, llmConfig: INITIAL_CONFIG },
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedFile);

    const beforeUpdate = readJson(metadataPath);
    await expect(updateAgent(first.serverUrl, {
      agentRunId: runId,
      llmModelIdentifier: model,
      llmConfig: UPDATED_CONFIG,
    })).resolves.toMatchObject({
      success: true,
      outcome: "UPDATED",
      isActive: false,
      canonicalSelection: { llmModelIdentifier: model, llmConfig: UPDATED_CONFIG },
      editability: { editable: true, reason: null },
    });
    const afterUpdate = readJson(metadataPath);
    expect(afterUpdate.llmConfig).toEqual(UPDATED_CONFIG);
    expect(withoutAgentLlmConfig(afterUpdate)).toEqual(withoutAgentLlmConfig(beforeUpdate));

    const schema = await executeGraphql<{
      agentInput: { inputFields: Array<{ name: string }> };
      agentResult: { fields: Array<{ name: string }> };
      teamInput: { inputFields: Array<{ name: string }> };
      optionResult: { fields: Array<{ name: string }> };
      optionRow: { fields: Array<{ name: string }> };
      exactCurrentResult: { fields: Array<{ name: string }> };
    }>(first.serverUrl, `
      query StoppedConfigSchema {
        agentInput: __type(name: "UpdateStoppedAgentRunSelectionInput") {
          inputFields { name }
        }
        agentResult: __type(name: "UpdateStoppedAgentRunSelectionResult") {
          fields { name }
        }
        teamInput: __type(name: "UpdateStoppedTeamRunSelectionsInput") {
          inputFields { name }
        }
        optionResult: __type(name: "RunModelOptionsObject") {
          fields { name }
        }
        optionRow: __type(name: "RunModelOptionObject") {
          fields { name }
        }
        exactCurrentResult: __type(name: "RuntimeCurrentModelDescriptorObject") {
          fields { name }
        }
      }
    `);
    expect(schema.agentInput.inputFields.map(({ name }) => name).sort()).toEqual([
      "agentRunId",
      "llmConfig",
      "llmModelIdentifier",
      "runtimeKind",
    ]);
    expect(schema.teamInput.inputFields.map(({ name }) => name).sort()).toEqual([
      "selectionPatches",
      "teamRunId",
    ]);
    expect(schema.agentResult.fields.map(({ name }) => name)).not.toContain("configurationRevision");
    expect(schema.optionResult.fields.map(({ name }) => name).sort()).toEqual([
      "currentModel",
      "currentModelIdentifier",
      "modelListReadable",
      "replacements",
      "unavailableReason",
    ]);
    expect(schema.optionRow.fields.map(({ name }) => name).sort()).toEqual([
      "canonicalName", "configSchema", "description", "displayName", "llmModelIdentifier",
      "providerName", "recommended",
    ]);
    expect(schema.exactCurrentResult.fields.map(({ name }) => name).sort()).toEqual(["identifier", "model"]);

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
    const rootTeamId = await createTeamDefinition(first.serverUrl, {
      name: `${label}-root`,
      coordinatorMemberName: "coordinator",
      nodes: [
        { memberName: "coordinator", ref: coordinatorId, refScope: "SHARED" },
        { memberName: "lead", ref: leadId, refScope: "SHARED" },
        { memberName: "reviewer", ref: reviewerId, refScope: "SHARED" },
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
        ],
        memberConfigs: [
          { memberAddress: "/coordinator", agentDefinitionId: coordinatorId, ...launch },
          { memberAddress: "/lead", agentDefinitionId: leadId, ...launch },
          { memberAddress: "/reviewer", agentDefinitionId: reviewerId, ...launch },
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
      { scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: "/", runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: UPDATED_CONFIG },
      { scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/coordinator", runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: UPDATED_CONFIG },
      {
        scopeKind: "CONFIGURED_AGENT" as const,
        scopeAddress: "/reviewer", runtimeKind: "autobyteus", llmModelIdentifier: model,
        llmConfig: UPDATED_CONFIG,
      },
    ];

    await expect(updateTeam(first.serverUrl, { teamRunId, selectionPatches: patches })).resolves.toMatchObject({
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
    // AC-004/007 applies to each configured patch, not only standalone commands.
    for (const patch of [
      { scopeKind: "CONFIGURED_AGENT", scopeAddress: "/reviewer", runtimeKind: "autobyteus", llmConfig: null },
      { scopeKind: "CONFIGURED_AGENT", scopeAddress: "/reviewer", runtimeKind: "autobyteus", llmModelIdentifier: model },
    ]) {
      const response = await fetch(`${first.serverUrl}/graphql`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: `mutation RequiredTeamPair($input: UpdateStoppedTeamRunSelectionsInput!) {
            updateStoppedTeamRunSelections(input: $input) { success outcome }
          }`,
          variables: { input: { teamRunId, selectionPatches: [patch] } },
        }),
      });
      const payload = await response.json();
      if (!Object.hasOwn(patch, "llmModelIdentifier")) {
        expect(JSON.stringify(payload.errors)).toContain("llmModelIdentifier");
      } else {
        expect(payload.data.updateStoppedTeamRunSelections.success).toBe(false);
      }
      expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedFile);
    }
    await expect(updateTeam(first.serverUrl, {
      teamRunId,
      selectionPatches: [{ scopeKind: "CONFIGURED_TEAM", scopeAddress: "/", runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: INITIAL_CONFIG }],
    })).resolves.toMatchObject({ success: true, outcome: "UNCHANGED" });
    expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedFile);

    await expect(updateTeam(first.serverUrl, {
      teamRunId,
      selectionPatches: [{
        scopeKind: "CONFIGURED_AGENT",
        scopeAddress: "/reviewer", runtimeKind: "autobyteus", llmModelIdentifier: model,
        llmConfig: { reasoning_effort: "not-a-level" },
      }],
    })).resolves.toMatchObject({
      success: false,
      outcome: "VALIDATION_FAILED",
      fieldErrors: [{ path: "selectionPatches[/reviewer].llmConfig.reasoning_effort" }],
    });
    expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedFile);

    const beforeUpdate = readJson(treePath);
    expect(beforeUpdate.rootTeam.members.map((member: JsonRecord) => member.address)).toEqual([
      "/coordinator", "/lead", "/reviewer",
    ]);
    expect(beforeUpdate.rootTeam.members.every((member: JsonRecord) =>
      typeof member.agentRunId === "string" && !Array.isArray(member.members))).toBe(true);
    // A valid first patch must not commit when another configured scope is invalid.
    for (const invalidScope of [
      { scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/missing" },
      { scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: "/coordinator" },
    ]) {
      await expect(updateTeam(first.serverUrl, {
        teamRunId,
        selectionPatches: [patches[0]!, { ...invalidScope, runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: UPDATED_CONFIG }],
      })).resolves.toMatchObject({ success: false });
      expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedFile);
    }
    await expect(updateTeam(first.serverUrl, { teamRunId, selectionPatches: patches })).resolves.toMatchObject({
      success: true,
      outcome: "UPDATED",
      isActive: false,
      editability: { editable: true, reason: null },
    });
    const afterUpdate = readJson(treePath);
    expect(findPersistedScopeConfig(afterUpdate, "/")).toEqual(UPDATED_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/coordinator")).toEqual(UPDATED_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/reviewer")).toEqual(UPDATED_CONFIG);
    expect(findPersistedScopeConfig(afterUpdate, "/lead")).toEqual(INITIAL_CONFIG);
    expect(withoutSelectedTeamLlmConfigs(afterUpdate, [
      "/",
      "/coordinator",
      "/reviewer",
    ])).toEqual(withoutSelectedTeamLlmConfigs(beforeUpdate, [
      "/",
      "/coordinator",
      "/reviewer",
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

  // MSR-001 (autobyteus-9, AC-012, AC-013): the model list of the runtime a stopped run is saved onto is read fresh on every
  // Save. The scripted Claude CLI starts offering a model while the server runs, then offers none (an unreadable list), and
  // the run is saved back onto its first runtime (a runtime switch there and back, TESTING.md Rule 10).
  it("MSR-001: a stopped agent and a stopped Team member saved onto the Claude Agent SDK runtime follow the CLI's current model list", async () => {
    const target = makeTarget("stopped-claude-offered-models");
    const claude = makeFakeClaude(target);
    const server = await startServer(target, claude.environment);
    const NEW_MODEL = "claude-new-model";
    const notOffered = (model: string, scope = "") =>
      `'${model}' is not offered by Claude Agent SDK now${scope}. Refresh the model list and choose again. Saved settings were not changed.`;
    // A diagnostic follows "could not be read" only where the runtime has its own (Antigravity, Grok Build, DeepSeek Harness).
    const unreadable = "The model list of Claude Agent SDK could not be read. Try again. Saved settings were not changed.";
    const model = await autoByteusReasoningModel(server.serverUrl);
    const workspaceRootPath = path.join(target.runtimeRoot, "workspaces", "msr");
    fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });

    // The stopped standalone agent.
    const definitionId = await createAgentDefinition(server.serverUrl, `msr-agent-${Date.now()}`);
    const created = await executeGraphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      server.serverUrl, `
      mutation CreateMsrAgentRun($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }
    `, { input: { agentDefinitionId: definitionId, workspaceRootPath, llmModelIdentifier: model, llmConfig: INITIAL_CONFIG,
      autoExecuteTools: false, runtimeKind: "autobyteus" } });
    if (!created.createAgentRun.success || !created.createAgentRun.runId) throw new Error(created.createAgentRun.message);
    const runId = created.createAgentRun.runId;
    const metadataPath = path.join(target.runtimeRoot, "memory", "agents", runId, "run_metadata.json");
    const snapshot = new WorkingContextFinalizer().finalize({
      messages: [new Message(MessageRole.SYSTEM, { content: "Owned API/E2E snapshot" })],
    });
    fs.writeFileSync(
      path.join(path.dirname(metadataPath), "working_context_snapshot.json"),
      JSON.stringify(WorkingContextSnapshotSerializer.serialize(snapshot, { agent_id: runId })),
      "utf8",
    );
    await executeGraphql(server.serverUrl, `mutation($runId: String!) { terminateAgentRun(agentRunId: $runId) { success } }`, { runId });
    const stoppedAgentFile = fs.readFileSync(metadataPath, "utf8");
    const toClaude = (llmModelIdentifier: string) => ({ agentRunId: runId, runtimeKind: CLAUDE_SDK, llmModelIdentifier, llmConfig: null });

    // The CLI does not offer the model yet: a refusal that names it, says what to do and that nothing was saved.
    await expect(updateAgent(server.serverUrl, toClaude(NEW_MODEL))).resolves.toMatchObject({
      success: false, outcome: "MODEL_UNAVAILABLE", message: notOffered(NEW_MODEL),
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(stoppedAgentFile);
    // The CLI starts offering it while the server runs: the next Save finds it and records the choice.
    claude.offer(`claude-fake-sonnet,${NEW_MODEL}`);
    const saved = await updateAgent(server.serverUrl, toClaude(NEW_MODEL));
    expect(saved).toMatchObject({ success: true, outcome: "UPDATED" });
    const switched = fs.readFileSync(metadataPath, "utf8");
    expect(switched).not.toBe(stoppedAgentFile);
    expect(JSON.stringify(readJson(metadataPath))).toContain(NEW_MODEL);
    // The CLI offers nothing (it failed or is signed out): an unreadable list, not "the model is not offered".
    claude.offer("none");
    await expect(updateAgent(server.serverUrl, toClaude(NEW_MODEL))).resolves.toMatchObject({
      success: false, outcome: "MODEL_LIST_UNAVAILABLE", message: unreadable,
    });
    expect(fs.readFileSync(metadataPath, "utf8")).toBe(switched);
    // Back to the first runtime: the run is saved on it again.
    await expect(updateAgent(server.serverUrl, {
      agentRunId: runId, runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: INITIAL_CONFIG,
    })).resolves.toMatchObject({ success: true, outcome: "UPDATED", canonicalSelection: { llmModelIdentifier: model, llmConfig: INITIAL_CONFIG } });
    expect(JSON.stringify(readJson(metadataPath))).not.toContain(NEW_MODEL);

    // A stopped Team run: one member saved onto the Claude Agent SDK runtime.
    claude.offer("claude-fake-sonnet");
    const label = `msr-team-${Date.now()}`;
    const leadId = await createAgentDefinition(server.serverUrl, `${label}-lead`);
    const reviewerId = await createAgentDefinition(server.serverUrl, `${label}-reviewer`);
    const teamDefinitionId = await createTeamDefinition(server.serverUrl, {
      name: `${label}-root`,
      coordinatorMemberName: "lead",
      nodes: [
        { memberName: "lead", ref: leadId, refScope: "SHARED" },
        { memberName: "reviewer", ref: reviewerId, refScope: "SHARED" },
      ],
    });
    const launch = { runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: INITIAL_CONFIG, autoExecuteTools: false, workspaceRootPath };
    const team = await executeGraphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      server.serverUrl, `
      mutation CreateMsrTeamRun($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }
    `, { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...launch }], memberConfigs: [
      { memberAddress: "/lead", agentDefinitionId: leadId, ...launch },
      { memberAddress: "/reviewer", agentDefinitionId: reviewerId, ...launch },
    ] } });
    if (!team.createAgentTeamRun.success || !team.createAgentTeamRun.teamRunId) throw new Error(team.createAgentTeamRun.message);
    const teamRunId = team.createAgentTeamRun.teamRunId;
    const treePath = path.join(target.runtimeRoot, "memory", "agent_teams", teamRunId, "team_run_execution_tree.json");
    await executeGraphql(server.serverUrl, `mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }`, { teamRunId });
    const stoppedTreeFile = fs.readFileSync(treePath, "utf8");
    const reviewerToClaude = (llmModelIdentifier: string) => ({
      teamRunId,
      selectionPatches: [{ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/reviewer", runtimeKind: CLAUDE_SDK, llmModelIdentifier, llmConfig: null }],
    });
    const teamRefusal = await updateTeam(server.serverUrl, reviewerToClaude(NEW_MODEL));
    expect(teamRefusal).toMatchObject({ success: false, outcome: "MODEL_UNAVAILABLE" });
    expect(teamRefusal.message).toBe(notOffered(NEW_MODEL, " (for '/reviewer')"));
    expect(fs.readFileSync(treePath, "utf8")).toBe(stoppedTreeFile);
    claude.offer(`claude-fake-sonnet,${NEW_MODEL}`);
    await expect(updateTeam(server.serverUrl, reviewerToClaude(NEW_MODEL))).resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    const switchedTree = fs.readFileSync(treePath, "utf8");
    expect(switchedTree).not.toBe(stoppedTreeFile);
    expect(JSON.stringify(readJson(treePath))).toContain(NEW_MODEL);
    claude.offer("none");
    const teamUnreadable = await updateTeam(server.serverUrl, reviewerToClaude(NEW_MODEL));
    expect(teamUnreadable).toMatchObject({ success: false, outcome: "MODEL_LIST_UNAVAILABLE" });
    expect(teamUnreadable.message).toBe(unreadable);
    expect(fs.readFileSync(treePath, "utf8")).toBe(switchedTree);
    await expect(updateTeam(server.serverUrl, {
      teamRunId,
      selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/reviewer", runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig: INITIAL_CONFIG }],
    })).resolves.toMatchObject({ success: true });
    expect(JSON.stringify(readJson(treePath))).not.toContain(NEW_MODEL);
  }, 180_000);

  // MSR-002 (autobyteus-9, AC-008): a new run stores the settings its model declares and nothing else, so no undeclared key
  // is stored or reaches a provider later; a launch that carries only undeclared keys still starts and stores none.
  it("MSR-002: a new agent run and a new Team run store only the settings the model declares", async () => {
    const target = makeTarget("new-run-declared-settings");
    const server = await startServer(target);
    const model = await autoByteusReasoningModel(server.serverUrl);
    const workspaceRootPath = path.join(target.runtimeRoot, "workspaces", "declared");
    fs.mkdirSync(workspaceRootPath, { recursive: true, mode: 0o700 });
    const submitted = { ...INITIAL_CONFIG, thinking_enabled: false, thinking_display: "omitted", extra_params: { reasoning_effort: "high", top_k: 5 } };
    const launch = (llmConfig: JsonRecord | null) => ({ runtimeKind: "autobyteus", llmModelIdentifier: model, llmConfig, autoExecuteTools: false, workspaceRootPath });

    const agentDefinitionId = await createAgentDefinition(server.serverUrl, `msr-declared-agent-${Date.now()}`);
    const createAgent = async (llmConfig: JsonRecord | null) => {
      const created = await executeGraphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(server.serverUrl, `
        mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }
      `, { input: { agentDefinitionId, ...launch(llmConfig) } });
      if (!created.createAgentRun.success || !created.createAgentRun.runId) throw new Error(created.createAgentRun.message);
      return created.createAgentRun.runId;
    };
    // The top-level value of a declared key wins over the same key inside the extra_params container; undeclared keys are dropped.
    const kept = await agentResume(server.serverUrl, await createAgent(submitted));
    expect(kept.metadataConfig.llmConfig).toEqual(INITIAL_CONFIG);
    // Only undeclared keys: the launch succeeds and stores nothing.
    const none = await agentResume(server.serverUrl, await createAgent({ thinking_enabled: false, thinking_display: "omitted", top_k: 5 }));
    expect(none.metadataConfig.llmConfig).toBeNull();

    const leadId = await createAgentDefinition(server.serverUrl, `msr-declared-lead-${Date.now()}`);
    const helperId = await createAgentDefinition(server.serverUrl, `msr-declared-helper-${Date.now()}`);
    const teamDefinitionId = await createTeamDefinition(server.serverUrl, {
      name: `msr-declared-team-${Date.now()}`, coordinatorMemberName: "lead",
      nodes: [{ memberName: "lead", ref: leadId, refScope: "SHARED" }, { memberName: "helper", ref: helperId, refScope: "SHARED" }],
    });
    const team = await executeGraphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(server.serverUrl, `
      mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }
    `, { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...launch(submitted) }], memberConfigs: [
      { memberAddress: "/lead", agentDefinitionId: leadId, ...launch(submitted) },
      { memberAddress: "/helper", agentDefinitionId: helperId, ...launch({ thinking_display: "omitted" }) },
    ] } });
    if (!team.createAgentTeamRun.success || !team.createAgentTeamRun.teamRunId) throw new Error(team.createAgentTeamRun.message);
    const treePath = path.join(target.runtimeRoot, "memory", "agent_teams", team.createAgentTeamRun.teamRunId, "team_run_execution_tree.json");
    const tree = readJson(treePath);
    expect(findPersistedScopeConfig(tree, "/")).toEqual(INITIAL_CONFIG);
    expect(findPersistedScopeConfig(tree, "/lead")).toEqual(INITIAL_CONFIG);
    expect(findPersistedScopeConfig(tree, "/helper")).toBeNull();
    expect(JSON.stringify(tree)).not.toMatch(/thinking_display|thinking_enabled|top_k/);
  }, 180_000);
});
