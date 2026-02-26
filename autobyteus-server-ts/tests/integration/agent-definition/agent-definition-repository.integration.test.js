import { describe, expect, it } from "vitest";
import { SqlAgentDefinitionRepository } from "../../../src/agent-definition/repositories/sql/agent-definition-repository.js";
describe("SqlAgentDefinitionRepository", () => {
    it("creates and finds agent definitions", async () => {
        const repo = new SqlAgentDefinitionRepository();
        const emptyList = JSON.stringify([]);
        const skillList = JSON.stringify(["test_skill_1", "test_skill_2"]);
        const created = await repo.createDefinition({
            name: "SQL Agent Def Repo Test",
            role: "Tester",
            description: "A test agent definition",
            toolNames: emptyList,
            inputProcessorNames: emptyList,
            llmResponseProcessorNames: emptyList,
            systemPromptProcessorNames: emptyList,
            toolExecutionResultProcessorNames: emptyList,
            toolInvocationPreprocessorNames: emptyList,
            lifecycleProcessorNames: emptyList,
            skillNames: skillList,
        });
        expect(created.id).toBeDefined();
        expect(created.name).toBe("SQL Agent Def Repo Test");
        expect(JSON.parse(created.skillNames)).toEqual(["test_skill_1", "test_skill_2"]);
        const found = await repo.findById(created.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
        expect(JSON.parse(found?.skillNames ?? "[]")).toEqual(["test_skill_1", "test_skill_2"]);
    });
});
