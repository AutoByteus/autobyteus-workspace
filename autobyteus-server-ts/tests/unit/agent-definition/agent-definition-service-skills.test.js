import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
describe("AgentDefinitionService skill names", () => {
    let provider;
    let mappingProvider;
    let promptService;
    beforeEach(() => {
        provider = {
            create: vi.fn(async (definition) => {
                definition.id = "test-id";
                return definition;
            }),
            getById: vi.fn(async () => null),
            getAll: vi.fn(async () => []),
            update: vi.fn(async (definition) => definition),
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
    const buildService = () => new AgentDefinitionService({
        provider,
        mappingProvider,
        promptService,
    });
    it("persists skill names on create", async () => {
        const service = buildService();
        const created = await service.createAgentDefinition({
            name: "Skill Agent",
            role: "Tester",
            description: "Tests skills",
            systemPromptName: "Default",
            systemPromptCategory: "Default",
            skillNames: ["skill_a", "skill_b"],
        });
        expect(created.skillNames).toEqual(["skill_a", "skill_b"]);
        const persisted = provider.create.mock.calls[0]?.[0];
        expect(persisted.skillNames).toEqual(["skill_a", "skill_b"]);
    });
    it("persists skill names on update", async () => {
        const service = buildService();
        const existing = new AgentDefinition({
            name: "Old",
            role: "Old",
            description: "Old",
            id: "test-id",
        });
        provider.getById.mockResolvedValue(existing);
        provider.update.mockImplementation(async (definition) => definition);
        const updated = await service.updateAgentDefinition("test-id", {
            skillNames: ["new_skill"],
        });
        expect(updated.skillNames).toEqual(["new_skill"]);
        expect(provider.update).toHaveBeenCalledOnce();
    });
});
