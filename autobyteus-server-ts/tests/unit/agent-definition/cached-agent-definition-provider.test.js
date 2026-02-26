import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedAgentDefinitionProvider } from "../../../src/agent-definition/providers/cached-agent-definition-provider.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
describe("CachedAgentDefinitionProvider", () => {
    let persistenceProvider;
    const sampleDefs = [
        new AgentDefinition({ id: "1", name: "Agent1", role: "Role1", description: "Desc1" }),
        new AgentDefinition({ id: "2", name: "Agent2", role: "Role2", description: "Desc2" }),
    ];
    beforeEach(() => {
        persistenceProvider = {
            getAll: vi.fn(async () => sampleDefs),
            create: vi.fn(async (def) => def),
            update: vi.fn(async (def) => def),
            delete: vi.fn(async () => true),
        };
    });
    it("populates cache on first getAll and reuses it", async () => {
        const provider = new CachedAgentDefinitionProvider(persistenceProvider);
        const result1 = await provider.getAll();
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
        expect(result1).toEqual(sampleDefs);
        const result2 = await provider.getById("1");
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
        expect(result2?.id).toBe("1");
    });
    it("populates cache on first getById", async () => {
        const provider = new CachedAgentDefinitionProvider(persistenceProvider);
        const result = await provider.getById("1");
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
        expect(result?.name).toBe("Agent1");
        await provider.getById("2");
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    });
    it("returns null for missing id", async () => {
        const provider = new CachedAgentDefinitionProvider(persistenceProvider);
        await provider.getAll();
        const result = await provider.getById("999");
        expect(result).toBeNull();
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
    });
    it("updates cache on create", async () => {
        const provider = new CachedAgentDefinitionProvider(persistenceProvider);
        await provider.getAll();
        const newDef = new AgentDefinition({ id: "3", name: "New", role: "Role", description: "Desc" });
        persistenceProvider.create.mockResolvedValue(newDef);
        await provider.create(newDef);
        const updated = await provider.getAll();
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
        expect(updated).toHaveLength(3);
        expect(updated.find((item) => item.id === "3")).toBeTruthy();
    });
    it("updates cache on update", async () => {
        const provider = new CachedAgentDefinitionProvider(persistenceProvider);
        await provider.getAll();
        const updatedDef = new AgentDefinition({
            id: "1",
            name: "Updated",
            role: "Updated Role",
            description: "Updated Desc",
        });
        persistenceProvider.update.mockResolvedValue(updatedDef);
        await provider.update(updatedDef);
        const result = await provider.getById("1");
        expect(persistenceProvider.getAll).toHaveBeenCalledTimes(1);
        expect(result?.name).toBe("Updated");
    });
    it("removes items from cache on delete", async () => {
        const provider = new CachedAgentDefinitionProvider(persistenceProvider);
        await provider.getAll();
        persistenceProvider.delete.mockResolvedValue(true);
        const success = await provider.delete("1");
        expect(success).toBe(true);
        const list = await provider.getAll();
        expect(list).toHaveLength(1);
        expect(list.find((item) => item.id === "1")).toBeUndefined();
        const missing = await provider.getById("1");
        expect(missing).toBeNull();
    });
});
