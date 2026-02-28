import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import {
  defaultSystemPromptProcessorRegistry,
  type SystemPromptProcessorDefinition,
  ToolManifestInjectorProcessor,
  AvailableSkillsProcessor,
} from "autobyteus-ts";
import { loadAgentCustomizations } from "../../../src/startup/agent-customization-loader.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig as BaseLlmConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { SystemPromptProcessingStep } from "autobyteus-ts/agent/bootstrap-steps/system-prompt-processing-step.js";
import { AgentRuntimeState } from "autobyteus-ts/agent/context/agent-runtime-state.js";
import { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import { ParameterSchema, ParameterDefinition, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ok" });
  }

  protected async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ok", is_complete: true });
  }
}

const makeDummyLLM = (provider: LLMProvider, systemMessage: string) => {
  const model = new LLMModel({
    name: "dummy",
    value: "dummy",
    canonicalName: "dummy",
    provider,
  });
  return new DummyLLM(model, new BaseLlmConfig({ systemMessage }));
};

class DummyTool extends BaseTool {
  static override getName(): string {
    return "dummy_tool";
  }

  static override getDescription(): string {
    return "Dummy tool for testing.";
  }

  static override getArgumentSchema(): ParameterSchema | null {
    return new ParameterSchema([
      new ParameterDefinition({
        name: "value",
        type: ParameterType.STRING,
        description: "Test value",
        required: false,
      }),
    ]);
  }
}

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

const registerDummyTool = () => {
  const definition = new ToolDefinition(
    DummyTool.getName(),
    DummyTool.getDescription(),
    ToolOrigin.LOCAL,
    "test",
    () => DummyTool.getArgumentSchema(),
    () => DummyTool.getConfigSchema(),
    { toolClass: DummyTool },
  );
  defaultToolRegistry.registerTool(definition);
  return definition.name;
};

const createManager = (overrides: Partial<ConstructorParameters<typeof AgentRunManager>[0]> = {}) => {
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
      getName: () => "Temp Workspace",
      getBasePath: () => "/tmp/temp-workspace",
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
  describe("system prompt processors", () => {
    let systemPromptSnapshot: Record<string, SystemPromptProcessorDefinition> | null = null;
    let streamParserSnapshot: string | undefined;
    let toolRegistrySnapshot: Map<string, ToolDefinition> | null = null;

    beforeEach(() => {
      streamParserSnapshot = process.env.AUTOBYTEUS_STREAM_PARSER;
      systemPromptSnapshot = defaultSystemPromptProcessorRegistry.getAllDefinitions();
      defaultSystemPromptProcessorRegistry.clear();
      toolRegistrySnapshot = defaultToolRegistry.snapshot();
      defaultToolRegistry.clear();
    });

    afterEach(() => {
      if (systemPromptSnapshot) {
        defaultSystemPromptProcessorRegistry.clear();
        Object.values(systemPromptSnapshot).forEach((definition) => {
          defaultSystemPromptProcessorRegistry.registerProcessor(definition);
        });
      }
      if (toolRegistrySnapshot) {
        defaultToolRegistry.restore(toolRegistrySnapshot);
      }
      if (streamParserSnapshot === undefined) {
        delete process.env.AUTOBYTEUS_STREAM_PARSER;
      } else {
        process.env.AUTOBYTEUS_STREAM_PARSER = streamParserSnapshot;
      }
    });

    it("applies mandatory system prompt processors from the registry", async () => {
      process.env.AUTOBYTEUS_STREAM_PARSER = "xml";
      loadAgentCustomizations();

      const registries = {
        ...makeEmptyRegistries(),
        systemPrompt: defaultSystemPromptProcessorRegistry,
      };

      const { manager, agentDefinitionService, agentFactory } = createManager({ registries });
      const agentDef = new AgentDefinition({
        id: "def_1",
        name: "ProcessorAgent",
        role: "Worker",
        description: "Agent expecting mandatory processors",
      });

      agentDefinitionService.getAgentDefinitionById.mockResolvedValue(agentDef);

      await manager.createAgentRun({
        agentDefinitionId: "def_1",
        llmModelIdentifier: "gpt-4",
        autoExecuteTools: true,
      });

      const config = agentFactory.createAgent.mock.calls[0][0] as {
        systemPromptProcessors: unknown[];
      };

      expect(
        config.systemPromptProcessors.some((processor) => processor instanceof ToolManifestInjectorProcessor),
      ).toBe(true);
      expect(
        config.systemPromptProcessors.some((processor) => processor instanceof AvailableSkillsProcessor),
      ).toBe(true);
    });

    it("injects tool manifest in xml mode and skips it in api tool call mode", async () => {
      loadAgentCustomizations();
      const toolName = registerDummyTool();

      const registries = {
        ...makeEmptyRegistries(),
        systemPrompt: defaultSystemPromptProcessorRegistry,
      };

      const llmFactory = {
        createLLM: vi.fn().mockReturnValue(makeDummyLLM(LLMProvider.OPENAI, "Base prompt.")),
      };

      const { manager, agentDefinitionService, agentFactory } = createManager({
        registries,
        llmFactory: llmFactory as any,
      });

      const agentDef = new AgentDefinition({
        id: "def_1",
        name: "ToolManifestAgent",
        role: "Worker",
        description: "Base prompt.",
        toolNames: [toolName],
      });

      agentDefinitionService.getAgentDefinitionById.mockResolvedValue(agentDef);

      process.env.AUTOBYTEUS_STREAM_PARSER = "xml";
      await manager.createAgentRun({
        agentDefinitionId: "def_1",
        llmModelIdentifier: "gpt-4",
        autoExecuteTools: true,
      });

      const xmlConfig = agentFactory.createAgent.mock.calls[0][0] as {
        tools: BaseTool[];
        llmInstance: BaseLLM;
      };
      const xmlState = new AgentRuntimeState("agent-xml");
      xmlState.toolInstances = Object.fromEntries(
        xmlConfig.tools.map((tool) => [
          tool.definition?.name ?? ((tool.constructor as typeof BaseTool).getName()),
          tool,
        ]),
      );
      xmlState.llmInstance = xmlConfig.llmInstance;
      const xmlContext = new AgentContext("agent-xml", xmlConfig as any, xmlState);

      const step = new SystemPromptProcessingStep();
      await step.execute(xmlContext);
      expect(xmlContext.processedSystemPrompt).toContain("## Accessible Tools");

      process.env.AUTOBYTEUS_STREAM_PARSER = "api_tool_call";
      await manager.createAgentRun({
        agentDefinitionId: "def_1",
        llmModelIdentifier: "gpt-4",
        autoExecuteTools: true,
      });

      const apiConfig = agentFactory.createAgent.mock.calls[1][0] as {
        tools: BaseTool[];
        llmInstance: BaseLLM;
      };
      const apiState = new AgentRuntimeState("agent-api");
      apiState.toolInstances = Object.fromEntries(
        apiConfig.tools.map((tool) => [
          tool.definition?.name ?? ((tool.constructor as typeof BaseTool).getName()),
          tool,
        ]),
      );
      apiState.llmInstance = apiConfig.llmInstance;
      const apiContext = new AgentContext("agent-api", apiConfig as any, apiState);

      await step.execute(apiContext);
      expect(apiContext.processedSystemPrompt).not.toContain("## Accessible Tools");
    });
  });

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
    skillService.getSkill.mockImplementation((name: string) => {
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
    const config = agentFactory.createAgent.mock.calls[0][0] as { skills: string[] };
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
    const config = agentFactory.createAgent.mock.calls[0][0] as {
      workspaceRootPath: string | null;
      initialCustomData?: Record<string, unknown>;
    };
    expect(config.workspaceRootPath).toBe("/tmp/temp-workspace");
    expect(config.initialCustomData?.workspace_id).toBe("temp_ws");
    expect(config.initialCustomData?.workspace_name).toBe("Temp Workspace");
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
    expect((passedConfig as LLMConfig).extraParams).toEqual({ thinking_level: "high" });
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
