import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentConfig } from "autobyteus-ts";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { AgentTeamRunManager, } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamCreationError, AgentTeamTerminationError } from "../../../src/agent-team-execution/errors.js";
const makeEmptyRegistries = () => ({
    input: {
        getProcessor: vi.fn(),
        getOrderedProcessorOptions: () => [],
    },
    llmResponse: {
        getProcessor: vi.fn(),
        getOrderedProcessorOptions: () => [],
    },
    systemPrompt: {
        getProcessor: vi.fn(),
        getOrderedProcessorOptions: () => [],
    },
    toolExecutionResult: {
        getProcessor: vi.fn(),
        getOrderedProcessorOptions: () => [],
    },
    toolInvocationPreprocessor: {
        getPreprocessor: vi.fn(),
        getOrderedProcessorOptions: () => [],
    },
    lifecycle: {
        getProcessor: vi.fn(),
        getOrderedProcessorOptions: () => [],
    },
});
const createManager = (overrides = {}) => {
    const fakeTeam = { teamId: "test_team_123", start: vi.fn() };
    const teamFactory = {
        createTeam: vi.fn().mockReturnValue(fakeTeam),
        removeTeam: vi.fn().mockResolvedValue(true),
        getTeam: vi.fn().mockReturnValue(fakeTeam),
        listActiveTeamIds: vi.fn().mockReturnValue(["test_team_123"]),
    };
    const teamDefinitionService = {
        getDefinitionById: vi.fn(),
        getFreshDefinitionById: vi.fn((id) => teamDefinitionService.getDefinitionById(id)),
    };
    const agentDefinitionService = {
        getAgentDefinitionById: vi.fn(),
        getFreshAgentDefinitionById: vi.fn((id) => agentDefinitionService.getAgentDefinitionById(id)),
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
    const waitForIdle = vi.fn().mockResolvedValue(undefined);
    const registries = makeEmptyRegistries();
    const manager = new AgentTeamRunManager({
        teamFactory,
        teamDefinitionService: teamDefinitionService,
        agentDefinitionService: agentDefinitionService,
        llmFactory: llmFactory,
        workspaceManager: workspaceManager,
        skillService: skillService,
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
        waitForIdle,
    };
};
afterEach(() => {
    vi.clearAllMocks();
});
describe("AgentTeamRunManager integration", () => {
    it("creates a team instance with member configs applied", async () => {
        const { manager, teamDefinitionService, agentDefinitionService, teamFactory, llmFactory } = createManager();
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
        agentDefinitionService.getAgentDefinitionById.mockImplementation(async (id) => {
            if (id === "1")
                return coordAgentDef;
            if (id === "2")
                return workerAgentDef;
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
        const memberConfigs = [
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
        const finalConfig = teamFactory.createTeam.mock.calls[0][0];
        const coordConfig = finalConfig.coordinatorNode.nodeDefinition;
        const workerNode = finalConfig.nodes.find((node) => node.name === "TheWorker");
        const workerConfig = workerNode?.nodeDefinition;
        expect(coordConfig).toBeInstanceOf(AgentConfig);
        expect(coordConfig.name).toBe("TheCoordinator");
        expect(coordConfig.autoExecuteTools).toBe(false);
        expect(workerConfig).toBeInstanceOf(AgentConfig);
        expect(workerConfig.name).toBe("TheWorker");
        expect(workerConfig.autoExecuteTools).toBe(true);
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
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(new AgentDefinition({
            id: "1",
            name: "A",
            role: "B",
            description: "C",
        }));
        await expect(manager.createTeamRun("main1", [])).rejects.toThrow(AgentTeamCreationError);
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
        teamDefinitionService.getDefinitionById.mockImplementation(async (id) => {
            if (id === "A")
                return teamA;
            if (id === "B")
                return teamB;
            return null;
        });
        await expect(manager.createTeamRun("A", [])).rejects.toThrow(AgentTeamCreationError);
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
        teamDefinitionService.getDefinitionById.mockImplementation(async (id) => {
            if (id === "main1")
                return mainTeamDef;
            if (id === "sub1")
                return subTeamDef;
            return null;
        });
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(subCoordAgentDef);
        const memberConfigs = [
            {
                memberName: "SubCoordinator",
                agentDefinitionId: "sub_agent_1",
                llmModelIdentifier: "gpt-3.5",
                autoExecuteTools: true,
            },
        ];
        await expect(manager.createTeamRun("main1", memberConfigs)).rejects.toThrow(AgentTeamCreationError);
    });
    it("terminates team instances and propagates failures", async () => {
        const { manager, teamFactory } = createManager();
        const success = await manager.terminateTeamRun("test_team_123");
        expect(success).toBe(true);
        expect(teamFactory.removeTeam).toHaveBeenCalledWith("test_team_123");
        teamFactory.removeTeam.mockRejectedValueOnce(new Error("Factory failed"));
        await expect(manager.terminateTeamRun("bad_id")).rejects.toThrow(AgentTeamTerminationError);
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
    it("passes llmConfig into createLLM for team members", async () => {
        const { manager, teamDefinitionService, agentDefinitionService, llmFactory } = createManager();
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(new AgentDefinition({
            id: "1",
            name: "TestAgent",
            role: "Worker",
            description: "...",
        }));
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
        const memberConfigs = [
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
        expect(passedConfig.extraParams).toEqual({ thinking_level: "high" });
    });
});
