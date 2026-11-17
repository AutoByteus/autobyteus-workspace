import { describe, expect, it } from "vitest";
import { buildClaudeSdkSpawnEnvironment } from "../../../../../src/runtime-management/claude/client/claude-sdk-spawn-environment.js";

const SHELL_TIME_LIMITS = { BASH_DEFAULT_TIMEOUT_MS: "7200000", BASH_MAX_TIMEOUT_MS: "7200000" };

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
      ...SHELL_TIME_LIMITS,
    });
    expect(buildClaudeSdkSpawnEnvironment({ CLAUDE_AGENT_SDK_AUTH_MODE: "auto", ...API_KEY_VARIABLES })).toEqual({
      CLAUDE_AGENT_SDK_AUTH_MODE: "auto",
      ...API_KEY_VARIABLES,
      ENABLE_PROMPT_CACHING_1H: "1",
      ...SHELL_TIME_LIMITS,
    });
    expect(buildClaudeSdkSpawnEnvironment(
      { CLAUDE_AGENT_SDK_AUTH_MODE: "api-key", ...API_KEY_VARIABLES },
      "synthetic-vault-key",
    )).toEqual({
      CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
      ANTHROPIC_API_KEY: "synthetic-vault-key",
      CLAUDE_CODE_API_KEY: "synthetic-code-key",
      ENABLE_PROMPT_CACHING_1H: "1",
      ...SHELL_TIME_LIMITS,
    });
  });
});

describe("buildClaudeSdkSpawnEnvironment shell time limits (autobyteus-483)", () => {
  it.each(["cli", "auto", "api-key"] as const)("sets both to 2 hours in %s mode when neither is set (AC-004)", (mode) => {
    const spawnEnv = buildClaudeSdkSpawnEnvironment({ CLAUDE_AGENT_SDK_AUTH_MODE: mode }, "synthetic-vault-key");
    expect(spawnEnv).toMatchObject(SHELL_TIME_LIMITS);
    expect(spawnEnv.ENABLE_PROMPT_CACHING_1H).toBe("1");
  });

  it.each([
    [{ BASH_MAX_TIMEOUT_MS: "900000" }, { BASH_MAX_TIMEOUT_MS: "900000", BASH_DEFAULT_TIMEOUT_MS: "7200000" }],
    [{ BASH_DEFAULT_TIMEOUT_MS: "60000" }, { BASH_DEFAULT_TIMEOUT_MS: "60000", BASH_MAX_TIMEOUT_MS: "7200000" }],
    [{ BASH_DEFAULT_TIMEOUT_MS: "", BASH_MAX_TIMEOUT_MS: "900000" }, { BASH_DEFAULT_TIMEOUT_MS: "", BASH_MAX_TIMEOUT_MS: "900000" }],
  ])("keeps a value the environment already sets %o and fills in only the other (AC-003)", (set, expected) => {
    expect(buildClaudeSdkSpawnEnvironment({ CLAUDE_AGENT_SDK_AUTH_MODE: "cli", ...set })).toMatchObject(expected);
  });
});
