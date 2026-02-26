import { describe, expect, it, vi } from "vitest";
import { Prompt } from "../../../src/prompt-engineering/domain/models.js";
import { PromptPersistenceProvider } from "../../../src/prompt-engineering/providers/prompt-persistence-provider.js";
import { SqlPromptProvider } from "../../../src/prompt-engineering/providers/sql-provider.js";
describe("PromptPersistenceProvider", () => {
    it("defaults to SqlPromptProvider", () => {
        const proxy = new PromptPersistenceProvider();
        expect(proxy.provider).toBeInstanceOf(SqlPromptProvider);
    });
    it("delegates calls to underlying provider", async () => {
        const provider = {
            createPrompt: vi.fn(),
            getPromptById: vi.fn(),
            getActivePromptsByContext: vi.fn(),
            findAllByNameAndCategory: vi.fn(),
            findPrompts: vi.fn(),
            getAllActivePrompts: vi.fn(),
            updatePrompt: vi.fn(),
            deletePrompt: vi.fn(),
        };
        const proxy = new PromptPersistenceProvider(provider);
        const prompt = new Prompt({
            name: "Test",
            category: "Test",
            promptContent: "Content",
        });
        await proxy.createPrompt(prompt);
        expect(provider.createPrompt).toHaveBeenCalledOnce();
        await proxy.getPromptById("123");
        expect(provider.getPromptById).toHaveBeenCalledWith("123");
        await proxy.getActivePromptsByContext("Test", "Test");
        expect(provider.getActivePromptsByContext).toHaveBeenCalledWith("Test", "Test");
        await proxy.findAllByNameAndCategory("Test", "Test");
        expect(provider.findAllByNameAndCategory).toHaveBeenCalledWith("Test", "Test", undefined);
        await proxy.findPrompts({ name: "Test" });
        expect(provider.findPrompts).toHaveBeenCalledWith({ name: "Test" });
    });
});
