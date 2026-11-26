import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../../config/app-config-provider.js";
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
const CODEX_OWN_CREDENTIAL_ENV = ["OPENAI_API_KEY", "CODEX_API_KEY", "CODEX_HOME"] as const;

/** The relay provider a relayed app-server's model calls use (API key, P-13): the node pass as its bearer. */
const RELAY_PROVIDER_ID = "autobyteus_relay";

const tomlString = (value: string): string => JSON.stringify(value);

/** A JWT-shaped placeholder (no signature) carrying only a placeholder account, for Codex's ChatGPT-mode `id_token`. */
const placeholderIdToken = (): string => {
  const part = (value: object) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${part({ alg: "none", typ: "JWT" })}.${part({
    exp: 4_102_444_800,
    "https://api.openai.com/auth": { chatgpt_account_id: "autobyteus-relay", chatgpt_plan_type: "plus" },
  })}.relay`;
};

/**
 * ChatGPT mode through the relay (login token, U-1): Codex's own home under the server data (never `~/.codex`), whose
 * `auth.json` holds placeholders only: the node pass as its access token. The relay node attaches its own login's
 * token and account and drops this one (C3). `last_refresh` is now, so Codex sees nothing to renew.
 */
const writeRelayCodexHome = (appDataDir: string, pass: string): string => {
  const home = path.join(appDataDir, "codex-relay-home");
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(home, "auth.json"), JSON.stringify({
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: { id_token: placeholderIdToken(), access_token: pass, refresh_token: "autobyteus-relay", account_id: "autobyteus-relay" },
    last_refresh: new Date().toISOString(),
  }), { mode: 0o600 });
  return home;
};

/**
 * The app-server launch (one per working directory). Unrelayed: as configured, in the server's environment. On a
 * relayed node (DS-001), with the node pass, by the relay credential kind: API key → a custom provider on the relay
 * (`base_url`, the pass as `experimental_bearer_token`, P-13); login token → ChatGPT mode with `chatgpt_base_url` on
 * the relay and a placeholder login in its own `CODEX_HOME` (P-6). Its own OpenAI credentials are removed either way.
 */
export const resolveCodexAppServerLaunch = (
  relay: ProviderRelayRunAccess | null = processNodeRelayAccess("openai", "codex_app_server"),
  appDataDir: () => string = () => appConfigProvider.config.getAppDataDir(),
): CodexAppServerLaunch => {
  if (!relay) return { args: parseArgs(), env: { ...process.env } };
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of CODEX_OWN_CREDENTIAL_ENV) delete env[key];
  if (relay.relayCredentialKind === "loginToken") {
    env.CODEX_HOME = writeRelayCodexHome(appDataDir(), relay.pass);
    return { args: [...parseArgs(), "-c", `chatgpt_base_url=${tomlString(`${relay.baseUrl}/backend-api/`)}`], env };
  }
  const provider = `{name=${tomlString("AutoByteus relay")},base_url=${tomlString(`${relay.baseUrl}/v1`)},`
    + `experimental_bearer_token=${tomlString(relay.pass)},wire_api="responses"}`;
  return {
    args: [...parseArgs(), "-c", `model_providers.${RELAY_PROVIDER_ID}=${provider}`, "-c", `model_provider=${RELAY_PROVIDER_ID}`],
    env,
  };
};
