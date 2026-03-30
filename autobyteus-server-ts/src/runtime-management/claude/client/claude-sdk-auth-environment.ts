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

export const buildClaudeSdkSpawnEnvironment = (
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string | undefined> => {
  const resolvedMode = resolveClaudeSdkAuthMode(env);
  const resolvedEnv: Record<string, string | undefined> = { ...env };

  if (resolvedMode === "api-key") {
    return resolvedEnv;
  }

  const hasOauthSignal = CLAUDE_OAUTH_TOKEN_ENV_KEYS.some(
    (key) => Boolean(asNonEmptyRawString(resolvedEnv[key])),
  );
  const shouldPreferCliAuth = resolvedMode === "cli" || (resolvedMode === "auto" && hasOauthSignal);
  if (!shouldPreferCliAuth) {
    return resolvedEnv;
  }

  for (const key of CLAUDE_API_KEY_ENV_KEYS) {
    delete resolvedEnv[key];
  }
  return resolvedEnv;
};
