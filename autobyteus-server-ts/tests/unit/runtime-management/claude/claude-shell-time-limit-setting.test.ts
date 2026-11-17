import { describe, expect, it } from "vitest";
import { applyClaudeShellTimeLimitDefaults } from "../../../../src/runtime-management/claude/claude-shell-time-limit-setting.js";

describe("applyClaudeShellTimeLimitDefaults (autobyteus-483, REQ-001, REQ-002)", () => {
  it("sets both Claude Code shell time-limit variables to 2 hours when neither is set", () => {
    const env: Record<string, string | undefined> = { KEEP: "kept" };
    applyClaudeShellTimeLimitDefaults(env);
    expect(env).toEqual({ KEEP: "kept", BASH_DEFAULT_TIMEOUT_MS: "7200000", BASH_MAX_TIMEOUT_MS: "7200000" });
  });

  it("never overrides a value the environment already defines, even an empty one", () => {
    const env: Record<string, string | undefined> = { BASH_DEFAULT_TIMEOUT_MS: "", BASH_MAX_TIMEOUT_MS: "900000" };
    applyClaudeShellTimeLimitDefaults(env);
    expect(env).toEqual({ BASH_DEFAULT_TIMEOUT_MS: "", BASH_MAX_TIMEOUT_MS: "900000" });
  });
});
