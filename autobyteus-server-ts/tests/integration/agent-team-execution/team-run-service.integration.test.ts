import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
  type MixedTeamMemberContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import {
  TeamRunConfig,
  type TeamMemberRunConfig,
  type TeamRunMemberConfig,
} from "../../../src/agent-team-execution/domain/team-run-config.js";
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
  memberKind: "agent",
  memberName: input.memberName,
  memberPath: [input.memberName],
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

const attachMemberRunIds = (
  members: readonly TeamRunMemberConfig[],
  teamRunId: string,
): TeamRunMemberConfig[] => members.map((member) => {
  const memberRunId = member.memberRunId ?? buildTeamMemberRunId(teamRunId, member.memberRouteKey);
  if (member.memberKind === "agent_team") {
    return {
      ...member,
      memberRunId,
      memberConfigs: attachMemberRunIds(member.memberConfigs, teamRunId),
    };
  }
  return { ...member, memberRunId };
});

const platformRunIdFor = (member: TeamMemberRunConfig): string => {
  if (member.runtimeKind === RuntimeKind.AUTOBYTEUS) {
    return `native-${member.memberRouteKey}`;
  }
  if (member.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
    return `session-${member.memberRouteKey}`;
  }
  return `thread-${member.memberRouteKey}`;
};

const buildMixedMemberContexts = (
  members: readonly TeamRunMemberConfig[],
): MixedTeamMemberContext[] => members.map((member) => {
  if (member.memberKind === "agent_team") {
    return new MixedSubTeamMemberContext({
      memberName: member.memberName,
      memberPath: member.memberPath,
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId!,
      teamDefinitionId: member.teamDefinitionId,
      childTeamRunId: member.childTeamRunId ?? null,
      childRuntimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: member.coordinatorMemberRouteKey,
        memberContexts: buildMixedMemberContexts(member.memberConfigs),
      }),
    });
  }
  return new MixedAgentMemberContext({
    memberName: member.memberName,
    memberPath: member.memberPath,
    memberRouteKey: member.memberRouteKey,
    memberRunId: member.memberRunId!,
    runtimeKind: member.runtimeKind,
    platformAgentRunId: platformRunIdFor(member),
  });
});

const createTeamRunFromConfig = (input: {
  runId: string;
  config: TeamRunConfig;
  coordinatorMemberName?: string | null;
}): TeamRun => {
  const memberTree = attachMemberRunIds(input.config.memberTree, input.runId);
  const config = new TeamRunConfig({
    teamDefinitionId: input.config.teamDefinitionId,
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberName: input.config.coordinatorMemberName,
    coordinatorMemberRouteKey: input.config.coordinatorMemberRouteKey,
    memberTree,
  });
  const runtimeContext = new MixedTeamRunContext({
    coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
    memberContexts: buildMixedMemberContexts(config.memberTree),
  });
  const backend: TeamRunBackend = {
    runId: input.runId,
    teamBackendKind: TeamBackendKind.MIXED,
    getRuntimeContext: () => runtimeContext,
    isActive: () => true,
    getStatusSnapshot: () => ({ status: "idle" }),
    getMemberStatusSnapshots: () => [],
    subscribeToEvents: () => () => undefined,
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
    settleMember: vi.fn().mockResolvedValue({ accepted: true }),
    startTaskAgentInstance: vi.fn().mockResolvedValue({ accepted: true }),
    settleTaskAgentInstance: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
    publishEvent: vi.fn(),
  };

  return new TeamRun({
    context: new TeamRunContext({
      runId: input.runId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: input.coordinatorMemberName ?? config.coordinatorMemberName,
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      config,
      runtimeContext,
    }),
    backend,
  });
};

const createTeamDefinition = (input: {
  id: string;
  name: string;
  coordinatorMemberName: string;
  nodes: TeamMember[];
}) => new AgentTeamDefinition({
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
    createdAt: "2026-03-28T00:00:00.000Z",
    updatedAt: "2026-03-28T00:00:00.000Z",
    memberTree: [{
      memberKind: "agent",
      memberRouteKey,
      memberPath: ["Coordinator"],
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
    }],
  };
};

const createHistoryCatalogServiceMock = () => ({
  recordTeamRunCreated: vi.fn().mockResolvedValue(undefined),
  recordTeamRunRestored: vi.fn().mockResolvedValue(undefined),
  recordTeamRunSummary: vi.fn().mockResolvedValue(undefined),
  recordTeamRunTerminated: vi.fn().mockResolvedValue(undefined),
  refreshTeamRunMetadata: vi.fn().mockResolvedValue(undefined),
});

const createTeamDefinitionService = (nodes: TeamMember[] = [
  new TeamMember({ memberName: "Coordinator", ref: "agent-Coordinator", refType: "agent", refScope: "shared" }),
]) => ({
  getDefinitionById: vi.fn().mockResolvedValue(createTeamDefinition({
    id: "team-def-1",
    name: "Team One",
    coordinatorMemberName: "Coordinator",
    nodes,
  })),
});

const createWorkspaceManager = () => ({
  ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
    workspaceId: "workspace-restored",
    getBasePath: () => "/tmp/team-workspace",
  }),
  getWorkspaceById: vi.fn().mockReturnValue({
    getBasePath: () => "/tmp/team-workspace",
  }),
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TeamRunService integration", () => {
  it("builds launch preset member configs through mixed topology", async () => {
    const service = new TeamRunService({
      agentTeamRunManager: {} as never,
      teamDefinitionService: createTeamDefinitionService() as never,
      teamRunMetadataService: {} as never,
      teamRunHistoryCatalogService: createHistoryCatalogServiceMock() as never,
      workspaceManager: createWorkspaceManager() as never,
    });

    const configs = await service.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: "team-def-1",
      launchPreset: {
        workspaceRootPath: "/tmp/team-workspace",
        llmModelIdentifier: "gpt-5.4-mini",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      },
    });

    expect(configs).toEqual([
      expect.objectContaining({
        memberName: "Coordinator",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
    ]);
  });

  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("creates a %s team run through the mixed backend and persists member metadata", async (runtimeKind) => {
    const config = new TeamRunConfig({
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      memberConfigs: [createMemberConfig({
        memberName: "Coordinator",
        runtimeKind,
        llmModelIdentifier: `model-${runtimeKind}`,
        workspaceId: "workspace-1",
      })],
    });
    const run = createTeamRunFromConfig({
      runId: "team-run-1",
      config,
      coordinatorMemberName: "Coordinator",
    });
    const agentTeamRunManager = {
      createTeamRun: vi.fn().mockResolvedValue(run),
      restoreTeamRun: vi.fn(),
      getTeamRun: vi.fn(),
      terminateTeamRun: vi.fn(),
    };
    const historyCatalogService = createHistoryCatalogServiceMock();
    const service = new TeamRunService({
      agentTeamRunManager: agentTeamRunManager as never,
      teamDefinitionService: createTeamDefinitionService() as never,
      teamRunMetadataService: { readMetadata: vi.fn() } as never,
      teamRunHistoryCatalogService: historyCatalogService as never,
      workspaceManager: createWorkspaceManager() as never,
      memoryDir: "/tmp/memory",
    });

    const result = await service.createTeamRun({
      teamDefinitionId: "team-def-1",
      memberConfigs: config.memberConfigs,
    });

    expect(result.runId).toBe("team-run-1");
    expect(result.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(agentTeamRunManager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({ teamBackendKind: TeamBackendKind.MIXED }),
    );
    expect(historyCatalogService.recordTeamRunCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "team-run-1",
        metadata: expect.objectContaining({
          memberTree: [expect.objectContaining({
            runtimeKind,
            platformAgentRunId: platformRunIdFor(result.config!.memberConfigs[0]!),
            workspaceRootPath: "/tmp/team-workspace",
          })],
        }),
      }),
    );
  });

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-restore-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-restore-1"],
  ] as const)("restores historical %s metadata as MixedTeamRunContext", async (runtimeKind, platformAgentRunId) => {
    const metadata = createSingleRuntimeMetadata({
      teamRunId: `team-run-${runtimeKind}`,
      runtimeKind,
      platformAgentRunId,
    });
    let activeRun: TeamRun | null = null;
    const agentTeamRunManager = {
      createTeamRun: vi.fn(),
      restoreTeamRun: vi.fn().mockImplementation(async (context: TeamRunContext<MixedTeamRunContext>) => {
        activeRun = createTeamRunFromConfig({
          runId: context.runId,
          config: context.config!,
          coordinatorMemberName: context.coordinatorMemberName,
        });
        return activeRun;
      }),
      getTeamRun: vi.fn().mockImplementation(() => activeRun),
      terminateTeamRun: vi.fn().mockResolvedValue(true),
    };
    const historyCatalogService = createHistoryCatalogServiceMock();
    const service = new TeamRunService({
      agentTeamRunManager: agentTeamRunManager as never,
      teamDefinitionService: createTeamDefinitionService() as never,
      teamRunMetadataService: { readMetadata: vi.fn().mockResolvedValue(metadata) } as never,
      teamRunHistoryCatalogService: historyCatalogService as never,
      workspaceManager: createWorkspaceManager() as never,
      memoryDir: "/tmp/memory",
    });

    await expect(service.restoreTeamRun(metadata.teamRunId)).resolves.toMatchObject({
      runId: metadata.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
    });
    const restoredContext = agentTeamRunManager.restoreTeamRun.mock.calls[0]?.[0] as TeamRunContext<MixedTeamRunContext>;
    expect(restoredContext.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(restoredContext.runtimeContext).toBeInstanceOf(MixedTeamRunContext);
    expect(restoredContext.runtimeContext.memberContexts[0]).toEqual(expect.objectContaining({
      runtimeKind,
      platformAgentRunId,
    }));
    expect(historyCatalogService.recordTeamRunRestored).toHaveBeenCalledWith(
      expect.objectContaining({ teamRunId: metadata.teamRunId }),
    );
  });

  it("records termination history only when team termination succeeds", async () => {
    const historyCatalogService = createHistoryCatalogServiceMock();
    const agentTeamRunManager = {
      terminateTeamRun: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
    };
    const service = new TeamRunService({
      agentTeamRunManager: agentTeamRunManager as never,
      teamDefinitionService: createTeamDefinitionService() as never,
      teamRunMetadataService: {} as never,
      teamRunHistoryCatalogService: historyCatalogService as never,
      workspaceManager: createWorkspaceManager() as never,
    });

    await expect(service.terminateTeamRun("team-run-1")).resolves.toBe(false);
    expect(historyCatalogService.recordTeamRunTerminated).not.toHaveBeenCalled();
    await expect(service.terminateTeamRun("team-run-1")).resolves.toBe(true);
    expect(historyCatalogService.recordTeamRunTerminated).toHaveBeenCalledWith({ teamRunId: "team-run-1" });
  });
});
