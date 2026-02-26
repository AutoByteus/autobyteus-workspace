import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerCreateAgentDefinitionTool } from "../../../../src/agent-tools/agent-management/create-agent-definition.js";

const mockService = {
  createAgentDefinition: vi.fn(),
  getAllAgentDefinitions: vi.fn(),
  getAgentDefinitionById: vi.fn(),
  updateAgentDefinition: vi.fn(),
  deleteAgentDefinition: vi.fn(),
};

vi.mock("../../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: {
    getInstance: () => mockService,
  },
}));

describe("createAgentDefinitionTool", () => {
  beforeEach(() => {
    mockService.createAgentDefinition.mockReset();
  });

  it("creates an agent definition and passes parsed lists", async () => {
    mockService.createAgentDefinition.mockResolvedValue({ id: "123" });

    const tool = registerCreateAgentDefinitionTool();
    const result = await tool.execute(
      { agentId: "test-agent" } as any,
      {
        name: "TestAgent",
        role: "Test Role",
        description: "Test Description",
        system_prompt_category: "TestCategory",
        system_prompt_name: "TestPrompt",
        tool_names: "Tool1, Tool2",
        system_prompt_processor_names: "",
        input_processor_names: "",
        llm_response_processor_names: "",
        tool_execution_result_processor_names: "",
        lifecycle_processor_names: "",
      },
    );

    expect(mockService.createAgentDefinition).toHaveBeenCalledOnce();
    const passed = mockService.createAgentDefinition.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(passed.toolNames).toEqual(["Tool1", "Tool2"]);
    expect(passed.inputProcessorNames).toEqual([]);
    expect(passed.llmResponseProcessorNames).toEqual([]);
    expect(passed.systemPromptProcessorNames).toEqual([]);
    expect(passed.toolExecutionResultProcessorNames).toEqual([]);
    expect(passed.lifecycleProcessorNames).toEqual([]);
    expect(result).toContain("created successfully with ID: 123");
  });

  it("propagates service errors", async () => {
    mockService.createAgentDefinition.mockRejectedValue(new Error("Prompt does not exist"));

    const tool = registerCreateAgentDefinitionTool();
    await expect(
      tool.execute(
        { agentId: "test-agent" } as any,
        {
          name: "TestAgent",
          role: "Test Role",
          description: "Test Description",
          system_prompt_category: "InvalidCategory",
          system_prompt_name: "InvalidPrompt",
        },
      ),
    ).rejects.toThrow("Prompt does not exist");
  });
});
