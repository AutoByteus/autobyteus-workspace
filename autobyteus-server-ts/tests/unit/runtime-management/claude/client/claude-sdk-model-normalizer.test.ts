import { describe, expect, it } from "vitest";
import {
  normalizeModelDescriptors,
  toModelInfo,
} from "../../../../../src/runtime-management/claude/client/claude-sdk-model-normalizer.js";

describe("claude-sdk-model-normalizer", () => {
  it("normalizes Claude model descriptors and preserves supported effort levels", () => {
    const descriptors = normalizeModelDescriptors([
      {
        id: "default",
        name: "Default (recommended)",
        supportsEffort: true,
        supportedEffortLevels: ["low", "medium", "high"],
        supportsAdaptiveThinking: true,
      },
      {
        id: "default",
        supported_effort_levels: ["medium", "high", "low"],
      },
      {
        id: "haiku",
        name: "Haiku",
      },
    ]);

    expect(descriptors).toEqual([
      {
        identifier: "default",
        displayName: "Default (recommended)",
        supportsEffort: true,
        supportedEffortLevels: ["low", "medium", "high"],
        supportsAdaptiveThinking: true,
      },
      {
        identifier: "haiku",
        displayName: "Haiku",
        supportsEffort: false,
        supportedEffortLevels: [],
        supportsAdaptiveThinking: false,
      },
    ]);
  });

  it("exposes thinking_enabled and reasoning_effort when Claude thinking is supported", () => {
    const model = toModelInfo({
      identifier: "opus",
      displayName: "Opus",
      supportsEffort: true,
      supportedEffortLevels: ["low", "medium", "high", "max"],
      supportsAdaptiveThinking: true,
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

  it("falls back to medium reasoning_effort when thinking is supported without explicit levels", () => {
    const model = toModelInfo({
      identifier: "default",
      displayName: "Default",
      supportsEffort: false,
      supportedEffortLevels: [],
      supportsAdaptiveThinking: true,
    });

    expect(model.config_schema).toMatchObject({
      properties: {
        reasoning_effort: expect.objectContaining({
          default: "medium",
          enum: ["medium"],
        }),
      },
    });
  });
});
