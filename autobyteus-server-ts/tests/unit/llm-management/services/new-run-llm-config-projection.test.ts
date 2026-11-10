import { beforeAll, describe, expect, it } from "vitest";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { projectNewRunLlmConfig } from "../../../../src/llm-management/services/new-run-llm-config-projection.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const project = (runtimeKind: RuntimeKind, llmModelIdentifier: string, llmConfig: Record<string, unknown> | null) =>
  projectNewRunLlmConfig({ runtimeKind, llmModelIdentifier, llmConfig });

describe("projectNewRunLlmConfig (AC-008): a new run stores only declared settings", () => {
  beforeAll(async () => {
    await LLMFactory.ensureInitialized();
  });

  describe("AutoByteus: the keys the selected model's schema declares", () => {
    it("keeps standard fields, lifts declared settings out of extra_params, and drops the rest", async () => {
      await expect(project(RuntimeKind.AUTOBYTEUS, "claude-sonnet-5", {
        temperature: 0.2,
        thinking_display: "omitted",
        extra_params: { reasoning_effort: "low", top_k: 5 },
      })).resolves.toEqual({ temperature: 0.2, reasoning_effort: "low" });
    });

    it("drops a stored switch the model no longer declares (Fable 5 is always on) and keeps its effort", async () => {
      await expect(project(RuntimeKind.AUTOBYTEUS, "claude-fable-5", { thinking_enabled: false, reasoning_effort: "max" }))
        .resolves.toEqual({ reasoning_effort: "max" });
    });

    it("keeps an explicit Off on a model that declares the switch", async () => {
      await expect(project(RuntimeKind.AUTOBYTEUS, "claude-opus-5", { thinking_enabled: false, reasoning_effort: "max" }))
        .resolves.toEqual({ thinking_enabled: false, reasoning_effort: "max" });
    });

    it("stores null when only undeclared keys were submitted, and for no config", async () => {
      await expect(project(RuntimeKind.AUTOBYTEUS, "claude-fable-5", { thinking_display: "omitted" })).resolves.toBeNull();
      await expect(project(RuntimeKind.AUTOBYTEUS, "claude-fable-5", null)).resolves.toBeNull();
    });

    it("keeps a model that is not in the registry as submitted (the runtime projection applies at activation)", async () => {
      const raw = { anything: 1 };
      await expect(project(RuntimeKind.AUTOBYTEUS, "model-not-in-the-registry", raw)).resolves.toEqual(raw);
    });
  });

  describe("external runtimes: the keys the runtime's backend reads, with no catalog read", () => {
    const submitted = { thinking_enabled: false, thinking_display: "x", reasoning_effort: "xhigh", service_tier: "fast", temperature: 0.1 };

    it.each([
      [RuntimeKind.CLAUDE_AGENT_SDK, { reasoning_effort: "xhigh" }],
      [RuntimeKind.CODEX_APP_SERVER, { reasoning_effort: "xhigh", service_tier: "fast" }],
      [RuntimeKind.GROK_BUILD, { reasoning_effort: "xhigh" }],
      [RuntimeKind.DEEPSEEK_HARNESS, { reasoning_effort: "xhigh" }],
      [RuntimeKind.ANTIGRAVITY_CLI, null],
    ])("%s", async (runtimeKind, expected) => {
      await expect(project(runtimeKind, "any-model-the-runtime-offers", submitted)).resolves.toEqual(expected);
    });

    it("stores null when nothing the runtime reads was submitted", async () => {
      await expect(project(RuntimeKind.CLAUDE_AGENT_SDK, "opus", { thinking_enabled: true })).resolves.toBeNull();
    });
  });
});
