import { describe, expect, it } from "vitest";
import { SqlAgentDefinitionRepository } from "../../../src/agent-definition/repositories/sql/agent-definition-repository.js";
import { SqlAgentPromptMappingRepository } from "../../../src/agent-definition/repositories/sql/agent-prompt-mapping-repository.js";

describe("SqlAgentPromptMappingRepository", () => {
  it("upserts and retrieves mappings", async () => {
    const agentRepo = new SqlAgentDefinitionRepository();
    const mappingRepo = new SqlAgentPromptMappingRepository();

    const emptyList = JSON.stringify([]);
    const agent = await agentRepo.createDefinition({
      name: "Agent For Mapping Test",
      role: "Test",
      description: "Test",
      toolNames: emptyList,
      inputProcessorNames: emptyList,
      llmResponseProcessorNames: emptyList,
      systemPromptProcessorNames: emptyList,
      toolExecutionResultProcessorNames: emptyList,
      toolInvocationPreprocessorNames: emptyList,
      lifecycleProcessorNames: emptyList,
      skillNames: emptyList,
    });

    const created = await mappingRepo.upsertMapping(
      agent.id,
      {
        agentDefinition: { connect: { id: agent.id } },
        promptName: "ProviderTest",
        promptCategory: "Provider",
      },
      {
        promptName: "ProviderTest",
        promptCategory: "Provider",
      },
    );

    expect(created.promptName).toBe("ProviderTest");

    const updated = await mappingRepo.upsertMapping(
      agent.id,
      {
        agentDefinition: { connect: { id: agent.id } },
        promptName: "ProviderUpdated",
        promptCategory: "Provider",
      },
      {
        promptName: "ProviderUpdated",
        promptCategory: "Provider",
      },
    );

    expect(updated.promptName).toBe("ProviderUpdated");

    const retrieved = await mappingRepo.getByAgentDefinitionId(agent.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.promptName).toBe("ProviderUpdated");
  });

  it("retrieves mappings in batch by agent definition IDs", async () => {
    const agentRepo = new SqlAgentDefinitionRepository();
    const mappingRepo = new SqlAgentPromptMappingRepository();

    const emptyList = JSON.stringify([]);
    const agentOne = await agentRepo.createDefinition({
      name: "Agent Batch Mapping Test 1",
      role: "Test",
      description: "Test",
      toolNames: emptyList,
      inputProcessorNames: emptyList,
      llmResponseProcessorNames: emptyList,
      systemPromptProcessorNames: emptyList,
      toolExecutionResultProcessorNames: emptyList,
      toolInvocationPreprocessorNames: emptyList,
      lifecycleProcessorNames: emptyList,
      skillNames: emptyList,
    });
    const agentTwo = await agentRepo.createDefinition({
      name: "Agent Batch Mapping Test 2",
      role: "Test",
      description: "Test",
      toolNames: emptyList,
      inputProcessorNames: emptyList,
      llmResponseProcessorNames: emptyList,
      systemPromptProcessorNames: emptyList,
      toolExecutionResultProcessorNames: emptyList,
      toolInvocationPreprocessorNames: emptyList,
      lifecycleProcessorNames: emptyList,
      skillNames: emptyList,
    });

    await mappingRepo.upsertMapping(
      agentOne.id,
      {
        agentDefinition: { connect: { id: agentOne.id } },
        promptName: "BatchPromptOne",
        promptCategory: "Batch",
      },
      {
        promptName: "BatchPromptOne",
        promptCategory: "Batch",
      },
    );
    await mappingRepo.upsertMapping(
      agentTwo.id,
      {
        agentDefinition: { connect: { id: agentTwo.id } },
        promptName: "BatchPromptTwo",
        promptCategory: "Batch",
      },
      {
        promptName: "BatchPromptTwo",
        promptCategory: "Batch",
      },
    );

    const mappings = await mappingRepo.getByAgentDefinitionIds([agentOne.id, agentTwo.id]);
    expect(mappings).toHaveLength(2);
    const promptNames = new Set(mappings.map((mapping) => mapping.promptName));
    expect(promptNames.has("BatchPromptOne")).toBe(true);
    expect(promptNames.has("BatchPromptTwo")).toBe(true);
  });
});
