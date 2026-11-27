import { applyClaudeOneHourPromptCacheDefault } from "../claude-prompt-cache-setting.js";
import { applyClaudeShellTimeLimitDefaults } from "../claude-shell-time-limit-setting.js";
import type { ProviderRelayRunAccess } from "../../../credential-proxy/provider-relays/provider-relay-access.js";

const CLAUDE_AGENT_SDK_AUTH_MODE_ENV_KEY = "CLAUDE_AGENT_SDK_AUTH_MODE";
const CLAUDE_OAUTH_TOKEN_ENV_KEYS = [
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
] as const;
const CLAUDE_API_KEY_ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "CLAUDE_CODE_API_KEY",
  "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
] as const;

export type ClaudeSdkAuthMode = "auto" | "cli" | "api-key";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNonEmptyRawString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const resolveClaudeSdkAuthMode = (
  env: NodeJS.ProcessEnv = process.env,
): ClaudeSdkAuthMode => {
  const rawMode = asString(env[CLAUDE_AGENT_SDK_AUTH_MODE_ENV_KEY])?.toLowerCase();
  if (rawMode === "auto" || rawMode === "cli" || rawMode === "api-key") {
    return rawMode;
  }

  // Claude Agent SDK runtime should prefer Claude CLI auth by default.
  return "cli";
};

const applyClaudeSdkAuthPolicy = (
  spawnEnv: Record<string, string | undefined>,
  mode: ClaudeSdkAuthMode,
  apiKeyOverride: string | undefined,
): void => {
  if (mode === "api-key") {
    if (apiKeyOverride !== undefined) {
      spawnEnv.ANTHROPIC_API_KEY = apiKeyOverride;
    }
    return;
  }

  const hasOauthSignal = CLAUDE_OAUTH_TOKEN_ENV_KEYS.some(
    (key) => Boolean(asNonEmptyRawString(spawnEnv[key])),
  );
  const shouldPreferCliAuth = mode === "cli" || (mode === "auto" && hasOauthSignal);
  if (!shouldPreferCliAuth) {
    return;
  }

  for (const key of CLAUDE_API_KEY_ENV_KEYS) {
    delete spawnEnv[key];
  }
};

/**
 * Composes the Claude Code child environment: auth-mode policy, then the one-hour prompt cache default, then the
 * 2-hour shell time-limit defaults.
 */
export const buildClaudeSdkSpawnEnvironment = (
  env: NodeJS.ProcessEnv = process.env,
  apiKeyOverride?: string,
): Record<string, string | undefined> => {
  const spawnEnv: Record<string, string | undefined> = { ...env };
  applyClaudeSdkAuthPolicy(spawnEnv, resolveClaudeSdkAuthMode(env), apiKeyOverride);
  applyClaudeOneHourPromptCacheDefault(spawnEnv);
  applyClaudeShellTimeLimitDefaults(spawnEnv);
  return spawnEnv;
};

/**
 * The Claude Code child environment on a relayed node: none of the node's own Claude credentials (no auth policy, no
 * vault key); the relay as `ANTHROPIC_BASE_URL` and the pass in the variable of the relay credential kind, which
 * decides Claude Code's request shape (P-3 `x-api-key`, P-4 Bearer with the OAuth beta). Then the same defaults.
 */
export const buildClaudeRelayedSpawnEnvironment = (
  env: NodeJS.ProcessEnv,
  relay: ProviderRelayRunAccess,
): Record<string, string | undefined> => {
  const spawnEnv: Record<string, string | undefined> = { ...env };
  for (const key of [...CLAUDE_OAUTH_TOKEN_ENV_KEYS, ...CLAUDE_API_KEY_ENV_KEYS, CLAUDE_AGENT_SDK_AUTH_MODE_ENV_KEY, "ANTHROPIC_AUTH_TOKEN"]) {
    delete spawnEnv[key];
  }
  spawnEnv.ANTHROPIC_BASE_URL = relay.baseUrl;
  if (relay.relayCredentialKind === "loginToken") spawnEnv.CLAUDE_CODE_OAUTH_TOKEN = relay.pass;
  else spawnEnv.ANTHROPIC_API_KEY = relay.pass;
  applyClaudeOneHourPromptCacheDefault(spawnEnv);
  applyClaudeShellTimeLimitDefaults(spawnEnv);
  return spawnEnv;
};
