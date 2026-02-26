import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentPromptMapping } from "../../../src/agent-definition/domain/models.js";
import { AgentPromptMappingPersistenceProvider } from "../../../src/agent-definition/providers/agent-prompt-mapping-persistence-provider.js";
import { PromptService } from "../../../src/prompt-engineering/services/prompt-service.js";

describe("AgentDefinitionService integration", () => {
  it("uses batched prompt mapping lookup in getAllAgentDefinitions", async () => {
    const promptService = PromptService.getInstance();
    const prompt = await promptService.createPrompt({
      name: `BatchServicePrompt-${randomUUID()}`,
      category: "BatchService",
      promptContent: "Prompt content for batched mapping test",
    });

    const realMappingProvider = new AgentPromptMappingPersistenceProvider();
    let singleLookups = 0;
    let batchLookups = 0;
    const observedMappingProvider = {
      async getByAgentDefinitionId(id: string) {
        singleLookups += 1;
        return realMappingProvider.getByAgentDefinitionId(id);
      },
      async getByAgentDefinitionIds(ids: string[]) {
        batchLookups += 1;
        return realMappingProvider.getByAgentDefinitionIds(ids);
      },
      async upsert(mapping: AgentPromptMapping) {
        return realMappingProvider.upsert(mapping);
      },
      async deleteByAgentDefinitionId(id: string) {
        return realMappingProvider.deleteByAgentDefinitionId(id);
      },
    };

    const service = new AgentDefinitionService({
      mappingProvider: observedMappingProvider,
      promptService,
    });

    const createdAgentIds: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const created = await service.createAgentDefinition({
        name: `Batch Mapping Agent ${i}-${randomUUID()}`,
        role: "Test",
        description: "Agent for batched prompt mapping lookup verification",
        systemPromptName: prompt.name,
        systemPromptCategory: prompt.category,
      });
      if (created.id) {
        createdAgentIds.push(created.id);
      }
    }

    const definitions = await service.getAllAgentDefinitions();
    expect(batchLookups).toBe(1);
    expect(singleLookups).toBe(0);

    for (const createdId of createdAgentIds) {
      const definition = definitions.find((item) => item.id === createdId);
      expect(definition).toBeDefined();
      expect(definition?.systemPromptName).toBe(prompt.name);
      expect(definition?.systemPromptCategory).toBe(prompt.category);
    }
  });
});
