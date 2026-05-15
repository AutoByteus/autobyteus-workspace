import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { CompactionAgentSettingsResolver } from "../../../../src/agent-execution/compaction/compaction-agent-settings-resolver.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createDefinition = (overrides: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) =>
  new AgentDefinition({
    id: "memory-compactor",
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

describe("CompactionAgentSettingsResolver", () => {
  it("resolves the selected compactor agent default launch config", async () => {
    const getFreshAgentDefinitionById = vi.fn(async () => createDefinition());
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      { getFreshAgentDefinitionById, getAgentDefinitionById: vi.fn() } as any,
    );

    await expect(resolver.resolve()).resolves.toEqual({
      agentDefinitionId: "memory-compactor",
      agentName: "Memory Compactor",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "codex:gpt-5",
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
    expect(getFreshAgentDefinitionById).toHaveBeenCalledWith("memory-compactor");
  });

  it("falls back to the parent runtime and model when the selected compactor has no launch defaults", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      {
        getFreshAgentDefinitionById: vi.fn(async () =>
          createDefinition({ defaultLaunchConfig: null }),
        ),
        getAgentDefinitionById: vi.fn(),
      } as any,
    );

    await expect(
      resolver.resolve({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
        sourceAgentDefinitionId: "parent-agent",
      }),
    ).resolves.toEqual({
      agentDefinitionId: "memory-compactor",
      agentName: "Memory Compactor",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "parent-model",
      llmConfig: null,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
  });

  it("keeps explicit selected compactor runtime and model authoritative over parent fallback", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      {
        getFreshAgentDefinitionById: vi.fn(async () => createDefinition()),
        getAgentDefinitionById: vi.fn(),
      } as any,
    );

    await expect(
      resolver.resolve({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
      }),
    ).resolves.toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "codex:gpt-5",
      llmConfig: { reasoning_effort: "medium" },
    });
  });

  it("applies parent fallback field-by-field for partially configured compactor launch defaults", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      {
        getFreshAgentDefinitionById: vi.fn(async () =>
          createDefinition({
            defaultLaunchConfig: {
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              llmModelIdentifier: null,
              llmConfig: null,
            },
          }),
        ),
        getAgentDefinitionById: vi.fn(),
      } as any,
    );

    await expect(
      resolver.resolve({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
      }),
    ).resolves.toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "parent-model",
    });
  });

  it("treats invalid selected runtime as absent and uses parent runtime fallback", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      {
        getFreshAgentDefinitionById: vi.fn(async () =>
          createDefinition({
            defaultLaunchConfig: {
              runtimeKind: "not-a-runtime",
              llmModelIdentifier: "explicit-model",
              llmConfig: null,
            },
          }),
        ),
        getAgentDefinitionById: vi.fn(),
      } as any,
    );

    await expect(
      resolver.resolve({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
      }),
    ).resolves.toMatchObject({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "explicit-model",
    });
  });

  it("fails clearly when no compactor agent is configured", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => null } as any,
      { getFreshAgentDefinitionById: vi.fn(), getAgentDefinitionById: vi.fn() } as any,
    );

    await expect(resolver.resolve()).rejects.toThrow(/No compactor agent is configured/);
  });

  it("fails clearly when runtime is missing from both selected definition and parent fallback", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      {
        getFreshAgentDefinitionById: vi.fn(async () =>
          createDefinition({
            defaultLaunchConfig: {
              runtimeKind: null,
              llmModelIdentifier: null,
              llmConfig: null,
            },
          }),
        ),
        getAgentDefinitionById: vi.fn(),
      } as any,
    );

    await expect(
      resolver.resolve({
        runtimeKind: null,
        llmModelIdentifier: "parent-model",
        sourceAgentDefinitionId: "parent-agent",
      }),
    ).rejects.toThrow(
      /missing a valid default runtime kind.*parent fallback context for agent 'parent-agent'.*runtime kind fallback/,
    );
  });

  it("fails clearly when model is missing from both selected definition and parent fallback", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => "memory-compactor" } as any,
      {
        getFreshAgentDefinitionById: vi.fn(async () =>
          createDefinition({
            defaultLaunchConfig: {
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              llmModelIdentifier: null,
              llmConfig: null,
            },
          }),
        ),
        getAgentDefinitionById: vi.fn(),
      } as any,
    );

    await expect(
      resolver.resolve({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: null,
      }),
    ).rejects.toThrow(
      /missing a default model identifier.*parent fallback context.*model identifier fallback/,
    );
  });
});
