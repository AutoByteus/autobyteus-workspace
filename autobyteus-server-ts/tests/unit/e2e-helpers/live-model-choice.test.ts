import { describe, expect, it } from "vitest";
import { chooseLiveModel } from "../../e2e/helpers/live-model-choice.js";

describe("chooseLiveModel", () => {
  it("uses the pin when the runtime offers it", () => {
    expect(chooseLiveModel("grok", "grok-4.7", ["grok-4.5", "grok-4.7"])).toEqual({ model: "grok-4.7" });
    expect(chooseLiveModel("codex", "gpt-5.6-luna", ["gpt-5.6-luna"])).toEqual({ model: "gpt-5.6-luna" });
  });

  it("falls back to Grok's first offered model when its pin is missing", () => {
    expect(chooseLiveModel("grok", "grok-4.7", ["grok-4.5", "grok-4.6"]))
      .toEqual({ model: "grok-4.5", fallbackFrom: "grok-4.7" });
  });

  it("fails Codex and Claude when their pin is missing", () => {
    expect(() => chooseLiveModel("codex", "gpt-5.6-luna", ["gpt-5.5"]))
      .toThrow("codex model gpt-5.6-luna is not offered; available: gpt-5.5");
    expect(() => chooseLiveModel("claude", "haiku", ["sonnet", "opus"]))
      .toThrow("claude model haiku is not offered; available: sonnet, opus");
  });

  it("uses an offered override and fails a missing one, also on Grok", () => {
    expect(chooseLiveModel("grok", "grok-4.7", ["grok-4.5", "grok-4.6"], "grok-4.6")).toEqual({ model: "grok-4.6" });
    expect(() => chooseLiveModel("grok", "grok-4.7", ["grok-4.5", "grok-4.6"], "grok-4.7"))
      .toThrow("grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6");
  });

  it("fails on an empty list", () => {
    expect(() => chooseLiveModel("grok", "grok-4.7", [])).toThrow("grok model grok-4.7 is not offered; available: ");
    expect(() => chooseLiveModel("claude", "haiku", [], "sonnet")).toThrow("claude model sonnet is not offered");
  });
});
