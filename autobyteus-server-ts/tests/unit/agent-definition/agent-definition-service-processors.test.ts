import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { createInMemoryPackageDefinitions } from "../../helpers/agent-package-definitions-test-support.js";

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
    getTemplates: ReturnType<typeof vi.fn>;
    listApplicationOwnedTeamLocalAgents: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let definitions: ReturnType<typeof createInMemoryPackageDefinitions>;

  beforeEach(() => {
    provider = {
      create: vi.fn(async (definition: AgentDefinition) => {
        definition.id = "test-id";
        return definition;
      }),
      getById: vi.fn(async () => null),
      getTemplates: vi.fn(async () => []),
      listApplicationOwnedTeamLocalAgents: vi.fn(async () => []),
      update: vi.fn(async (definition: AgentDefinition) => definition),
      delete: vi.fn(async () => true),
    };
    definitions = createInMemoryPackageDefinitions();
  });

  const buildService = () =>
    new AgentDefinitionService({
      fileStore: provider as never,
      packageDefinitions: definitions.packageDefinitions,
      registries: {
        input: registry,
        llmResponse: registry,
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
      toolExecutionResultProcessorNames: ["MANDATORY_A", "optional_tool_result"],
      toolInvocationPreprocessorNames: ["MANDATORY_B", "optional_invocation"],
      lifecycleProcessorNames: ["optional_lifecycle", "MANDATORY_A"],
    });

    expect(created.inputProcessorNames).toEqual(["optional_input"]);
    expect(created.llmResponseProcessorNames).toEqual(["optional_llm"]);
    expect(created.toolExecutionResultProcessorNames).toEqual(["optional_tool_result"]);
    expect(created.toolInvocationPreprocessorNames).toEqual(["optional_invocation"]);
    expect(created.lifecycleProcessorNames).toEqual(["optional_lifecycle"]);

    const persisted = provider.create.mock.calls[0]?.[0] as AgentDefinition;
    expect(persisted.inputProcessorNames).toEqual(["optional_input"]);
    expect(persisted.llmResponseProcessorNames).toEqual(["optional_llm"]);
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
    definitions.seed("agent", existing);
    provider.update.mockImplementation(async (definition: AgentDefinition) => definition);

    const updated = await service.updateAgentDefinition("test-id", {
      inputProcessorNames: ["MANDATORY_B", "new_optional"],
      lifecycleProcessorNames: ["MANDATORY_A", "new_lifecycle"],
    });

    expect(updated.inputProcessorNames).toEqual(["new_optional"]);
    expect(updated.lifecycleProcessorNames).toEqual(["new_lifecycle"]);
    // The stored definition is never mutated in place, and the owning unit is reconciled.
    expect(definitions.store.getDefinition("agent", "test-id")?.inputProcessorNames).toEqual(["MANDATORY_A", "legacy_optional"]);
    expect(definitions.reloader.reloadFoldersNow).toHaveBeenCalledWith("agent", ["test-id"]);
  });
});
