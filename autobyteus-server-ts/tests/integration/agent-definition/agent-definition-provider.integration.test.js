import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { SqlAgentDefinitionProvider } from "../../../src/agent-definition/providers/sql-agent-definition-provider.js";
describe("SqlAgentDefinitionProvider", () => {
    it("creates and retrieves agent definitions", async () => {
        const provider = new SqlAgentDefinitionProvider();
        const domain = new AgentDefinition({
            name: "Provider Agent Test",
            role: "Test",
            description: "Test desc",
        });
        const created = await provider.create(domain);
        expect(created.id).toBeTruthy();
        const retrieved = await provider.getById(created.id ?? "");
        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.name).toBe("Provider Agent Test");
    });
});
