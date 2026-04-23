import { describe, expect, it, vi } from "vitest";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import type { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";

describe("TeamRunService", () => {
  const createSubject = (activeRun: unknown = null) => {
    const agentTeamRunManager = {
      getTeamRun: vi.fn().mockReturnValue(activeRun),
      createTeamRun: vi.fn(),
    } as any;
    const teamRunMetadataService = {
      writeMetadata: vi.fn().mockResolvedValue(undefined),
    } as any;
    const teamRunHistoryIndexService = {
      recordRunCreated: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
    } as any;
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
        workspaceId: "workspace-1",
      }),
      getWorkspaceById: vi.fn(),
    } as any;
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue({
        name: "Support Team",
        coordinatorMemberName: "Coordinator",
      }),
    } as any;
    const service = new TeamRunService({
      agentTeamRunManager,
      teamDefinitionService,
      teamRunMetadataService,
      teamRunHistoryIndexService,
      workspaceManager,
      memoryDir: "/tmp/team-run-service-test",
    });

    return {
      service,
      mocks: {
        agentTeamRunManager,
        teamRunMetadataService,
        teamRunHistoryIndexService,
        workspaceManager,
      },
    };
  };

  it("returns an active team run without attempting restore", async () => {
    const activeRun = {
      runId: "team-1",
    };
    const { service, mocks } = createSubject(activeRun);
    const restoreSpy = vi.spyOn(service, "restoreTeamRun");

    const result = await service.resolveTeamRun("team-1");

    expect(result).toBe(activeRun);
    expect(mocks.agentTeamRunManager.getTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoreSpy).not.toHaveBeenCalled();
  });

  it("returns null when restore fails", async () => {
    const { service } = createSubject(null);
    vi.spyOn(service, "restoreTeamRun").mockRejectedValue(new Error("missing metadata"));

    const result = await service.resolveTeamRun("team-1");

    expect(result).toBeNull();
  });

  it("preserves the existing default IDLE/empty history semantics on create", async () => {
    const { service, mocks } = createSubject();
    const createdRun = {
      runId: "team-1",
      config: {
        teamDefinitionId: "team-def-1",
        memberConfigs: [
          {
            memberName: "Coordinator",
            memberRouteKey: "coordinator",
            memberRunId: "team-1/coordinator",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            workspaceRootPath: "/tmp/workspace",
            llmConfig: null,
          },
        ],
      } as TeamRunConfig,
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    } as any;
    mocks.agentTeamRunManager.createTeamRun.mockResolvedValue(createdRun);

    const result = await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: [
        {
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          workspaceRootPath: "/tmp/workspace",
          llmConfig: null,
        },
      ],
    });

    expect(result).toBe(createdRun);
    expect(mocks.agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinatorMemberName: "Coordinator",
      }),
    );
    expect(mocks.teamRunHistoryIndexService.recordRunCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-1",
        summary: "",
        lastKnownStatus: "IDLE",
      }),
    );
  });

  it("records ACTIVE summary through recordRunActivity", async () => {
    const { service, mocks } = createSubject();
    const activeRun = {
      runId: "team-1",
      config: {
        teamDefinitionId: "team-def-1",
        memberConfigs: [
          {
            memberName: "Coordinator",
            memberRouteKey: "coordinator",
            memberRunId: "team-1/coordinator",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            workspaceRootPath: "/tmp/workspace",
            llmConfig: null,
          },
        ],
      } as TeamRunConfig,
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    } as any;

    await service.recordRunActivity(activeRun, {
      summary: "First external message",
      lastKnownStatus: "ACTIVE",
    });

    expect(mocks.teamRunHistoryIndexService.recordRunActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-1",
        summary: "First external message",
        lastKnownStatus: "ACTIVE",
      }),
    );
  });

  it("builds launch member configs with shared and team-local agent ids", async () => {
    const { service } = createSubject();
    const teamDefinitions = new Map([
      [
        "root-team",
        {
          name: "Root Team",
          coordinatorMemberName: "sharedLead",
          nodes: [
            { memberName: "sharedLead", refType: "agent", refScope: "shared", ref: "shared-reviewer" },
            { memberName: "localLead", refType: "agent", refScope: "team_local", ref: "reviewer" },
            { memberName: "subTeam", refType: "agent_team", ref: "sub-team" },
          ],
        },
      ],
      [
        "sub-team",
        {
          name: "Sub Team",
          coordinatorMemberName: "subReviewer",
          nodes: [
            { memberName: "subReviewer", refType: "agent", refScope: "team_local", ref: "reviewer" },
          ],
        },
      ],
    ]);

    (service as unknown as { teamDefinitionService: { getDefinitionById: (id: string) => Promise<unknown> } }).teamDefinitionService = {
      getDefinitionById: vi.fn(async (id: string) => teamDefinitions.get(id) ?? null),
    } as any;

    const configs = await service.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: "root-team",
      launchPreset: {
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        skillAccessMode: "PRELOADED_ONLY" as any,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmConfig: { temperature: 0.1 },
      },
    });

    expect(configs).toEqual([
      expect.objectContaining({
        memberName: "sharedLead",
        agentDefinitionId: "shared-reviewer",
      }),
      expect.objectContaining({
        memberName: "localLead",
        agentDefinitionId: buildTeamLocalAgentDefinitionId("root-team", "reviewer"),
      }),
      expect.objectContaining({
        memberName: "subReviewer",
        agentDefinitionId: buildTeamLocalAgentDefinitionId("sub-team", "reviewer"),
      }),
    ]);
  });

  it("resolves a nested team coordinator to the leaf member before creating the run", async () => {
    const { service, mocks } = createSubject();
    const createdRun = {
      runId: "team-1",
      config: {
        teamDefinitionId: "root-team",
        coordinatorMemberName: "Specialist",
        memberConfigs: [],
      } as TeamRunConfig,
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    } as any;
    mocks.agentTeamRunManager.createTeamRun.mockResolvedValue(createdRun);

    (service as unknown as { teamDefinitionService: { getDefinitionById: (id: string) => Promise<unknown> } }).teamDefinitionService = {
      getDefinitionById: vi.fn(async (id: string) => {
        if (id === "root-team") {
          return {
            name: "Root Team",
            coordinatorMemberName: "SubTeam",
            nodes: [{ memberName: "SubTeam", refType: "agent_team", ref: "sub-team" }],
          };
        }
        if (id === "sub-team") {
          return {
            name: "Sub Team",
            coordinatorMemberName: "Specialist",
            nodes: [{ memberName: "Specialist", refType: "agent", ref: "agent-specialist" }],
          };
        }
        return null;
      }),
    } as any;

    await service.createTeamRun({
      teamDefinitionId: "root-team",
      memberConfigs: [
        {
          memberName: "Specialist",
          memberRouteKey: "specialist",
          agentDefinitionId: "agent-specialist",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceRootPath: "/tmp/workspace",
          llmConfig: null,
        },
      ],
    });

    expect(mocks.agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        coordinatorMemberName: "Specialist",
      }),
    );
  });
});
