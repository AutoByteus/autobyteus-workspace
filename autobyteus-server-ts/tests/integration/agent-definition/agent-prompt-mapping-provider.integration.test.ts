import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { SqlAgentPromptMappingProvider } from "../../../src/agent-definition/providers/sql-agent-prompt-mapping-provider.js";
import { PromptService } from "../../../src/prompt-engineering/services/prompt-service.js";
import { AgentPromptMapping } from "../../../src/agent-definition/domain/models.js";

describe("SqlAgentPromptMappingProvider", () => {
  it("upserts and retrieves mappings", async () => {
    const promptService = new PromptService();
    const prompt = await promptService.createPrompt({
      name: "ProviderTest",
      category: "Provider",
      promptContent: "Test prompt content",
    });

    const service = new AgentDefinitionService();
    const agent = await service.createAgentDefinition({
      name: `Agent For Provider Test - ${randomUUID()}`,
      role: "Test",
      description: "Test",
      systemPromptName: prompt.name,
      systemPromptCategory: prompt.category,
    });

    const mappingProvider = new SqlAgentPromptMappingProvider();

    const mapping1 = new AgentPromptMapping({
      agentDefinitionId: agent.id ?? "",
      promptName: "ProviderTest",
      promptCategory: "Provider",
    });
    const created = await mappingProvider.upsert(mapping1);
    expect(created.promptName).toBe("ProviderTest");

    const mapping2 = new AgentPromptMapping({
      agentDefinitionId: agent.id ?? "",
      promptName: "ProviderUpdated",
      promptCategory: "Provider",
    });
    const updated = await mappingProvider.upsert(mapping2);
    expect(updated.promptName).toBe("ProviderUpdated");

    const retrieved = await mappingProvider.getByAgentDefinitionId(agent.id ?? "");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.promptName).toBe("ProviderUpdated");
  });

  it("retrieves mappings in batch by agent definition IDs", async () => {
    const promptService = new PromptService();
    const prompt = await promptService.createPrompt({
      name: `ProviderBatchTest-${randomUUID()}`,
      category: "Provider",
      promptContent: "Batch prompt content",
    });

    const service = new AgentDefinitionService();
    const agentOne = await service.createAgentDefinition({
      name: `Agent For Provider Batch Test One - ${randomUUID()}`,
      role: "Test",
      description: "Test",
      systemPromptName: prompt.name,
      systemPromptCategory: prompt.category,
    });
    const agentTwo = await service.createAgentDefinition({
      name: `Agent For Provider Batch Test Two - ${randomUUID()}`,
      role: "Test",
      description: "Test",
      systemPromptName: prompt.name,
      systemPromptCategory: prompt.category,
    });

    const mappingProvider = new SqlAgentPromptMappingProvider();
    const mappings = await mappingProvider.getByAgentDefinitionIds([
      agentOne.id ?? "",
      agentTwo.id ?? "",
    ]);

    expect(mappings.size).toBe(2);
    expect(mappings.get(agentOne.id ?? "")?.agentDefinitionId).toBe(agentOne.id);
    expect(mappings.get(agentTwo.id ?? "")?.agentDefinitionId).toBe(agentTwo.id);
  });
});
