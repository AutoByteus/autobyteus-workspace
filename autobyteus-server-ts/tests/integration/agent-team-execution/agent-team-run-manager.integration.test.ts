import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentConfig, AgentTeamConfig } from "autobyteus-ts";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import {
  AgentTeamRunManager,
  TeamMemberConfigInput,
} from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamCreationError, AgentTeamTerminationError } from "../../../src/agent-team-execution/errors.js";

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

const createManager = (overrides: Partial<ConstructorParameters<typeof AgentTeamRunManager>[0]> = {}) => {
  const fakeTeam = { teamId: "test_team_123", start: vi.fn() };
  const teamFactory = {
    createTeam: vi.fn().mockReturnValue(fakeTeam),
    createTeamWithId: vi.fn().mockImplementation((teamId: string) => ({
      teamId,
      start: vi.fn(),
    })),
    removeTeam: vi.fn().mockResolvedValue(true),
    getTeam: vi.fn().mockReturnValue(fakeTeam),
    listActiveTeamIds: vi.fn().mockReturnValue(["test_team_123"]),
  };

  const teamDefinitionService = {
    getDefinitionById: vi.fn(),
  };

  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(),
  };

  const llmFactory = {
    createLLM: vi.fn().mockResolvedValue({}),
  };

  const workspaceManager = {
    getWorkspaceById: vi.fn().mockReturnValue(null),
  };

  const skillService = {
    getSkill: vi.fn(),
  };

  const promptLoader = {
    getPromptTemplateForAgent: vi.fn().mockResolvedValue(null),
  };

  const waitForIdle = vi.fn().mockResolvedValue(undefined);

  const registries = makeEmptyRegistries();

  const manager = new AgentTeamRunManager({
    teamFactory,
    teamDefinitionService: teamDefinitionService as any,
    agentDefinitionService: agentDefinitionService as any,
    llmFactory: llmFactory as any,
    workspaceManager: workspaceManager as any,
    skillService: skillService as any,
    promptLoader: promptLoader as any,
    registries,
    waitForIdle,
    ...overrides,
  });

  return {
    manager,
    teamFactory,
    teamDefinitionService,
    agentDefinitionService,
    llmFactory,
    workspaceManager,
    skillService,
    promptLoader,
    waitForIdle,
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("AgentTeamRunManager integration", () => {
  it("creates a team instance with member configs applied", async () => {
    const { manager, teamDefinitionService, agentDefinitionService, teamFactory, llmFactory } =
      createManager();

    const coordAgentDef = new AgentDefinition({
      id: "1",
      name: "CoordinatorBlueprint",
      role: "Coord",
      description: "...",
      instructions: "Coordinate work.",
    });
    const workerAgentDef = new AgentDefinition({
      id: "2",
      name: "WorkerBlueprint",
      role: "Worker",
      description: "...",
      instructions: "Execute tasks.",
    });

    agentDefinitionService.getAgentDefinitionById.mockImplementation(async (id: string) => {
      if (id === "1") return coordAgentDef;
      if (id === "2") return workerAgentDef;
      return null;
    });

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      instructions: "Coordinate members.",
      nodes: [
        new TeamMember({
          memberName: "TheCoordinator",
          ref: "1",
          refType: "agent",
        }),
        new TeamMember({
          memberName: "TheWorker",
          ref: "2",
          refType: "agent",
        }),
      ],
      coordinatorMemberName: "TheCoordinator",
    });

    teamDefinitionService.getDefinitionById.mockResolvedValue(teamDef);

    const memberConfigs: TeamMemberConfigInput[] = [
      {
        memberName: "TheCoordinator",
        agentDefinitionId: "1",
        llmModelIdentifier: "gpt-4o",
        autoExecuteTools: false,
      },
      {
        memberName: "TheWorker",
        agentDefinitionId: "2",
        llmModelIdentifier: "claude-3",
        autoExecuteTools: true,
      },
    ];

    const teamId = await manager.createTeamRun("main1", memberConfigs);

    expect(teamId).toBe("test_team_123");
    expect(teamFactory.createTeam).toHaveBeenCalledTimes(1);
    const models = llmFactory.createLLM.mock.calls.map((call) => call[0]);
    expect(models).toContain("gpt-4o");
    expect(models).toContain("claude-3");

    const finalConfig = teamFactory.createTeam.mock.calls[0][0] as AgentTeamConfig;
    const coordConfig = finalConfig.coordinatorNode.nodeDefinition;
    const workerNode = finalConfig.nodes.find((node) => node.name === "TheWorker");
    const workerConfig = workerNode?.nodeDefinition;

    expect(coordConfig).toBeInstanceOf(AgentConfig);
    expect((coordConfig as AgentConfig).name).toBe("TheCoordinator");
    expect((coordConfig as AgentConfig).autoExecuteTools).toBe(false);
    expect(workerConfig).toBeInstanceOf(AgentConfig);
    expect((workerConfig as AgentConfig).name).toBe("TheWorker");
    expect((workerConfig as AgentConfig).autoExecuteTools).toBe(true);
  });

  it("throws when member config is missing", async () => {
    const { manager, teamDefinitionService, agentDefinitionService } = createManager();

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      instructions: "Coordinate members.",
      nodes: [
        new TeamMember({
          memberName: "AgentOne",
          ref: "1",
          refType: "agent",
        }),
      ],
      coordinatorMemberName: "AgentOne",
    });

    teamDefinitionService.getDefinitionById.mockResolvedValue(teamDef);
    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
      new AgentDefinition({
        id: "1",
        name: "A",
        role: "B",
        description: "C",
        instructions: "Do work.",
      }),
    );

    await expect(manager.createTeamRun("main1", [])).rejects.toThrow(
      AgentTeamCreationError,
    );
  });

  it("detects circular dependencies between team definitions", async () => {
    const { manager, teamDefinitionService } = createManager();

    const teamA = new AgentTeamDefinition({
      id: "A",
      name: "TeamA",
      description: "...",
      instructions: "Coordinate TeamA.",
      nodes: [
        new TeamMember({
          memberName: "SubTeamB",
          ref: "B",
          refType: "agent_team",
        }),
      ],
      coordinatorMemberName: "SubTeamB",
    });

    const teamB = new AgentTeamDefinition({
      id: "B",
      name: "TeamB",
      description: "...",
      instructions: "Coordinate TeamB.",
      nodes: [
        new TeamMember({
          memberName: "SubTeamA",
          ref: "A",
          refType: "agent_team",
        }),
      ],
      coordinatorMemberName: "SubTeamA",
    });

    teamDefinitionService.getDefinitionById.mockImplementation(async (id: string) => {
      if (id === "A") return teamA;
      if (id === "B") return teamB;
      return null;
    });

    await expect(manager.createTeamRun("A", [])).rejects.toThrow(
      AgentTeamCreationError,
    );
  });

  it("throws if coordinator is a team instead of an agent", async () => {
    const { manager, teamDefinitionService, agentDefinitionService } = createManager();

    const subCoordAgentDef = new AgentDefinition({
      id: "sub_agent_1",
      name: "SubCoordinator",
      role: "Sub",
      description: "...",
      instructions: "Coordinate sub team.",
    });

    const subTeamDef = new AgentTeamDefinition({
      id: "sub1",
      name: "SubTeam",
      description: "...",
      instructions: "Sub team instructions.",
      nodes: [
        new TeamMember({
          memberName: "SubCoordinator",
          ref: "sub_agent_1",
          refType: "agent",
        }),
      ],
      coordinatorMemberName: "SubCoordinator",
    });

    const mainTeamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      instructions: "Main team instructions.",
      nodes: [
        new TeamMember({
          memberName: "MySubTeam",
          ref: "sub1",
          refType: "agent_team",
        }),
      ],
      coordinatorMemberName: "MySubTeam",
    });

    teamDefinitionService.getDefinitionById.mockImplementation(async (id: string) => {
      if (id === "main1") return mainTeamDef;
      if (id === "sub1") return subTeamDef;
      return null;
    });
    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(subCoordAgentDef);

    const memberConfigs: TeamMemberConfigInput[] = [
      {
        memberName: "SubCoordinator",
        agentDefinitionId: "sub_agent_1",
        llmModelIdentifier: "gpt-3.5",
        autoExecuteTools: true,
      },
    ];

    await expect(manager.createTeamRun("main1", memberConfigs)).rejects.toThrow(
      AgentTeamCreationError,
    );
  });

  it("terminates team instances and propagates failures", async () => {
    const { manager, teamFactory } = createManager();

    const success = await manager.terminateTeamRun("test_team_123");
    expect(success).toBe(true);
    expect(teamFactory.removeTeam).toHaveBeenCalledWith("test_team_123");

    teamFactory.removeTeam.mockRejectedValueOnce(new Error("Factory failed"));
    await expect(manager.terminateTeamRun("bad_id")).rejects.toThrow(
      AgentTeamTerminationError,
    );
  });

  it("retrieves team instance and lists active IDs", () => {
    const { manager, teamFactory } = createManager();

    const team = manager.getTeamRun("test_team_123");
    expect(teamFactory.getTeam).toHaveBeenCalledWith("test_team_123");
    expect(team?.teamId).toBe("test_team_123");

    const ids = manager.listActiveRuns();
    expect(teamFactory.listActiveTeamIds).toHaveBeenCalledTimes(1);
    expect(ids).toEqual(["test_team_123"]);
  });

  it("creates a team instance with an explicit preferred team ID", async () => {
    const { manager, teamDefinitionService, agentDefinitionService, teamFactory } = createManager();

    const coordinator = new AgentDefinition({
      id: "1",
      name: "Coordinator",
      role: "Coord",
      description: "...",
      instructions: "Coordinate team.",
    });
    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(coordinator);

    const teamDef = new AgentTeamDefinition({
      id: "team_def",
      name: "PreferredIdTeam",
      description: "...",
      instructions: "Preferred team instructions.",
      nodes: [
        new TeamMember({
          memberName: "TheCoordinator",
          ref: "1",
          refType: "agent",
        }),
      ],
      coordinatorMemberName: "TheCoordinator",
    });
    teamDefinitionService.getDefinitionById.mockResolvedValue(teamDef);

    const teamId = await manager.createTeamRunWithId("team_preferred_1", "team_def", [
      {
        memberName: "TheCoordinator",
        agentDefinitionId: "1",
        llmModelIdentifier: "gpt-4o",
        autoExecuteTools: false,
      },
    ]);

    expect(teamId).toBe("team_preferred_1");
    expect(teamFactory.createTeamWithId).toHaveBeenCalledTimes(1);
    expect(teamFactory.createTeamWithId).toHaveBeenCalledWith(
      "team_preferred_1",
      expect.any(AgentTeamConfig),
    );
  });

  it("passes llmConfig into createLLM for team members", async () => {
    const { manager, teamDefinitionService, agentDefinitionService, llmFactory } = createManager();

    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
      new AgentDefinition({
        id: "1",
        name: "TestAgent",
        role: "Worker",
        description: "...",
        instructions: "Handle tasks.",
      }),
    );

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      instructions: "Coordinate members.",
      nodes: [
        new TeamMember({
          memberName: "TheAgent",
          ref: "1",
          refType: "agent",
        }),
      ],
      coordinatorMemberName: "TheAgent",
    });

    teamDefinitionService.getDefinitionById.mockResolvedValue(teamDef);

    const memberConfigs: TeamMemberConfigInput[] = [
      {
        memberName: "TheAgent",
        agentDefinitionId: "1",
        llmModelIdentifier: "gemini-3-flash-preview",
        autoExecuteTools: true,
        llmConfig: { thinking_level: "high" },
      },
    ];

    const teamId = await manager.createTeamRun("main1", memberConfigs);
    expect(teamId).toBe("test_team_123");
    expect(llmFactory.createLLM).toHaveBeenCalledTimes(1);
    const [, passedConfig] = llmFactory.createLLM.mock.calls[0];
    expect(passedConfig).toBeInstanceOf(LLMConfig);
    expect((passedConfig as LLMConfig).extraParams).toEqual({ thinking_level: "high" });
  });
});
