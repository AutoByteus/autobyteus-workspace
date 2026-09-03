import { describe, expect, it } from "vitest";
import {
  buildTokenUsageModelDisplayEntries,
  parseTokenUsageCompositeModelValue,
  resolveTokenUsageModelDisplayName,
  type TokenUsageModelDisplayContext,
} from "../../../../src/token-usage/projections/token-usage-model-display-projection.js";

const context = (names: Record<string, string> = {}): TokenUsageModelDisplayContext => ({
  customProviderNames: new Map(Object.entries(names)),
});

const event = (input: Partial<{
  runtime_kind: string;
  model_provider: string | null;
  provider_name: string | null;
  model_identifier: string | null;
  model_value: string | null;
}>) => ({
  runtime_kind: input.runtime_kind ?? "autobyteus",
  model_provider: input.model_provider ?? "OPENAI_COMPATIBLE",
  provider_name: input.provider_name ?? null,
  model_identifier: input.model_identifier === undefined
    ? "openai-compatible:provider_A:qwen3.8-max-preview"
    : input.model_identifier,
  model_value: input.model_value === undefined ? "qwen3.8-max-preview" : input.model_value,
});

describe("token usage model display projection", () => {
  it("parses the complete colon-containing suffix with the anchored grammar", () => {
    expect(parseTokenUsageCompositeModelValue(" openai-compatible:provider_A:org/model:tag ")).toEqual({
      providerId: "provider_A",
      modelName: "org/model:tag",
    });
    expect(parseTokenUsageCompositeModelValue("openai-compatible:provider_A")).toBeNull();
  });

  it("resolves custom, built-in, and non-AutoByteus labels without changing raw identity", () => {
    expect(resolveTokenUsageModelDisplayName(event({}), context({ provider_A: "alibaba_cloud" }))).toBe(
      "alibaba_cloud:qwen3.8-max-preview",
    );
    expect(resolveTokenUsageModelDisplayName(event({ provider_name: "historical_provider" }), context({ provider_A: "renamed_provider" }))).toBe(
      "historical_provider:qwen3.8-max-preview",
    );
    expect(resolveTokenUsageModelDisplayName(event({
      model_provider: "DEEPSEEK",
      model_identifier: "deepseek-v4-flash",
      model_value: "deepseek-v4-flash",
    }), context())).toBe("DeepSeek:deepseek-v4-flash");
    expect(resolveTokenUsageModelDisplayName(event({
      model_provider: "GEMINI",
      model_identifier: "gemini-3.7-flash",
      model_value: "gemini-3.7-flash",
    }), context())).toBe("Gemini:gemini-3.7-flash");
    expect(resolveTokenUsageModelDisplayName(event({
      runtime_kind: "codex_app_server",
      model_provider: "OPENAI",
      model_identifier: "gpt-5.6-luna",
      model_value: "gpt-5.6-luna",
    }), context())).toBe("gpt-5.6-luna");
  });

  it("uses deterministic deleted-provider and malformed-value fallbacks", () => {
    expect(resolveTokenUsageModelDisplayName(event({}), context())).toBe(
      "OpenAI-Compatible (provider_A):qwen3.8-max-preview",
    );
    expect(resolveTokenUsageModelDisplayName(event({
      model_identifier: "openai-compatible:provider_A:qwen3",
      model_value: "openai-compatible:provider_A",
    }), context())).toBe("OpenAI-Compatible (provider_A):qwen3");
    expect(resolveTokenUsageModelDisplayName(event({
      model_identifier: "legacy-model",
      model_value: "openai-compatible:provider_A",
    }), context())).toBe("Unknown Provider:Unknown Model");
    expect(resolveTokenUsageModelDisplayName(event({
      model_provider: "DEEPSEEK",
      provider_name: "DeepSeek",
      model_identifier: "legacy-model",
      model_value: "openai-compatible:provider_A",
    }), context())).toBe("Unknown Provider:Unknown Model");
    expect(resolveTokenUsageModelDisplayName(event({
      model_identifier: null,
      model_value: null,
    }), context())).toBe("Unknown Provider:Unknown Model");
  });

  it("keeps task raw/display entries aligned and falls back on cross-runtime collisions", () => {
    const entries = buildTokenUsageModelDisplayEntries([
      event({ model_identifier: "raw-A", model_value: "same" }),
      event({
        runtime_kind: "codex_app_server",
        model_provider: "OPENAI",
        model_identifier: "raw-A",
        model_value: "same",
      }),
      event({
        model_identifier: "openai-compatible:provider_A:raw-B",
        model_value: "same",
      }),
    ], context({ provider_A: "provider" }));
    expect(entries).toEqual([
      { modelIdentifier: "openai-compatible:provider_A:raw-B", modelDisplayName: "provider:same" },
      { modelIdentifier: "raw-A", modelDisplayName: "raw-A" },
    ]);
  });
});
