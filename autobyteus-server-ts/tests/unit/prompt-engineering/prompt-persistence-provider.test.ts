import { describe, expect, it, vi } from "vitest";
import { Prompt } from "../../../src/prompt-engineering/domain/models.js";
import { PromptPersistenceProvider } from "../../../src/prompt-engineering/providers/prompt-persistence-provider.js";
import { PromptPersistenceProviderRegistry } from "../../../src/prompt-engineering/providers/persistence-provider-registry.js";
import { SqlPromptProvider } from "../../../src/prompt-engineering/providers/sql-provider.js";

describe("PromptPersistenceProvider", () => {
  it("uses SqlPromptProvider for the sqlite profile", async () => {
    process.env.PERSISTENCE_PROVIDER = "sqlite";
    const proxy = new PromptPersistenceProvider();
    const spy = vi
      .spyOn(SqlPromptProvider.prototype, "getAllActivePrompts")
      .mockResolvedValue([]);
    await proxy.getAllActivePrompts();
    expect(spy).toHaveBeenCalledOnce();
  });

  it("delegates calls to underlying provider", async () => {
    const provider = {
      createPrompt: vi.fn().mockResolvedValue(undefined),
      getPromptById: vi.fn().mockResolvedValue(undefined),
      getActivePromptsByContext: vi.fn().mockResolvedValue([]),
      findAllByNameAndCategory: vi.fn().mockResolvedValue([]),
      findPrompts: vi.fn().mockResolvedValue([]),
      getAllActivePrompts: vi.fn().mockResolvedValue([]),
      updatePrompt: vi.fn().mockResolvedValue(undefined),
      deletePrompt: vi.fn().mockResolvedValue(true),
    };

    const registry = PromptPersistenceProviderRegistry.getInstance();
    const originalLoader = registry.getProviderLoader("sqlite");
    registry.registerProviderLoader("sqlite", async () => provider as any);
    process.env.PERSISTENCE_PROVIDER = "sqlite";

    try {
      const proxy = new PromptPersistenceProvider();
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
    } finally {
      if (originalLoader) {
        registry.registerProviderLoader("sqlite", originalLoader);
      }
    }
  });
});
