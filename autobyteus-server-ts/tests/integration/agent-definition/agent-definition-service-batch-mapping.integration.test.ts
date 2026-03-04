import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";

describe("AgentDefinitionService integration", () => {
  it("returns created definitions from file persistence", async () => {
    const service = new AgentDefinitionService();

    const createdAgentIds: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const created = await service.createAgentDefinition({
        name: `File Mapping Agent ${i}-${randomUUID()}`,
        role: "Test",
        description: "Agent definition persistence verification",
        activePromptVersion: i + 1,
      });
      if (created.id) {
        createdAgentIds.push(created.id);
      }
    }

    const definitions = await service.getAllAgentDefinitions();
    expect(definitions.length).toBeGreaterThanOrEqual(3);

    for (const [index, createdId] of createdAgentIds.entries()) {
      const definition = definitions.find((item) => item.id === createdId) ?? null;
      expect(definition).toBeDefined();
      expect(definition?.systemPromptName ?? null).toBeNull();
      expect(definition?.systemPromptCategory ?? null).toBeNull();
      expect(definition?.activePromptVersion).toBe(index + 1);
    }
  });
});
