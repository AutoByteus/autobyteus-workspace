// Claude runtime one-hour prompt cache default (autobyteus-273).
// Claude Code ranks ENABLE_PROMPT_CACHING_1H below every explicit user choice
// (`promptCacheTtl` settings, CLAUDE_CODE_PROMPT_CACHE_TTL, FORCE_PROMPT_CACHING_5M),
// so setting it as a default never overrides the user. CLAUDE_CODE_PROMPT_CACHE_TTL
// is deliberately not used: it would override a user's `promptCacheTtl` setting.
// See https://code.claude.com/docs/en/prompt-caching.

export const CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY = "CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE" as const;

export const CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_VALUES = ["true", "false"] as const;

const CLAUDE_CODE_ONE_HOUR_PROMPT_CACHE_ENV_KEY = "ENABLE_PROMPT_CACHING_1H";
const CLAUDE_CODE_ONE_HOUR_PROMPT_CACHE_ENV_VALUE = "1";

/** Absent or any value other than "false" means on. */
export const isClaudeOneHourPromptCacheEnabled = (
  env: Record<string, string | undefined>,
): boolean => env[CLAUDE_ONE_HOUR_PROMPT_CACHE_SETTING_KEY]?.trim().toLowerCase() !== "false";

/**
 * Requests Claude Code's one-hour prompt cache in a Claude Code child environment
 * when the setting is on and the environment does not already define the variable.
 */
export const applyClaudeOneHourPromptCacheDefault = (
  spawnEnv: Record<string, string | undefined>,
): void => {
  if (!isClaudeOneHourPromptCacheEnabled(spawnEnv)) {
    return;
  }
  if (spawnEnv[CLAUDE_CODE_ONE_HOUR_PROMPT_CACHE_ENV_KEY] !== undefined) {
    return;
  }
  spawnEnv[CLAUDE_CODE_ONE_HOUR_PROMPT_CACHE_ENV_KEY] = CLAUDE_CODE_ONE_HOUR_PROMPT_CACHE_ENV_VALUE;
};
