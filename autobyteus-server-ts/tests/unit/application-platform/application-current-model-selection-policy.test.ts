import { CurrentModelSelectionRequiredError } from "autobyteus-ts/llm/index.js";
import { buildHostScopedLlmModelIdentifier } from "autobyteus-ts/llm/models.js";
import { buildOpenAICompatibleEndpointModelIdentifier } from "autobyteus-ts/llm/openai-compatible-endpoint-model.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { describe, expect, it, vi } from "vitest";
import {
  ApplicationCurrentModelSelectionPolicy,
  ApplicationModelAvailabilityError,
} from "../../../src/application-platform/launch-configuration/application-current-model-selection-policy.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const buildPolicy = () => {
  const requireCurrentAutoByteusModelIdentifier = vi.fn(async (modelIdentifier: string) => {
    if (modelIdentifier === "removed-model") {
      throw new CurrentModelSelectionRequiredError(modelIdentifier);
    }
  });
  const ensureAutoByteusModelAvailable = vi.fn(async (modelIdentifier: string) => {
    if (modelIdentifier.includes("unavailable")) throw new Error("sensitive provider detail");
  });
  return {
    policy: new ApplicationCurrentModelSelectionPolicy({
      ensureAutoByteusModelAvailable,
      requireCurrentAutoByteusModelIdentifier,
    }),
    ensureAutoByteusModelAvailable,
    requireCurrentAutoByteusModelIdentifier,
  };
};

describe("ApplicationCurrentModelSelectionPolicy", () => {
  it.each([undefined, null, "", "   "])(
    "normalizes an absent or blank runtime (%s) to AutoByteus and requires current membership",
    async (runtimeKind) => {
      const { policy, requireCurrentAutoByteusModelIdentifier } = buildPolicy();

      await expect(policy.requireCurrentSelection({
        runtimeKind,
        llmModelIdentifier: "current-model",
      })).resolves.toBe(RuntimeKind.AUTOBYTEUS);
      expect(requireCurrentAutoByteusModelIdentifier).toHaveBeenCalledWith("current-model");
    },
  );

  it("preserves the current-model error for a stale AutoByteus identifier", async () => {
    const { policy } = buildPolicy();

    await expect(policy.requireCurrentSelection({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "removed-model",
    })).rejects.toMatchObject({
      name: "CurrentModelSelectionRequiredError",
      code: "CURRENT_MODEL_SELECTION_REQUIRED",
      modelIdentifier: "removed-model",
      message: "The selected model is no longer supported. Select a current supported model.",
    });
  });

  it.each([
    buildOpenAICompatibleEndpointModelIdentifier("provider-a", "dynamic-model"),
    buildHostScopedLlmModelIdentifier(
      "dynamic-model",
      LLMRuntime.OLLAMA,
      "http://127.0.0.1:11434",
    ),
    buildHostScopedLlmModelIdentifier(
      "dynamic-model",
      LLMRuntime.LMSTUDIO,
      "http://127.0.0.1:1234",
    ),
    buildHostScopedLlmModelIdentifier(
      "dynamic-model",
      LLMRuntime.AUTOBYTEUS,
      "https://models.example.test",
    ),
  ])("delegates canonical dynamic identifier %s to selected-provider availability", async (
    modelIdentifier,
  ) => {
    const {
      policy,
      ensureAutoByteusModelAvailable,
      requireCurrentAutoByteusModelIdentifier,
    } = buildPolicy();

    await expect(policy.requireCurrentSelection({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: ` ${modelIdentifier} `,
    })).resolves.toBe(RuntimeKind.AUTOBYTEUS);
    expect(ensureAutoByteusModelAvailable).toHaveBeenCalledExactlyOnceWith(modelIdentifier);
    expect(requireCurrentAutoByteusModelIdentifier).not.toHaveBeenCalled();
  });

  it("maps a selected-provider failure to the application-safe dynamic availability error", async () => {
    const { policy } = buildPolicy();
    const modelIdentifier = buildOpenAICompatibleEndpointModelIdentifier(
      "provider-a",
      "unavailable-model",
    );

    await expect(policy.requireCurrentSelection({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: modelIdentifier,
    })).rejects.toEqual(new ApplicationModelAvailabilityError(modelIdentifier));
  });

  it.each([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK])(
    "leaves the provider-owned %s model outside the AutoByteus membership guard",
    async (runtimeKind) => {
      const {
        policy,
        ensureAutoByteusModelAvailable,
        requireCurrentAutoByteusModelIdentifier,
      } = buildPolicy();

      await expect(policy.requireCurrentSelection({
        runtimeKind,
        llmModelIdentifier: "provider-owned-model",
      })).resolves.toBe(runtimeKind);
      expect(ensureAutoByteusModelAvailable).not.toHaveBeenCalled();
      expect(requireCurrentAutoByteusModelIdentifier).not.toHaveBeenCalled();
    },
  );

  it("rejects an explicit unknown runtime without falling back", async () => {
    const { policy, requireCurrentAutoByteusModelIdentifier } = buildPolicy();

    expect(policy.normalizeRuntimeKind("unknown-runtime")).toBeNull();
    await expect(policy.requireCurrentSelection({
      runtimeKind: "unknown-runtime",
      llmModelIdentifier: "current-model",
    })).rejects.toThrow("Unsupported application runtimeKind 'unknown-runtime'.");
    expect(requireCurrentAutoByteusModelIdentifier).not.toHaveBeenCalled();
  });
});
