import { describe, expect, it } from "vitest";
import {
  buildClaudeSdkSpawnEnvironment,
  resolveClaudeSdkAuthMode,
  resolveClaudeSdkPermissionMode,
} from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-shared.js";

describe("claude-runtime-shared auth mode", () => {
  it("defaults to cli auth mode for Claude Agent SDK runtime", () => {
    const mode = resolveClaudeSdkAuthMode({});

    expect(mode).toBe("cli");
  });

  it("defaults to cli auth mode inside Electron runtime", () => {
    const mode = resolveClaudeSdkAuthMode({
      ELECTRON_RUN_AS_NODE: "1",
    });

    expect(mode).toBe("cli");
  });

  it("respects explicit api-key auth mode", () => {
    const mode = resolveClaudeSdkAuthMode({
      CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
      ELECTRON_RUN_AS_NODE: "1",
    });

    expect(mode).toBe("api-key");
  });

  it("strips API key variables in cli mode", () => {
    const resolved = buildClaudeSdkSpawnEnvironment({
      CLAUDE_AGENT_SDK_AUTH_MODE: "cli",
      ANTHROPIC_API_KEY: "invalid-key",
      CLAUDE_CODE_API_KEY: "invalid-key",
      CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR: "9",
      KEEP_ME: "yes",
    });

    expect(resolved.ANTHROPIC_API_KEY).toBeUndefined();
    expect(resolved.CLAUDE_CODE_API_KEY).toBeUndefined();
    expect(resolved.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR).toBeUndefined();
    expect(resolved.KEEP_ME).toBe("yes");
  });

  it("strips API key variables in auto mode when OAuth signal exists", () => {
    const resolved = buildClaudeSdkSpawnEnvironment({
      CLAUDE_AGENT_SDK_AUTH_MODE: "auto",
      CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: "8",
      ANTHROPIC_API_KEY: "invalid-key",
      KEEP_ME: "yes",
    });

    expect(resolved.ANTHROPIC_API_KEY).toBeUndefined();
    expect(resolved.KEEP_ME).toBe("yes");
  });

  it("keeps API key variables in auto mode when OAuth signal is missing", () => {
    const resolved = buildClaudeSdkSpawnEnvironment({
      CLAUDE_AGENT_SDK_AUTH_MODE: "auto",
      ANTHROPIC_API_KEY: "valid-key",
      KEEP_ME: "yes",
    });

    expect(resolved.ANTHROPIC_API_KEY).toBe("valid-key");
    expect(resolved.KEEP_ME).toBe("yes");
  });
});

describe("claude-runtime-shared permission mode", () => {
  it("defaults to default permission mode when no override is configured", () => {
    expect(resolveClaudeSdkPermissionMode({ env: {} })).toBe("default");
  });

  it("resolves permission mode from runtime metadata before llmConfig/env", () => {
    const permissionMode = resolveClaudeSdkPermissionMode({
      runtimeMetadata: {
        permissionMode: "bypass-permissions",
      },
      llmConfig: {
        permissionMode: "plan",
      },
      env: {
        CLAUDE_AGENT_SDK_PERMISSION_MODE: "default",
      },
    });

    expect(permissionMode).toBe("bypassPermissions");
  });

  it("falls back to llmConfig when runtime metadata does not specify permission mode", () => {
    const permissionMode = resolveClaudeSdkPermissionMode({
      runtimeMetadata: {},
      llmConfig: {
        claude_permission_mode: "accept_edits",
      },
      env: {
        CLAUDE_AGENT_SDK_PERMISSION_MODE: "plan",
      },
    });

    expect(permissionMode).toBe("acceptEdits");
  });

  it("uses env override when metadata and llmConfig are not set", () => {
    const permissionMode = resolveClaudeSdkPermissionMode({
      env: {
        CLAUDE_AGENT_SDK_PERMISSION_MODE: "plan",
      },
    });

    expect(permissionMode).toBe("plan");
  });

  it("falls back to default on invalid env override", () => {
    const permissionMode = resolveClaudeSdkPermissionMode({
      env: {
        CLAUDE_AGENT_SDK_PERMISSION_MODE: "invalid-mode",
      },
    });

    expect(permissionMode).toBe("default");
  });
});
