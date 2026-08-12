import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import {
  testAgentNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

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

describe("TeamRunService", () => {
  const createSubject = (
    activeRun: unknown = null,
    definitions: Map<string, unknown> = new Map([["team-def-1", rootDefinition]]),
  ) => {
    const agentTeamRunManager = {
      getTeamRun: vi.fn().mockReturnValue(activeRun),
      createTeamRun: vi.fn(async (config, teamRunId) => ({
        teamRunId,
        config,
        getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
      })),
      restoreTeamRun: vi.fn(),
      terminateTeamRun: vi.fn().mockResolvedValue(true),
      subscribeToLifecycle: vi.fn().mockReturnValue(vi.fn()),
      getLifecycleSnapshot: vi.fn((teamRunId: string) => ({
        teamRunId,
        isActive: Boolean(activeRun),
      })),
    } as any;
    const teamRunMetadataService = {
      writeMetadata: vi.fn().mockResolvedValue(undefined),
      readMetadata: vi.fn(),
    } as any;
    const teamRunHistoryCatalogService = {
      recordTeamRunCreated: vi.fn().mockResolvedValue(undefined),
      recordTeamRunSummary: vi.fn().mockResolvedValue(undefined),
      recordTeamRunRestored: vi.fn().mockResolvedValue(undefined),
      recordTeamRunTerminated: vi.fn().mockResolvedValue(undefined),
      refreshTeamRunMetadata: vi.fn().mockResolvedValue(undefined),
    } as any;
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn(async (rootPath: string) => ({
        workspaceId: `workspace:${rootPath}`,
        getBasePath: () => rootPath,
      })),
      getWorkspaceById: vi.fn(),
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
      teamRunMetadataService,
      teamRunHistoryCatalogService,
      workspaceManager,
      memoryDir: "/tmp/team-run-service-test",
      agentRunIdentityAllocator,
    });

    return {
      service,
      mocks: {
        agentTeamRunManager,
        teamRunMetadataService,
        teamRunHistoryCatalogService,
        workspaceManager,
        teamDefinitionService,
        agentRunIdentityAllocator,
      },
    };
  };

  it("returns an active TeamRun without attempting restore", async () => {
    const activeRun = { teamRunId: "team-1" };
    const { service, mocks } = createSubject(activeRun);
    const restoreSpy = vi.spyOn(service, "restoreTeamRun");

    await expect(service.resolveTeamRun("team-1")).resolves.toBe(activeRun);
    expect(mocks.agentTeamRunManager.getTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoreSpy).not.toHaveBeenCalled();
  });

  it("returns null when restore fails", async () => {
    const { service } = createSubject();
    vi.spyOn(service, "restoreTeamRun").mockRejectedValue(new Error("missing metadata"));

    await expect(service.resolveTeamRun("team-1")).resolves.toBeNull();
  });

  it("projects the current exact Agent error event into one failed lifecycle result", async () => {
    let eventListener: ((event: TeamRunEvent) => void) | null = null;
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
    const executionAddress = createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      memberAddress: "/Coordinator",
    });

    eventListener!({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: createTeamAgentExecutionBinding({ executionAddress, agentRunId: "member-run-1" }),
      payload: {
        eventType: "ERROR",
        details: { code: "TURN_FAILED", message: "terminal failure" },
        statusHint: "error",
      },
    });
    eventListener!({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: createTeamAgentExecutionBinding({ executionAddress, agentRunId: "member-run-1" }),
      payload: {
        eventType: "ERROR",
        details: { code: "LATE_ERROR", message: "must be ignored" },
        statusHint: "error",
      },
    });

    expect(observed).toEqual([
      expect.objectContaining({ phase: "ATTACHED", runId: "team-1" }),
      expect.objectContaining({ phase: "FAILED", runId: "team-1", errorMessage: "terminal failure" }),
    ]);
    unsubscribe?.();
  });

  it("builds a canonical mixed TeamRunConfig from exact member addresses", async () => {
    const { service, mocks } = createSubject();

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamRunId: "team-mixed-1",
      memberConfigs: [
        launchConfig("/Coordinator", RuntimeKind.CODEX_APP_SERVER),
        launchConfig("/Reviewer", RuntimeKind.CLAUDE_AGENT_SDK),
      ],
    });

    const [config, teamRunId] = mocks.agentTeamRunManager.createTeamRun.mock.calls[0];
    expect(teamRunId).toBe("team-mixed-1");
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
  });

  it("rejects an unknown exact member address before a TeamRun is created", async () => {
    const { service, mocks } = createSubject();

    await expect(service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamRunId: "team-1",
      memberConfigs: [
        launchConfig("/Coordinator"),
        launchConfig("/Reviewer"),
        launchConfig("/RemovedLegacySelector"),
      ],
    })).rejects.toThrow("unknown Team member '/RemovedLegacySelector'");

    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });

  it("activates one canonical workspace root once for multiple exact members", async () => {
    const { service, mocks } = createSubject();
    const workspaceRootPath = "/tmp/MetadataTeam";

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamRunId: "team-workspace-1",
      memberConfigs: [
        launchConfig("/Coordinator", RuntimeKind.CODEX_APP_SERVER, `${workspaceRootPath}/`),
        launchConfig("/Reviewer", RuntimeKind.CODEX_APP_SERVER, workspaceRootPath),
      ],
    });

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledTimes(1);
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(workspaceRootPath);
    const [config] = mocks.agentTeamRunManager.createTeamRun.mock.calls[0];
    expect(config.rootTeam.children).toEqual([
      expect.objectContaining({ address: "/Coordinator", workspaceRootPath }),
      expect.objectContaining({ address: "/Reviewer", workspaceRootPath }),
    ]);
  });

  it("activates each distinct canonical workspace root exactly once", async () => {
    const { service, mocks } = createSubject();

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamRunId: "team-workspace-2",
      memberConfigs: [
        launchConfig("/Coordinator", RuntimeKind.AUTOBYTEUS, "/tmp/MetadataTeamA"),
        launchConfig("/Reviewer", RuntimeKind.AUTOBYTEUS, "/tmp/MetadataTeamB"),
      ],
    });

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledTimes(2);
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/MetadataTeamA");
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/MetadataTeamB");
  });

  it("restores a mixed TeamRun from the exact schema-v3 topology snapshot", async () => {
    const coordinator = testAgentNode("/Coordinator", {
      agentDefinitionId: "agent-def-1",
      agentRunId: "run-1",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "platform-1",
    });
    const reviewer = testAgentNode("/Reviewer", {
      agentDefinitionId: "agent-def-2",
      agentRunId: "run-2",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: "platform-2",
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "team-mixed-restore-1",
      rootTeamDefinitionId: "team-def-1",
      coordinatorAddress: "/Coordinator",
      children: [coordinator, reviewer],
    });
    const metadata: TeamRunMetadata = {
      schemaVersion: 3,
      teamDefinitionName: "Support Team",
      createdAt: "2026-08-12T00:00:00.000Z",
      archivedAt: null,
      rootTeam: config.rootTeam,
      handoffs: config.handoffs,
    };
    const restoredRun = {
      teamRunId: "team-mixed-restore-1",
      config,
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    };
    const { service, mocks } = createSubject();
    mocks.teamRunMetadataService.readMetadata.mockResolvedValue(metadata);
    mocks.agentTeamRunManager.restoreTeamRun.mockResolvedValue(restoredRun);
    mocks.agentTeamRunManager.getTeamRun
      .mockReturnValueOnce(null)
      .mockReturnValue(restoredRun);

    await expect(service.restoreTeamRun("team-mixed-restore-1")).resolves.toBe(restoredRun);

    expect(mocks.agentTeamRunManager.restoreTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-mixed-restore-1",
        teamAddress: "/",
        config: expect.objectContaining({ rootTeam: config.rootTeam }),
      }),
    );
    expect(mocks.teamRunHistoryCatalogService.recordTeamRunRestored).toHaveBeenCalledWith(
      expect.objectContaining({ teamRunId: "team-mixed-restore-1" }),
    );
  });

  it("records a newly created TeamRun with empty summary and exact topology metadata", async () => {
    const { service, mocks } = createSubject();

    const result = await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      teamRunId: "team-1",
      memberConfigs: [launchConfig("/Coordinator"), launchConfig("/Reviewer")],
    });

    expect(result.teamRunId).toBe("team-1");
    expect(mocks.teamRunHistoryCatalogService.recordTeamRunCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-1",
        summary: "",
        metadata: expect.objectContaining({
          schemaVersion: 3,
          rootTeam: expect.objectContaining({ teamRunId: "team-1" }),
        }),
      }),
    );
  });

  it("records summary through the Team history catalog boundary", async () => {
    const { service, mocks } = createSubject();
    const run = { teamRunId: "team-1" } as any;

    await service.recordRunActivity(run, { summary: "First external message" });

    expect(mocks.teamRunHistoryCatalogService.recordTeamRunSummary).toHaveBeenCalledWith({
      teamRunId: "team-1",
      summary: "First external message",
    });
  });

  it("builds preset launch settings with exact addresses and shared/team-local Agent IDs", async () => {
    const definitions = new Map<string, unknown>([
      ["root-team", {
        name: "Root Team",
        coordinatorMemberName: "sharedLead",
        nodes: [
          { memberName: "sharedLead", refType: "agent", refScope: "shared", ref: "shared-reviewer" },
          { memberName: "localLead", refType: "agent", refScope: "team_local", ref: "reviewer" },
          { memberName: "subTeam", refType: "agent_team", refScope: "shared", ref: "sub-team" },
        ],
      }],
      ["sub-team", {
        name: "Sub Team",
        coordinatorMemberName: "subReviewer",
        nodes: [
          { memberName: "subReviewer", refType: "agent", refScope: "team_local", ref: "reviewer" },
        ],
      }],
    ]);
    const { service } = createSubject(null, definitions);

    const configs = await service.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: "root-team",
      launchPreset: {
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmConfig: { temperature: 0.1 },
      },
    });

    expect(configs).toEqual([
      expect.objectContaining({ memberAddress: "/sharedLead", agentDefinitionId: "shared-reviewer" }),
      expect.objectContaining({
        memberAddress: "/localLead",
        agentDefinitionId: buildTeamLocalAgentDefinitionId("root-team", "reviewer"),
      }),
      expect.objectContaining({
        memberAddress: "/subTeam/subReviewer",
        agentDefinitionId: buildTeamLocalAgentDefinitionId("sub-team", "reviewer"),
      }),
    ]);
  });

  it("rejects an AgentTeam node as the root coordinator", async () => {
    const definitions = new Map<string, unknown>([
      ["root-team", {
        name: "Root Team",
        coordinatorMemberName: "SubTeam",
        nodes: [{ memberName: "SubTeam", refType: "agent_team", ref: "sub-team", refScope: "shared" }],
      }],
      ["sub-team", {
        name: "Sub Team",
        coordinatorMemberName: "Specialist",
        nodes: [{ memberName: "Specialist", refType: "agent", ref: "agent-specialist", refScope: "shared" }],
      }],
    ]);
    const { service, mocks } = createSubject(null, definitions);

    await expect(service.createTeamRun({
      teamDefinitionId: "root-team",
      teamRunId: "root-run",
      memberConfigs: [launchConfig("/SubTeam/Specialist")],
    })).rejects.toThrow("must have exactly one direct Agent coordinator 'SubTeam'");
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });
});
