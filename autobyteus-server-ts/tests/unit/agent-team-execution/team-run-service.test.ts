import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { configureTokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";

const rootDefinition = {
  name: "Support Team",
  coordinatorMemberName: "Coordinator",
  nodes: [
    { memberName: "Coordinator", refType: "agent", refScope: "shared", ref: "agent-def-1" },
    { memberName: "Reviewer", refType: "agent", refScope: "shared", ref: "agent-def-2" },
  ],
};

const launchConfig = (
  memberAddress: string,
  runtimeKind: RuntimeKind = RuntimeKind.AUTOBYTEUS,
  workspaceRootPath: string | null = null,
) => ({
  memberAddress,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind,
  workspaceRootPath,
  llmConfig: null,
});

const teamLaunchConfig = (
  runtimeKind: RuntimeKind = RuntimeKind.AUTOBYTEUS,
  workspaceRootPath: string | null = null,
) => ({
  teamAddress: "/",
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind,
  workspaceRootPath,
  llmConfig: null,
});

const createSubject = (
  activeRun: unknown = null,
  definitions: Map<string, unknown> = new Map([["team-def-1", rootDefinition]]),
  tokenUsageReadiness?: {
    assertCurrentSchemaReady(): void;
    assertExistingRunRestoreReady(): void;
  },
  managedRun: unknown = activeRun,
) => {
  const executionTree = { schemaVersion: 1, rootTeam: { teamRunId: "team-mixed-1" } };
  const agentTeamRunManager = {
    getActiveTeamRun: vi.fn().mockReturnValue(activeRun),
    getManagedTeamRun: vi.fn().mockReturnValue(managedRun),
    hasManagedTeamRun: vi.fn().mockReturnValue(Boolean(managedRun)),
    createTeamRun: vi.fn(async ({ config }) => ({
      teamRunId: config.rootTeam.teamRunId,
      config,
      getExecutionTreeSnapshot: vi.fn(() => executionTree),
    })),
    restoreTeamRun: vi.fn(),
    terminateTeamRun: vi.fn().mockResolvedValue(true),
    subscribeToLifecycle: vi.fn().mockReturnValue(vi.fn()),
  } as any;
  const teamRunHistoryCatalogService = {
    recordTeamRunCreated: vi.fn().mockResolvedValue(undefined),
    recordTeamRunSummary: vi.fn().mockResolvedValue(undefined),
    recordTeamRunRestored: vi.fn().mockResolvedValue(undefined),
    recordTeamRunTerminated: vi.fn().mockResolvedValue(undefined),
  } as any;
  const workspaceManager = {
    ensureWorkspaceByRootPath: vi.fn(async (rootPath: string) => ({ getBasePath: () => rootPath })),
  } as any;
  const teamDefinitionService = {
    getDefinitionById: vi.fn(async (id: string) => definitions.get(id) ?? null),
  } as any;
  let allocationCounter = 0;
  const agentRunIdentityAllocator = {
    allocateForAgentDefinition: vi.fn(async (agentDefinitionId: string) => {
      allocationCounter += 1;
      return `${agentDefinitionId}-run-${allocationCounter}`;
    }),
  };
  const teamRunIdentityAllocator = {
    allocateForTeamDefinitionName: vi.fn(() => "team-mixed-1"),
  };
  const service = new TeamRunService({
    agentTeamRunManager,
    teamDefinitionService,
    teamRunHistoryCatalogService,
    workspaceManager,
    memoryDir: "/tmp/team-run-service-current-test",
    agentRunIdentityAllocator,
    teamRunIdentityAllocator,
    tokenUsageReadiness,
  });
  return {
    service,
    mocks: { agentTeamRunManager, teamRunHistoryCatalogService, workspaceManager, agentRunIdentityAllocator, teamRunIdentityAllocator },
  };
};

describe("TeamRunService current root lifecycle", () => {
  it("rejects current-schema admission before constructing a new team run", async () => {
    const tokenUsageReadiness = {
      assertCurrentSchemaReady: vi.fn(() => {
        throw new Error("TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED");
      }),
      assertExistingRunRestoreReady: vi.fn(),
    };
    const { service, mocks } = createSubject(null, undefined, tokenUsageReadiness);

    await expect(service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamConfigs: [],
      memberConfigs: [launchConfig("/Coordinator")],
    })).rejects.toThrow("TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED");

    expect(tokenUsageReadiness.assertCurrentSchemaReady).toHaveBeenCalledOnce();
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });

  it("rejects a managed offline run before consulting pre-existing-run readiness", async () => {
    const managedRun = { teamRunId: "team-offline-1" };
    const tokenUsageReadiness = {
      assertCurrentSchemaReady: vi.fn(),
      assertExistingRunRestoreReady: vi.fn(() => {
        throw new Error("TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED");
      }),
    };
    const { service, mocks } = createSubject(null, undefined, tokenUsageReadiness, managedRun);

    await expect(service.restoreTeamRun("team-offline-1")).rejects.toThrow(
      "Team run 'team-offline-1' is already managed and cannot be restored.",
    );

    expect(mocks.agentTeamRunManager.hasManagedTeamRun).toHaveBeenCalledWith("team-offline-1");
    expect(tokenUsageReadiness.assertExistingRunRestoreReady).not.toHaveBeenCalled();
    expect(mocks.agentTeamRunManager.restoreTeamRun).not.toHaveBeenCalled();
  });

  it("blocks root, nested, delegated, and task-team restoration before the team backend constructs providers", async () => {
    configureTokenUsageMigrationReadiness({
      kind: "CURRENT_SCHEMA_DEGRADED",
      migrationStatus: "FAILED",
      logPath: null,
    });
    try {
      const { service, mocks } = createSubject();
      await expect(service.restoreTeamRun("team-with-nested-and-task-runs")).rejects.toMatchObject({
        code: "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED",
      });
      expect(mocks.agentTeamRunManager.restoreTeamRun).not.toHaveBeenCalled();
    } finally {
      configureTokenUsageMigrationReadiness({ kind: "READY" });
    }
  });

  it("returns an active RootTeamRun without attempting restore", async () => {
    const activeRun = { teamRunId: "team-1" };
    const { service, mocks } = createSubject(activeRun);
    const restoreSpy = vi.spyOn(service, "restoreTeamRun");

    await expect(service.resolveActiveTeamRun("team-1")).resolves.toBe(activeRun);
    expect(mocks.agentTeamRunManager.getActiveTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoreSpy).not.toHaveBeenCalled();
  });

  it("returns null when exact current-package restore fails", async () => {
    const { service } = createSubject();
    vi.spyOn(service, "restoreTeamRun").mockRejectedValue(new Error("missing current TeamRun package"));

    await expect(service.resolveActiveTeamRun("team-1")).resolves.toBeNull();
  });

  it("projects one exact current Agent error into a failed lifecycle result", async () => {
    let eventListener: ((input: { event: TeamRunEvent }) => void) | null = null;
    const activeRun = {
      teamRunId: "team-1",
      subscribeToEvents: vi.fn((listener) => {
        eventListener = listener;
        return vi.fn();
      }),
    };
    const { service } = createSubject(activeRun);
    const observed: Array<{ phase: string; errorMessage?: string | null }> = [];
    const unsubscribe = await service.observeTeamRunLifecycle("team-1", (event) => observed.push(event));

    eventListener!({ event: {
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: createTeamAgentExecutionBinding({
        rootTeamRunId: "team-1",
        memberAddress: "/Coordinator",
        agentRunId: "member-run-1",
      }),
      payload: {
        eventType: "ERROR",
        details: { code: "TURN_FAILED", message: "terminal failure", errorScope: "runtime", errorEffect: "terminal", turnId: null },
        statusHint: "ERROR",
      },
    } });

    expect(observed).toEqual([
      expect.objectContaining({ phase: "ATTACHED", runId: "team-1" }),
      expect.objectContaining({ phase: "FAILED", runId: "team-1", errorMessage: "terminal failure" }),
    ]);
    unsubscribe?.();
  });

  it("builds one canonical mixed root config and records its execution tree", async () => {
    const { service, mocks } = createSubject();

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamConfigs: [teamLaunchConfig(RuntimeKind.CODEX_APP_SERVER)],
      memberConfigs: [
        launchConfig("/Coordinator", RuntimeKind.CODEX_APP_SERVER),
        launchConfig("/Reviewer", RuntimeKind.CLAUDE_AGENT_SDK),
      ],
    });

    const [{ config, teamDefinitionName }] = mocks.agentTeamRunManager.createTeamRun.mock.calls[0];
    expect(teamDefinitionName).toBe("Support Team");
    expect(config).toMatchObject({
      teamBackendKind: TeamBackendKind.MIXED,
      rootTeam: {
        address: "/",
        teamRunId: "team-mixed-1",
        coordinatorAddress: "/Coordinator",
        children: [
          { kind: "agent", address: "/Coordinator", runtimeKind: RuntimeKind.CODEX_APP_SERVER },
          { kind: "agent", address: "/Reviewer", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK },
        ],
      },
    });
    expect(mocks.teamRunHistoryCatalogService.recordTeamRunCreated).toHaveBeenCalledOnce();
  });

  it.each([
    { subject: "Team", teamRuntime: undefined, memberRuntime: RuntimeKind.AUTOBYTEUS, expected: "teamConfigs[0].runtimeKind is required." },
    { subject: "Team", teamRuntime: "   ", memberRuntime: RuntimeKind.AUTOBYTEUS, expected: "teamConfigs[0].runtimeKind is required." },
    { subject: "Team", teamRuntime: "unsupported", memberRuntime: RuntimeKind.AUTOBYTEUS, expected: "[INVALID_RUNTIME_KIND]" },
    { subject: "Agent", teamRuntime: RuntimeKind.AUTOBYTEUS, memberRuntime: undefined, expected: "memberConfigs[0].runtimeKind is required." },
    { subject: "Agent", teamRuntime: RuntimeKind.AUTOBYTEUS, memberRuntime: "   ", expected: "memberConfigs[0].runtimeKind is required." },
    { subject: "Agent", teamRuntime: RuntimeKind.AUTOBYTEUS, memberRuntime: "unsupported", expected: "[INVALID_RUNTIME_KIND]" },
  ])("rejects a missing, blank, or invalid $subject runtime before workspace activation", async ({
    teamRuntime,
    memberRuntime,
    expected,
  }) => {
    const { service, mocks } = createSubject();
    const teamConfig = {
      ...teamLaunchConfig(RuntimeKind.AUTOBYTEUS, "/tmp/strict-runtime-workspace"),
      runtimeKind: teamRuntime,
    };
    const memberConfig = {
      ...launchConfig("/Coordinator", RuntimeKind.AUTOBYTEUS, "/tmp/strict-runtime-workspace"),
      runtimeKind: memberRuntime,
    };

    await expect(service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamConfigs: [teamConfig],
      memberConfigs: [memberConfig, launchConfig("/Reviewer")],
    } as any)).rejects.toThrow(expected);

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });

  it("deduplicates workspace activation by canonical root and rejects unknown members before create", async () => {
    const { service, mocks } = createSubject();

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamConfigs: [teamLaunchConfig(RuntimeKind.CODEX_APP_SERVER, "/tmp/MetadataTeam")],
      memberConfigs: [
        launchConfig("/Coordinator", RuntimeKind.CODEX_APP_SERVER, "/tmp/MetadataTeam/"),
        launchConfig("/Reviewer", RuntimeKind.CODEX_APP_SERVER, "/tmp/MetadataTeam"),
      ],
    });
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledOnce();
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/MetadataTeam");

    mocks.agentTeamRunManager.createTeamRun.mockClear();
    await expect(service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamConfigs: [teamLaunchConfig()],
      memberConfigs: [
        launchConfig("/Coordinator"),
        launchConfig("/Reviewer"),
        launchConfig("/RemovedLegacySelector"),
      ],
    })).rejects.toThrow("unknown Team member '/RemovedLegacySelector'");
    expect(mocks.teamRunIdentityAllocator.allocateForTeamDefinitionName).toHaveBeenCalledTimes(1);
    expect(mocks.agentRunIdentityAllocator.allocateForAgentDefinition).toHaveBeenCalledTimes(2);
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "full hierarchy",
      launch: (service: TeamRunService) => service.createTeamRun({
        teamDefinitionId: "team-def-1",
        teamConfigs: [teamLaunchConfig()],
        memberConfigs: [launchConfig("/Coordinator")],
      }),
    },
    {
      name: "root-only application-style expansion",
      launch: (service: TeamRunService) => service.createTeamRunFromRootConfig({
        teamDefinitionId: "team-def-1",
        rootConfig: {
          workspaceRootPath: "/tmp/root-only-invalid",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          llmConfig: null,
        },
        memberConfigs: [launchConfig("/Coordinator")],
        applicationBinding: { applicationId: "app-1", bindingId: "binding-1" },
      }),
    },
  ])("rejects invalid $name coverage before allocation, manager creation, or persistence", async ({ launch }) => {
    const { service, mocks } = createSubject();

    await expect(launch(service)).rejects.toThrow("Launch settings for Team member '/Reviewer' were not provided");

    expect(mocks.teamRunIdentityAllocator.allocateForTeamDefinitionName).not.toHaveBeenCalled();
    expect(mocks.agentRunIdentityAllocator.allocateForAgentDefinition).not.toHaveBeenCalled();
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
    expect(mocks.teamRunHistoryCatalogService.recordTeamRunCreated).not.toHaveBeenCalled();
  });
});
