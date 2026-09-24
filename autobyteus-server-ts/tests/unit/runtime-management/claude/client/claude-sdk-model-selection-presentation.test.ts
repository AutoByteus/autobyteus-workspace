import { describe, expect, it } from "vitest";
import { normalizeModelDescriptors } from "../../../../../src/runtime-management/claude/client/claude-sdk-model-normalizer.js";
import { deriveClaudeModelSelectionPresentation } from "../../../../../src/runtime-management/claude/client/claude-sdk-model-selection-presentation.js";

const derive = (rows: unknown[]) =>
  Object.fromEntries(deriveClaudeModelSelectionPresentation(normalizeModelDescriptors(rows)));

describe("deriveClaudeModelSelectionPresentation", () => {
  it("folds default into the first sibling with the same canonical ID and recommends that sibling", () => {
    expect(derive([
      { value: "default", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "claude-fable-5[1m]", resolvedModel: "claude-fable-5" },
      { value: "opus[1m]", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "opus-late", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "sonnet", resolvedModel: "claude-sonnet-5" },
    ])).toEqual({
      default: { recommended: false, aliasOfModelIdentifier: "opus[1m]" },
      "claude-fable-5[1m]": { recommended: false, aliasOfModelIdentifier: null },
      "opus[1m]": { recommended: true, aliasOfModelIdentifier: null },
      "opus-late": { recommended: false, aliasOfModelIdentifier: null },
      sonnet: { recommended: false, aliasOfModelIdentifier: null },
    });
  });

  it("keeps default as its own recommended option when no sibling shares its canonical ID", () => {
    expect(derive([
      { value: "default", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "sonnet", resolvedModel: "claude-sonnet-5" },
    ])).toEqual({
      default: { recommended: true, aliasOfModelIdentifier: null },
      sonnet: { recommended: false, aliasOfModelIdentifier: null },
    });
  });

  it("never folds when default has no or an ambiguous canonical ID", () => {
    expect(derive([
      { value: "default" },
      { value: "sonnet" },
    ])).toEqual({
      default: { recommended: true, aliasOfModelIdentifier: null },
      sonnet: { recommended: false, aliasOfModelIdentifier: null },
    });
    expect(derive([
      { value: "default", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "default", resolvedModel: "claude-sonnet-5" },
      { value: "opus[1m]", resolvedModel: "claude-opus-5-5[1m]" },
    ])).toEqual({
      default: { recommended: true, aliasOfModelIdentifier: null },
      "opus[1m]": { recommended: false, aliasOfModelIdentifier: null },
    });
  });

  it("does not fold into a sibling whose canonical ID is ambiguous", () => {
    expect(derive([
      { value: "default", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "opus[1m]", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "opus[1m]", resolvedModel: "claude-opus-6[1m]" },
    ])).toEqual({
      default: { recommended: true, aliasOfModelIdentifier: null },
      "opus[1m]": { recommended: false, aliasOfModelIdentifier: null },
    });
  });

  it("marks nothing recommended when the SDK reports no default row", () => {
    expect(derive([
      { value: "opus[1m]", resolvedModel: "claude-opus-5-5[1m]" },
      { value: "sonnet", resolvedModel: "claude-sonnet-5" },
    ])).toEqual({
      "opus[1m]": { recommended: false, aliasOfModelIdentifier: null },
      sonnet: { recommended: false, aliasOfModelIdentifier: null },
    });
  });
});
