import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { createInMemoryPackageDefinitions } from "../../helpers/agent-package-definitions-test-support.js";

describe("AgentDefinitionService skill names", () => {
  let provider: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    listApplicationOwnedTeamLocalAgents: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let definitions: ReturnType<typeof createInMemoryPackageDefinitions>;

  beforeEach(() => {
    provider = {
      create: vi.fn(async (definition: AgentDefinition) => {
        definition.id = "test-id";
        return definition;
      }),
      getById: vi.fn(async () => null),
      getTemplates: vi.fn(async () => []),
      listApplicationOwnedTeamLocalAgents: vi.fn(async () => []),
      update: vi.fn(async (definition: AgentDefinition) => definition),
      delete: vi.fn(async () => true),
    };
    definitions = createInMemoryPackageDefinitions();
  });

  const buildService = () =>
    new AgentDefinitionService({
      fileStore: provider as never,
      packageDefinitions: definitions.packageDefinitions,
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
    definitions.seed("agent", existing);
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
