import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
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
    const fakeAgent = { agentId: "agent_123", start: vi.fn() };
    const agentFactory = {
        createAgent: vi.fn().mockReturnValue(fakeAgent),
        getAgent: vi.fn().mockReturnValue(fakeAgent),
        removeAgent: vi.fn().mockResolvedValue(true),
        listActiveAgentIds: vi.fn().mockReturnValue(["agent_123"]),
    };
    const agentDefinitionService = {
        getAgentDefinitionById: vi.fn(),
    };
    const llmFactory = {
        createLLM: vi.fn().mockResolvedValue({}),
    };
    const workspaceManager = {
        getWorkspaceById: vi.fn().mockReturnValue(null),
        getOrCreateTempWorkspace: vi.fn().mockResolvedValue({
            workspaceId: "temp_ws",
            name: "Temp Workspace",
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
    const manager = new AgentRunManager({
        agentFactory,
        agentDefinitionService: agentDefinitionService,
        llmFactory: llmFactory,
        workspaceManager: workspaceManager,
        skillService: skillService,
        promptLoader: promptLoader,
        registries,
        waitForIdle,
        ...overrides,
    });
    return {
        manager,
        agentFactory,
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
describe("AgentRunManager integration", () => {
    it("resolves skill names to paths via SkillService", async () => {
        const { manager, agentDefinitionService, skillService, agentFactory } = createManager();
        const agentDef = new AgentDefinition({
            id: "def_1",
            name: "SkillfulAgent",
            role: "Worker",
            description: "A skilled worker",
            skillNames: ["coding_skill", "testing_skill"],
        });
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(agentDef);
        skillService.getSkill.mockImplementation((name) => {
            if (name === "coding_skill") {
                return { rootPath: "/path/to/coding_skill" };
            }
            if (name === "testing_skill") {
                return { rootPath: "/path/to/testing_skill" };
            }
            return null;
        });
        const createdId = await manager.createAgentRun({
            agentDefinitionId: "def_1",
            llmModelIdentifier: "gpt-4",
            autoExecuteTools: true,
        });
        expect(createdId).toBe("agent_123");
        expect(agentFactory.createAgent).toHaveBeenCalledTimes(1);
        const config = agentFactory.createAgent.mock.calls[0][0];
        expect(config.skills).toContain("/path/to/coding_skill");
        expect(config.skills).toContain("/path/to/testing_skill");
        expect(config.skills).toHaveLength(2);
    });
    it("falls back to temp workspace when none is provided", async () => {
        const { manager, agentDefinitionService, workspaceManager, agentFactory } = createManager();
        const agentDef = new AgentDefinition({
            id: "def_1",
            name: "TempWorkspaceAgent",
            role: "Worker",
            description: "An agent without explicit workspace",
        });
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(agentDef);
        const createdId = await manager.createAgentRun({
            agentDefinitionId: "def_1",
            llmModelIdentifier: "gpt-4",
            autoExecuteTools: true,
            workspaceId: null,
        });
        expect(createdId).toBe("agent_123");
        expect(workspaceManager.getOrCreateTempWorkspace).toHaveBeenCalledTimes(1);
        const config = agentFactory.createAgent.mock.calls[0][0];
        expect(config.workspace).toEqual({ workspaceId: "temp_ws", name: "Temp Workspace" });
    });
    it("passes llmConfig into createLLM when provided", async () => {
        const { manager, agentDefinitionService, llmFactory } = createManager();
        const agentDef = new AgentDefinition({
            id: "def_1",
            name: "ConfiguredAgent",
            role: "Worker",
            description: "An agent with LLM config",
        });
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(agentDef);
        const createdId = await manager.createAgentRun({
            agentDefinitionId: "def_1",
            llmModelIdentifier: "gemini-3-flash-preview",
            autoExecuteTools: true,
            llmConfig: { thinking_level: "high" },
        });
        expect(createdId).toBe("agent_123");
        expect(llmFactory.createLLM).toHaveBeenCalledTimes(1);
        const [, passedConfig] = llmFactory.createLLM.mock.calls[0];
        expect(passedConfig).toBeInstanceOf(LLMConfig);
        expect(passedConfig.extraParams).toEqual({ thinking_level: "high" });
    });
    it("calls createLLM with undefined config when llmConfig is not provided", async () => {
        const { manager, agentDefinitionService, llmFactory } = createManager();
        const agentDef = new AgentDefinition({
            id: "def_1",
            name: "DefaultAgent",
            role: "Worker",
            description: "An agent without LLM config",
        });
        agentDefinitionService.getAgentDefinitionById.mockResolvedValue(agentDef);
        const createdId = await manager.createAgentRun({
            agentDefinitionId: "def_1",
            llmModelIdentifier: "gpt-4",
            autoExecuteTools: true,
        });
        expect(createdId).toBe("agent_123");
        expect(llmFactory.createLLM).toHaveBeenCalledWith("gpt-4", undefined);
    });
});
