import type { ProviderRelayRunAccess } from "../../../credential-proxy/provider-relays/provider-relay-access.js";
import { processNodeRelayAccess } from "../../../credential-proxy/provider-relays/provider-relay-process-access.js";

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

/** One app-server process's arguments and environment. */
export type CodexAppServerLaunch = Readonly<{ args: string[]; env: NodeJS.ProcessEnv }>;

/** The node's own OpenAI credentials, which a relayed Codex never sees. */
const CODEX_OWN_CREDENTIAL_ENV = ["OPENAI_API_KEY", "CODEX_API_KEY"] as const;

/** The relay provider a relayed app-server's model calls use (API key, P-13): the node pass as its bearer. */
const RELAY_PROVIDER_ID = "autobyteus_relay";

const tomlString = (value: string): string => JSON.stringify(value);

/**
 * The app-server launch (one per working directory). Unrelayed: as configured, in the server's environment. On a
 * relayed node (DS-001), a custom provider on the relay with the node pass as its bearer (`base_url`,
 * `experimental_bearer_token`, P-13), and none of the node's own OpenAI keys. Always the API key: Codex cannot run on a
 * relayed login token (DEC-115, IMP-12: in ChatGPT mode it sends model calls only to an HTTPS workspace backend).
 */
export const resolveCodexAppServerLaunch = (
  relay: ProviderRelayRunAccess | null = processNodeRelayAccess("openai", "codex_app_server"),
): CodexAppServerLaunch => {
  if (!relay) return { args: parseArgs(), env: { ...process.env } };
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of CODEX_OWN_CREDENTIAL_ENV) delete env[key];
  const provider = `{name=${tomlString("AutoByteus relay")},base_url=${tomlString(`${relay.baseUrl}/v1`)},`
    + `experimental_bearer_token=${tomlString(relay.pass)},wire_api="responses"}`;
  return {
    args: [...parseArgs(), "-c", `model_providers.${RELAY_PROVIDER_ID}=${provider}`, "-c", `model_provider=${RELAY_PROVIDER_ID}`],
    env,
  };
};
