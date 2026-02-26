import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { Prompt } from "../../../../src/prompt-engineering/domain/models.js";
import { SqlPromptProvider } from "../../../../src/prompt-engineering/providers/sql-provider.js";

const makeName = (prefix: string) => `${prefix}-${randomUUID()}`;

describe("SqlPromptProvider", () => {
  it("creates and retrieves prompts by id", async () => {
    const provider = new SqlPromptProvider();
    const name = makeName("Provider Test");
    const domainPrompt = new Prompt({
      name,
      category: "Provider",
      promptContent: "Content",
    });

    const created = await provider.createPrompt(domainPrompt);
    expect(created.id).toBeTruthy();
    expect(created.version).toBe(1);

    const retrieved = await provider.getPromptById(created.id ?? "");
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.name).toBe(name);
  });

  it("updates prompts through provider", async () => {
    const provider = new SqlPromptProvider();
    const name = makeName("Update Provider");
    const created = await provider.createPrompt(
      new Prompt({ name, category: "Provider", promptContent: "Original" }),
    );

    created.promptContent = "Updated";
    created.isActive = false;

    const updated = await provider.updatePrompt(created);
    expect(updated.promptContent).toBe("Updated");
    expect(updated.isActive).toBe(false);
  });

  it("finds prompts by name/category with suitable model filter", async () => {
    const provider = new SqlPromptProvider();
    const name = makeName("Context");

    await provider.createPrompt(
      new Prompt({
        name,
        category: "Provider",
        promptContent: "Model gpt",
        suitableForModels: "gpt-4o",
      }),
    );
    await provider.createPrompt(
      new Prompt({
        name,
        category: "Provider",
        promptContent: "Model claude",
        suitableForModels: "claude-3",
      }),
    );

    const results = await provider.findAllByNameAndCategory(name, "Provider");
    expect(results.length).toBe(2);

    const gptResults = await provider.findAllByNameAndCategory(
      name,
      "Provider",
      "gpt-4o",
    );
    expect(gptResults.length).toBe(1);
    expect(gptResults[0]?.promptContent).toBe("Model gpt");
  });

  it("retrieves active prompts by context", async () => {
    const provider = new SqlPromptProvider();
    const name = makeName("ActiveProvider");

    await provider.createPrompt(
      new Prompt({
        name,
        category: "Provider",
        promptContent: "v1",
        isActive: true,
      }),
    );
    await provider.createPrompt(
      new Prompt({
        name,
        category: "Provider",
        promptContent: "v2",
        isActive: false,
      }),
    );

    const results = await provider.getActivePromptsByContext(name, "Provider");
    expect(results.length).toBe(1);
    expect(results[0]?.isActive).toBe(true);
  });
});
