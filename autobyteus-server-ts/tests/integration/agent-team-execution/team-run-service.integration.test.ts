import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import {
  AutoByteusTeamMemberContext,
  AutoByteusTeamRunContext,
} from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-context.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import {
  CodexTeamMemberContext,
  CodexTeamRunContext,
} from "../../../src/agent-team-execution/backends/codex/codex-team-run-context.js";
import {
  MixedTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind, resolveSingleRuntimeTeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
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
  teamBackendKind: TeamBackendKind;
  config: TeamRunConfig;
  runtimeContext: unknown;
  coordinatorMemberName?: string | null;
}) => {
  const backend: TeamRunBackend = {
    runId: input.runId,
    teamBackendKind: input.teamBackendKind,
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
      teamBackendKind: input.teamBackendKind,
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

const createSingleRuntimeMetadata = (input: {
  teamRunId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string;
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
        platformAgentRunId: input.platformAgentRunId,
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

const createMixedMetadata = (teamRunId: string): TeamRunMetadata => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "Coordinator",
  runVersion: 1,
  createdAt: "2026-03-28T00:00:00.000Z",
  updatedAt: "2026-03-28T00:00:00.000Z",
  memberMetadata: [
    {
      memberRouteKey: "Coordinator",
      memberName: "Coordinator",
      memberRunId: buildTeamMemberRunId(teamRunId, "Coordinator"),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "thread-mixed-1",
      agentDefinitionId: "agent-Coordinator",
      llmModelIdentifier: "model-Coordinator",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      llmConfig: { tag: "Coordinator" },
      workspaceRootPath: "/tmp/team-workspace",
    },
    {
      memberRouteKey: "Reviewer",
      memberName: "Reviewer",
      memberRunId: buildTeamMemberRunId(teamRunId, "Reviewer"),
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      platformAgentRunId: "session-mixed-1",
      agentDefinitionId: "agent-Reviewer",
      llmModelIdentifier: "model-Reviewer",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      llmConfig: { tag: "Reviewer" },
      workspaceRootPath: "/tmp/team-workspace",
    },
  ],
});

const buildSingleRuntimeContext = (input: {
  runtimeKind: RuntimeKind;
  memberRunId: string;
  llmModelIdentifier: string;
  platformAgentRunId: string;
}) => {
  if (input.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
    return new CodexTeamRunContext({
      coordinatorMemberRouteKey: "Coordinator",
      memberContexts: [
        new CodexTeamMemberContext({
          memberName: "Coordinator",
          memberRouteKey: "Coordinator",
          memberRunId: input.memberRunId,
          agentRunConfig: new AgentRunConfig({
            runtimeKind: input.runtimeKind,
            agentDefinitionId: "agent-Coordinator",
            llmModelIdentifier: input.llmModelIdentifier,
            autoExecuteTools: true,
            workspaceId: "workspace-1",
            llmConfig: { tag: "Coordinator" },
            skillAccessMode: SkillAccessMode.NONE,
          }),
          threadId: input.platformAgentRunId,
        }),
      ],
    });
  }

  if (input.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
    return new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: "Coordinator",
      memberContexts: [
        new ClaudeTeamMemberContext({
          memberName: "Coordinator",
          memberRouteKey: "Coordinator",
          memberRunId: input.memberRunId,
          agentRunConfig: new AgentRunConfig({
            runtimeKind: input.runtimeKind,
            agentDefinitionId: "agent-Coordinator",
            llmModelIdentifier: input.llmModelIdentifier,
            autoExecuteTools: true,
            workspaceId: "workspace-1",
            llmConfig: { tag: "Coordinator" },
            skillAccessMode: SkillAccessMode.NONE,
          }),
          sessionId: input.platformAgentRunId,
        }),
      ],
    });
  }

  return new AutoByteusTeamRunContext({
    coordinatorMemberRouteKey: "Coordinator",
    memberContexts: [
      new AutoByteusTeamMemberContext({
        memberName: "Coordinator",
        memberRouteKey: "Coordinator",
        memberRunId: input.memberRunId,
        nativeAgentId: input.platformAgentRunId,
      }),
    ],
  });
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
      expect(memberConfigs.every((config) => config.runtimeKind === runtimeKind)).toBe(true);
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
      const teamBackendKind = resolveSingleRuntimeTeamBackendKind(runtimeKind);
      const config = new TeamRunConfig({
        teamDefinitionId: "team-def-1",
        teamBackendKind,
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
      const platformAgentRunId =
        runtimeKind === RuntimeKind.AUTOBYTEUS
          ? "native-1"
          : runtimeKind === RuntimeKind.CODEX_APP_SERVER
            ? "thread-1"
            : "session-1";
      const runtimeContext = buildSingleRuntimeContext({
        runtimeKind,
        memberRunId,
        llmModelIdentifier,
        platformAgentRunId,
      });
      const run = createTeamRun({
        runId: "team-run-1",
        teamBackendKind,
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
      expect(result.teamBackendKind).toBe(teamBackendKind);
      expect(agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
        expect.objectContaining({
          teamBackendKind,
        }),
      );
      expect(metadataService.writeMetadata).toHaveBeenCalledWith(
        "team-run-1",
        expect.objectContaining({
          teamDefinitionId: "team-def-1",
          teamDefinitionName: "Team One",
          memberMetadata: [
            expect.objectContaining({
              platformAgentRunId,
              llmModelIdentifier,
              workspaceRootPath: "/tmp/team-workspace",
            }),
          ],
        }),
      );
      expect(historyIndexService.recordRunCreated).toHaveBeenCalledTimes(1);
    },
  );

  it("selects the mixed backend during create and persists mixed member metadata", async () => {
    const memberConfigs = [
      createMemberConfig({
        memberName: "Coordinator",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "model-coordinator",
        workspaceId: "workspace-1",
      }),
      createMemberConfig({
        memberName: "Reviewer",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        llmModelIdentifier: "model-reviewer",
        workspaceId: "workspace-1",
      }),
    ];
    const config = new TeamRunConfig({
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      memberConfigs,
    });
    const runtimeContext = new MixedTeamRunContext({
      coordinatorMemberRouteKey: "Coordinator",
      memberContexts: [
        new MixedTeamMemberContext({
          memberName: "Coordinator",
          memberRouteKey: "Coordinator",
          memberRunId: buildTeamMemberRunId("team-run-mixed-1", "Coordinator"),
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "thread-mixed-1",
        }),
        new MixedTeamMemberContext({
          memberName: "Reviewer",
          memberRouteKey: "Reviewer",
          memberRunId: buildTeamMemberRunId("team-run-mixed-1", "Reviewer"),
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          platformAgentRunId: "session-mixed-1",
        }),
      ],
    });
    const run = createTeamRun({
      runId: "team-run-mixed-1",
      teamBackendKind: TeamBackendKind.MIXED,
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
          nodes: [
            new TeamMember({ memberName: "Coordinator", ref: "agent-Coordinator", refType: "agent" }),
            new TeamMember({ memberName: "Reviewer", ref: "agent-Reviewer", refType: "agent" }),
          ],
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
      memberConfigs,
    });

    expect(result.runId).toBe("team-run-mixed-1");
    expect(result.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: "Coordinator",
      }),
    );
    expect(metadataService.writeMetadata).toHaveBeenCalledWith(
      "team-run-mixed-1",
      expect.objectContaining({
        memberMetadata: expect.arrayContaining([
          expect.objectContaining({
            memberName: "Coordinator",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            platformAgentRunId: "thread-mixed-1",
          }),
          expect.objectContaining({
            memberName: "Reviewer",
            runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
            platformAgentRunId: "session-mixed-1",
          }),
        ]),
      }),
    );
    expect(historyIndexService.recordRunCreated).toHaveBeenCalledTimes(1);
  });

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-restore-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-restore-1"],
  ] as const)(
    "restores a %s team run with the correct member runtime context and refreshed metadata/history",
    async (runtimeKind, platformAgentRunId) => {
      const metadata = createSingleRuntimeMetadata({
        teamRunId: `team-run-${runtimeKind}`,
        runtimeKind,
        platformAgentRunId,
      });
      const teamBackendKind = resolveSingleRuntimeTeamBackendKind(runtimeKind);
      let activeRun: TeamRun | null = null;
      const agentTeamRunManager = {
        createTeamRun: vi.fn(),
        restoreTeamRun: vi.fn().mockImplementation(async (context: TeamRunContext) => {
          activeRun = createTeamRun({
            runId: context.runId,
            teamBackendKind: context.teamBackendKind,
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
      expect(restored.teamBackendKind).toBe(teamBackendKind);
      const restoredContext = agentTeamRunManager.restoreTeamRun.mock.calls[0]?.[0] as TeamRunContext;
      expect(restoredContext.teamBackendKind).toBe(teamBackendKind);
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

  it("restores a mixed team run with mixed runtime member contexts and refreshed metadata/history", async () => {
    const metadata = createMixedMetadata("team-run-mixed-restore-1");
    let activeRun: TeamRun | null = null;
    const agentTeamRunManager = {
      createTeamRun: vi.fn(),
      restoreTeamRun: vi.fn().mockImplementation(async (context: TeamRunContext) => {
        activeRun = createTeamRun({
          runId: context.runId,
          teamBackendKind: context.teamBackendKind,
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
          nodes: [
            new TeamMember({ memberName: "Coordinator", ref: "agent-Coordinator", refType: "agent" }),
            new TeamMember({ memberName: "Reviewer", ref: "agent-Reviewer", refType: "agent" }),
          ],
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
    expect(restored.teamBackendKind).toBe(TeamBackendKind.MIXED);
    const restoredContext = agentTeamRunManager.restoreTeamRun.mock.calls[0]?.[0] as TeamRunContext;
    expect(restoredContext.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(restoredContext.runtimeContext).toBeInstanceOf(MixedTeamRunContext);
    expect((restoredContext.runtimeContext as MixedTeamRunContext).memberContexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "Coordinator",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "thread-mixed-1",
        }),
        expect.objectContaining({
          memberName: "Reviewer",
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          platformAgentRunId: "session-mixed-1",
        }),
      ]),
    );
    expect(metadataService.writeMetadata).toHaveBeenCalledWith(
      metadata.teamRunId,
      expect.objectContaining({
        memberMetadata: expect.arrayContaining([
          expect.objectContaining({
            memberName: "Coordinator",
            platformAgentRunId: "thread-mixed-1",
          }),
          expect.objectContaining({
            memberName: "Reviewer",
            platformAgentRunId: "session-mixed-1",
          }),
        ]),
      }),
    );
    expect(historyIndexService.recordRunRestored).toHaveBeenCalledTimes(1);
  });

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
