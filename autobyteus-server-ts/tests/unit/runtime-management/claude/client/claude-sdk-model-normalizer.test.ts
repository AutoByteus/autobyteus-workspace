import { describe, expect, it } from "vitest";
import {
  normalizeModelDescriptors,
  toModelInfo,
} from "../../../../../src/runtime-management/claude/client/claude-sdk-model-normalizer.js";

describe("claude-sdk-model-normalizer", () => {
  it("normalizes live Claude model descriptions and preserves supported effort levels", () => {
    const descriptors = normalizeModelDescriptors([
      {
        value: "default",
        displayName: "Default (recommended)",
        description: "   ",
        supportsEffort: true,
        supportedEffortLevels: ["low", "medium", "high"],
        supportsAdaptiveThinking: true,
      },
      {
        id: "default",
        description: " Sonnet 5 · Efficient for routine tasks ",
        supported_effort_levels: ["medium", "high", "low"],
      },
      {
        id: "default",
        description: "Later duplicate description must not replace the first nonempty value",
      },
      {
        value: "sonnet",
        displayName: "Sonnet",
        description: "Sonnet 5 · Efficient for routine tasks",
      },
      {
        value: "opus",
        displayName: "Opus",
        description: "Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet",
      },
      {
        value: "haiku",
        displayName: "Haiku",
        description: "Haiku 4.5 · Fastest for quick answers",
      },
    ]);

    expect(descriptors).toEqual([
      {
        identifier: "default",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Default (recommended)",
        description: "Sonnet 5 · Efficient for routine tasks",
        supportsEffort: true,
        supportedEffortLevels: ["low", "medium", "high"],
      },
      {
        identifier: "sonnet",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Sonnet",
        description: "Sonnet 5 · Efficient for routine tasks",
        supportsEffort: false,
        supportedEffortLevels: [],
      },
      {
        identifier: "opus",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Opus",
        description: "Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet",
        supportsEffort: false,
        supportedEffortLevels: [],
      },
      {
        identifier: "haiku",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Haiku",
        description: "Haiku 4.5 · Fastest for quick answers",
        supportsEffort: false,
        supportedEffortLevels: [],
      },
    ]);
  });

  it("offers effort only, at the SDK's levels and with no default, and no thinking on/off switch", () => {
    const model = toModelInfo({
      identifier: "opus",
      resolvedModel: null,
      resolvedModelAmbiguous: false,
      displayName: "Opus",
      description: "Opus 4.8 · Best for everyday, complex tasks",
      supportsEffort: true,
      supportedEffortLevels: ["low", "medium", "high", "max"],
    });

    expect(model).toMatchObject({
      model_identifier: "opus",
      display_name: "Opus",
      description: "Opus 4.8 · Best for everyday, complex tasks",
      value: "opus",
      canonical_name: "opus",
    });
    const properties = (model.config_schema as { properties: Record<string, Record<string, unknown>> }).properties;
    expect(Object.keys(properties)).toEqual(["reasoning_effort"]);
    expect(properties.reasoning_effort).toMatchObject({ type: "string", enum: ["low", "medium", "high", "max"] });
    expect(properties.reasoning_effort).not.toHaveProperty("default");
  });

  it("uses the SDK resolved model as canonical name and falls back to the SDK value", () => {
    const descriptor = {
      identifier: "claude-fable-5[1m]",
      resolvedModel: "claude-fable-5",
      resolvedModelAmbiguous: false,
      displayName: "Fable",
      description: null,
      supportsEffort: false,
      supportedEffortLevels: [],
    };

    expect(toModelInfo(descriptor)).toMatchObject({
      model_identifier: "claude-fable-5[1m]",
      value: "claude-fable-5[1m]",
      canonical_name: "claude-fable-5",
    });
    expect(toModelInfo({ ...descriptor, resolvedModel: null }).canonical_name).toBe("claude-fable-5[1m]");
    expect(toModelInfo({ ...descriptor, resolvedModel: null, resolvedModelAmbiguous: true }).canonical_name)
      .toBe("claude-fable-5[1m]");
  });

  it("offers no settings for a model whose SDK row reports no effort support, whatever else it reports", () => {
    const [descriptor] = normalizeModelDescriptors([
      { value: "default", displayName: "Default", supportsAdaptiveThinking: true, supportsEffort: false },
    ]);
    const model = toModelInfo(descriptor!);

    expect(model.config_schema).toBeUndefined();
    expect(model.description).toBeNull();
  });

  it("treats empty descriptions as absent", () => {
    expect(normalizeModelDescriptors([
      { value: "bare", displayName: "Bare", description: " \n\t " },
      "string-only",
    ])).toEqual([
      {
        identifier: "bare",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Bare",
        description: null,
        supportsEffort: false,
        supportedEffortLevels: [],
      },
      {
        identifier: "string-only",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: null,
        description: null,
        supportsEffort: false,
        supportedEffortLevels: [],
      },
    ]);
  });
});

describe('Claude SDK resolved-model binding', () => {
  it('retains exact SDK alias-to-wire mapping and marks conflicting duplicate rows ambiguous', () => {
    const rows = normalizeModelDescriptors([
      { value: 'opus[1m]', resolvedModel: 'claude-opus-5-5[1m]' },
      { value: 'default', resolvedModel: 'claude-sonnet-5' },
      { value: 'opus[1m]', resolvedModel: 'claude-opus-5-5[1m]' },
    ]);
    expect(rows.find((row) => row.identifier === 'opus[1m]')).toMatchObject({
      resolvedModel: 'claude-opus-5-5[1m]', resolvedModelAmbiguous: false,
    });
    expect(normalizeModelDescriptors([
      { value: 'opus[1m]', resolvedModel: 'claude-opus-5-5[1m]' },
      { value: 'opus[1m]', resolvedModel: 'different-wire-id' },
    ])[0]).toMatchObject({ resolvedModel: null, resolvedModelAmbiguous: true });
  });
});
