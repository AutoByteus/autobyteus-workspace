import { describe, expect, it } from "vitest";
import {
  familyMatchStrength, resolveLimitCoverage,
} from "../../../src/available-agent-runtimes/usage-limit-model-matching.js";
import type { RuntimeUsageLimit } from "../../../src/runtime-management/agent-runtimes/usage-limits/usage-limits-reading.js";

const AGY_MODELS = [
  { id: "gemini-4-argon-high", name: "Gemini 4 Argon (High)" },
  { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash (High)" },
  { id: "claude-opus-5-5-low", name: "Claude Opus 5.5 (Low)" },
  { id: "claude-sonnet-5-5-medium", name: "Claude Sonnet 5.5 (Medium)" },
  { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B (Medium)" },
];
const limit = (name: string, appliesTo: RuntimeUsageLimit["appliesTo"]): RuntimeUsageLimit =>
  ({ name, remainingPercent: 0, resetsAt: null, exhausted: true, appliesTo });

describe("usage-limit model matching", () => {
  it("matches a family's words in order from the display name's first word", () => {
    expect(familyMatchStrength("Gemini 3.8 Flash (High)", "Gemini Flash")).toBe(2);
    expect(familyMatchStrength("Gemini 4 Argon (High)", "Gemini 4 Argon")).toBe(3);
    expect(familyMatchStrength("Gemini 4 Argon (High)", "Gemini Pro")).toBe(0);
    expect(familyMatchStrength("GPT-OSS 120B (Medium)", "GPT-OSS")).toBe(1);
    expect(familyMatchStrength("Opus (1M context)", "Fable")).toBe(0);
    expect(familyMatchStrength("Flash Gemini", "Gemini Flash")).toBe(0);
  });

  it("gives each model to its most specific group and a group without models to the whole runtime (DEC-003)", () => {
    const gemini = limit("Gemini Models · weekly", { kind: "modelFamilies", families: ["Gemini Flash", "Gemini Pro", "Gemini", "Gemini Models"] });
    const argon = limit("Gemini 4 Argon · weekly", { kind: "modelFamilies", families: ["Gemini 4 Argon"] });
    const thirdParty = limit("Claude and GPT models · weekly", { kind: "modelFamilies", families: ["Claude Opus", "Claude Sonnet", "GPT-OSS"] });
    const nothing = limit("Unknown group · weekly", { kind: "modelFamilies", families: ["Imagen"] });
    const coverage = resolveLimitCoverage([gemini, argon, thirdParty, nothing], AGY_MODELS);
    expect([...coverage.get(gemini)!]).toEqual(["gemini-3.8-flash-high"]);
    expect([...coverage.get(argon)!]).toEqual(["gemini-4-argon-high"]);
    expect([...coverage.get(thirdParty)!]).toEqual(["claude-opus-5-5-low", "claude-sonnet-5-5-medium", "gpt-oss-120b-medium"]);
    expect(coverage.get(nothing)!.size).toBe(AGY_MODELS.length);
  });

  it("covers listed model ids, falling back to every model when none is offered", () => {
    const known = limit("Weekly · spark", { kind: "models", modelIds: ["gpt-oss-120b-medium"] });
    const unknown = limit("Weekly · gone", { kind: "models", modelIds: ["not-offered"] });
    const coverage = resolveLimitCoverage([known, unknown], AGY_MODELS);
    expect([...coverage.get(known)!]).toEqual(["gpt-oss-120b-medium"]);
    expect(coverage.get(unknown)!.size).toBe(AGY_MODELS.length);
  });
});
