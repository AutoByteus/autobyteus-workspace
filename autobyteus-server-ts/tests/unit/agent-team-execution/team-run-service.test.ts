import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";

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

const createSubject = (
  activeRun: unknown = null,
  definitions: Map<string, unknown> = new Map([["team-def-1", rootDefinition]]),
) => {
  const executionTree = { schemaVersion: 1, rootTeam: { teamRunId: "team-mixed-1" } };
  const agentTeamRunManager = {
    getActiveTeamRun: vi.fn().mockReturnValue(activeRun),
    getManagedTeamRun: vi.fn().mockReturnValue(activeRun),
    hasManagedTeamRun: vi.fn().mockReturnValue(Boolean(activeRun)),
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
  const service = new TeamRunService({
    agentTeamRunManager,
    teamDefinitionService,
    teamRunHistoryCatalogService,
    workspaceManager,
    memoryDir: "/tmp/team-run-service-current-test",
    agentRunIdentityAllocator,
  });
  return {
    service,
    mocks: { agentTeamRunManager, teamRunHistoryCatalogService, workspaceManager, agentRunIdentityAllocator },
  };
};

describe("TeamRunService current root lifecycle", () => {
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
    vi.spyOn(service, "restoreTeamRun").mockRejectedValue(new Error("missing V1 package"));

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
      teamRunId: "team-mixed-1",
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

  it("deduplicates workspace activation by canonical root and rejects unknown members before create", async () => {
    const { service, mocks } = createSubject();

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamRunId: "team-workspace-1",
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
      teamRunId: "team-invalid-1",
      memberConfigs: [
        launchConfig("/Coordinator"),
        launchConfig("/Reviewer"),
        launchConfig("/RemovedLegacySelector"),
      ],
    })).rejects.toThrow("unknown Team member '/RemovedLegacySelector'");
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });
});
