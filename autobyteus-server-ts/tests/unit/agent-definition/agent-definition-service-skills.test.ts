import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";

describe("AgentDefinitionService skill names", () => {
  let provider: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mappingProvider: {
    getByAgentDefinitionId: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    deleteByAgentDefinitionId: ReturnType<typeof vi.fn>;
  };
  let promptService: { findAllByNameAndCategory: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    provider = {
      create: vi.fn(async (definition: AgentDefinition) => {
        definition.id = "test-id";
        return definition;
      }),
      getById: vi.fn(async () => null),
      getAll: vi.fn(async () => []),
      update: vi.fn(async (definition: AgentDefinition) => definition),
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

  const buildService = () =>
    new AgentDefinitionService({
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
      avatarUrl: "http://localhost:8000/rest/files/images/skill-avatar.png",
      systemPromptName: "Default",
      systemPromptCategory: "Default",
      skillNames: ["skill_a", "skill_b"],
    });

    expect(created.skillNames).toEqual(["skill_a", "skill_b"]);
    expect(created.avatarUrl).toBe("http://localhost:8000/rest/files/images/skill-avatar.png");

    const persisted = provider.create.mock.calls[0]?.[0] as AgentDefinition;
    expect(persisted.skillNames).toEqual(["skill_a", "skill_b"]);
    expect(persisted.avatarUrl).toBe("http://localhost:8000/rest/files/images/skill-avatar.png");
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
    provider.update.mockImplementation(async (definition: AgentDefinition) => definition);

    const updated = await service.updateAgentDefinition("test-id", {
      skillNames: ["new_skill"],
      avatarUrl: "",
    });

    expect(updated.skillNames).toEqual(["new_skill"]);
    expect(updated.avatarUrl).toBeNull();
    expect(provider.update).toHaveBeenCalledOnce();
  });
});
