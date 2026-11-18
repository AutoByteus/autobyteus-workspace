import { describe, expect, it } from "vitest";
import {
  buildClaudeSessionConfig,
  CLAUDE_SESSION_SETTING_KEYS,
  claudeSessionReasoningOptions,
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
      additionalDirectories: [],
    });
  });

  it("maps the stored effort to the Claude SDK effort option and sends no thinking option (AC-005, AC-006)", () => {
    const config = buildClaudeSessionConfig({
      model: "opus",
      workingDirectory: "/tmp/claude-session-config",
      llmConfig: {
        thinking_enabled: false,
        reasoning_effort: "xhigh",
        thinking_display: "summarized",
      },
    });

    expect(config).toEqual({
      model: "opus",
      workingDirectory: "/tmp/claude-session-config",
      permissionMode: "default",
      autoExecuteTools: false,
      additionalDirectories: [],
      effort: "xhigh",
    });
    expect(claudeSessionReasoningOptions(config)).toEqual({ effort: "xhigh" });
  });

  it("sends nothing for an unchosen effort", () => {
    const config = buildClaudeSessionConfig({
      model: "opus",
      workingDirectory: "/tmp/claude-session-config",
      llmConfig: { thinking_enabled: true },
    });

    expect(config).not.toHaveProperty("effort");
    expect(claudeSessionReasoningOptions(config)).toEqual({});
  });

  it("reads only the keys CLAUDE_SESSION_SETTING_KEYS names (new runs keep exactly these)", () => {
    const everyKey = Object.fromEntries(
      ["thinking_enabled", "thinking_display", "service_tier", "other", ...CLAUDE_SESSION_SETTING_KEYS].map((key) => [key, "low"]),
    );
    const withAll = buildClaudeSessionConfig({ model: "m", workingDirectory: "/w", llmConfig: everyKey });
    const withDeclaredOnly = buildClaudeSessionConfig({
      model: "m",
      workingDirectory: "/w",
      llmConfig: Object.fromEntries(CLAUDE_SESSION_SETTING_KEYS.map((key) => [key, "low"])),
    });

    expect(withAll).toEqual(withDeclaredOnly);
    expect(CLAUDE_SESSION_SETTING_KEYS).toEqual(["reasoning_effort"]);
  });

  it("keeps the agent's semantic memory folder as an additional directory (REQ-006)", () => {
    const folder = "/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator";
    expect(buildClaudeSessionConfig({
      model: "haiku", workingDirectory: "/tmp/claude-session-config", additionalDirectories: [folder],
    }).additionalDirectories).toEqual([folder]);
  });
});
