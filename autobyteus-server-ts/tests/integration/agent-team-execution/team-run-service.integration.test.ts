import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { AutoByteusTeamRunContext } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-context.js";
import { ClaudeTeamMemberContext, ClaudeTeamRunContext } from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import { CodexTeamMemberContext, CodexTeamRunContext } from "../../../src/agent-team-execution/backends/codex/codex-team-run-context.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { buildTeamMemberRunId } from "../../../src/run-history/utils/team-member-run-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createMemberConfig = (input: {
  memberName: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier?: string;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
}): TeamMemberRunConfig => ({
  memberName: input.memberName,
  memberRouteKey: input.memberRouteKey ?? input.memberName,
  memberRunId: input.memberRunId ?? null,
  agentDefinitionId: `agent-${input.memberName}`,
  llmModelIdentifier: input.llmModelIdentifier ?? `model-${input.memberName}`,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: input.runtimeKind,
  workspaceId: input.workspaceId ?? null,
  workspaceRootPath: input.workspaceRootPath ?? null,
  llmConfig: { tag: input.memberName },
});

const createTeamRun = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  config: TeamRunConfig;
  runtimeContext: unknown;
  coordinatorMemberName?: string | null;
}) => {
  const backend: TeamRunBackend = {
    runId: input.runId,
    runtimeKind: input.runtimeKind,
    getRuntimeContext: () => input.runtimeContext as never,
    isActive: () => true,
    getStatus: () => "IDLE",
    subscribeToEvents: () => () => undefined,
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
  };

  return new TeamRun({
    context: new TeamRunContext({
      runId: input.runId,
      runtimeKind: input.runtimeKind,
      coordinatorMemberName: input.coordinatorMemberName ?? null,
      config: input.config,
      runtimeContext: input.runtimeContext as never,
    }),
    backend,
  });
};

const createTeamDefinition = (input: {
  id: string;
  name: string;
  coordinatorMemberName: string;
  nodes: TeamMember[];
}) =>
  new AgentTeamDefinition({
    id: input.id,
    name: input.name,
    description: `${input.name} description`,
    instructions: `${input.name} instructions`,
    coordinatorMemberName: input.coordinatorMemberName,
    nodes: input.nodes,
  });

const createMetadata = (input: {
  teamRunId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunIdField: string;
}): TeamRunMetadata => {
  const memberRouteKey = "Coordinator";
  const memberRunId = buildTeamMemberRunId(input.teamRunId, memberRouteKey);
  return {
    teamRunId: input.teamRunId,
    teamDefinitionId: "team-def-1",
    teamDefinitionName: "Team One",
    coordinatorMemberRouteKey: memberRouteKey,
    runVersion: 1,
    createdAt: "2026-03-28T00:00:00.000Z",
    updatedAt: "2026-03-28T00:00:00.000Z",
    memberMetadata: [
      {
        memberRouteKey,
        memberName: "Coordinator",
        memberRunId,
        runtimeKind: input.runtimeKind,
        platformAgentRunId: input.platformAgentRunIdField,
        agentDefinitionId: "agent-Coordinator",
        llmModelIdentifier: "model-Coordinator",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        llmConfig: { tag: "Coordinator" },
        workspaceRootPath: "/tmp/team-workspace",
      },
    ],
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("TeamRunService integration", () => {
  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])(
    "builds member configs from a launch preset by flattening nested team definitions for %s",
    async (runtimeKind) => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockImplementation(async (id: string) => {
        if (id === "root-team") {
          return createTeamDefinition({
            id: "root-team",
            name: "Root Team",
            coordinatorMemberName: "Lead",
            nodes: [
              new TeamMember({ memberName: "Lead", ref: "agent-1", refType: "agent" }),
              new TeamMember({ memberName: "SubTeam", ref: "sub-team", refType: "agent_team" }),
            ],
          });
        }
        if (id === "sub-team") {
          return createTeamDefinition({
            id: "sub-team",
            name: "Sub Team",
            coordinatorMemberName: "Specialist",
            nodes: [new TeamMember({ memberName: "Specialist", ref: "agent-2", refType: "agent" })],
          });
        }
        return null;
      }),
    };
    const service = new TeamRunService({
      teamDefinitionService: teamDefinitionService as never,
      agentTeamRunManager: {
        createTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
        getTeamRun: vi.fn(),
        terminateTeamRun: vi.fn(),
      } as never,
      teamRunMetadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      teamRunHistoryIndexService: {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn(),
        recordRunActivity: vi.fn(),
        recordRunTerminated: vi.fn(),
      } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    const memberConfigs = await service.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: "root-team",
      launchPreset: {
        workspaceRootPath: "/tmp/team-workspace",
        llmModelIdentifier:
          runtimeKind === RuntimeKind.AUTOBYTEUS ? "qwen3.5" : "gpt-5.4-mini",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind,
      },
    });

    expect(memberConfigs.map((config) => config.memberName)).toEqual(["Lead", "Specialist"]);
    expect(memberConfigs.every((config) => config.runtimeKind === runtimeKind)).toBe(
      true,
    );
    expect(memberConfigs.every((config) => config.workspaceRootPath === "/tmp/team-workspace")).toBe(
      true,
    );
    },
  );

  it("detects circular nested team definitions while building launch preset member configs", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockImplementation(async (id: string) => {
        if (id === "A") {
          return createTeamDefinition({
            id: "A",
            name: "Team A",
            coordinatorMemberName: "TeamB",
            nodes: [new TeamMember({ memberName: "TeamB", ref: "B", refType: "agent_team" })],
          });
        }
        if (id === "B") {
          return createTeamDefinition({
            id: "B",
            name: "Team B",
            coordinatorMemberName: "TeamA",
            nodes: [new TeamMember({ memberName: "TeamA", ref: "A", refType: "agent_team" })],
          });
        }
        return null;
      }),
    };
    const service = new TeamRunService({
      teamDefinitionService: teamDefinitionService as never,
      agentTeamRunManager: {
        createTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
        getTeamRun: vi.fn(),
        terminateTeamRun: vi.fn(),
      } as never,
      teamRunMetadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      teamRunHistoryIndexService: {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn(),
        recordRunActivity: vi.fn(),
        recordRunTerminated: vi.fn(),
      } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    await expect(
      service.buildMemberConfigsFromLaunchPreset({
        teamDefinitionId: "A",
        launchPreset: {
          workspaceRootPath: "/tmp/team-workspace",
          llmModelIdentifier: "gpt-5.4-mini",
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.NONE,
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        },
      }),
    ).rejects.toThrow("Circular dependency");
  });

  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])(
    "creates a %s team run, persists metadata/history, and resolves member workspace roots",
    async (runtimeKind) => {
      const llmModelIdentifier =
        runtimeKind === RuntimeKind.AUTOBYTEUS ? "qwen3.5" : `model-${runtimeKind}`;
      const config = new TeamRunConfig({
      teamDefinitionId: "team-def-1",
      runtimeKind,
      memberConfigs: [
        createMemberConfig({
          memberName: "Coordinator",
          runtimeKind,
          llmModelIdentifier,
          workspaceId: "workspace-1",
        }),
      ],
    });
      const memberRunId = buildTeamMemberRunId("team-run-1", "Coordinator");
      const runtimeContext =
        runtimeKind === RuntimeKind.CODEX_APP_SERVER
          ? new CodexTeamRunContext({
              coordinatorMemberRouteKey: "Coordinator",
              memberContexts: [
                new CodexTeamMemberContext({
                  memberName: "Coordinator",
                  memberRouteKey: "Coordinator",
                  memberRunId,
                  agentRunConfig: new AgentRunConfig({
                    runtimeKind,
                    agentDefinitionId: "agent-Coordinator",
                    llmModelIdentifier,
                    autoExecuteTools: true,
                    workspaceId: "workspace-1",
                    llmConfig: { tag: "Coordinator" },
                    skillAccessMode: SkillAccessMode.NONE,
                  }),
                  threadId: "thread-1",
                }),
              ],
            })
          : runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
            ? new ClaudeTeamRunContext({
                coordinatorMemberRouteKey: "Coordinator",
                memberContexts: [
                  new ClaudeTeamMemberContext({
                    memberName: "Coordinator",
                    memberRouteKey: "Coordinator",
                    memberRunId,
                    agentRunConfig: new AgentRunConfig({
                      runtimeKind,
                      agentDefinitionId: "agent-Coordinator",
                      llmModelIdentifier,
                      autoExecuteTools: true,
                      workspaceId: "workspace-1",
                      llmConfig: { tag: "Coordinator" },
                      skillAccessMode: SkillAccessMode.NONE,
                    }),
                    sessionId: "session-1",
                  }),
                ],
              })
            : { teamId: "native-team-1" };
      const run = createTeamRun({
      runId: "team-run-1",
      runtimeKind,
      config,
      runtimeContext,
      coordinatorMemberName: "Coordinator",
    });
    const agentTeamRunManager = {
      createTeamRun: vi.fn().mockResolvedValue(run),
      restoreTeamRun: vi.fn(),
      getTeamRun: vi.fn(),
      terminateTeamRun: vi.fn(),
    };
    const metadataService = {
      writeMetadata: vi.fn().mockResolvedValue(undefined),
      readMetadata: vi.fn(),
    };
    const historyIndexService = {
      recordRunCreated: vi.fn().mockResolvedValue(undefined),
      recordRunRestored: vi.fn(),
      recordRunActivity: vi.fn(),
      recordRunTerminated: vi.fn(),
    };
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue(
        createTeamDefinition({
          id: "team-def-1",
          name: "Team One",
          coordinatorMemberName: "Coordinator",
          nodes: [new TeamMember({ memberName: "Coordinator", ref: "agent-Coordinator", refType: "agent" })],
        }),
      ),
    };
    const workspaceManager = {
      ensureWorkspaceByRootPath: vi.fn(),
      getWorkspaceById: vi.fn().mockReturnValue({
        getBasePath: () => "/tmp/team-workspace",
      }),
    };
    const service = new TeamRunService({
      agentTeamRunManager: agentTeamRunManager as never,
      teamDefinitionService: teamDefinitionService as never,
      teamRunMetadataService: metadataService as never,
      teamRunHistoryIndexService: historyIndexService as never,
      workspaceManager: workspaceManager as never,
      memoryDir: "/tmp/memory",
    });

    const result = await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: config.memberConfigs,
    });

    expect(result.runId).toBe("team-run-1");
    expect(agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeKind,
      }),
    );
    expect(metadataService.writeMetadata).toHaveBeenCalledWith(
      "team-run-1",
      expect.objectContaining({
        teamDefinitionId: "team-def-1",
        teamDefinitionName: "Team One",
        memberMetadata: [
          expect.objectContaining({
            platformAgentRunId:
              runtimeKind === RuntimeKind.CODEX_APP_SERVER
                ? "thread-1"
                : runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
                  ? "session-1"
                  : null,
            llmModelIdentifier,
            workspaceRootPath: "/tmp/team-workspace",
          }),
        ],
      }),
    );
    expect(historyIndexService.recordRunCreated).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects mixed team runtime kinds during create", async () => {
    const service = new TeamRunService({
      agentTeamRunManager: {
        createTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
        getTeamRun: vi.fn(),
        terminateTeamRun: vi.fn(),
      } as never,
      teamDefinitionService: {
        getDefinitionById: vi.fn(),
      } as never,
      teamRunMetadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      teamRunHistoryIndexService: {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn(),
        recordRunActivity: vi.fn(),
        recordRunTerminated: vi.fn(),
      } as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    await expect(
      service.createTeamRun({
        teamDefinitionId: "team-def-1",
        memberConfigs: [
          createMemberConfig({ memberName: "One", runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
          createMemberConfig({ memberName: "Two", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }),
        ],
      }),
    ).rejects.toThrow("[MIXED_TEAM_RUNTIME_UNSUPPORTED]");
  });

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-restore-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-restore-1"],
  ] as const)(
    "restores a %s team run with the correct member runtime context and refreshed metadata/history",
    async (runtimeKind, platformAgentRunId) => {
      const metadata = createMetadata({
        teamRunId: `team-run-${runtimeKind}`,
        runtimeKind,
        platformAgentRunIdField: platformAgentRunId,
      });
      let activeRun: TeamRun | null = null;
      const agentTeamRunManager = {
        createTeamRun: vi.fn(),
        restoreTeamRun: vi.fn().mockImplementation(async (context: TeamRunContext) => {
          activeRun = createTeamRun({
            runId: context.runId,
            runtimeKind,
            config: context.config!,
            runtimeContext: context.runtimeContext,
            coordinatorMemberName: context.coordinatorMemberName,
          });
          return activeRun;
        }),
        getTeamRun: vi.fn().mockImplementation(() => activeRun),
        terminateTeamRun: vi.fn().mockResolvedValue(true),
      };
      const metadataService = {
        writeMetadata: vi.fn().mockResolvedValue(undefined),
        readMetadata: vi.fn().mockResolvedValue(metadata),
      };
      const historyIndexService = {
        recordRunCreated: vi.fn(),
        recordRunRestored: vi.fn().mockResolvedValue(undefined),
        recordRunActivity: vi.fn(),
        recordRunTerminated: vi.fn(),
      };
      const teamDefinitionService = {
        getDefinitionById: vi.fn().mockResolvedValue(
          createTeamDefinition({
            id: "team-def-1",
            name: "Team One",
            coordinatorMemberName: "Coordinator",
            nodes: [new TeamMember({ memberName: "Coordinator", ref: "agent-Coordinator", refType: "agent" })],
          }),
        ),
      };
      const workspaceManager = {
        ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
          workspaceId: "workspace-restored",
          getBasePath: () => "/tmp/team-workspace",
        }),
        getWorkspaceById: vi.fn(),
      };
      const service = new TeamRunService({
        agentTeamRunManager: agentTeamRunManager as never,
        teamDefinitionService: teamDefinitionService as never,
        teamRunMetadataService: metadataService as never,
        teamRunHistoryIndexService: historyIndexService as never,
        workspaceManager: workspaceManager as never,
        memoryDir: "/tmp/memory",
      });

      const restored = await service.restoreTeamRun(metadata.teamRunId);

      expect(restored.runId).toBe(metadata.teamRunId);
      const restoredContext = agentTeamRunManager.restoreTeamRun.mock.calls[0]?.[0] as TeamRunContext;
      expect(restoredContext.config?.memberConfigs[0]?.workspaceId).toBe("workspace-restored");
      if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
        expect(restoredContext.runtimeContext).toBeInstanceOf(AutoByteusTeamRunContext);
        expect(
          (restoredContext.runtimeContext as AutoByteusTeamRunContext).memberContexts[0]?.nativeAgentId,
        ).toBe(platformAgentRunId);
      } else if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
        expect(restoredContext.runtimeContext).toBeInstanceOf(CodexTeamRunContext);
        expect((restoredContext.runtimeContext as CodexTeamRunContext).memberContexts[0]?.threadId).toBe(
          platformAgentRunId,
        );
      } else {
        expect(restoredContext.runtimeContext).toBeInstanceOf(ClaudeTeamRunContext);
        expect((restoredContext.runtimeContext as ClaudeTeamRunContext).memberContexts[0]?.sessionId).toBe(
          platformAgentRunId,
        );
      }
      expect(metadataService.writeMetadata).toHaveBeenCalledWith(
        metadata.teamRunId,
        expect.objectContaining({
          memberMetadata: [
            expect.objectContaining({
              platformAgentRunId,
            }),
          ],
        }),
      );
      expect(historyIndexService.recordRunRestored).toHaveBeenCalledTimes(1);
    },
  );

  it("records termination history only when team termination succeeds", async () => {
    const terminateTeamRun = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const historyIndexService = {
      recordRunCreated: vi.fn(),
      recordRunRestored: vi.fn(),
      recordRunActivity: vi.fn(),
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
    };
    const service = new TeamRunService({
      agentTeamRunManager: {
        createTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
        getTeamRun: vi.fn(),
        terminateTeamRun,
      } as never,
      teamDefinitionService: {
        getDefinitionById: vi.fn(),
      } as never,
      teamRunMetadataService: {
        writeMetadata: vi.fn(),
        readMetadata: vi.fn(),
      } as never,
      teamRunHistoryIndexService: historyIndexService as never,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as never,
    });

    await expect(service.terminateTeamRun("team-run-1")).resolves.toBe(true);
    await expect(service.terminateTeamRun("team-run-2")).resolves.toBe(false);
    expect(historyIndexService.recordRunTerminated).toHaveBeenCalledTimes(1);
    expect(historyIndexService.recordRunTerminated).toHaveBeenCalledWith("team-run-1");
  });
});
