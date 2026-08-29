import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import type {
  MixedTeamRunBackendFactory,
  MixedTeamRunCallbacks,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import type { ChannelBinding } from "../../../src/external-channel/domain/models.js";
import { ChannelBindingRunLauncher } from "../../../src/external-channel/runtime/channel-binding-run-launcher.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import type { RunModelConfigValidator } from "../../../src/llm-management/services/model-config-validation-service.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const tempDirs: string[] = [];
const createMemoryDir = async (): Promise<string> => {
  const value = await fs.mkdtemp(path.join(os.tmpdir(), "agent-team-run-manager-current-"));
  tempDirs.push(value);
  return value;
};

const modelConfigValidator = Object.freeze({
  validate: vi.fn(async ({ llmConfig }: { llmConfig: Record<string, unknown> | null }) => ({
    kind: "valid" as const,
    config: llmConfig,
  })),
});

const initializeTaskIdentityAllocator = (memoryDir: string): AgentRunIdentityAllocator =>
  AgentRunIdentityAllocator.getInstance({
    memoryDir,
    agentDefinitionService: {
      getAgentDefinitionById: async (id: string) => ({ id, name: id }) as never,
    },
    agentRunManager: { hasActiveRun: () => false },
    agentRunMetadataService: { readMetadata: async () => null },
    teamRunExecutionTreeLocationService: { containsRunId: async () => false },
    createToken: () => "00000000000000000000000000000000",
  });

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const createConfig = (runtimeKinds: readonly RuntimeKind[]) => {
  const children = runtimeKinds.map((runtimeKind, index) => testAgentNode(
    index === 0 ? "/Coordinator" : `/Member${index}`,
    {
      agentRunId: index === 0 ? "run-coordinator" : `run-member-${index}`,
      runtimeKind,
    },
  ));
  return testTeamRunConfig({
    rootTeamRunId: "team-runtime-root",
    rootTeamDefinitionId: "team-def-mixed-only",
    coordinatorAddress: "/Coordinator",
    children,
  });
};

const createFactory = (input: {
  active?: boolean;
  terminateResult?: { accepted: boolean; code?: string; message?: string };
  beforeBackendReturn?: (callbacks: MixedTeamRunCallbacks) => Promise<void>;
} = {}) => {
  const state = { active: input.active ?? true };
  const callbacks: MixedTeamRunCallbacks[] = [];
  const backends: Array<Record<string, unknown>> = [];
  const buildBackend = async (
    config: ReturnType<typeof createConfig>,
    teamRunId: string,
    callback: MixedTeamRunCallbacks,
    configuredMemberActivationMode: "fresh" | "restore",
  ) => {
    callbacks.push(callback);
    const runtimeContext = new MixedTeamRunContext({
      memberContexts: config.rootTeam.children
        .filter((node) => node.kind === "agent")
        .map((node) => new MixedAgentMemberContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: node.platformAgentRunId,
        })),
      configuredMemberActivationMode,
    });
    const context = new TeamRunContext({
      physicalScope: createRootTeamRunPhysicalScope(teamRunId),
      teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: config.rootTeam,
      handoffs: config.handoffs,
      applicationBinding: config.applicationBinding,
      runtimeContext,
    });
    const backend = {
      teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      getTeamRunContext: () => context,
      getRuntimeContext: () => runtimeContext,
      isActive: () => state.active,
      isTerminated: () => !state.active,
      getLeafAgentStatusSnapshots: () => [],
      hasOpenExecutionWork: () => false,
      terminate: vi.fn(async () => {
        const result = input.terminateResult ?? { accepted: true };
        if (result.accepted) state.active = false;
        return result;
      }),
      freezeForRootTermination: () => ({
        interruptActiveTurns: vi.fn(async () => ({ accepted: true })),
        prepareMemberRuns: vi.fn(async () => undefined),
        finish: vi.fn(async () => backend.terminate()),
      }),
    };
    backends.push(backend);
    await input.beforeBackendReturn?.(callback);
    return backend;
  };
  const createBackend = vi.fn((config, teamRunId, callback) =>
    buildBackend(config, teamRunId, callback, "fresh"));
  const restoreBackend = vi.fn((config, teamRunId, callback) =>
    buildBackend(config, teamRunId, callback, "restore"));
  return {
    factory: { createBackend, restoreBackend } as unknown as MixedTeamRunBackendFactory,
    createBackend,
    restoreBackend,
    callbacks,
    backends,
    state,
  };
};

const createTeamBinding = (teamRunId: string): ChannelBinding => ({
  id: `binding-${teamRunId}`,
  provider: "WHATSAPP" as any,
  transport: "BUSINESS_API" as any,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "TEAM",
  agentDefinitionId: null,
  launchPreset: null,
  agentRunId: null,
  teamDefinitionId: "team-def-mixed-only",
  teamLaunchPreset: {
    workspaceRootPath: "/tmp/external-team-workspace",
    llmModelIdentifier: "unused-fallback-model",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  teamRunId,
  targetMemberRouteKey: "Coordinator",
  allowTransportFallback: false,
  createdAt: new Date("2026-08-25T00:00:00.000Z"),
  updatedAt: new Date("2026-08-25T00:00:00.000Z"),
});

const exactChannelLauncher = (
  manager: AgentTeamRunManager,
  memoryDir: string,
): { launcher: ChannelBindingRunLauncher; teamRunService: TeamRunService } => {
  const teamRunService = new TeamRunService({
    agentTeamRunManager: manager,
    memoryDir,
    memoryLocationService: new AgentMemoryLocationService({
      memoryDir,
      locationService: new TeamRunExecutionTreeLocationService({ memoryDir, manager }),
    }),
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: vi.fn(async () => "run-unused-by-stopped-config"),
    },
    teamRunHistoryCatalogService: {
      recordTeamRunRestored: vi.fn(async () => undefined),
    } as never,
    tokenUsageReadiness: {
      assertCurrentSchemaReady: vi.fn(),
      assertExistingRunRestoreReady: vi.fn(),
    },
  });
  const launcher = new ChannelBindingRunLauncher({
    bindingService: {
      upsertBindingAgentRunId: vi.fn(),
      upsertBindingTeamRunId: vi.fn(async () => undefined),
    } as never,
    agentRunService: {} as never,
    teamRunService,
  });
  return { launcher, teamRunService };
};

describe("AgentTeamRunManager strict current V2 package integration", () => {
  it.each([
    [[RuntimeKind.AUTOBYTEUS]],
    [[RuntimeKind.CODEX_APP_SERVER]],
    [[RuntimeKind.CLAUDE_AGENT_SDK]],
    [[RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]],
  ] as const)("creates exactly one admitted root and the three-file current package for %j", async (runtimeKinds) => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig(runtimeKinds);
    const factory = createFactory();
    const manager = new AgentTeamRunManager({ memoryDir, mixedTeamRunBackendFactory: factory.factory, taskExecutionIdentity, modelConfigValidator });

    const run = await manager.createTeamRun({ config, teamDefinitionName: "Runtime Team" });

    expect(run.teamRunId).toBe("team-runtime-root");
    const checkpoint = run.getExecutionCheckpoint();
    expect(checkpoint).toEqual({
      rootTeamRunId: "team-runtime-root",
      changeSequence: 0,
      hasOpenExecutionWork: false,
    });
    expect(Object.isFrozen(checkpoint)).toBe(true);
    expect(manager.getActiveTeamRun(run.teamRunId)).toBe(run);
    expect(manager.listActiveTeamRunIds()).toEqual([run.teamRunId]);
    expect(factory.createBackend).toHaveBeenCalledWith(
      expect.objectContaining({ rootTeam: config.rootTeam }),
      "team-runtime-root",
      expect.objectContaining({
        taskRootResolver: expect.objectContaining({ resolveActiveRoot: expect.any(Function) }),
        publish: expect.any(Function),
        deliverInterAgentMessage: expect.any(Function),
      }),
    );
    const rootDir = new AgentMemoryLayout(memoryDir).getTeamDirPath({
      rootTeamRunId: run.teamRunId,
      ancestorTeamRunIds: [],
    });
    await expect(fs.readdir(rootDir)).resolves.toEqual(expect.arrayContaining([
      "team_run_execution_tree.json",
      "task_delegation_records.json",
      "team_communication_messages.json",
    ]));
    const entries = (await fs.readdir(rootDir)).filter((name) => name.endsWith(".json"));
    expect(entries.sort()).toEqual([
      "task_delegation_records.json",
      "team_communication_messages.json",
      "team_run_execution_tree.json",
    ]);
    const tree = JSON.parse(await fs.readFile(path.join(rootDir, "team_run_execution_tree.json"), "utf8"));
    expect(tree).toMatchObject({
      schemaVersion: 2,
      rootTeam: {
        address: "/",
        teamRunId: run.teamRunId,
        coordinatorAddress: "/Coordinator",
        defaultLaunchConfiguration: config.rootTeam.defaultLaunchConfiguration,
      },
    });
    for (const member of tree.rootTeam.members) {
      if ("agentRunId" in member && member.launchConfiguration.runtimeKind === RuntimeKind.AUTOBYTEUS) {
        expect(member.platformAgentRunId).toBeNull();
      }
    }
    await expect(manager.createTeamRun({ config, teamDefinitionName: "Duplicate" })).rejects.toThrow(
      "already managed",
    );
  });

  it("binds one exact root resolver after construction and rejects before bind and after close", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.AUTOBYTEUS]);
    const beforeBackendReturn = vi.fn(async (callbacks: MixedTeamRunCallbacks) => {
      await expect(callbacks.taskRootResolver.resolveActiveRoot()).rejects.toMatchObject({
        code: "TEAM_ROOT_NOT_BOUND",
      });
    });
    const factory = createFactory({ beforeBackendReturn });
    const manager = new AgentTeamRunManager({ memoryDir, mixedTeamRunBackendFactory: factory.factory, taskExecutionIdentity, modelConfigValidator });

    const root = await manager.createTeamRun({ config, teamDefinitionName: "Resolver Team" });
    const resolver = factory.callbacks[0]!.taskRootResolver;
    await expect(resolver.resolveActiveRoot()).resolves.toBe(root);
    await expect(manager.terminateTeamRun(root.teamRunId)).resolves.toBe(true);
    await expect(resolver.resolveActiveRoot()).rejects.toMatchObject({
      code: "TEAM_RUN_NOT_ACTIVE",
    });
    expect(beforeBackendReturn).toHaveBeenCalledOnce();
  });

  it("restores the strict three-file package and rebuilds runtime context from current tree identity", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]);
    const initialFactory = createFactory();
    const initial = new AgentTeamRunManager({ memoryDir, mixedTeamRunBackendFactory: initialFactory.factory, taskExecutionIdentity, modelConfigValidator });
    await initial.createTeamRun({ config, teamDefinitionName: "Restorable Team" });
    initialFactory.state.active = false;
    expect(initial.getActiveTeamRun(config.rootTeam.teamRunId)).toBeNull();
    expect(initial.getManagedTeamRun(config.rootTeam.teamRunId)).not.toBeNull();

    const restoredFactory = createFactory();
    const restoredManager = new AgentTeamRunManager({ memoryDir, mixedTeamRunBackendFactory: restoredFactory.factory, taskExecutionIdentity, modelConfigValidator });
    const restored = await restoredManager.restoreTeamRun(config.rootTeam.teamRunId);

    expect(restored.getExecutionTreeSnapshot()).toMatchObject({
      schemaVersion: 2,
      rootTeam: {
        address: "/",
        teamRunId: config.rootTeam.teamRunId,
        defaultLaunchConfiguration: config.rootTeam.defaultLaunchConfiguration,
      },
    });
    expect(restored.getTaskRecordsSnapshot()).toEqual({
      schemaVersion: 1,
      rootTeamRunId: config.rootTeam.teamRunId,
      records: [],
    });
    expect(restored.getCommunicationSnapshot()).toEqual({
      schemaVersion: 1,
      rootTeamRunId: config.rootTeam.teamRunId,
      messages: [],
    });
    expect(restoredFactory.createBackend).not.toHaveBeenCalled();
    expect(restoredFactory.restoreBackend).toHaveBeenCalledWith(
      expect.objectContaining({ rootTeam: expect.objectContaining({ teamRunId: config.rootTeam.teamRunId }) }),
      config.rootTeam.teamRunId,
      expect.any(Object),
    );
    const restoredRuntime = (restoredFactory.backends[0]?.getRuntimeContext as (() => MixedTeamRunContext))();
    expect(restoredRuntime.configuredMemberActivationMode).toBe("restore");
  });

  it("emits root lifecycle transitions and unregisters only after accepted termination", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.AUTOBYTEUS]);
    const factory = createFactory();
    const manager = new AgentTeamRunManager({ memoryDir, mixedTeamRunBackendFactory: factory.factory, taskExecutionIdentity, modelConfigValidator });
    const snapshots: Array<{ teamRunId: string; isActive: boolean }> = [];
    manager.subscribeToLifecycle(config.rootTeam.teamRunId, (snapshot) => snapshots.push(snapshot));

    await manager.createTeamRun({ config, teamDefinitionName: "Lifecycle Team" });
    await expect(manager.terminateTeamRun(config.rootTeam.teamRunId)).resolves.toBe(true);

    expect(snapshots).toEqual([
      { teamRunId: config.rootTeam.teamRunId, isActive: true },
      { teamRunId: config.rootTeam.teamRunId, isActive: false },
    ]);
    expect(manager.getManagedTeamRun(config.rootTeam.teamRunId)).toBeNull();
    await expect(manager.terminateTeamRun(config.rootTeam.teamRunId)).resolves.toBe(false);
  });

  it("holds one exact-ID transition lane across unmanaged deletion and restore registration", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.AUTOBYTEUS]);
    const factory = createFactory();
    const manager = new AgentTeamRunManager({ memoryDir, mixedTeamRunBackendFactory: factory.factory, taskExecutionIdentity, modelConfigValidator });
    await manager.createTeamRun({ config, teamDefinitionName: "Lane Team" });
    await expect(manager.terminateTeamRun(config.rootTeam.teamRunId)).resolves.toBe(true);
    // The fake factory shares lifecycle state across backends; a restored backend is a fresh active owner.
    factory.state.active = true;

    let releaseDeletion!: () => void;
    const deletionBarrier = new Promise<void>((resolve) => { releaseDeletion = resolve; });
    const deletion = manager.withUnmanagedHistoryDeletion(config.rootTeam.teamRunId, async () => {
      await deletionBarrier;
      return "deleted";
    });
    let restoreSettled = false;
    const restore = manager.restoreTeamRun(config.rootTeam.teamRunId).then((root) => {
      restoreSettled = true;
      return root;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(restoreSettled).toBe(false);

    releaseDeletion();
    await expect(deletion).resolves.toEqual({ kind: "completed", value: "deleted" });
    await expect(restore).resolves.toMatchObject({ teamRunId: config.rootTeam.teamRunId });
    await expect(manager.withUnmanagedHistoryDeletion(config.rootTeam.teamRunId, async () => "unexpected"))
      .resolves.toEqual({ kind: "managed" });
  });

  it("rejects active updates, then persists a stopped narrow patch for the next restore", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER]);
    const factory = createFactory();
    const validate: RunModelConfigValidator["validate"] = vi.fn(async ({ llmConfig }) => ({
      kind: "valid" as const,
      config: llmConfig,
    }));
    const manager = new AgentTeamRunManager({
      memoryDir,
      mixedTeamRunBackendFactory: factory.factory,
      taskExecutionIdentity,
      modelConfigValidator: { validate },
    });
    const root = await manager.createTeamRun({ config, teamDefinitionName: "Editable Team" });
    const initialTree = root.getExecutionTreeSnapshot();
    const patch = [{
      scopeKind: "CONFIGURED_TEAM" as const,
      scopeAddress: "/",
      llmConfig: { reasoning_effort: "high", service_tier: "priority" },
    }];

    await expect(manager.updateStoppedModelConfigs({
      teamRunId: root.teamRunId,
      patches: patch,
    })).resolves.toMatchObject({ outcome: "RUN_ACTIVE", success: false });
    expect(validate).not.toHaveBeenCalled();

    await expect(manager.terminateTeamRun(root.teamRunId)).resolves.toBe(true);
    const updated = await manager.updateStoppedModelConfigs({
      teamRunId: root.teamRunId,
      patches: patch,
    });
    expect(updated).toMatchObject({
      outcome: "UPDATED",
      success: true,
      isActive: false,
      canonical: {
        rootTeam: {
          teamRunId: root.teamRunId,
          defaultLaunchConfiguration: {
            llmConfig: { reasoning_effort: "high", service_tier: "priority" },
          },
        },
      },
    });
    expect(updated.canonical?.rootTeam.members[0]).toMatchObject({
      launchConfiguration: initialTree.rootTeam.members[0] && "launchConfiguration" in initialTree.rootTeam.members[0]
        ? { llmConfig: initialTree.rootTeam.members[0].launchConfiguration.llmConfig }
        : undefined,
    });
    expect(validate).toHaveBeenCalledWith(expect.objectContaining({
      runtimeKind: initialTree.rootTeam.defaultLaunchConfiguration.runtimeKind,
      llmModelIdentifier: initialTree.rootTeam.defaultLaunchConfiguration.llmModelIdentifier,
      llmConfig: patch[0].llmConfig,
    }));

    factory.state.active = true;
    const restored = await manager.restoreTeamRun(root.teamRunId);
    expect(restored.teamRunId).toBe(root.teamRunId);
    expect(factory.restoreBackend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rootTeam: expect.objectContaining({
          defaultLaunchConfiguration: expect.objectContaining({ llmConfig: patch[0].llmConfig }),
        }),
      }),
      root.teamRunId,
      expect.any(Object),
    );
  });

  it("orders the exact external-channel Team resolver after Save and restores committed config", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER]);
    const factory = createFactory();
    let releaseValidation!: () => void;
    const validationBarrier = new Promise<void>((resolve) => { releaseValidation = resolve; });
    const validate: RunModelConfigValidator["validate"] = vi.fn(async ({ llmConfig }) => {
      await validationBarrier;
      return { kind: "valid" as const, config: llmConfig };
    });
    const manager = new AgentTeamRunManager({
      memoryDir,
      mixedTeamRunBackendFactory: factory.factory,
      taskExecutionIdentity,
      modelConfigValidator: { validate },
    });
    const root = await manager.createTeamRun({ config, teamDefinitionName: "External Save-First Team" });
    await expect(manager.terminateTeamRun(root.teamRunId)).resolves.toBe(true);
    factory.state.active = true;
    const { launcher, teamRunService } = exactChannelLauncher(manager, memoryDir);
    const patch = [{
      scopeKind: "CONFIGURED_TEAM" as const,
      scopeAddress: "/",
      llmConfig: { reasoning_effort: "high", service_tier: "priority" },
    }];

    const save = teamRunService.updateStoppedModelConfigs({
      teamRunId: root.teamRunId,
      patches: patch,
    });
    await vi.waitFor(() => expect(validate).toHaveBeenCalledOnce());
    const externalResolve = launcher.resolveOrStartTeamRun(createTeamBinding(root.teamRunId));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(factory.restoreBackend).not.toHaveBeenCalled();

    releaseValidation();
    await expect(save).resolves.toMatchObject({
      success: true,
      outcome: "UPDATED",
      canonical: {
        rootTeam: {
          defaultLaunchConfiguration: { llmConfig: patch[0].llmConfig },
        },
      },
    });
    await expect(externalResolve).resolves.toBe(root.teamRunId);
    expect(factory.restoreBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        rootTeam: expect.objectContaining({
          defaultLaunchConfiguration: expect.objectContaining({
            llmConfig: patch[0].llmConfig,
          }),
        }),
      }),
      root.teamRunId,
      expect.any(Object),
    );
  });

  it("returns RUN_ACTIVE when the exact external-channel Team resolver restores before Save", async () => {
    const memoryDir = await createMemoryDir();
    const taskExecutionIdentity = createTaskExecutionIdentityCapabilities(
      initializeTaskIdentityAllocator(memoryDir),
    );
    const config = createConfig([RuntimeKind.CODEX_APP_SERVER]);
    const factory = createFactory();
    const validate: RunModelConfigValidator["validate"] = vi.fn(async ({ llmConfig }) => ({
      kind: "valid" as const,
      config: llmConfig,
    }));
    const manager = new AgentTeamRunManager({
      memoryDir,
      mixedTeamRunBackendFactory: factory.factory,
      taskExecutionIdentity,
      modelConfigValidator: { validate },
    });
    const root = await manager.createTeamRun({ config, teamDefinitionName: "External Restore-First Team" });
    await expect(manager.terminateTeamRun(root.teamRunId)).resolves.toBe(true);
    factory.state.active = true;
    const { launcher, teamRunService } = exactChannelLauncher(manager, memoryDir);

    await expect(launcher.resolveOrStartTeamRun(createTeamBinding(root.teamRunId)))
      .resolves.toBe(root.teamRunId);
    await expect(teamRunService.updateStoppedModelConfigs({
      teamRunId: root.teamRunId,
      patches: [{
        scopeKind: "CONFIGURED_TEAM",
        scopeAddress: "/",
        llmConfig: { reasoning_effort: "high", service_tier: "priority" },
      }],
    })).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
    });
    expect(validate).not.toHaveBeenCalled();
  });
});
