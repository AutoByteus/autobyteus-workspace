import { describe, expect, it } from "vitest";
import { resolveClaudePermissionMode } from "../../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";

describe("Claude session config", () => {
  it("uses SDK bypassPermissions when autoExecuteTools is enabled", () => {
    expect(resolveClaudePermissionMode(true)).toBe("bypassPermissions");
  });

  it("uses default permission mode when autoExecuteTools is disabled", () => {
    expect(resolveClaudePermissionMode(false)).toBe("default");
    expect(resolveClaudePermissionMode(null)).toBe("default");
    expect(resolveClaudePermissionMode(undefined)).toBe("default");
  });
});
