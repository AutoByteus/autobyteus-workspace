import { describe, expect, it } from "vitest";
import { buildClaudeSdkSpawnEnvironment } from "../../../../../src/runtime-management/claude/client/claude-sdk-spawn-environment.js";

const API_KEY_VARIABLES = {
  ANTHROPIC_API_KEY: "synthetic-api-key",
  CLAUDE_CODE_API_KEY: "synthetic-code-key",
};

describe("buildClaudeSdkSpawnEnvironment one-hour prompt cache default", () => {
  it.each([
    ["cli", {}],
    ["auto", {}],
    ["auto", { CLAUDE_CODE_OAUTH_TOKEN: "synthetic-oauth" }],
    ["api-key", {}],
  ] as const)("sets ENABLE_PROMPT_CACHING_1H=1 in %s mode", (mode, extra) => {
    const spawnEnv = buildClaudeSdkSpawnEnvironment({ CLAUDE_AGENT_SDK_AUTH_MODE: mode, ...extra }, "synthetic-vault-key");
    expect(spawnEnv.ENABLE_PROMPT_CACHING_1H).toBe("1");
    expect(spawnEnv).not.toHaveProperty("CLAUDE_CODE_PROMPT_CACHE_TTL");
  });

  it.each(["cli", "auto", "api-key"] as const)("adds nothing in %s mode when the setting is false", (mode) => {
    const spawnEnv = buildClaudeSdkSpawnEnvironment({
      CLAUDE_AGENT_SDK_AUTH_MODE: mode,
      CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE: "false",
    });
    expect(spawnEnv).not.toHaveProperty("ENABLE_PROMPT_CACHING_1H");
  });

  it("keeps a user-set ENABLE_PROMPT_CACHING_1H", () => {
    const spawnEnv = buildClaudeSdkSpawnEnvironment({
      CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
      ENABLE_PROMPT_CACHING_1H: "0",
    });
    expect(spawnEnv.ENABLE_PROMPT_CACHING_1H).toBe("0");
  });

  it("keeps the auth-mode policy unchanged", () => {
    expect(buildClaudeSdkSpawnEnvironment({ CLAUDE_AGENT_SDK_AUTH_MODE: "cli", ...API_KEY_VARIABLES })).toEqual({
      CLAUDE_AGENT_SDK_AUTH_MODE: "cli",
      ENABLE_PROMPT_CACHING_1H: "1",
    });
    expect(buildClaudeSdkSpawnEnvironment({ CLAUDE_AGENT_SDK_AUTH_MODE: "auto", ...API_KEY_VARIABLES })).toEqual({
      CLAUDE_AGENT_SDK_AUTH_MODE: "auto",
      ...API_KEY_VARIABLES,
      ENABLE_PROMPT_CACHING_1H: "1",
    });
    expect(buildClaudeSdkSpawnEnvironment(
      { CLAUDE_AGENT_SDK_AUTH_MODE: "api-key", ...API_KEY_VARIABLES },
      "synthetic-vault-key",
    )).toEqual({
      CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
      ANTHROPIC_API_KEY: "synthetic-vault-key",
      CLAUDE_CODE_API_KEY: "synthetic-code-key",
      ENABLE_PROMPT_CACHING_1H: "1",
    });
  });
});
