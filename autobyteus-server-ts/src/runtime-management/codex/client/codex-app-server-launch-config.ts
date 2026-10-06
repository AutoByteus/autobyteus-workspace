const DEFAULT_APP_SERVER_COMMAND = "codex";
const DEFAULT_APP_SERVER_ARGS = ["app-server"];
/**
 * Disable Codex's native collaboration tools on new AutoByteus app-server processes.
 * Append the config override last so it wins over user config and custom base args.
 * External AutoByteus MCP collaboration remains independently configured per thread.
 */
const AUTOBYTEUS_CONFIG_OVERRIDES = ["-c", "agents.enabled=false"];
export const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

/** App-server launch arguments: the default or env override, always followed by the AutoByteus config overrides. */
export const parseArgs = (): string[] => [...parseBaseArgs(), ...AUTOBYTEUS_CONFIG_OVERRIDES];

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
