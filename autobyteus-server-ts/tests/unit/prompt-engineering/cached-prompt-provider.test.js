import { describe, expect, it, vi } from "vitest";
import { CachedPromptProvider } from "../../../src/prompt-engineering/providers/cached-prompt-provider.js";
import { Prompt } from "../../../src/prompt-engineering/domain/models.js";
const samplePrompts = [
    new Prompt({
        id: "1",
        name: "System Prompt",
        category: "General",
        promptContent: "Content1",
        isActive: true,
        version: 1,
        suitableForModels: "gpt-4",
    }),
    new Prompt({
        id: "2",
        name: "System Prompt",
        category: "General",
        promptContent: "Content2",
        isActive: false,
        version: 2,
        suitableForModels: "gpt-4",
    }),
    new Prompt({
        id: "3",
        name: "User Query",
        category: "Specific",
        promptContent: "Content3",
        isActive: true,
        version: 1,
        suitableForModels: "claude-3",
    }),
    new Prompt({
        id: "4",
        name: "Summarizer",
        category: "General",
        promptContent: "Content4",
        isActive: true,
        version: 1,
    }),
];
const createProvider = () => {
    const persistenceProvider = {
        findPrompts: vi.fn().mockResolvedValue(samplePrompts),
        createPrompt: vi.fn(),
        updatePrompt: vi.fn(),
        deletePrompt: vi.fn(),
        getPromptById: vi.fn(),
        getAllActivePrompts: vi.fn(),
        findAllByNameAndCategory: vi.fn(),
        getActivePromptsByContext: vi.fn(),
    };
    return { persistenceProvider, cachedProvider: new CachedPromptProvider(persistenceProvider) };
};
describe("CachedPromptProvider", () => {
    it("populates cache on first read and reuses it", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        const result1 = await cachedProvider.findPrompts();
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        expect(result1.length).toBe(samplePrompts.length);
        const result2 = await cachedProvider.findPrompts({ name: "System" });
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        expect(result2.length).toBe(2);
    });
    it("populates cache when getPromptById is called first", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        const result = await cachedProvider.getPromptById("1");
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        expect(result.name).toBe("System Prompt");
        await cachedProvider.getPromptById("3");
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
    });
    it("uses cache for all read methods after population", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        await cachedProvider.getPromptById("1");
        await cachedProvider.findPrompts({ name: "System" });
        await cachedProvider.getAllActivePrompts();
        await cachedProvider.findAllByNameAndCategory("System Prompt", "General");
        await cachedProvider.getActivePromptsByContext("User Query", "Specific");
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
    });
    it("filters active prompts from cache", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        const activePrompts = await cachedProvider.getAllActivePrompts();
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        expect(activePrompts.length).toBe(3);
        expect(activePrompts.every((prompt) => prompt.isActive)).toBe(true);
        expect(new Set(activePrompts.map((prompt) => prompt.id))).toEqual(new Set(["1", "3", "4"]));
    });
    it("filters prompts by name, category, and active status", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        const byName = await cachedProvider.findPrompts({ name: "system" });
        expect(byName.length).toBe(2);
        expect(byName.every((prompt) => prompt.name.toLowerCase().includes("system"))).toBe(true);
        const byCategory = await cachedProvider.findPrompts({ category: "Specific" });
        expect(byCategory.length).toBe(1);
        expect(byCategory[0]?.id).toBe("3");
        const active = await cachedProvider.findPrompts({ isActive: true });
        expect(active.length).toBe(3);
        expect(active.every((prompt) => prompt.isActive)).toBe(true);
        const combined = await cachedProvider.findPrompts({
            category: "General",
            isActive: true,
        });
        expect(combined.length).toBe(2);
        expect(new Set(combined.map((prompt) => prompt.id))).toEqual(new Set(["1", "4"]));
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
    });
    it("filters by name and category with model filter", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        const family = await cachedProvider.findAllByNameAndCategory("System Prompt", "General");
        expect(family.length).toBe(2);
        expect(new Set(family.map((prompt) => prompt.id))).toEqual(new Set(["1", "2"]));
        const gptFamily = await cachedProvider.findAllByNameAndCategory("System Prompt", "General", "gpt-4");
        expect(gptFamily.length).toBe(2);
        const none = await cachedProvider.findAllByNameAndCategory("System Prompt", "General", "nonexistent-model");
        expect(none.length).toBe(0);
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
    });
    it("filters active prompts by context", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        const specific = await cachedProvider.getActivePromptsByContext("User Query", "Specific");
        expect(specific.length).toBe(1);
        expect(specific[0]?.id).toBe("3");
        const general = await cachedProvider.getActivePromptsByContext("System Prompt", "General");
        expect(general.length).toBe(1);
        expect(general[0]?.id).toBe("1");
        const none = await cachedProvider.getActivePromptsByContext("Nonexistent", "Context");
        expect(none.length).toBe(0);
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
    });
    it("throws for nonexistent prompt id", async () => {
        const { cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        await expect(cachedProvider.getPromptById("999")).rejects.toThrow("Prompt not found");
    });
    it("updates cache on create", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        const newPrompt = new Prompt({
            id: "5",
            name: "New Prompt",
            category: "New",
            promptContent: "New",
        });
        persistenceProvider.createPrompt.mockResolvedValue(newPrompt);
        await cachedProvider.createPrompt(newPrompt);
        const updatedList = await cachedProvider.findPrompts();
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        expect(updatedList.length).toBe(5);
        expect(updatedList.find((prompt) => prompt.id === "5")).toBeTruthy();
    });
    it("updates cache on update", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        const updatedPrompt = new Prompt({
            id: "1",
            name: "Updated Name",
            category: "General",
            promptContent: "Updated Content",
            isActive: true,
            version: 1,
        });
        persistenceProvider.updatePrompt.mockResolvedValue(updatedPrompt);
        await cachedProvider.updatePrompt(updatedPrompt);
        const result = await cachedProvider.getPromptById("1");
        expect(persistenceProvider.findPrompts).toHaveBeenCalledOnce();
        expect(result.name).toBe("Updated Name");
        expect(result.promptContent).toBe("Updated Content");
    });
    it("removes from cache on delete", async () => {
        const { persistenceProvider, cachedProvider } = createProvider();
        await cachedProvider.findPrompts();
        persistenceProvider.deletePrompt.mockResolvedValue(true);
        const success = await cachedProvider.deletePrompt("1");
        expect(success).toBe(true);
        const updatedList = await cachedProvider.findPrompts();
        expect(updatedList.length).toBe(samplePrompts.length - 1);
        expect(updatedList.find((prompt) => prompt.id === "1")).toBeUndefined();
        await expect(cachedProvider.getPromptById("1")).rejects.toThrow("Prompt not found");
    });
});
