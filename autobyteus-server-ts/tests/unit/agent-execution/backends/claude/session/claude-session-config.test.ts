import { describe, expect, it } from "vitest";
import {
  buildClaudeSessionConfig,
  DEFAULT_CLAUDE_PERMISSION_MODE,
  resolveClaudePermissionMode,
} from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";

describe("Claude session config", () => {
  it("keeps AutoByteus auto approval separate from Claude provider permission mode", () => {
    expect(resolveClaudePermissionMode(true)).toBe(DEFAULT_CLAUDE_PERMISSION_MODE);
    expect(resolveClaudePermissionMode(false)).toBe(DEFAULT_CLAUDE_PERMISSION_MODE);
    expect(resolveClaudePermissionMode(null)).toBe(DEFAULT_CLAUDE_PERMISSION_MODE);
    expect(resolveClaudePermissionMode(undefined)).toBe(DEFAULT_CLAUDE_PERMISSION_MODE);
  });

  it("stores autoExecuteTools as explicit AutoByteus approval state", () => {
    expect(
      buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: "/tmp/claude-session-config",
        autoExecuteTools: true,
      }),
    ).toEqual({
      model: "haiku",
      workingDirectory: "/tmp/claude-session-config",
      permissionMode: "default",
      autoExecuteTools: true,
    });
  });
});
