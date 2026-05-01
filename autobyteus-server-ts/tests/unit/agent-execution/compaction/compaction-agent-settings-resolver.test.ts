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

  it("fails clearly when no compactor agent is configured", async () => {
    const resolver = new CompactionAgentSettingsResolver(
      { getCompactionAgentDefinitionId: () => null } as any,
      { getFreshAgentDefinitionById: vi.fn(), getAgentDefinitionById: vi.fn() } as any,
    );

    await expect(resolver.resolve()).rejects.toThrow(/No compactor agent is configured/);
  });

  it("fails clearly when the selected definition lacks runtime or model", async () => {
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

    await expect(resolver.resolve()).rejects.toThrow(/missing a valid default runtime kind/);
  });
});
