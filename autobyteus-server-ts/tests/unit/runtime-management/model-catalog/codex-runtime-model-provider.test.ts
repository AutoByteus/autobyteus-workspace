import { describe, expect, it, vi } from "vitest";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { CodexAppServerRuntimeService } from "../../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import { CodexRuntimeModelProvider } from "../../../../src/runtime-management/model-catalog/providers/codex-runtime-model-provider.js";

describe("CodexRuntimeModelProvider", () => {
  it("delegates model listing to Codex runtime service", async () => {
    const listModels = vi.fn().mockResolvedValue([
      {
        model_identifier: "gpt-5.3-codex",
        display_name: "gpt-5.3-codex (default reasoning: medium)",
        value: "gpt-5.3-codex",
        canonical_name: "gpt-5.3-codex",
        provider: "OPENAI",
        runtime: "api",
      },
    ]);

    const runtimeService = {
      listModels,
    } as unknown as CodexAppServerRuntimeService;

    const provider = new CodexRuntimeModelProvider(runtimeService);
    const models = await provider.listLlmModels();

    expect(models).toHaveLength(1);
    expect(models[0]?.model_identifier).toBe("gpt-5.3-codex");
    expect(listModels).toHaveBeenCalledTimes(1);
  });

  it("only reloads provider-scoped models for OPENAI", async () => {
    const listModels = vi.fn().mockResolvedValue([{ model_identifier: "model-1" }]);
    const runtimeService = {
      listModels,
    } as unknown as CodexAppServerRuntimeService;

    const provider = new CodexRuntimeModelProvider(runtimeService);

    const openAiCount = await provider.reloadLlmModelsForProvider(LLMProvider.OPENAI);
    const mistralCount = await provider.reloadLlmModelsForProvider(LLMProvider.MISTRAL);

    expect(openAiCount).toBe(1);
    expect(mistralCount).toBe(0);
    expect(listModels).toHaveBeenCalledTimes(1);
  });
});
