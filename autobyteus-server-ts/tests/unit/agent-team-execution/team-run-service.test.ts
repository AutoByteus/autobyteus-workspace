import { describe, expect, it, vi } from "vitest";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildFilesystemWorkspaceId } from "../../../src/workspaces/workspace-id-mapping-store.js";

describe("TeamRunService", () => {
  const createSubject = (activeRun: unknown = null) => {
    const agentTeamRunManager = {
      getTeamRun: vi.fn().mockReturnValue(activeRun),
      createTeamRun: vi.fn(),
      restoreTeamRun: vi.fn(),
      terminateTeamRun: vi.fn().mockResolvedValue(true),
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
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
        workspaceId: "workspace-1",
      }),
      getWorkspaceById: vi.fn(),
    } as any;
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue({
        name: "Support Team",
        coordinatorMemberName: "Coordinator",
        nodes: [
          { memberName: "Coordinator", refType: "agent", refScope: "shared", ref: "agent-def-1" },
          { memberName: "Reviewer", refType: "agent", refScope: "shared", ref: "agent-def-2" },
        ],
      }),
    } as any;
    const service = new TeamRunService({
      agentTeamRunManager,
      teamDefinitionService,
      teamRunMetadataService,
      teamRunHistoryCatalogService,
      workspaceManager,
      memoryDir: "/tmp/team-run-service-test",
    });

    return {
      service,
      mocks: {
        agentTeamRunManager,
        teamRunMetadataService,
        teamRunHistoryCatalogService,
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

  it("selects the mixed team backend when member runtimes span multiple runtimes", async () => {
    const { service, mocks } = createSubject();
    const createdRun = {
      runId: "team-mixed-1",
      config: new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.MIXED,
        memberConfigs: [],
      }),
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    } as any;
    mocks.agentTeamRunManager.createTeamRun.mockResolvedValue(createdRun);

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: [
        {
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceRootPath: "/tmp/workspace",
          llmConfig: null,
        },
        {
          memberName: "Reviewer",
          memberRouteKey: "reviewer",
          agentDefinitionId: "agent-def-2",
          llmModelIdentifier: "haiku",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          workspaceRootPath: "/tmp/workspace",
          llmConfig: null,
        },
      ],
    });

    expect(mocks.agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamBackendKind: TeamBackendKind.MIXED,
      }),
    );
  });

  it("activates filesystem workspace metadata roots even when workspaceId is already present", async () => {
    const { service, mocks } = createSubject();
    const workspaceRootPath = "/tmp/MetadataTeam";
    const workspaceId = buildFilesystemWorkspaceId(workspaceRootPath);
    mocks.workspaceManager.ensureWorkspaceByRootPath.mockResolvedValue({
      workspaceId,
      getBasePath: () => workspaceRootPath,
    });
    mocks.agentTeamRunManager.createTeamRun.mockImplementation(async (config: TeamRunConfig) => ({
      runId: "team-metadata-1",
      config,
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    }));

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: [
        {
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceId,
          workspaceRootPath: `${workspaceRootPath}/`,
          llmConfig: null,
        },
        {
          memberName: "Reviewer",
          memberRouteKey: "reviewer",
          agentDefinitionId: "agent-def-2",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceId,
          workspaceRootPath,
          llmConfig: null,
        },
      ],
    });

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledTimes(1);
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(workspaceRootPath);
    expect(mocks.agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        memberConfigs: expect.arrayContaining([
          expect.objectContaining({
            memberName: "Coordinator",
            workspaceId,
            workspaceRootPath,
          }),
          expect.objectContaining({
            memberName: "Reviewer",
            workspaceId,
            workspaceRootPath,
          }),
        ]),
      }),
    );
    expect(mocks.workspaceManager.getWorkspaceById).not.toHaveBeenCalled();
  });

  it("activates each distinct team workspace root once per create request", async () => {
    const { service, mocks } = createSubject();
    const coordinatorRootPath = "/tmp/MetadataTeamA";
    const reviewerRootPath = "/tmp/MetadataTeamB";
    const coordinatorWorkspaceId = buildFilesystemWorkspaceId(coordinatorRootPath);
    const reviewerWorkspaceId = buildFilesystemWorkspaceId(reviewerRootPath);
    mocks.workspaceManager.ensureWorkspaceByRootPath.mockImplementation(async (rootPath: string) => {
      if (rootPath === coordinatorRootPath) {
        return {
          workspaceId: coordinatorWorkspaceId,
          getBasePath: () => coordinatorRootPath,
        };
      }
      if (rootPath === reviewerRootPath) {
        return {
          workspaceId: reviewerWorkspaceId,
          getBasePath: () => reviewerRootPath,
        };
      }
      throw new Error(`Unexpected workspace root ${rootPath}`);
    });
    mocks.agentTeamRunManager.createTeamRun.mockImplementation(async (config: TeamRunConfig) => ({
      runId: "team-distinct-reference-1",
      config,
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    }));

    await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: [
        {
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceId: coordinatorWorkspaceId,
          workspaceRootPath: `${coordinatorRootPath}/`,
          llmConfig: null,
        },
        {
          memberName: "Reviewer",
          memberRouteKey: "reviewer",
          agentDefinitionId: "agent-def-2",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceId: reviewerWorkspaceId,
          workspaceRootPath: reviewerRootPath,
          llmConfig: null,
        },
      ],
    });

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledTimes(2);
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(coordinatorRootPath);
    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(reviewerRootPath);
    expect(mocks.agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        memberConfigs: expect.arrayContaining([
          expect.objectContaining({
            memberName: "Coordinator",
            workspaceId: coordinatorWorkspaceId,
            workspaceRootPath: coordinatorRootPath,
          }),
          expect.objectContaining({
            memberName: "Reviewer",
            workspaceId: reviewerWorkspaceId,
            workspaceRootPath: reviewerRootPath,
          }),
        ]),
      }),
    );
  });

  it("rejects filesystem reference team launches when the root path is missing", async () => {
    const { service, mocks } = createSubject();
    const workspaceId = buildFilesystemWorkspaceId("/tmp/MissingRoot");

    await expect(service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: [
        {
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY" as any,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceId,
          llmConfig: null,
        },
      ],
    })).rejects.toThrow("workspaceRootPath is required");

    expect(mocks.workspaceManager.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });

  it("restores mixed team runs using persisted member runtime metadata", async () => {
    const { service, mocks } = createSubject();
    const restoredRun = {
      runId: "team-mixed-restore-1",
      config: new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.MIXED,
        memberConfigs: [
          {
            memberKind: "agent",
            memberName: "Coordinator",
            memberPath: ["Coordinator"],
            memberRouteKey: "coordinator",
            memberRunId: "run-1",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            workspaceRootPath: "/tmp/workspace",
            llmConfig: null,
          },
          {
            memberKind: "agent",
            memberName: "Reviewer",
            memberPath: ["Reviewer"],
            memberRouteKey: "reviewer",
            memberRunId: "run-2",
            agentDefinitionId: "agent-def-2",
            llmModelIdentifier: "haiku",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
            workspaceRootPath: "/tmp/workspace",
            llmConfig: null,
          },
          {
            memberKind: "agent",
            memberName: "Reviewer",
            memberPath: ["Reviewer"],
            memberRouteKey: "reviewer",
            memberRunId: "team-1/reviewer",
            agentDefinitionId: "agent-def-2",
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: "PRELOADED_ONLY",
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            workspaceRootPath: "/tmp/workspace",
            llmConfig: null,
          },
        ],
      }),
      getRuntimeContext: vi.fn().mockReturnValue({
        memberContexts: [
          { memberKind: "agent", memberName: "Coordinator", memberPath: ["Coordinator"], memberRouteKey: "coordinator", memberRunId: "run-1", getPlatformAgentRunId: () => "platform-1" },
          { memberKind: "agent", memberName: "Reviewer", memberPath: ["Reviewer"], memberRouteKey: "reviewer", memberRunId: "run-2", getPlatformAgentRunId: () => "platform-2" },
        ],
      }),
    } as any;
    mocks.teamRunMetadataService.readMetadata.mockResolvedValue({
      teamRunId: "team-mixed-restore-1",
      teamDefinitionId: "team-def-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teamDefinitionName: "Support Team",
      coordinatorMemberRouteKey: "coordinator",
      memberTree: [
        {
          memberKind: "agent",
          memberRouteKey: "coordinator",
          memberPath: ["Coordinator"],
          memberName: "Coordinator",
          memberRunId: "run-1",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "platform-1",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY",
          llmConfig: null,
          workspaceRootPath: "/tmp/workspace",
        },
        {
          memberKind: "agent",
          memberRouteKey: "reviewer",
          memberPath: ["Reviewer"],
          memberName: "Reviewer",
          memberRunId: "run-2",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          platformAgentRunId: "platform-2",
          agentDefinitionId: "agent-def-2",
          llmModelIdentifier: "haiku",
          autoExecuteTools: false,
          skillAccessMode: "PRELOADED_ONLY",
          llmConfig: null,
          workspaceRootPath: "/tmp/workspace",
        },
      ],
    });
    mocks.agentTeamRunManager.restoreTeamRun.mockResolvedValue(restoredRun);
    mocks.agentTeamRunManager.getTeamRun
      .mockReturnValueOnce(null)
      .mockImplementation((teamRunId: string) =>
        teamRunId === "team-mixed-restore-1" ? restoredRun : null,
      );

    await service.restoreTeamRun("team-mixed-restore-1");

    expect(mocks.agentTeamRunManager.restoreTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamBackendKind: TeamBackendKind.MIXED,
        config: expect.objectContaining({
          teamBackendKind: TeamBackendKind.MIXED,
        }),
      }),
    );
  });

  it("preserves the existing default IDLE/empty history semantics on create", async () => {
    const { service, mocks } = createSubject();
    const createdRun = {
      runId: "team-1",
      config: new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.AUTOBYTEUS,
        coordinatorMemberName: "Coordinator",
        memberConfigs: [
          {
            memberKind: "agent",
            memberName: "Coordinator",
            memberPath: ["Coordinator"],
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
      }),
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
        {
          memberName: "Reviewer",
          memberRouteKey: "reviewer",
          agentDefinitionId: "agent-def-2",
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
    expect(mocks.teamRunHistoryCatalogService.recordTeamRunCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-1",
        summary: "",
              }),
    );
  });

  it("records summary through the team catalog boundary", async () => {
    const { service, mocks } = createSubject();
    const activeRun = {
      runId: "team-1",
      config: new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind: TeamBackendKind.AUTOBYTEUS,
        memberConfigs: [
          {
            memberKind: "agent",
            memberName: "Coordinator",
            memberPath: ["Coordinator"],
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
      }),
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    } as any;

    await service.recordRunActivity(activeRun, {
      summary: "First external message",
    });

    expect(mocks.teamRunHistoryCatalogService.recordTeamRunSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-1",
        summary: "First external message",
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
            { memberName: "subTeam", refType: "agent_team", ref: "sub-team" , refScope: "shared" },
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

  it("rejects a subteam node as the root coordinator", async () => {
    const { service, mocks } = createSubject();
    const createdRun = {
      runId: "team-1",
      config: new TeamRunConfig({
        teamDefinitionId: "root-team",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: "Specialist",
        memberConfigs: [],
      }),
      getRuntimeContext: vi.fn().mockReturnValue({ memberContexts: [] }),
    } as any;
    mocks.agentTeamRunManager.createTeamRun.mockResolvedValue(createdRun);

    (service as unknown as { teamDefinitionService: { getDefinitionById: (id: string) => Promise<unknown> } }).teamDefinitionService = {
      getDefinitionById: vi.fn(async (id: string) => {
        if (id === "root-team") {
          return {
            name: "Root Team",
            coordinatorMemberName: "SubTeam",
            nodes: [{ memberName: "SubTeam", refType: "agent_team", ref: "sub-team" , refScope: "shared" }],
          };
        }
        if (id === "sub-team") {
          return {
            name: "Sub Team",
            coordinatorMemberName: "Specialist",
            nodes: [{ memberName: "Specialist", refType: "agent", ref: "agent-specialist" , refScope: "shared" }],
          };
        }
        return null;
      }),
    } as any;

    await expect(service.createTeamRun({
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
    })).rejects.toThrow("must be an agent member");
    expect(mocks.agentTeamRunManager.createTeamRun).not.toHaveBeenCalled();
  });
});
