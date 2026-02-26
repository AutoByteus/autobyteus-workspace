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
        const created = await mappingRepo.upsertMapping(agent.id, {
            agentDefinition: { connect: { id: agent.id } },
            promptName: "ProviderTest",
            promptCategory: "Provider",
        }, {
            promptName: "ProviderTest",
            promptCategory: "Provider",
        });
        expect(created.promptName).toBe("ProviderTest");
        const updated = await mappingRepo.upsertMapping(agent.id, {
            agentDefinition: { connect: { id: agent.id } },
            promptName: "ProviderUpdated",
            promptCategory: "Provider",
        }, {
            promptName: "ProviderUpdated",
            promptCategory: "Provider",
        });
        expect(updated.promptName).toBe("ProviderUpdated");
        const retrieved = await mappingRepo.getByAgentDefinitionId(agent.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.promptName).toBe("ProviderUpdated");
    });
});
