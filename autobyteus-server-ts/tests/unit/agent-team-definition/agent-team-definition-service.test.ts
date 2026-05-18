import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentTeamDefinition, AgentTeamDefinitionUpdate, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import {
  buildCanonicalApplicationId,
  buildCanonicalApplicationOwnedTeamId,
} from "../../../src/application-bundles/utils/application-bundle-identity.js";

describe("AgentTeamDefinitionService", () => {
  let provider: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let agentDefinitionService: {
    getAgentDefinitionById: ReturnType<typeof vi.fn>;
    getFreshAgentDefinitionById: ReturnType<typeof vi.fn>;
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
          refScope: "shared",
        }),
      ],
      coordinatorMemberName: "coord1",
    });

  const buildLeafDefinition = (id: string) =>
    new AgentTeamDefinition({
      id,
      name: "Leaf Team",
      description: "Leaf Desc",
      instructions: "Leaf instructions",
      nodes: [
        new TeamMember({
          memberName: "leaf",
          ref: "agent2",
          refType: "agent",
          refScope: "shared",
        }),
      ],
      coordinatorMemberName: "leaf",
    });

  const mockDefinitionGraph = (root: AgentTeamDefinition) => {
    const leaf = buildLeafDefinition("team2");
    provider.getById.mockImplementation(async (id: string) => {
      if (id === root.id) {
        return root;
      }
      if (id === leaf.id) {
        return leaf;
      }
      return null;
    });
  };

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
      getById: vi.fn(async (id: string) => id === "team2" ? buildLeafDefinition("team2") : null),
      getAll: vi.fn(async () => []),
      getTemplates: vi.fn(async () => []),
      update: vi.fn(async (definition: AgentTeamDefinition) => definition),
      delete: vi.fn(async () => true),
    };
    agentDefinitionService = {
      getAgentDefinitionById: vi.fn(async () => ({ id: "agent" })),
      getFreshAgentDefinitionById: vi.fn(async () => ({ id: "agent" })),
    };
  });

  const buildService = () => new AgentTeamDefinitionService({ provider, agentDefinitionService });

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

  it("rolls back a created definition when graph validation fails", async () => {
    const service = buildService();
    const definition = new AgentTeamDefinition({
      name: "Invalid Team",
      description: "Self-reference",
      instructions: "Invalid",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          ref: "agent1",
          refType: "agent",
          refScope: "shared",
        }),
        new TeamMember({
          memberName: "self",
          ref: "def-123",
          refType: "agent_team",
          refScope: "shared",
        }),
      ],
      coordinatorMemberName: "coord1",
    });

    await expect(service.createDefinition(definition)).rejects.toThrow(
      "cannot reference itself",
    );
    expect(provider.delete).toHaveBeenCalledWith("def-123");
  });

  it("gets definitions by id", async () => {
    const service = buildService();
    const existing = buildDefinition("def-123");
    mockDefinitionGraph(existing);

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
    mockDefinitionGraph(existing);
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
    mockDefinitionGraph(existing);
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
    mockDefinitionGraph(existing);
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

  it("rejects application-owned nested team refs from shared definitions", async () => {
    const service = buildService();
    const applicationId = buildCanonicalApplicationId("built-in:applications", "sample-app");
    const siblingTeamId = buildCanonicalApplicationOwnedTeamId(
      "built-in:applications",
      "sample-app",
      "review-team",
    );
    const existing = new AgentTeamDefinition({
      id: "def-123",
      name: "Shared Team",
      description: "Desc",
      instructions: "Instructions",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          ref: "agent1",
          refType: "agent",
          refScope: "shared",
        }),
        new TeamMember({
          memberName: "review",
          ref: siblingTeamId,
          refType: "agent_team",
          refScope: "application_owned",
        }),
      ],
      coordinatorMemberName: "coord1",
      ownershipScope: "shared",
    });
    const sibling = buildLeafDefinition(siblingTeamId);
    sibling.ownershipScope = "application_owned";
    sibling.ownerApplicationId = applicationId;
    provider.getById.mockImplementation(async (id: string) => {
      if (id === existing.id) {
        return existing;
      }
      if (id === sibling.id) {
        return sibling;
      }
      return null;
    });

    await expect(
      service.updateDefinition("def-123", new AgentTeamDefinitionUpdate({ description: "Updated" })),
    ).rejects.toThrow("outside an application-owned team context");
  });

  it("allows same-application application-owned team refs from application-owned definitions", async () => {
    const service = buildService();
    const applicationId = buildCanonicalApplicationId("built-in:applications", "sample-app");
    const rootTeamId = buildCanonicalApplicationOwnedTeamId(
      "built-in:applications",
      "sample-app",
      "main-team",
    );
    const siblingTeamId = buildCanonicalApplicationOwnedTeamId(
      "built-in:applications",
      "sample-app",
      "review-team",
    );
    const existing = new AgentTeamDefinition({
      id: rootTeamId,
      name: "Application Team",
      description: "Desc",
      instructions: "Instructions",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          ref: "agent1",
          refType: "agent",
          refScope: "team_local",
        }),
        new TeamMember({
          memberName: "review",
          ref: siblingTeamId,
          refType: "agent_team",
          refScope: "application_owned",
        }),
      ],
      coordinatorMemberName: "coord1",
      ownershipScope: "application_owned",
      ownerApplicationId: applicationId,
    });
    const sibling = buildLeafDefinition(siblingTeamId);
    sibling.ownershipScope = "application_owned";
    sibling.ownerApplicationId = applicationId;
    provider.getById.mockImplementation(async (id: string) => {
      if (id === existing.id) {
        return existing;
      }
      if (id === sibling.id) {
        return sibling;
      }
      return null;
    });
    provider.update.mockImplementation(async (definition: AgentTeamDefinition) => definition);

    const updated = await service.updateDefinition(
      rootTeamId,
      new AgentTeamDefinitionUpdate({ description: "Updated" }),
    );

    expect(updated.description).toBe("Updated");
    expect(provider.update).toHaveBeenCalledOnce();
  });

  it("rejects application-owned refs from team-local definitions without inherited application context", async () => {
    const service = buildService();
    const applicationId = buildCanonicalApplicationId("built-in:applications", "sample-app");
    const siblingTeamId = buildCanonicalApplicationOwnedTeamId(
      "built-in:applications",
      "sample-app",
      "review-team",
    );
    const existing = new AgentTeamDefinition({
      id: "team-local-team:shared-parent:review-cell",
      name: "Local Team",
      description: "Desc",
      instructions: "Instructions",
      nodes: [
        new TeamMember({
          memberName: "coord1",
          ref: "agent1",
          refType: "agent",
          refScope: "shared",
        }),
        new TeamMember({
          memberName: "review",
          ref: siblingTeamId,
          refType: "agent_team",
          refScope: "application_owned",
        }),
      ],
      coordinatorMemberName: "coord1",
      ownershipScope: "team_local",
      ownerTeamId: "shared-parent",
    });
    const sibling = buildLeafDefinition(siblingTeamId);
    sibling.ownershipScope = "application_owned";
    sibling.ownerApplicationId = applicationId;
    provider.getById.mockImplementation(async (id: string) => {
      if (id === existing.id) {
        return existing;
      }
      if (id === sibling.id) {
        return sibling;
      }
      return null;
    });

    await expect(
      service.updateDefinition(
        existing.id!,
        new AgentTeamDefinitionUpdate({ description: "Updated" }),
      ),
    ).rejects.toThrow("outside an application-owned team context");
  });

  it("throws when updating missing definitions", async () => {
    const service = buildService();
    provider.getById.mockResolvedValue(null);

    const updateData = new AgentTeamDefinitionUpdate({ description: "Updated Description" });

    await expect(service.updateDefinition("missing-id", updateData)).rejects.toThrow(
      "Agent Team Definition with ID missing-id not found.",
    );
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
