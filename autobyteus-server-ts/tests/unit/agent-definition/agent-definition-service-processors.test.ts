import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";

type FakeOption = { name: string; isMandatory: boolean };

class FakeRegistry {
  private options: FakeOption[];

  constructor(mandatoryNames: string[]) {
    this.options = mandatoryNames.map((name) => ({ name, isMandatory: true }));
  }

  getOrderedProcessorOptions(): FakeOption[] {
    return this.options;
  }
}

describe("AgentDefinitionService processor filtering", () => {
  const registry = new FakeRegistry(["MANDATORY_A", "MANDATORY_B"]);

  let provider: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mappingProvider: {
    getByAgentDefinitionId: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    deleteByAgentDefinitionId: ReturnType<typeof vi.fn>;
  };
  let promptService: { findAllByNameAndCategory: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    provider = {
      create: vi.fn(async (definition: AgentDefinition) => {
        definition.id = "test-id";
        return definition;
      }),
      getById: vi.fn(async () => null),
      getAll: vi.fn(async () => []),
      update: vi.fn(async (definition: AgentDefinition) => definition),
      delete: vi.fn(async () => true),
    };

    mappingProvider = {
      getByAgentDefinitionId: vi.fn(async () => null),
      upsert: vi.fn(async () => null),
      deleteByAgentDefinitionId: vi.fn(async () => true),
    };

    promptService = {
      findAllByNameAndCategory: vi.fn(async () => ["prompt"]),
    };
  });

  const buildService = () =>
    new AgentDefinitionService({
      provider,
      mappingProvider,
      promptService,
      registries: {
        input: registry,
        llmResponse: registry,
        systemPrompt: registry,
        toolExecutionResult: registry,
        toolInvocationPreprocessor: registry,
        lifecycle: registry,
      },
    });

  it("strips mandatory processors on create", async () => {
    const service = buildService();

    const created = await service.createAgentDefinition({
      name: "Processor Agent",
      role: "Tester",
      description: "Tests processor filtering",
      systemPromptName: "Default",
      systemPromptCategory: "Default",
      inputProcessorNames: ["MANDATORY_A", "optional_input"],
      llmResponseProcessorNames: ["MANDATORY_B", "optional_llm"],
      systemPromptProcessorNames: ["optional_prompt", "MANDATORY_A"],
      toolExecutionResultProcessorNames: ["MANDATORY_A", "optional_tool_result"],
      toolInvocationPreprocessorNames: ["MANDATORY_B", "optional_invocation"],
      lifecycleProcessorNames: ["optional_lifecycle", "MANDATORY_A"],
    });

    expect(created.inputProcessorNames).toEqual(["optional_input"]);
    expect(created.llmResponseProcessorNames).toEqual(["optional_llm"]);
    expect(created.systemPromptProcessorNames).toEqual(["optional_prompt"]);
    expect(created.toolExecutionResultProcessorNames).toEqual(["optional_tool_result"]);
    expect(created.toolInvocationPreprocessorNames).toEqual(["optional_invocation"]);
    expect(created.lifecycleProcessorNames).toEqual(["optional_lifecycle"]);

    const persisted = provider.create.mock.calls[0]?.[0] as AgentDefinition;
    expect(persisted.inputProcessorNames).toEqual(["optional_input"]);
    expect(persisted.llmResponseProcessorNames).toEqual(["optional_llm"]);
    expect(persisted.systemPromptProcessorNames).toEqual(["optional_prompt"]);
    expect(persisted.toolExecutionResultProcessorNames).toEqual(["optional_tool_result"]);
    expect(persisted.toolInvocationPreprocessorNames).toEqual(["optional_invocation"]);
    expect(persisted.lifecycleProcessorNames).toEqual(["optional_lifecycle"]);
  });

  it("strips mandatory processors on update", async () => {
    const service = buildService();

    const existing = new AgentDefinition({
      name: "Existing",
      role: "Role",
      description: "Desc",
      id: "test-id",
      inputProcessorNames: ["MANDATORY_A", "legacy_optional"],
    });
    provider.getById.mockResolvedValue(existing);
    provider.update.mockImplementation(async (definition: AgentDefinition) => definition);

    const updated = await service.updateAgentDefinition("test-id", {
      inputProcessorNames: ["MANDATORY_B", "new_optional"],
      lifecycleProcessorNames: ["MANDATORY_A", "new_lifecycle"],
    });

    expect(updated.inputProcessorNames).toEqual(["new_optional"]);
    expect(updated.lifecycleProcessorNames).toEqual(["new_lifecycle"]);
  });
});
