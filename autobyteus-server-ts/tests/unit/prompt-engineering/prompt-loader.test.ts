import { describe, expect, it, vi } from "vitest";
import { PromptLoader } from "../../../src/prompt-engineering/utils/prompt-loader.js";
import { Prompt } from "../../../src/prompt-engineering/domain/models.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";

const makePrompt = (options: {
  name?: string;
  category?: string;
  content?: string;
  models?: string;
}) =>
  new Prompt({
    name: options.name ?? "Coder",
    category: options.category ?? "System",
    promptContent: options.content ?? "",
    suitableForModels: options.models ?? null,
  });

describe("PromptLoader", () => {
  it("returns a direct model match for an agent prompt", async () => {
    const agentDef = new AgentDefinition({
      id: "agent1",
      name: "TestAgent",
      role: "TestRole",
      description: "Test",
      systemPromptName: "Coder",
      systemPromptCategory: "System",
    });

    const promptService = {
      getActivePromptsByContext: vi.fn().mockResolvedValue([
        makePrompt({ content: "This is for GPT-4o", models: "gpt-4o" }),
      ]),
    };

    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue(agentDef),
    };

    const llmFactory = {
      getCanonicalName: vi.fn().mockResolvedValue("gpt-4o"),
    };

    const loader = new PromptLoader({
      promptService: promptService as any,
      agentDefinitionService: agentDefinitionService as any,
      llmFactory,
    });

    const content = await loader.getPromptTemplateForAgent("agent1", "GPT_4o_API");

    expect(agentDefinitionService.getAgentDefinitionById).toHaveBeenCalledOnce();
    expect(promptService.getActivePromptsByContext).toHaveBeenCalledWith("Coder", "System");
    expect(promptService.getActivePromptsByContext).toHaveBeenCalledTimes(1);
    expect(content).toBe("This is for GPT-4o");
  });

  it("falls back to default model prompt for agent when no specific match", async () => {
    const agentDef = new AgentDefinition({
      id: "agent1",
      name: "TestAgent",
      role: "TestRole",
      description: "Test",
      systemPromptName: "Coder",
      systemPromptCategory: "System",
    });

    const promptService = {
      getActivePromptsByContext: vi.fn().mockResolvedValue([
        makePrompt({
          content: "Default Content",
          models: PromptLoader.DEFAULT_CANONICAL_MODEL,
        }),
      ]),
    };

    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue(agentDef),
    };

    const llmFactory = {
      getCanonicalName: vi.fn().mockResolvedValue("some-new-model"),
    };

    const loader = new PromptLoader({
      promptService: promptService as any,
      agentDefinitionService: agentDefinitionService as any,
      llmFactory,
    });

    const content = await loader.getPromptTemplateForAgent("agent1", "SomeNewModel_API");

    expect(promptService.getActivePromptsByContext).toHaveBeenCalledWith("Coder", "System");
    expect(promptService.getActivePromptsByContext).toHaveBeenCalledTimes(1);
    expect(content).toBe("Default Content");
  });

  it("returns null if agent has no prompt mapping", async () => {
    const promptService = {
      getActivePromptsByContext: vi.fn(),
    };

    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue(null),
    };

    const llmFactory = {
      getCanonicalName: vi.fn(),
    };

    const loader = new PromptLoader({
      promptService: promptService as any,
      agentDefinitionService: agentDefinitionService as any,
      llmFactory,
    });

    const content = await loader.getPromptTemplateForAgent("agent_no_mapping", "GPT_4o_API");

    expect(content).toBeNull();
    expect(promptService.getActivePromptsByContext).not.toHaveBeenCalled();
  });

  it("returns null if no suitable prompts for model or default", async () => {
    const agentDef = new AgentDefinition({
      id: "agent1",
      name: "TestAgent",
      role: "TestRole",
      description: "Test",
      systemPromptName: "Coder",
      systemPromptCategory: "System",
    });

    const promptService = {
      getActivePromptsByContext: vi.fn().mockResolvedValue([
        makePrompt({ content: "Other", models: "some-other-model" }),
      ]),
    };

    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue(agentDef),
    };

    const llmFactory = {
      getCanonicalName: vi.fn().mockResolvedValue("gpt-4o"),
    };

    const loader = new PromptLoader({
      promptService: promptService as any,
      agentDefinitionService: agentDefinitionService as any,
      llmFactory,
    });

    const content = await loader.getPromptTemplateForAgent("agent1", "GPT_4o_API");

    expect(content).toBeNull();
  });

  it("caches agent prompt results", async () => {
    const agentDef = new AgentDefinition({
      id: "agent1",
      name: "TestAgent",
      role: "TestRole",
      description: "Test",
      systemPromptName: "Coder",
      systemPromptCategory: "System",
    });

    const promptService = {
      getActivePromptsByContext: vi.fn().mockResolvedValue([
        makePrompt({ content: "Cached Content", models: "gpt-4o" }),
      ]),
    };

    const agentDefinitionService = {
      getAgentDefinitionById: vi.fn().mockResolvedValue(agentDef),
    };

    const llmFactory = {
      getCanonicalName: vi.fn().mockResolvedValue("gpt-4o"),
    };

    const loader = new PromptLoader({
      promptService: promptService as any,
      agentDefinitionService: agentDefinitionService as any,
      llmFactory,
    });

    const content1 = await loader.getPromptTemplateForAgent("agent1", "GPT_4o_API");
    const content2 = await loader.getPromptTemplateForAgent("agent1", "GPT_4o_API");

    expect(agentDefinitionService.getAgentDefinitionById).toHaveBeenCalledOnce();
    expect(promptService.getActivePromptsByContext).toHaveBeenCalledOnce();
    expect(content1).toBe("Cached Content");
    expect(content1).toBe(content2);
  });
});
