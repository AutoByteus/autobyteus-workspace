import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const definition = {
  id: "team-def-1",
  name: "Team One",
  description: "Team One description",
  instructions: "Coordinate exactly.",
  coordinatorMemberName: "Coordinator",
  nodes: [
    { memberName: "Coordinator", ref: "agent-Coordinator", refType: "agent", refScope: "shared" },
  ],
};

const createHistoryCatalogServiceMock = () => ({
  recordTeamRunCreated: vi.fn().mockResolvedValue(undefined),
  recordTeamRunRestored: vi.fn().mockResolvedValue(undefined),
  recordTeamRunSummary: vi.fn().mockResolvedValue(undefined),
  recordTeamRunTerminated: vi.fn().mockResolvedValue(undefined),
  refreshTeamRunMetadata: vi.fn().mockResolvedValue(undefined),
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

const platformRunIdFor = (node: TeamRunAgentNode): string => {
  if (node.runtimeKind === RuntimeKind.AUTOBYTEUS) return `native-${node.agentRunId}`;
  if (node.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) return `session-${node.agentRunId}`;
  return `thread-${node.agentRunId}`;
};

const createRun = (
  context: TeamRunContext<MixedTeamRunContext>,
): TeamRun => {
  const backend = {
    isActive: () => true,
    getRuntimeContext: () => context.runtimeContext,
    subscribeToEvents: () => () => undefined,
    getLeafAgentStatusSnapshots: () => [],
    hasOpenExecutionWork: () => false,
  } as unknown as TeamRunBackend;
  return new TeamRun({ context, backend });
};

const createRunFromConfig = (
  teamRunId: string,
  config: ReturnType<typeof testTeamRunConfig> | Parameters<typeof createRun>[0]["config"],
): TeamRun => {
  const agents = config.rootTeam.children.filter((node): node is TeamRunAgentNode => node.kind === "agent");
  const runtimeContext = new MixedTeamRunContext({
    memberContexts: agents.map((node) => new MixedAgentMemberContext({
      address: node.address,
      agentRunId: node.agentRunId,
      runtimeKind: node.runtimeKind,
      platformAgentRunId: node.platformAgentRunId ?? platformRunIdFor(node),
    })),
    teamExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: teamRunId,
      memberAddress: config.rootTeam.coordinatorAddress,
    }),
  });
  return createRun(new TeamRunContext({
    teamRunId,
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext,
  }));
};

const launchConfig = (runtimeKind: RuntimeKind) => ({
  memberAddress: "/Coordinator",
  llmModelIdentifier: `model-${runtimeKind}`,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind,
  workspaceRootPath: "/tmp/team-workspace",
  llmConfig: { runtimeKind },
});

const createService = (input: {
  metadata?: TeamRunMetadata | null;
  createRunImplementation?: (config: ReturnType<typeof testTeamRunConfig>, teamRunId: string) => Promise<TeamRun>;
} = {}) => {
  let activeRun: TeamRun | null = null;
  const historyCatalog = createHistoryCatalogServiceMock();
  const manager = {
    createTeamRun: vi.fn(async (config, teamRunId) => {
      activeRun = input.createRunImplementation
        ? await input.createRunImplementation(config, teamRunId)
        : createRunFromConfig(teamRunId, config);
      return activeRun;
    }),
    restoreTeamRun: vi.fn(async (context: TeamRunContext<MixedTeamRunContext>) => {
      activeRun = createRun(context);
      return activeRun;
    }),
    getTeamRun: vi.fn(() => activeRun),
    terminateTeamRun: vi.fn().mockResolvedValue(true),
  };
  const metadataService = {
    readMetadata: vi.fn().mockResolvedValue(input.metadata ?? null),
  };
  let allocation = 0;
  const service = new TeamRunService({
    agentTeamRunManager: manager as never,
    teamDefinitionService: {
      getDefinitionById: vi.fn().mockImplementation(async (id: string) => id === definition.id ? definition : null),
    } as never,
    teamRunMetadataService: metadataService as never,
    teamRunHistoryCatalogService: historyCatalog as never,
    workspaceManager: createWorkspaceManager() as never,
    memoryDir: "/tmp/team-run-service-integration",
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: vi.fn(async () => `agent-run-${++allocation}`),
    },
  });
  return { service, manager, metadataService, historyCatalog };
};

afterEach(() => vi.clearAllMocks());

describe("TeamRunService current-schema integration", () => {
  it("builds launch preset inputs with exact canonical member addresses", async () => {
    const { service } = createService();

    await expect(service.buildMemberConfigsFromLaunchPreset({
      teamDefinitionId: definition.id,
      launchPreset: {
        workspaceRootPath: "/tmp/team-workspace",
        llmModelIdentifier: "gpt-5.6-luna",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      },
    })).resolves.toEqual([
      expect.objectContaining({
        memberAddress: "/Coordinator",
        agentDefinitionId: "agent-Coordinator",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
    ]);
  });

  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("creates a %s TeamRun and records exact schema-v3 topology metadata", async (runtimeKind) => {
    const { service, manager, historyCatalog } = createService();

    const run = await service.createTeamRun({
      teamDefinitionId: definition.id,
      teamRunId: `team-run-${runtimeKind}`,
      memberConfigs: [launchConfig(runtimeKind)],
    });

    expect(run.teamRunId).toBe(`team-run-${runtimeKind}`);
    expect(manager.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamBackendKind: TeamBackendKind.MIXED,
        rootTeam: expect.objectContaining({
          address: "/",
          teamRunId: run.teamRunId,
          coordinatorAddress: "/Coordinator",
          children: [expect.objectContaining({
            kind: "agent",
            address: "/Coordinator",
            runtimeKind,
            agentRunId: "agent-run-1",
          })],
        }),
      }),
      run.teamRunId,
    );
    expect(historyCatalog.recordTeamRunCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: run.teamRunId,
        summary: "",
        metadata: expect.objectContaining({
          schemaVersion: 3,
          rootTeam: expect.objectContaining({
            teamRunId: run.teamRunId,
            children: [expect.objectContaining({
              address: "/Coordinator",
              runtimeKind,
              platformAgentRunId: expect.any(String),
            })],
          }),
        }),
      }),
    );
  });

  it.each([
    [RuntimeKind.AUTOBYTEUS, "native-restore-1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread-restore-1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session-restore-1"],
  ] as const)("restores current schema-v3 %s metadata into an exact mixed runtime context", async (
    runtimeKind,
    platformAgentRunId,
  ) => {
    const coordinator = testAgentNode("/Coordinator", {
      agentDefinitionId: "agent-Coordinator",
      agentRunId: "coordinator-run",
      runtimeKind,
      platformAgentRunId,
      workspaceRootPath: "/tmp/team-workspace",
    });
    const config = testTeamRunConfig({
      rootTeamRunId: `team-run-${runtimeKind}`,
      rootTeamDefinitionId: definition.id,
      coordinatorAddress: coordinator.address,
      children: [coordinator],
    });
    const metadata: TeamRunMetadata = {
      schemaVersion: 3,
      teamDefinitionName: definition.name,
      createdAt: "2026-08-12T00:00:00.000Z",
      archivedAt: null,
      rootTeam: config.rootTeam,
      handoffs: config.handoffs,
    };
    const { service, manager, historyCatalog } = createService({ metadata });

    const restored = await service.restoreTeamRun(config.rootTeam.teamRunId);

    expect(restored.teamRunId).toBe(config.rootTeam.teamRunId);
    const context = manager.restoreTeamRun.mock.calls[0]?.[0] as TeamRunContext<MixedTeamRunContext>;
    expect(context).toMatchObject({
      teamRunId: config.rootTeam.teamRunId,
      teamAddress: "/",
      teamBackendKind: TeamBackendKind.MIXED,
    });
    expect(context.runtimeContext.memberContexts[0]).toMatchObject({
      kind: "agent",
      address: "/Coordinator",
      agentRunId: "coordinator-run",
      runtimeKind,
      platformAgentRunId,
    });
    expect(historyCatalog.recordTeamRunRestored).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: config.rootTeam.teamRunId,
        metadata: expect.objectContaining({ schemaVersion: 3 }),
      }),
    );
  });

  it("records termination history only after successful manager termination", async () => {
    const { service, manager, historyCatalog } = createService();
    manager.terminateTeamRun.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(service.terminateTeamRun("team-run-1")).resolves.toBe(false);
    expect(historyCatalog.recordTeamRunTerminated).not.toHaveBeenCalled();
    await expect(service.terminateTeamRun("team-run-1")).resolves.toBe(true);
    expect(historyCatalog.recordTeamRunTerminated).toHaveBeenCalledWith({ teamRunId: "team-run-1" });
  });
});
