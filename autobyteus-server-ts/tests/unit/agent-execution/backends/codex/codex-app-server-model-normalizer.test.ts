import { describe, expect, it } from "vitest";
import {
  mapCodexModelListRowToModelInfo,
  normalizeCodexReasoningEffort,
  normalizeCodexServiceTier,
  resolveCodexSessionReasoningEffort,
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
  it("normalizes reasoning effort as a trimmed non-empty open string", () => {
    expect(normalizeCodexReasoningEffort(" max ")).toBe("max");
    expect(normalizeCodexReasoningEffort(" ultra ")).toBe("ultra");
    expect(normalizeCodexReasoningEffort(" Future-Custom ")).toBe("Future-Custom");
    expect(normalizeCodexReasoningEffort("")).toBeNull();
    expect(normalizeCodexReasoningEffort("   ")).toBeNull();
    expect(normalizeCodexReasoningEffort(42)).toBeNull();
    expect(normalizeCodexReasoningEffort(null)).toBeNull();
  });

  it("preserves advertised reasoning efforts in first-seen order", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      model: "gpt-reasoning",
      displayName: "GPT Reasoning",
      defaultReasoningEffort: "low",
      supportedReasoningEfforts: [
        "low",
        { reasoningEffort: "medium" },
        { reasoning_effort: "high" },
        { effort: "xhigh" },
        "max",
        " ultra ",
        "Future-Custom",
        "max",
        "   ",
        42,
      ],
    });

    expect(parameterByName(modelInfo?.config_schema, "reasoning_effort")).toMatchObject({
      enum_values: ["low", "medium", "high", "xhigh", "max", "ultra", "Future-Custom"],
      default_value: "low",
    });
  });

  it("appends a valid default effort only when it was not advertised", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      model: "gpt-default",
      defaultReasoningEffort: " ultra ",
      supportedReasoningEfforts: ["low", "max"],
    });

    expect(parameterByName(modelInfo?.config_schema, "reasoning_effort")).toMatchObject({
      enum_values: ["low", "max", "ultra"],
      default_value: "ultra",
    });
  });

  it("preserves explicit reasoning effort values for Codex runtime configuration", () => {
    expect(resolveCodexSessionReasoningEffort({ reasoning_effort: " max " })).toBe("max");
    expect(resolveCodexSessionReasoningEffort({ reasoning_effort: "ultra" })).toBe("ultra");
    expect(resolveCodexSessionReasoningEffort({ reasoning_effort: " Future-Custom " })).toBe(
      "Future-Custom",
    );
    expect(resolveCodexSessionReasoningEffort({ reasoning_effort: "   " })).toBeNull();
    expect(resolveCodexSessionReasoningEffort({ reasoningEffort: "max" })).toBeNull();
    expect(resolveCodexSessionReasoningEffort(null)).toBeNull();
  });

  it("adds Fast mode schema only when a Codex model advertises the priority service tier", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      model: "gpt-fast",
      displayName: "GPT Fast",
      defaultReasoningEffort: "high",
      supportedReasoningEfforts: ["medium", "high"],
      serviceTiers: [{ id: "priority", name: "Fast" }],
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

  it("normalizes case and whitespace in structured service tier IDs", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      id: "gpt-normalized-tier",
      serviceTiers: [{ id: " PRIORITY ", name: "Provider-defined label" }],
    });

    expect(modelInfo).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "service_tier")).toMatchObject({
      enum_values: ["fast"],
    });
  });

  it("omits Fast mode schema for non-priority, malformed, or missing service tiers", () => {
    const modelInfo = mapCodexModelListRowToModelInfo({
      model: "gpt-standard",
      supportedReasoningEfforts: ["medium"],
      serviceTiers: [
        { id: "flex" },
        { id: "" },
        { name: "Fast" },
        "priority",
        null,
        42,
      ],
    });
    const missingServiceTiers = mapCodexModelListRowToModelInfo({
      model: "gpt-no-tiers",
    });

    expect(modelInfo).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "reasoning_effort")).not.toBeNull();
    expect(parameterByName(modelInfo?.config_schema, "service_tier")).toBeNull();
    expect(parameterByName(missingServiceTiers?.config_schema, "service_tier")).toBeNull();
  });

  it("does not fall back to deprecated additional speed tier metadata", () => {
    const camelCaseModelInfo = mapCodexModelListRowToModelInfo({
      id: "gpt-deprecated-camel",
      additionalSpeedTiers: ["fast"],
    });
    const snakeCaseModelInfo = mapCodexModelListRowToModelInfo({
      id: "gpt-deprecated-snake",
      additional_speed_tiers: [" Fast "],
    });

    expect(camelCaseModelInfo).not.toBeNull();
    expect(snakeCaseModelInfo).not.toBeNull();
    expect(parameterByName(camelCaseModelInfo?.config_schema, "service_tier")).toBeNull();
    expect(parameterByName(snakeCaseModelInfo?.config_schema, "service_tier")).toBeNull();
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
