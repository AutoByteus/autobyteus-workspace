import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { SqlPromptRepository } from "../../../../src/prompt-engineering/repositories/sql/prompt-repository.js";
import { randomUUID } from "crypto";

const makeName = (prefix: string) => `${prefix}-${randomUUID()}`;

describe("SqlPromptRepository", () => {
  it("creates a prompt successfully", async () => {
    const repo = new SqlPromptRepository();
    const name = makeName("Test Success");
    const created = await repo.createPrompt({
      name,
      category: "SQL",
      promptContent: "...",
      version: 1,
      isActive: true,
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe(name);
  });

  it("allows duplicate prompts when legacy nullable model discriminator is absent", async () => {
    const repo = new SqlPromptRepository();
    const name = makeName("DuplicateTest");
    const base: Prisma.PromptCreateInput = {
      name,
      category: "SQL",
      promptContent: "...",
      version: 1,
      isActive: true,
    };

    const first = await repo.createPrompt(base);
    const second = await repo.createPrompt(base);
    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
  });

  it("finds prompts with filters", async () => {
    const repo = new SqlPromptRepository();
    const base = makeName("FilterTest");

    const prompt1 = await repo.createPrompt({
      name: base,
      category: "SQL",
      promptContent: "1",
      isActive: true,
    });
    const prompt2 = await repo.createPrompt({
      name: base,
      category: "SQL",
      promptContent: "2",
      isActive: false,
    });
    const prompt3 = await repo.createPrompt({
      name: makeName("AnotherName"),
      category: "SQL",
      promptContent: "3",
      isActive: true,
    });
    const prompt4 = await repo.createPrompt({
      name: base,
      category: "OtherCat",
      promptContent: "4",
      isActive: true,
    });

    expect((await repo.findPrompts({})).length).toBeGreaterThanOrEqual(4);
    expect((await repo.findPrompts({ name: base })).length).toBe(3);
    expect((await repo.findPrompts({ name: base.toLowerCase() })).length).toBe(3);
    const categoryResults = await repo.findPrompts({ category: "SQL" });
    const categoryIds = new Set(categoryResults.map((prompt) => prompt.id));
    expect(categoryIds.has(prompt1.id)).toBe(true);
    expect(categoryIds.has(prompt2.id)).toBe(true);
    expect(categoryIds.has(prompt3.id)).toBe(true);
    expect(categoryIds.has(prompt4.id)).toBe(false);

    const activeResults = await repo.findPrompts({ isActive: true });
    const activeIds = new Set(activeResults.map((prompt) => prompt.id));
    expect(activeIds.has(prompt1.id)).toBe(true);
    expect(activeIds.has(prompt3.id)).toBe(true);
    expect(activeIds.has(prompt4.id)).toBe(true);
    expect(activeIds.has(prompt2.id)).toBe(false);

    const inactiveResults = await repo.findPrompts({ isActive: false });
    const inactiveIds = new Set(inactiveResults.map((prompt) => prompt.id));
    expect(inactiveIds.has(prompt2.id)).toBe(true);

    expect((await repo.findPrompts({ name: base, category: "SQL" })).length).toBe(2);
  });

  it("finds prompts by name and category", async () => {
    const repo = new SqlPromptRepository();
    const name = makeName("FindTest");

    await repo.createPrompt({
      name,
      category: "SQL",
      promptContent: "Non-Team",
      version: 1,
      isActive: true,
    });
    await repo.createPrompt({
      name,
      category: "SQL",
      promptContent: "Team",
      version: 2,
      isActive: true,
    });
    await repo.createPrompt({
      name,
      category: "SQL",
      promptContent: "Team-claude",
      version: 3,
      isActive: true,
    });

    const allPrompts = await repo.findAllByNameAndCategory(name, "SQL");
    expect(allPrompts.length).toBe(3);
  });
});
