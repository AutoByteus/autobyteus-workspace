import { describe, expect, it } from "vitest";
import {
  CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY,
  CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_VALUES,
  applyClaudeOneHourPromptCacheDefault,
  isClaudeOneHourPromptCacheEnabled,
} from "../../../../src/runtime-management/claude/claude-prompt-cache-setting.js";

describe("Claude one-hour prompt cache setting", () => {
  it("exports the canonical key and the two allowed values", () => {
    expect(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY).toBe("CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE");
    expect(CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_VALUES).toEqual(["true", "false"]);
  });

  it("is on when absent or true, and off only for false", () => {
    expect(isClaudeOneHourPromptCacheEnabled({})).toBe(true);
    expect(isClaudeOneHourPromptCacheEnabled({ CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE: "true" })).toBe(true);
    expect(isClaudeOneHourPromptCacheEnabled({ CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE: "false" })).toBe(false);
    expect(isClaudeOneHourPromptCacheEnabled({ CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE: " FALSE " })).toBe(false);
  });

  it("sets ENABLE_PROMPT_CACHING_1H=1 when on and the variable is not set", () => {
    const env: Record<string, string | undefined> = {};
    applyClaudeOneHourPromptCacheDefault(env);
    expect(env).toEqual({ ENABLE_PROMPT_CACHING_1H: "1" });
  });

  it("adds nothing when the setting is false", () => {
    const env: Record<string, string | undefined> = { CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE: "false" };
    applyClaudeOneHourPromptCacheDefault(env);
    expect(env).toEqual({ CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE: "false" });
  });

  it("keeps a user-set ENABLE_PROMPT_CACHING_1H and never sets the TTL bucket variables", () => {
    const env: Record<string, string | undefined> = { ENABLE_PROMPT_CACHING_1H: "0" };
    applyClaudeOneHourPromptCacheDefault(env);
    expect(env).toEqual({ ENABLE_PROMPT_CACHING_1H: "0" });
    expect(env).not.toHaveProperty("CLAUDE_CODE_PROMPT_CACHE_TTL");
  });
});
