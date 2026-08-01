import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { MemoryCompactorAgentLaunchResolver } from "../../../../src/agent-execution/compaction/memory-compactor-agent-launch-resolver.js";
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createDefinition = (overrides: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) =>
  new AgentDefinition({
    id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    name: "Memory Compactor",
    role: "summarizer",
    description: "Compacts memory.",
    instructions: "Return JSON only.",
    defaultLaunchConfig: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "codex:gpt-5",
      llmConfig: { reasoning_effort: "medium" },
    },
    ...overrides,
  });

const createResolver = (definition: AgentDefinition | null) => {
  const getFreshAgentDefinitionById = vi.fn(async () => definition);
  return {
    resolver: new MemoryCompactorAgentLaunchResolver({
      getFreshAgentDefinitionById,
      getAgentDefinitionById: vi.fn(),
    } as any),
    getFreshAgentDefinitionById,
  };
};

describe("MemoryCompactorAgentLaunchResolver", () => {
  beforeEach(() => {
    vi.spyOn(LLMFactory, "getProvider").mockResolvedValue(LLMProvider.OPENAI);
  });

  it("resolves only the fixed built-in Memory Compactor launch config", async () => {
    const { resolver, getFreshAgentDefinitionById } = createResolver(createDefinition());

    await expect(resolver.resolve()).resolves.toEqual({
      agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      agentName: "Memory Compactor",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "codex:gpt-5",
      provider: LLMProvider.OPENAI,
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
    expect(getFreshAgentDefinitionById).toHaveBeenCalledOnce();
    expect(getFreshAgentDefinitionById).toHaveBeenCalledWith(
      MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
    );
  });

  it("falls back to the parent runtime and model when the built-in has no launch defaults", async () => {
    const { resolver } = createResolver(createDefinition({ defaultLaunchConfig: null }));

    await expect(resolver.resolve({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "parent-model",
      sourceAgentDefinitionId: "parent-agent",
    })).resolves.toMatchObject({
      agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "parent-model",
      provider: LLMProvider.OPENAI,
      llmConfig: null,
    });
  });

  it("keeps explicit built-in runtime and model authoritative over parent fallback", async () => {
    const { resolver } = createResolver(createDefinition());

    await expect(resolver.resolve({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "parent-model",
    })).resolves.toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "codex:gpt-5",
    });
  });

  it("applies parent fallback field-by-field", async () => {
    const { resolver } = createResolver(createDefinition({
      defaultLaunchConfig: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: null,
        llmConfig: null,
      },
    }));

    await expect(resolver.resolve({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "parent-model",
    })).resolves.toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "parent-model",
    });
  });

  it("fails truthfully when the fixed built-in definition is missing", async () => {
    const { resolver } = createResolver(null);

    await expect(resolver.resolve()).rejects.toThrow(
      `Built-in Memory Compactor agent definition '${MEMORY_COMPACTOR_AGENT_DEFINITION_ID}' was not found`,
    );
  });

  it("fails when runtime is missing from both built-in definition and parent fallback", async () => {
    const { resolver } = createResolver(createDefinition({
      defaultLaunchConfig: {
        runtimeKind: null,
        llmModelIdentifier: null,
        llmConfig: null,
      },
    }));

    await expect(resolver.resolve({
      runtimeKind: null,
      llmModelIdentifier: "parent-model",
      sourceAgentDefinitionId: "parent-agent",
    })).rejects.toThrow(
      /missing a valid default runtime kind.*parent fallback context for agent 'parent-agent'.*runtime kind fallback/,
    );
  });

  it("fails when model is missing from both built-in definition and parent fallback", async () => {
    const { resolver } = createResolver(createDefinition({
      defaultLaunchConfig: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: null,
        llmConfig: null,
      },
    }));

    await expect(resolver.resolve({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: null,
    })).rejects.toThrow(
      /missing a default model identifier.*parent fallback context.*model identifier fallback/,
    );
  });
});
