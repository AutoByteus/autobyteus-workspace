// Claude runtime shell time limits (autobyteus-483).
// Claude Code derives its Bash limits from two variables: the foreground default and maximum
// are BASH_DEFAULT_TIMEOUT_MS and BASH_MAX_TIMEOUT_MS, the background default is the larger of
// 30 minutes and BASH_DEFAULT_TIMEOUT_MS, and the background maximum the larger of 2 hours and
// BASH_MAX_TIMEOUT_MS (Claude Code 2.1.325). Both at 2 hours make all four limits 2 hours.
// A value the user already set (the server's environment, or Claude Code's own settings `env`,
// which Claude Code applies over the process value) is kept.

const CLAUDE_CODE_SHELL_TIME_LIMIT_ENV_KEYS = ["BASH_DEFAULT_TIMEOUT_MS", "BASH_MAX_TIMEOUT_MS"] as const;
const CLAUDE_CODE_SHELL_TIME_LIMIT_MS = "7200000";

/** Sets each Claude Code shell time-limit variable to 2 hours when the environment does not already define it. */
export const applyClaudeShellTimeLimitDefaults = (
  spawnEnv: Record<string, string | undefined>,
): void => {
  for (const key of CLAUDE_CODE_SHELL_TIME_LIMIT_ENV_KEYS) {
    if (spawnEnv[key] === undefined) {
      spawnEnv[key] = CLAUDE_CODE_SHELL_TIME_LIMIT_MS;
    }
  }
};
