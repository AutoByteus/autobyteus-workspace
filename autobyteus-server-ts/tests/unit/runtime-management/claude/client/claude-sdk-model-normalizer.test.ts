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
        supportsAdaptiveThinking: true,
      },
      {
        identifier: "sonnet",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Sonnet",
        description: "Sonnet 5 · Efficient for routine tasks",
        supportsEffort: false,
        supportedEffortLevels: [],
        supportsAdaptiveThinking: false,
      },
      {
        identifier: "opus",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Opus",
        description: "Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet",
        supportsEffort: false,
        supportedEffortLevels: [],
        supportsAdaptiveThinking: false,
      },
      {
        identifier: "haiku",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: "Haiku",
        description: "Haiku 4.5 · Fastest for quick answers",
        supportsEffort: false,
        supportedEffortLevels: [],
        supportsAdaptiveThinking: false,
      },
    ]);
  });

  it("exposes thinking_enabled and reasoning_effort when Claude thinking is supported", () => {
    const model = toModelInfo({
      identifier: "opus",
      resolvedModel: null,
      resolvedModelAmbiguous: false,
      displayName: "Opus",
      description: "Opus 4.8 · Best for everyday, complex tasks",
      supportsEffort: true,
      supportedEffortLevels: ["low", "medium", "high", "max"],
      supportsAdaptiveThinking: true,
    });

    expect(model).toMatchObject({
      model_identifier: "opus",
      display_name: "Opus",
      description: "Opus 4.8 · Best for everyday, complex tasks",
      value: "opus",
      canonical_name: "opus",
    });
    expect(model.config_schema).toMatchObject({
      properties: {
        thinking_enabled: expect.objectContaining({
          type: "boolean",
          default: false,
        }),
        reasoning_effort: expect.objectContaining({
          type: "string",
          default: "medium",
          enum: ["low", "medium", "high", "max"],
        }),
      },
    });
  });

  it("keeps adaptive-thinking and effort capabilities independent", () => {
    const model = toModelInfo({
      identifier: "default",
      resolvedModel: null,
      resolvedModelAmbiguous: false,
      displayName: "Default",
      description: null,
      supportsEffort: false,
      supportedEffortLevels: [],
      supportsAdaptiveThinking: true,
    });

    expect(model.config_schema).toMatchObject({
      properties: {
        thinking_enabled: expect.objectContaining({ type: "boolean" }),
      },
    });
    expect(model.config_schema).not.toHaveProperty("properties.reasoning_effort");
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
        supportsAdaptiveThinking: false,
      },
      {
        identifier: "string-only",
        resolvedModel: null,
        resolvedModelAmbiguous: false,
        displayName: null,
        description: null,
        supportsEffort: false,
        supportedEffortLevels: [],
        supportsAdaptiveThinking: false,
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
