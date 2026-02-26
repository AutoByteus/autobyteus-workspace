import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentTeamDefinition, AgentTeamDefinitionUpdate, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
describe("AgentTeamDefinitionService", () => {
    let provider;
    const buildDefinition = (id) => new AgentTeamDefinition({
        id,
        name: "Team",
        description: "Desc",
        role: "Role",
        nodes: [
            new TeamMember({
                memberName: "coord1",
                referenceId: "agent1",
                referenceType: NodeType.AGENT,
            }),
            new TeamMember({
                memberName: "subteam2",
                referenceId: "team2",
                referenceType: NodeType.AGENT_TEAM,
            }),
        ],
        coordinatorMemberName: "coord1",
    });
    beforeEach(() => {
        provider = {
            create: vi.fn(async (definition) => new AgentTeamDefinition({
                id: "def-123",
                name: definition.name,
                description: definition.description,
                role: definition.role ?? null,
                nodes: definition.nodes,
                coordinatorMemberName: definition.coordinatorMemberName,
            })),
            getById: vi.fn(async () => null),
            getAll: vi.fn(async () => []),
            update: vi.fn(async (definition) => definition),
            delete: vi.fn(async () => true),
        };
    });
    const buildService = () => new AgentTeamDefinitionService({ provider });
    it("creates agent team definitions", async () => {
        const service = buildService();
        const definition = buildDefinition();
        const created = await service.createDefinition(definition);
        expect(provider.create).toHaveBeenCalledOnce();
        const passed = provider.create.mock.calls[0]?.[0];
        expect(passed.id).toBeNull();
        expect(created.id).toBe("def-123");
    });
    it("rejects creating a definition that already has an id", async () => {
        const service = buildService();
        const definition = buildDefinition("existing-id");
        await expect(service.createDefinition(definition)).rejects.toThrow("Cannot create a definition that already has an ID.");
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
        provider.update.mockImplementation(async (definition) => definition);
        const updateData = new AgentTeamDefinitionUpdate({
            description: "Updated Description",
            role: "New Role",
        });
        const updated = await service.updateDefinition("def-123", updateData);
        expect(provider.getById).toHaveBeenCalledWith("def-123");
        expect(provider.update).toHaveBeenCalledOnce();
        expect(updated.description).toBe("Updated Description");
        expect(updated.role).toBe("New Role");
        expect(updated.nodes[1].referenceType).toBe(NodeType.AGENT_TEAM);
    });
    it("throws when updating missing definitions", async () => {
        const service = buildService();
        provider.getById.mockResolvedValue(null);
        const updateData = new AgentTeamDefinitionUpdate({ description: "Updated Description" });
        await expect(service.updateDefinition("missing-id", updateData)).rejects.toThrow("Agent Team Definition with ID missing-id not found.");
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
        await expect(service.deleteDefinition("missing-id")).rejects.toThrow("Agent Team Definition with ID missing-id not found.");
    });
});
