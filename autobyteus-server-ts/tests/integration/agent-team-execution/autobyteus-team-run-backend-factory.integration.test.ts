import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentConfig, AgentTeamConfig } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { AutoByteusTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamCreationError } from "../../../src/agent-team-execution/errors.js";
import { buildTeamMemberRunId } from "../../../src/run-history/utils/team-member-run-id.js";

type ProcessorRegistry<T> = {
  getProcessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => Array<{ name: string; isMandatory: boolean }>;
};

type PreprocessorRegistry<T> = {
  getPreprocessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => Array<{ name: string; isMandatory: boolean }>;
};

const makeEmptyRegistries = () => ({
  input: {
    getProcessor: vi.fn(),
    getOrderedProcessorOptions: () => [],
  } as ProcessorRegistry<unknown>,
  llmResponse: {
    getProcessor: vi.fn(),
    getOrderedProcessorOptions: () => [],
  } as ProcessorRegistry<unknown>,
  systemPrompt: {
    getProcessor: vi.fn(),
    getOrderedProcessorOptions: () => [],
  } as ProcessorRegistry<unknown>,
  toolExecutionResult: {
    getProcessor: vi.fn(),
    getOrderedProcessorOptions: () => [],
  } as ProcessorRegistry<unknown>,
  toolInvocationPreprocessor: {
    getPreprocessor: vi.fn(),
    getOrderedProcessorOptions: () => [],
  } as PreprocessorRegistry<unknown>,
  lifecycle: {
    getProcessor: vi.fn(),
    getOrderedProcessorOptions: () => [],
  } as ProcessorRegistry<unknown>,
});

type FakeTeam = {
  teamId: string;
  currentStatus: string;
  context: {
    agents: Array<{
      agentId: string;
      context: {
        config: {
          name: string;
        };
      };
    }>;
  };
  start: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
  postToolExecutionApproval: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const createFakeTeam = (teamId: string): FakeTeam => ({
  teamId,
  currentStatus: "IDLE",
  context: {
    agents: [
      {
        agentId: "Coordinator_Coordinator_1234",
        context: {
          config: {
            name: "Coordinator",
          },
        },
      },
    ],
  },
  start: vi.fn(),
  postMessage: vi.fn().mockResolvedValue(undefined),
  postToolExecutionApproval: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
});

const createFactory = () => {
  const activeTeams = new Map<string, FakeTeam>();

  const teamFactory = {
    createTeam: vi.fn().mockImplementation((config: AgentTeamConfig) => {
      const team = createFakeTeam(`team-${config.name}`);
      activeTeams.set(team.teamId, team);
      return team;
    }),
    createTeamWithId: vi.fn().mockImplementation((teamId: string) => {
      const team = createFakeTeam(teamId);
      activeTeams.set(team.teamId, team);
      return team;
    }),
    removeTeam: vi.fn().mockImplementation(async (teamId: string) => activeTeams.delete(teamId)),
    getTeam: vi.fn().mockImplementation((teamId: string) => activeTeams.get(teamId) ?? null),
    listActiveTeamIds: vi.fn().mockImplementation(() => [...activeTeams.keys()]),
  };

  const teamDefinitionService = {
    getDefinitionById: vi.fn(),
    getFreshDefinitionById: vi.fn(),
  };

  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(),
    getFreshAgentDefinitionById: vi.fn(),
  };

  const llmFactory = {
    createLLM: vi.fn().mockResolvedValue({ provider: "lmstudio" }),
  };

  const workspaceManager = {
    getWorkspaceById: vi.fn().mockReturnValue(null),
  };

  const skillService = {
    getSkill: vi.fn(),
  };

  const waitForIdle = vi.fn().mockResolvedValue(undefined);

  const factory = new AutoByteusTeamRunBackendFactory({
    teamFactory: teamFactory as any,
    teamDefinitionService: teamDefinitionService as any,
    agentDefinitionService: agentDefinitionService as any,
    llmFactory: llmFactory as any,
    workspaceManager: workspaceManager as any,
    skillService: skillService as any,
    registries: makeEmptyRegistries(),
    waitForIdle,
  });

  return {
    factory,
    teamFactory,
    teamDefinitionService,
    agentDefinitionService,
    llmFactory,
    waitForIdle,
    activeTeams,
  };
};

const createSimpleTeamDefinition = () =>
  new AgentTeamDefinition({
    id: "team-def-1",
    name: "ResearchTeam",
    description: "Research coordination team",
    instructions: "Coordinate research work.",
    nodes: [
      new TeamMember({
        memberName: "Coordinator",
        ref: "agent-def-1",
        refType: "agent",
      }),
    ],
    coordinatorMemberName: "Coordinator",
  });

const createSimpleAgentDefinition = () =>
  new AgentDefinition({
    id: "agent-def-1",
    name: "CoordinatorBlueprint",
    role: "Coordinator",
    description: "Coordinates team work.",
    instructions: "Think carefully and coordinate the team.",
  });

const createSimpleConfig = (llmConfig: Record<string, unknown> | null = null) =>
  new TeamRunConfig({
    teamDefinitionId: "team-def-1",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberConfigs: [
      {
        memberName: "Coordinator",
        memberRouteKey: "coordinator",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "qwen3.5",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmConfig,
      } satisfies TeamMemberRunConfig,
    ],
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("AutoByteusTeamRunBackendFactory integration", () => {
  it("creates a runtime team from fresh definitions and returns an active backend", async () => {
    const {
      factory,
      teamFactory,
      teamDefinitionService,
      agentDefinitionService,
      llmFactory,
      waitForIdle,
    } = createFactory();

    teamDefinitionService.getFreshDefinitionById.mockResolvedValue(createSimpleTeamDefinition());
    agentDefinitionService.getFreshAgentDefinitionById.mockResolvedValue(createSimpleAgentDefinition());

    const backend = await factory.createBackend(createSimpleConfig());

    expect(teamDefinitionService.getFreshDefinitionById).toHaveBeenCalledWith("team-def-1");
    expect(agentDefinitionService.getFreshAgentDefinitionById).toHaveBeenCalledWith("agent-def-1");
    expect(llmFactory.createLLM).toHaveBeenCalledWith("qwen3.5", undefined);
    expect(teamFactory.createTeam).not.toHaveBeenCalled();
    expect(teamFactory.createTeamWithId).toHaveBeenCalledTimes(1);
    const [createdTeamId, builtConfig] = teamFactory.createTeamWithId.mock.calls[0] as [
      string,
      AgentTeamConfig,
    ];
    expect(builtConfig).toBeInstanceOf(AgentTeamConfig);
    expect(builtConfig.name).toBe("ResearchTeam");
    expect(createdTeamId).toMatch(/^team_researchteam_[a-f0-9]{8}$/);
    expect(builtConfig.coordinatorNode.nodeDefinition).toBeInstanceOf(AgentConfig);
    const coordinatorConfig = builtConfig.coordinatorNode.nodeDefinition as AgentConfig;
    expect(coordinatorConfig.systemPrompt).toBe(
      "Think carefully and coordinate the team.",
    );
    expect(coordinatorConfig.memoryDir).toEqual(
      expect.stringContaining(`agent_teams/${createdTeamId}/`),
    );
    expect(coordinatorConfig.initialCustomData).toMatchObject({
      member_route_key: "coordinator",
      member_run_id: buildTeamMemberRunId(createdTeamId, "coordinator"),
    });

    const createdTeam = teamFactory.createTeamWithId.mock.results[0]?.value as FakeTeam;
    expect(createdTeam.start).toHaveBeenCalledTimes(1);
    expect(waitForIdle).toHaveBeenCalledWith(createdTeam, 120.0);

    expect(backend.runId).toBe(createdTeam.teamId);
    expect(backend.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
    expect(backend.isActive()).toBe(true);
    expect(backend.getRuntimeContext()).toEqual(
      expect.objectContaining({
        coordinatorMemberRouteKey: null,
        memberContexts: [
          expect.objectContaining({
            memberName: "Coordinator",
            memberRouteKey: "coordinator",
            memberRunId: buildTeamMemberRunId(createdTeamId, "coordinator"),
            nativeAgentId: "Coordinator_Coordinator_1234",
          }),
        ],
      }),
    );

    await expect(
      backend.postMessage(new AgentInputUserMessage("hello"), "Coordinator"),
    ).resolves.toEqual({ accepted: true });
    expect(createdTeam.postMessage).toHaveBeenCalledTimes(1);
  });

  it("restores a backend with the preferred runtime team id", async () => {
    const { factory, teamFactory, teamDefinitionService, agentDefinitionService } = createFactory();

    teamDefinitionService.getFreshDefinitionById.mockResolvedValue(createSimpleTeamDefinition());
    agentDefinitionService.getFreshAgentDefinitionById.mockResolvedValue(createSimpleAgentDefinition());

    const context = new TeamRunContext({
      runId: "team-restore-1",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      config: createSimpleConfig(),
      runtimeContext: { teamId: "team-restore-1" },
    });

    const backend = await factory.restoreBackend(context);

    expect(teamFactory.createTeamWithId).toHaveBeenCalledWith(
      "team-restore-1",
      expect.any(AgentTeamConfig),
    );
    expect(backend.runId).toBe("team-restore-1");
    expect(backend.getRuntimeContext()).toEqual(
      expect.objectContaining({
        coordinatorMemberRouteKey: null,
        memberContexts: [
          expect.objectContaining({
            memberName: "Coordinator",
            memberRouteKey: "coordinator",
            memberRunId: buildTeamMemberRunId("team-restore-1", "coordinator"),
            nativeAgentId: "Coordinator_Coordinator_1234",
          }),
        ],
      }),
    );
  });

  it("creates a backend and passes llmConfig through to the runtime llm factory", async () => {
    const { factory, teamDefinitionService, agentDefinitionService, llmFactory } = createFactory();

    teamDefinitionService.getFreshDefinitionById.mockResolvedValue(createSimpleTeamDefinition());
    agentDefinitionService.getFreshAgentDefinitionById.mockResolvedValue(createSimpleAgentDefinition());

    const llmConfig = { temperature: 0.2, top_p: 0.95 };
    const backend = await factory.createBackend(createSimpleConfig(llmConfig));

    expect(backend.runId).toMatch(/^team_researchteam_[a-f0-9]{8}$/);
    expect(backend.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
    expect(backend.getRuntimeContext()).toEqual(
      expect.objectContaining({
        coordinatorMemberRouteKey: null,
        memberContexts: [
          expect.objectContaining({
            memberName: "Coordinator",
            memberRouteKey: "coordinator",
            memberRunId: buildTeamMemberRunId(backend.runId, "coordinator"),
            nativeAgentId: "Coordinator_Coordinator_1234",
          }),
        ],
      }),
    );

    expect(llmFactory.createLLM).toHaveBeenCalledWith(
      "qwen3.5",
      expect.any(LLMConfig),
    );
    const llmConfigArg = llmFactory.createLLM.mock.calls[0]?.[1] as LLMConfig;
    expect(llmConfigArg?.extraParams).toEqual(llmConfig);
  });

  it("fails when required member config is missing", async () => {
    const { factory, teamDefinitionService } = createFactory();

    teamDefinitionService.getFreshDefinitionById.mockResolvedValue(
      new AgentTeamDefinition({
        id: "team-def-1",
        name: "BrokenTeam",
        description: "Missing config team",
        instructions: "Coordinate work.",
        nodes: [
          new TeamMember({
            memberName: "WorkerA",
            ref: "agent-def-1",
            refType: "agent",
          }),
        ],
        coordinatorMemberName: "WorkerA",
      }),
    );

    await expect(
      factory.createBackend(
        new TeamRunConfig({
          teamDefinitionId: "team-def-1",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberConfigs: [],
        }),
      ),
    ).rejects.toThrowError(AgentTeamCreationError);
  });
});
