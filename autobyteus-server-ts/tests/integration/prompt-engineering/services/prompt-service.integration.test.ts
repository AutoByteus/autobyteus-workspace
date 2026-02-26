import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { PromptService } from "../../../../src/prompt-engineering/services/prompt-service.js";

const makeName = (prefix: string) => `${prefix}-${randomUUID()}`;

describe("PromptService", { timeout: 15000 }, () => {
  it("handles prompt versioning on create", async () => {
    const promptService = new PromptService();
    const name = makeName("Service Version Test");
    const category = "Service";

    const created1 = await promptService.createPrompt({
      name,
      category,
      promptContent: "Content v1",
      suitableForModels: "gpt-4o",
    });
    expect(created1.version).toBe(1);
    expect(created1.isActive).toBe(true);

    const created2 = await promptService.createPrompt({
      name,
      category,
      promptContent: "Content v2",
      suitableForModels: "gpt-4o",
    });
    expect(created2.version).toBe(2);
    expect(created2.isActive).toBe(false);
  });

  it("defaults suitable_for_models to 'default'", async () => {
    const promptService = new PromptService();
    const name = makeName("Default Model Test");
    const category = "Service";

    const created1 = await promptService.createPrompt({
      name,
      category,
      promptContent: "Content v1",
    });
    expect(created1.suitableForModels).toBe("default");
    expect(created1.version).toBe(1);
    expect(created1.isActive).toBe(true);

    const created2 = await promptService.createPrompt({
      name,
      category,
      promptContent: "Content v2",
    });
    expect(created2.suitableForModels).toBe("default");
    expect(created2.version).toBe(2);
    expect(created2.isActive).toBe(false);
  });

  it("creates separate v1 prompts for different models", async () => {
    const promptService = new PromptService();
    const name = makeName("Model Variation Test");
    const category = "Service";

    const prompt1 = await promptService.createPrompt({
      name,
      category,
      promptContent: "GPT prompt",
      suitableForModels: "gpt-4o",
    });
    expect(prompt1.version).toBe(1);
    expect(prompt1.id).toBeTruthy();

    const prompt2 = await promptService.createPrompt({
      name,
      category,
      promptContent: "Claude prompt",
      suitableForModels: "claude-3",
    });
    expect(prompt2.version).toBe(1);
    expect(prompt2.id).toBeTruthy();
    expect(prompt2.id).not.toBe(prompt1.id);
  });

  it("activates a prompt and deactivates others in the family", async () => {
    const promptService = new PromptService();
    const name = makeName("ActiveTest");
    const category = "Service";

    const promptV1 = await promptService.createPrompt({
      name,
      category,
      promptContent: "v1",
      suitableForModels: "gpt-4o",
    });
    const promptV2 = await promptService.createPrompt({
      name,
      category,
      promptContent: "v2",
      suitableForModels: "gpt-4o",
    });

    const fetchedV1 = await promptService.getPromptById(promptV1.id ?? "");
    const fetchedV2 = await promptService.getPromptById(promptV2.id ?? "");
    expect(fetchedV1.isActive).toBe(true);
    expect(fetchedV2.isActive).toBe(false);

    const activated = await promptService.markActivePrompt(promptV2.id ?? "");
    expect(activated.isActive).toBe(true);
    expect(activated.id).toBe(promptV2.id);

    const refreshedV1 = await promptService.getPromptById(promptV1.id ?? "");
    expect(refreshedV1.isActive).toBe(false);
  });

  it("activates prompt when no prior active prompt exists", async () => {
    const promptService = new PromptService();
    const name = makeName("ActiveTestNoPrior");
    const category = "Service";

    const promptV1 = await promptService.createPrompt({
      name,
      category,
      promptContent: "v1",
      suitableForModels: "gpt-4o",
    });

    await promptService.updatePrompt({
      promptId: promptV1.id ?? "",
      isActive: false,
    });

    const promptV2 = await promptService.createPrompt({
      name,
      category,
      promptContent: "v2",
      suitableForModels: "gpt-4o",
    });

    const activated = await promptService.markActivePrompt(promptV2.id ?? "");
    expect(activated.isActive).toBe(true);
    expect(activated.id).toBe(promptV2.id);
  });

  it("finds prompts with filters", async () => {
    const promptService = new PromptService();
    const name = makeName("ServiceFind");
    const category = "Service";

    await promptService.createPrompt({
      name,
      category,
      promptContent: "active",
    });
    await promptService.createPrompt({
      name,
      category,
      promptContent: "inactive",
    });

    const results = await promptService.findPrompts({ name });
    expect(results.length).toBe(2);

    const activeResults = await promptService.findPrompts({
      name,
      isActive: true,
    });
    expect(activeResults.length).toBe(1);
    expect(activeResults[0]?.promptContent).toBe("active");
  });

  it("finds prompts by name and category", async () => {
    const promptService = new PromptService();
    const name = makeName("FindMe");
    const category = "Service";

    await promptService.createPrompt({
      name,
      category,
      promptContent: "...",
      suitableForModels: "gpt-4o",
    });
    await promptService.createPrompt({
      name,
      category,
      promptContent: "...",
      suitableForModels: "claude-3",
    });
    await promptService.createPrompt({
      name: `${name}-other`,
      category,
      promptContent: "...",
    });

    const results = await promptService.findAllByNameAndCategory(name, category);
    expect(results.length).toBe(2);
  });
});
