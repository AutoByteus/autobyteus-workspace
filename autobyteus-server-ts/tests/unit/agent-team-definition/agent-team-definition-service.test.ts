import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentTeamDefinition, AgentTeamDefinitionUpdate, TeamMember } from "../../../src/agent-team-definition/domain/models.js";

describe("AgentTeamDefinitionService", () => {
  let provider: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let applicationBundleService: {
    listApplicationOwnedAgentSources: ReturnType<typeof vi.fn>;
    listApplicationOwnedTeamSources: ReturnType<typeof vi.fn>;
  };

  const buildDefinition = (id?: string) =>
    new AgentTeamDefinition({
      id,
      name: "Team",
      description: "Desc",
      instructions: "Team instructions",
      category: "coordination",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          ref: "agent1",
          refType: "agent",
          refScope: "shared",
        }),
        new TeamMember({
          memberName: "subteam2",
          ref: "team2",
          refType: "agent_team",
        }),
      ],
      coordinatorMemberName: "coord1",
    });

  beforeEach(() => {
    provider = {
      create: vi.fn(
        async (definition: AgentTeamDefinition) =>
          new AgentTeamDefinition({
            id: "def-123",
            name: definition.name,
            description: definition.description,
            instructions: definition.instructions,
            category: definition.category ?? null,
            nodes: definition.nodes,
            coordinatorMemberName: definition.coordinatorMemberName,
          }),
      ),
      getById: vi.fn(async () => null),
      getAll: vi.fn(async () => []),
      getTemplates: vi.fn(async () => []),
      update: vi.fn(async (definition: AgentTeamDefinition) => definition),
      delete: vi.fn(async () => true),
    };
    applicationBundleService = {
      listApplicationOwnedAgentSources: vi.fn(async () => []),
      listApplicationOwnedTeamSources: vi.fn(async () => []),
    };
  });

  const buildService = () => new AgentTeamDefinitionService({ provider, applicationBundleService });

  it("creates agent team definitions", async () => {
    const service = buildService();
    const definition = buildDefinition();

    const created = await service.createDefinition(definition);

    expect(provider.create).toHaveBeenCalledOnce();
    const passed = provider.create.mock.calls[0]?.[0] as AgentTeamDefinition;
    expect(passed.id).toBeNull();
    expect(created.id).toBe("def-123");
  });

  it("rejects creating a definition that already has an id", async () => {
    const service = buildService();
    const definition = buildDefinition("existing-id");

    await expect(service.createDefinition(definition)).rejects.toThrow(
      "Cannot create a definition that already has an ID.",
    );
  });

  it("gets definitions by id", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    provider.getById.mockResolvedValue(existing);

    const retrieved = await service.getDefinitionById("def-123");

    expect(provider.getById).toHaveBeenCalledWith("def-123");
    expect(retrieved).toBe(existing);
  });

  it("returns null for missing definitions", async () => {
    const service = buildService();
    provider.getById.mockResolvedValue(null);

    const retrieved = await service.getDefinitionById("missing-id");

    expect(provider.getById).toHaveBeenCalledWith("missing-id");
    expect(retrieved).toBeNull();
  });

  it("gets all definitions", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    provider.getAll.mockResolvedValue([existing]);

    const allDefs = await service.getAllDefinitions();

    expect(provider.getAll).toHaveBeenCalledOnce();
    expect(allDefs).toEqual([existing]);
  });

  it("updates definitions with provided fields", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    provider.getById.mockResolvedValue(existing);
    provider.update.mockImplementation(async (definition: AgentTeamDefinition) => definition);

    const updateData = new AgentTeamDefinitionUpdate({
      description: "Updated Description",
      instructions: "Updated team instructions",
      category: "updated-category",
      avatarUrl: "http://localhost:8000/rest/files/images/updated-team-avatar.png",
    });

    const updated = await service.updateDefinition("def-123", updateData);

    expect(provider.getById).toHaveBeenCalledWith("def-123");
    expect(provider.update).toHaveBeenCalledOnce();
    expect(updated.description).toBe("Updated Description");
    expect(updated.instructions).toBe("Updated team instructions");
    expect(updated.category).toBe("updated-category");
    expect(updated.avatarUrl).toBe("http://localhost:8000/rest/files/images/updated-team-avatar.png");
    expect(updated.nodes[1].refType).toBe("agent_team");
  });

  it("clears defaultLaunchConfig when the update explicitly sets null", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    existing.defaultLaunchConfig = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: { reasoning_effort: "medium" },
    };
    provider.getById.mockResolvedValue(existing);
    provider.update.mockImplementation(async (definition: AgentTeamDefinition) => definition);

    const updated = await service.updateDefinition(
      "def-123",
      new AgentTeamDefinitionUpdate({
        defaultLaunchConfig: null,
      }),
    );

    expect(provider.update).toHaveBeenCalledOnce();
    expect(updated.defaultLaunchConfig).toBeNull();
  });

  it("preserves defaultLaunchConfig when the update omits the field", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    existing.defaultLaunchConfig = {
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: { reasoning_effort: "medium" },
    };
    provider.getById.mockResolvedValue(existing);
    provider.update.mockImplementation(async (definition: AgentTeamDefinition) => definition);

    const updateData = new AgentTeamDefinitionUpdate({
      description: "Updated without changing launch defaults",
    });

    const updated = await service.updateDefinition("def-123", updateData);

    expect(provider.update).toHaveBeenCalledOnce();
    expect(updated.description).toBe("Updated without changing launch defaults");
    expect(updated.defaultLaunchConfig).toEqual({
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: { reasoning_effort: "medium" },
    });
  });

  it("throws when updating missing definitions", async () => {
    const service = buildService();
    provider.getById.mockResolvedValue(null);

    const updateData = new AgentTeamDefinitionUpdate({ description: "Updated Description" });

    await expect(service.updateDefinition("missing-id", updateData)).rejects.toThrow(
      "Agent Team Definition with ID missing-id not found.",
    );
  });

  it("rejects application-owned team updates that escape the owning bundle", async () => {
    const service = buildService();
    const existing = new AgentTeamDefinition({
      id: "bundle-team-1",
      name: "App Team",
      description: "Desc",
      instructions: "Team instructions",
      category: "coordination",
      ownershipScope: "application_owned",
      ownerApplicationId: "bundle-app-1",
      ownerApplicationName: "App One",
      ownerPackageId: "pkg-1",
      ownerLocalApplicationId: "app-one",
      nodes: [
        new TeamMember({
          memberName: "tutor",
          ref: "bundle-agent-1",
          refType: "agent",
          refScope: "application_owned",
        }),
      ],
      coordinatorMemberName: "tutor",
    });
    provider.getById.mockResolvedValue(existing);
    applicationBundleService.listApplicationOwnedAgentSources.mockResolvedValue([
      { definitionId: "bundle-agent-1", applicationId: "bundle-app-1" },
      { definitionId: "bundle-agent-foreign", applicationId: "bundle-app-foreign" },
    ]);
    applicationBundleService.listApplicationOwnedTeamSources.mockResolvedValue([]);

    await expect(
      service.updateDefinition(
        "bundle-team-1",
        new AgentTeamDefinitionUpdate({
          nodes: [
            new TeamMember({
              memberName: "foreign",
              ref: "bundle-agent-foreign",
              refType: "agent",
              refScope: "application_owned",
            }),
          ],
          coordinatorMemberName: "foreign",
        }),
      ),
    ).rejects.toThrow("must reference an agent inside the same application bundle");

    expect(provider.update).not.toHaveBeenCalled();
  });

  it("deletes definitions", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    provider.getById.mockResolvedValue(existing);
    provider.delete.mockResolvedValue(true);

    const result = await service.deleteDefinition("def-123");

    expect(provider.getById).toHaveBeenCalledWith("def-123");
    expect(provider.delete).toHaveBeenCalledWith("def-123");
    expect(result).toBe(true);
  });

  it("throws when deleting missing definitions", async () => {
    const service = buildService();
    provider.getById.mockResolvedValue(null);

    await expect(service.deleteDefinition("missing-id")).rejects.toThrow(
      "Agent Team Definition with ID missing-id not found.",
    );
  });
});
