const DEFAULT_APP_SERVER_COMMAND = "codex";
const DEFAULT_APP_SERVER_ARGS = ["app-server"];
/**
 * AutoByteus-launched Codex never runs Codex's own multi-agent features, whatever the user's
 * `~/.codex/config.toml` says (REQ-014). `-c` overrides config and tolerates keys an installed Codex
 * version doesn't know; `--disable` would reject an unknown feature and stop the app-server starting.
 */
const AUTOBYTEUS_FEATURE_OVERRIDES = ["-c", "features.multi_agent=false", "-c", "features.multi_agent_v2=false"];
export const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

/** App-server launch arguments: the default or env override, always followed by the AutoByteus feature overrides. */
export const parseArgs = (): string[] => [...parseBaseArgs(), ...AUTOBYTEUS_FEATURE_OVERRIDES];

const parseBaseArgs = (): string[] => {
  const jsonArgs = process.env.CODEX_APP_SERVER_ARGS_JSON?.trim();
  if (jsonArgs) {
    try {
      const parsed = JSON.parse(jsonArgs);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return parsed as string[];
      }
    } catch (error) {
      logger.warn(`Failed to parse CODEX_APP_SERVER_ARGS_JSON: ${String(error)}`);
    }
  }

  const argString = process.env.CODEX_APP_SERVER_ARGS?.trim();
  if (!argString) {
    return [...DEFAULT_APP_SERVER_ARGS];
  }
  return argString
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

export const resolveRequestTimeoutMs = (): number => {
  const raw = Number(process.env.CODEX_APP_SERVER_REQUEST_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

export const resolveLaunchCommand = (): string =>
  process.env.CODEX_APP_SERVER_COMMAND?.trim() || DEFAULT_APP_SERVER_COMMAND;
