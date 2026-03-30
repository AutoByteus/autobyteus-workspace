import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ClaudeModelCatalog } from "../../../src/llm-management/services/claude-model-catalog.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeModelCatalogIntegration =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

describeClaudeModelCatalogIntegration("ClaudeModelCatalog integration (live transport)", () => {
  it("lists live Claude models with usable identifiers", async () => {
    const catalog = new ClaudeModelCatalog();

    const models = await catalog.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(
      models.every(
        (model) =>
          typeof model.model_identifier === "string" && model.model_identifier.length > 0,
      ),
    ).toBe(true);
    const defaultModel = models.find((model) => model.model_identifier === "default");
    const opusModel = models.find((model) => model.model_identifier === "opus");
    const haikuModel = models.find((model) => model.model_identifier === "haiku");

    expect(
      (defaultModel?.config_schema as { properties?: Record<string, unknown> } | undefined)?.properties
        ?.thinking_enabled,
    ).toBeTruthy();
    expect(
      (
        (defaultModel?.config_schema as { properties?: Record<string, { enum?: string[] }> } | undefined)
          ?.properties?.reasoning_effort?.enum ?? []
      ).sort(),
    ).toEqual(["high", "low", "medium"]);

    expect(
      (
        (opusModel?.config_schema as { properties?: Record<string, { enum?: string[] }> } | undefined)
          ?.properties?.reasoning_effort?.enum ?? []
      ).sort(),
    ).toEqual(["high", "low", "max", "medium"]);

    expect(haikuModel?.config_schema ?? null).toBeNull();
  });
});
