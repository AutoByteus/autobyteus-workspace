import { describe, expect, it } from "vitest";
import {
  mapCodexModelListRowToModelInfo,
  normalizeCodexServiceTier,
  resolveCodexSessionServiceTier,
} from "../../../../../src/agent-execution/backends/codex/codex-app-server-model-normalizer.js";

const parameterByName = (
  schema: Record<string, unknown> | undefined,
  name: string,
) => {
  const parameters = Array.isArray(schema?.parameters)
    ? (schema.parameters as Array<Record<string, unknown>>)
    : [];
  return parameters.find((parameter) => parameter.name === name) ?? null;
};

describe("codex app-server model normalizer", () => {
  it("adds Fast mode schema only when a Codex model advertises the fast speed tier", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      model: "gpt-fast",
      displayName: "GPT Fast",
      defaultReasoningEffort: "high",
      supportedReasoningEfforts: ["medium", "high"],
      additionalSpeedTiers: ["fast", "flex"],
    });

    expect(modelInfo).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "reasoning_effort")).toMatchObject({
      name: "reasoning_effort",
      type: "enum",
      enum_values: ["medium", "high"],
      default_value: "high",
    });
    expect(parameterByName(modelInfo?.config_schema, "service_tier")).toMatchObject({
      name: "service_tier",
      label: "Fast mode",
      type: "enum",
      description: expect.stringContaining("Codex Fast mode"),
      enum_values: ["fast"],
    });
    expect(parameterByName(modelInfo?.config_schema, "service_tier")).not.toHaveProperty(
      "default_value",
    );
  });

  it("omits Fast mode schema for models without the fast speed tier", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      model: "gpt-standard",
      supportedReasoningEfforts: ["medium"],
      additionalSpeedTiers: ["flex"],
    });

    expect(modelInfo).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "reasoning_effort")).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "service_tier")).toBeNull();
  });

  it("supports snake_case additional speed tier metadata", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      id: "gpt-snake",
      supported_reasoning_efforts: [],
      additional_speed_tiers: [" Fast "],
    });

    expect(modelInfo).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "service_tier")).toMatchObject({
      enum_values: ["fast"],
    });
  });

  it("normalizes only the in-scope Codex Fast service tier", () => {
    expect(normalizeCodexServiceTier(" FAST ")).toBe("fast");
    expect(normalizeCodexServiceTier("flex")).toBeNull();
    expect(normalizeCodexServiceTier("turbo")).toBeNull();
    expect(normalizeCodexServiceTier(null)).toBeNull();
  });

  it("resolves persisted llmConfig.service_tier into a safe runtime service tier", () => {
    expect(resolveCodexSessionServiceTier({ service_tier: "fast" })).toBe("fast");
    expect(resolveCodexSessionServiceTier({ service_tier: "turbo" })).toBeNull();
    expect(resolveCodexSessionServiceTier({ serviceTier: "fast" })).toBeNull();
    expect(resolveCodexSessionServiceTier(null)).toBeNull();
  });
});
