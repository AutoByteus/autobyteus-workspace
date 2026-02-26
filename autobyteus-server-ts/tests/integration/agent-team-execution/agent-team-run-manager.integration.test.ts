import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentConfig, AgentTeamConfig } from "autobyteus-ts";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import {
  AgentTeamRunManager,
  TeamMemberConfigInput,
} from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
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
      ...fakeTeam,
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
    ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({
      workspaceId: "workspace-by-root",
      rootPath: "/tmp/workspace-by-root",
    }),
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
  it("creates a team run with member configs applied", async () => {
    const { manager, teamDefinitionService, agentDefinitionService, teamFactory, llmFactory } =
      createManager();

    const coordAgentDef = new AgentDefinition({
      id: "1",
      name: "CoordinatorBlueprint",
      role: "Coord",
      description: "...",
    });
    const workerAgentDef = new AgentDefinition({
      id: "2",
      name: "WorkerBlueprint",
      role: "Worker",
      description: "...",
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
      nodes: [
        new TeamMember({
          memberName: "TheCoordinator",
          referenceId: "1",
          referenceType: NodeType.AGENT,
        }),
        new TeamMember({
          memberName: "TheWorker",
          referenceId: "2",
          referenceType: NodeType.AGENT,
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
        memberRouteKey: "TheCoordinator",
        memberAgentId: "member_coord_001",
        memoryDir: "/tmp/team-memory",
      },
      {
        memberName: "TheWorker",
        agentDefinitionId: "2",
        llmModelIdentifier: "claude-3",
        autoExecuteTools: true,
        memberRouteKey: "TheWorker",
        memberAgentId: "member_worker_001",
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
    expect((coordConfig as AgentConfig).initialCustomData?.teamMemberIdentity).toEqual({
      memberRouteKey: "TheCoordinator",
      memberAgentId: "member_coord_001",
    });
    expect((coordConfig as AgentConfig).initialCustomData?.teamRestore).toEqual({
      TheCoordinator: {
        memberAgentId: "member_coord_001",
        memoryDir: "/tmp/team-memory",
      },
    });
    expect((coordConfig as AgentConfig).initialCustomData).not.toHaveProperty("teamMemberHomeNodeId");
    expect(workerConfig).toBeInstanceOf(AgentConfig);
    expect((workerConfig as AgentConfig).name).toBe("TheWorker");
    expect((workerConfig as AgentConfig).autoExecuteTools).toBe(true);
    expect((workerConfig as AgentConfig).initialCustomData?.teamMemberIdentity).toEqual({
      memberRouteKey: "TheWorker",
      memberAgentId: "member_worker_001",
    });
    expect((workerConfig as AgentConfig).initialCustomData).not.toHaveProperty("teamMemberHomeNodeId");
  });

  it("creates a team run with a preferred team id", async () => {
    const { manager, teamDefinitionService, agentDefinitionService, teamFactory } = createManager();

    const coordAgentDef = new AgentDefinition({
      id: "1",
      name: "CoordinatorBlueprint",
      role: "Coord",
      description: "...",
    });

    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(coordAgentDef);
    teamDefinitionService.getDefinitionById.mockResolvedValue(
      new AgentTeamDefinition({
        id: "main1",
        name: "MainTeam",
        description: "...",
        nodes: [
          new TeamMember({
            memberName: "TheCoordinator",
            referenceId: "1",
            referenceType: NodeType.AGENT,
          }),
        ],
        coordinatorMemberName: "TheCoordinator",
      }),
    );

    const createdTeamId = await manager.createTeamRunWithId("team_restore_001", "main1", [
      {
        memberName: "TheCoordinator",
        agentDefinitionId: "1",
        llmModelIdentifier: "gpt-4o",
        autoExecuteTools: false,
      },
    ]);

    expect(teamFactory.createTeamWithId).toHaveBeenCalledTimes(1);
    expect(teamFactory.createTeamWithId).toHaveBeenCalledWith(
      "team_restore_001",
      expect.any(AgentTeamConfig),
    );
    expect(createdTeamId).toBe("team_restore_001");
  });

  it("throws when member config is missing", async () => {
    const { manager, teamDefinitionService, agentDefinitionService } = createManager();

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "AgentOne",
          referenceId: "1",
          referenceType: NodeType.AGENT,
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
      nodes: [
        new TeamMember({
          memberName: "SubTeamB",
          referenceId: "B",
          referenceType: NodeType.AGENT_TEAM,
        }),
      ],
      coordinatorMemberName: "SubTeamB",
    });

    const teamB = new AgentTeamDefinition({
      id: "B",
      name: "TeamB",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "SubTeamA",
          referenceId: "A",
          referenceType: NodeType.AGENT_TEAM,
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
    });

    const subTeamDef = new AgentTeamDefinition({
      id: "sub1",
      name: "SubTeam",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "SubCoordinator",
          referenceId: "sub_agent_1",
          referenceType: NodeType.AGENT,
        }),
      ],
      coordinatorMemberName: "SubCoordinator",
    });

    const mainTeamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "MySubTeam",
          referenceId: "sub1",
          referenceType: NodeType.AGENT_TEAM,
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

  it("terminates team runs and propagates failures", async () => {
    const { manager, teamFactory } = createManager();

    const success = await manager.terminateTeamRun("test_team_123");
    expect(success).toBe(true);
    expect(teamFactory.removeTeam).toHaveBeenCalledWith("test_team_123");

    teamFactory.removeTeam.mockRejectedValueOnce(new Error("Factory failed"));
    await expect(manager.terminateTeamRun("bad_id")).rejects.toThrow(
      AgentTeamTerminationError,
    );
  });

  it("retrieves team run and lists active IDs", () => {
    const { manager, teamFactory } = createManager();

    const team = manager.getTeamRun("test_team_123");
    expect(teamFactory.getTeam).toHaveBeenCalledWith("test_team_123");
    expect(team?.teamId).toBe("test_team_123");

    const ids = manager.listActiveRuns();
    expect(teamFactory.listActiveTeamIds).toHaveBeenCalledTimes(1);
    expect(ids).toEqual(["test_team_123"]);
  });

  it("passes llmConfig into createLLM for team members", async () => {
    const { manager, teamDefinitionService, agentDefinitionService, llmFactory } = createManager();

    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
      new AgentDefinition({
        id: "1",
        name: "TestAgent",
        role: "Worker",
        description: "...",
      }),
    );

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "TheAgent",
          referenceId: "1",
          referenceType: NodeType.AGENT,
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

  it("requires workspaceRootPath for local remote-home members when workspaceId is missing", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "node-docker-8001";
    try {
      const { manager, teamDefinitionService, agentDefinitionService } = createManager();

      agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
        new AgentDefinition({
          id: "1",
          name: "RemoteAgent",
          role: "Worker",
          description: "...",
        }),
      );

      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "main1",
          name: "RemoteTeam",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "remoteStudent",
              referenceId: "1",
              referenceType: NodeType.AGENT,
              homeNodeId: "node-docker-8001",
            }),
          ],
          coordinatorMemberName: "remoteStudent",
        }),
      );

      await expect(
        manager.createTeamRun("main1", [
          {
            memberName: "remoteStudent",
            agentDefinitionId: "1",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: true,
            workspaceId: null,
          },
        ]),
      ).rejects.toThrow(AgentTeamCreationError);
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("creates a local workspace from workspaceRootPath when workspaceId is omitted", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "node-docker-8001";
    try {
      const {
        manager,
        teamDefinitionService,
        agentDefinitionService,
        workspaceManager,
        teamFactory,
      } = createManager();

      agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
        new AgentDefinition({
          id: "1",
          name: "RemoteAgent",
          role: "Worker",
          description: "...",
        }),
      );

      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "main1",
          name: "RemoteTeam",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "remoteStudent",
              referenceId: "1",
              referenceType: NodeType.AGENT,
              homeNodeId: "node-docker-8001",
            }),
          ],
          coordinatorMemberName: "remoteStudent",
        }),
      );

      await manager.createTeamRun("main1", [
        {
          memberName: "remoteStudent",
          agentDefinitionId: "1",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: true,
          workspaceId: null,
          workspaceRootPath: "/tmp/remote-student-ws",
        },
      ]);

      expect(workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(
        "/tmp/remote-student-ws",
      );

      const finalConfig = teamFactory.createTeam.mock.calls[0][0] as AgentTeamConfig;
      const remoteNode = finalConfig.nodes.find((node) => node.name === "remoteStudent");
      const remoteConfig = remoteNode?.nodeDefinition as AgentConfig;
      expect(remoteConfig.initialCustomData).not.toHaveProperty("teamMemberHomeNodeId");
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("requires workspaceRootPath for host-remote members even when workspaceId is provided", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "node-host-8000";
    try {
      const { manager, teamDefinitionService, agentDefinitionService } = createManager();

      agentDefinitionService.getAgentDefinitionById.mockImplementation(async (id: string) => {
        if (id === "2") {
          return new AgentDefinition({
            id: "2",
            name: "Professor",
            role: "Coordinator",
            description: "...",
          });
        }
        return null;
      });

      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "main1",
          name: "RemotePathRequired",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "professor",
              referenceId: "2",
              referenceType: NodeType.AGENT,
              homeNodeId: "embedded-local",
            }),
            new TeamMember({
              memberName: "student",
              referenceId: "24",
              referenceType: NodeType.AGENT,
              homeNodeId: "node-docker-8001",
            }),
          ],
          coordinatorMemberName: "professor",
        }),
      );

      await expect(
        manager.createTeamRun("main1", [
          {
            memberName: "professor",
            agentDefinitionId: "2",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: false,
          },
          {
            memberName: "student",
            agentDefinitionId: "24",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: true,
            workspaceId: "host-workspace-id-only",
          },
        ]),
      ).rejects.toThrow(/requires workspaceRootPath for home node 'node-docker-8001'/);
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("falls back to workspaceRootPath when workspaceId is stale on local home node", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "node-docker-8001";
    try {
      const {
        manager,
        teamDefinitionService,
        agentDefinitionService,
        workspaceManager,
      } = createManager();

      agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
        new AgentDefinition({
          id: "1",
          name: "RemoteAgent",
          role: "Worker",
          description: "...",
        }),
      );

      workspaceManager.getWorkspaceById.mockReturnValue(null);

      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "main1",
          name: "RemoteTeam",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "remoteStudent",
              referenceId: "1",
              referenceType: NodeType.AGENT,
              homeNodeId: "node-docker-8001",
            }),
          ],
          coordinatorMemberName: "remoteStudent",
        }),
      );

      await manager.createTeamRun("main1", [
        {
          memberName: "remoteStudent",
          agentDefinitionId: "1",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: true,
          workspaceId: "stale-workspace-id",
          workspaceRootPath: "/tmp/remote-student-ws-fallback",
        },
      ]);

      expect(workspaceManager.getWorkspaceById).toHaveBeenCalledWith("stale-workspace-id");
      expect(workspaceManager.ensureWorkspaceByRootPath).toHaveBeenCalledWith(
        "/tmp/remote-student-ws-fallback",
      );
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("allows remote-home members when remote definition id is absent locally", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "node-host-8000";
    try {
      const {
        manager,
        teamDefinitionService,
        agentDefinitionService,
        promptLoader,
        teamFactory,
      } = createManager();

      const localProfessor = new AgentDefinition({
        id: "2",
        name: "Professor",
        role: "Coordinator",
        description: "Local coordinator",
      });

      agentDefinitionService.getAgentDefinitionById.mockImplementation(async (id: string) => {
        if (id === "2") {
          return localProfessor;
        }
        return null;
      });

      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "team-local-remote-mix",
          name: "Class Room Simulation",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "professor",
              referenceId: "2",
              referenceType: NodeType.AGENT,
              homeNodeId: "embedded-local",
            }),
            new TeamMember({
              memberName: "student",
              referenceId: "24",
              referenceType: NodeType.AGENT,
              homeNodeId: "node-docker-8001",
            }),
          ],
          coordinatorMemberName: "professor",
        }),
      );

      await manager.createTeamRun("team-local-remote-mix", [
        {
          memberName: "professor",
          agentDefinitionId: "2",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: false,
          memberRouteKey: "professor",
          memberAgentId: "member_professor",
        },
        {
          memberName: "student",
          agentDefinitionId: "24",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: true,
          memberRouteKey: "student",
          memberAgentId: "member_student",
          workspaceRootPath: "/tmp/student-remote-workspace",
        },
      ]);

      expect(agentDefinitionService.getAgentDefinitionById).toHaveBeenCalledWith("2");
      expect(agentDefinitionService.getAgentDefinitionById).toHaveBeenCalledWith("24");
      expect(promptLoader.getPromptTemplateForAgent).toHaveBeenCalledTimes(1);
      expect(promptLoader.getPromptTemplateForAgent).toHaveBeenCalledWith("2", "gpt-4o-mini");

      const finalConfig = teamFactory.createTeam.mock.calls[0][0] as AgentTeamConfig;
      const remoteNode = finalConfig.nodes.find((node) => node.name === "student");
      const remoteConfig = remoteNode?.nodeDefinition as AgentConfig;
      expect(remoteConfig).toBeInstanceOf(AgentConfig);
      expect(remoteConfig.initialCustomData?.agent_definition_id).toBe("24");
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("fails when a local member definition is missing", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "node-host-8000";
    try {
      const { manager, teamDefinitionService, agentDefinitionService } = createManager();

      agentDefinitionService.getAgentDefinitionById.mockResolvedValue(null);
      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "team-local-only",
          name: "Local Team",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "professor",
              referenceId: "404",
              referenceType: NodeType.AGENT,
              homeNodeId: "embedded-local",
            }),
          ],
          coordinatorMemberName: "professor",
        }),
      );

      await expect(
        manager.createTeamRun("team-local-only", [
          {
            memberName: "professor",
            agentDefinitionId: "404",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: false,
          },
        ]),
      ).rejects.toThrow(/AgentDefinition with ID 404 not found/);
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("allows non-local projection members without workspaceRootPath in worker projection mode", async () => {
    const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;
    process.env.AUTOBYTEUS_NODE_ID = "worker-1";
    try {
      const { manager, teamDefinitionService, agentDefinitionService, teamFactory } = createManager();

      agentDefinitionService.getAgentDefinitionById.mockImplementation(async (id: string) => {
        if (id === "2") {
          return new AgentDefinition({
            id: "2",
            name: "Professor",
            role: "Coordinator",
            description: "...",
          });
        }
        if (id === "24") {
          return new AgentDefinition({
            id: "24",
            name: "Student",
            role: "Student",
            description: "...",
          });
        }
        return null;
      });
      teamDefinitionService.getDefinitionById.mockResolvedValue(
        new AgentTeamDefinition({
          id: "team-distributed",
          name: "Distributed Team",
          description: "...",
          nodes: [
            new TeamMember({
              memberName: "professor",
              referenceId: "2",
              referenceType: NodeType.AGENT,
              homeNodeId: "embedded-local",
            }),
            new TeamMember({
              memberName: "student",
              referenceId: "24",
              referenceType: NodeType.AGENT,
              homeNodeId: "worker-1",
            }),
          ],
          coordinatorMemberName: "professor",
        }),
      );

      await manager.createWorkerProjectionTeamRunWithId(
        "team-distributed-run",
        "team-distributed",
        [
          {
            memberName: "professor",
            agentDefinitionId: "2",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: false,
            memberRouteKey: "professor",
            memberAgentId: "professor_member",
            hostNodeId: "host-1",
          },
          {
            memberName: "student",
            agentDefinitionId: "24",
            llmModelIdentifier: "gpt-4o-mini",
            autoExecuteTools: true,
            memberRouteKey: "student",
            memberAgentId: "student_member",
            hostNodeId: "worker-1",
            workspaceRootPath: "/tmp/student-worker-workspace",
          },
        ],
      );

      const finalConfig = teamFactory.createTeamWithId.mock.calls[0][1] as AgentTeamConfig;
      const coordinatorConfig = finalConfig.coordinatorNode.nodeDefinition as AgentConfig;
      expect(coordinatorConfig.initialCustomData?.teamMemberPlacement).toEqual({
        homeNodeId: "host-1",
        isLocalToCurrentNode: false,
      });
    } finally {
      if (originalNodeId === undefined) {
        delete process.env.AUTOBYTEUS_NODE_ID;
      } else {
        process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
      }
    }
  });

  it("stores and returns member config snapshots by team definition id", async () => {
    const { manager, teamDefinitionService, agentDefinitionService } = createManager();

    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
      new AgentDefinition({
        id: "1",
        name: "SnapshotAgent",
        role: "Worker",
        description: "...",
      }),
    );

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "SnapshotMember",
          referenceId: "1",
          referenceType: NodeType.AGENT,
        }),
      ],
      coordinatorMemberName: "SnapshotMember",
    });
    teamDefinitionService.getDefinitionById.mockResolvedValue(teamDef);

    const memberConfigs: TeamMemberConfigInput[] = [
      {
        memberName: "SnapshotMember",
        agentDefinitionId: "1",
        llmModelIdentifier: "gpt-4o-mini",
        autoExecuteTools: true,
        llmConfig: { temperature: 0.2 },
      },
    ];

    await manager.createTeamRun("main1", memberConfigs);
    const snapshot = manager.getTeamMemberConfigsByDefinitionId("main1");
    const teamScopedSnapshot = manager.getTeamMemberConfigs("test_team_123");

    expect(snapshot).toEqual([
      {
        ...memberConfigs[0],
        workspaceId: null,
        workspaceRootPath: null,
      },
    ]);
    expect(snapshot).not.toBe(memberConfigs);
    expect(snapshot[0]).not.toBe(memberConfigs[0]);
    expect(teamScopedSnapshot).toEqual(snapshot);
    expect(teamScopedSnapshot).not.toBe(snapshot);
    expect(teamScopedSnapshot[0]).not.toBe(snapshot[0]);
  });

  it("clears member config snapshot when mapped team run is terminated", async () => {
    const { manager, teamDefinitionService, agentDefinitionService } = createManager();

    agentDefinitionService.getAgentDefinitionById.mockResolvedValue(
      new AgentDefinition({
        id: "1",
        name: "CleanupAgent",
        role: "Worker",
        description: "...",
      }),
    );

    const teamDef = new AgentTeamDefinition({
      id: "main1",
      name: "MainTeam",
      description: "...",
      nodes: [
        new TeamMember({
          memberName: "CleanupMember",
          referenceId: "1",
          referenceType: NodeType.AGENT,
        }),
      ],
      coordinatorMemberName: "CleanupMember",
    });
    teamDefinitionService.getDefinitionById.mockResolvedValue(teamDef);

    await manager.createTeamRun("main1", [
      {
        memberName: "CleanupMember",
        agentDefinitionId: "1",
        llmModelIdentifier: "gpt-4o-mini",
        autoExecuteTools: true,
      },
    ]);
    expect(manager.getTeamMemberConfigsByDefinitionId("main1")).toHaveLength(1);
    expect(manager.getTeamMemberConfigs("test_team_123")).toHaveLength(1);

    await manager.terminateTeamRun("test_team_123");
    expect(manager.getTeamMemberConfigsByDefinitionId("main1")).toEqual([]);
    expect(manager.getTeamMemberConfigs("test_team_123")).toEqual([]);
  });
});
