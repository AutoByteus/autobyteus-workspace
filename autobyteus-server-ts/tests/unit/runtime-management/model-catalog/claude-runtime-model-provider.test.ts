import { describe, expect, it, vi } from "vitest";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ClaudeAgentSdkRuntimeService } from "../../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";
import { ClaudeRuntimeModelProvider } from "../../../../src/runtime-management/model-catalog/providers/claude-runtime-model-provider.js";

describe("ClaudeRuntimeModelProvider", () => {
  it("delegates model listing to Claude runtime service", async () => {
    const listModels = vi.fn().mockResolvedValue([
      {
        model_identifier: "claude-sonnet-4-5",
        display_name: "claude-sonnet-4-5",
        value: "claude-sonnet-4-5",
        canonical_name: "claude-sonnet-4-5",
        provider: "ANTHROPIC",
        runtime: "api",
      },
    ]);

    const runtimeService = {
      listModels,
    } as unknown as ClaudeAgentSdkRuntimeService;

    const provider = new ClaudeRuntimeModelProvider(runtimeService);
    const models = await provider.listLlmModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.model_identifier).toBe("claude-sonnet-4-5");
    expect(listModels).toHaveBeenCalledTimes(1);
  });

  it("only reloads provider-scoped models for ANTHROPIC", async () => {
    const listModels = vi.fn().mockResolvedValue([{ model_identifier: "claude-sonnet-4-5" }]);
    const runtimeService = {
      listModels,
    } as unknown as ClaudeAgentSdkRuntimeService;

    const provider = new ClaudeRuntimeModelProvider(runtimeService);

    const anthropicCount = await provider.reloadLlmModelsForProvider(LLMProvider.ANTHROPIC);
    const openAiCount = await provider.reloadLlmModelsForProvider(LLMProvider.OPENAI);

    expect(anthropicCount).toBe(1);
    expect(openAiCount).toBe(0);
    expect(listModels).toHaveBeenCalledTimes(1);
  });
});
