import { appConfigProvider } from "../../config/app-config-provider.js";

/** C1: the relay node's node ID on a relayed node (empty: not relayed, every runtime unchanged). */
export const PROVIDER_RELAY_PEER_SETTING = "AUTOBYTEUS_PROVIDER_RELAY_PEER";
/** C1: the relays the relay node has an API key for. */
export const PROVIDER_RELAYS_SETTING = "AUTOBYTEUS_PROVIDER_RELAYS";
/** C1: the runtimes that run on the relay node's login token. */
export const PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING = "AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES";
/**
 * C1 (DEC-115): the relay node's ChatGPT account ID, for Codex on its login token: Codex checks its own account against
 * the account list the relay returns. An identifier, never a credential. Set exactly when Codex uses a login token.
 */
export const PROVIDER_RELAY_CODEX_ACCOUNT_ID_SETTING = "AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID";
/** C2: on a relay node, `true` lets relayed calls use its login tokens (absent: off). */
export const PROVIDER_RELAY_LOGIN_TOKENS_SETTING = "AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS";

/** What the relay node attaches to a relayed call. */
export type RelayCredentialKind = "apiKey" | "loginToken";
export const RELAY_CREDENTIAL_KINDS: readonly RelayCredentialKind[] = Object.freeze(["apiKey", "loginToken"]);

/** The runtimes that can run on a relay node's login token. */
export type LoginTokenRuntimeKind = "claude_agent_sdk" | "codex_app_server" | "grok_build";
export const LOGIN_TOKEN_RUNTIME_KINDS: readonly LoginTokenRuntimeKind[] = Object.freeze(["claude_agent_sdk", "codex_app_server", "grok_build"]);

/** The relays a relayed node may name (C3's rows). */
export const RELAYED_PROVIDER_RELAY_IDS: readonly string[] = Object.freeze([
  "anthropic", "openai", "xai", "deepseek", "gemini", "kimi", "glm", "qwen", "mistral", "minimax",
]);

/** C1 of a relayed node: read-only configuration fixed before startup. */
export type RelayedNodeSettings = Readonly<{
  relayPeerNodeId: string;
  /** Relays the relay node has API keys for. */
  relays: ReadonlySet<string>;
  /** Runtimes that use the relay node's login token. */
  loginTokenRuntimes: ReadonlySet<LoginTokenRuntimeKind>;
  /** The relay node's ChatGPT account ID; set exactly when Codex runs on the login token. */
  codexAccountId: string | null;
}>;

export class ProviderRelaySettingsError extends Error {
  constructor(message: string) {
    super(`PROVIDER_RELAY_SETTINGS_INVALID: ${message}`);
    this.name = "ProviderRelaySettingsError";
  }
}

const list = (value: string | undefined): string[] =>
  (value ?? "").split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);

/**
 * C1 from one reading of the settings: `null` when the relay peer is not set. A malformed value is refused with the
 * reason (it stops startup), never read as "not relayed".
 */
export const parseRelayedNodeSettings = (read: (key: string) => string | undefined): RelayedNodeSettings | null => {
  const peer = (read(PROVIDER_RELAY_PEER_SETTING) ?? "").trim();
  const relays = list(read(PROVIDER_RELAYS_SETTING));
  const runtimes = list(read(PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING));
  const codexAccountId = (read(PROVIDER_RELAY_CODEX_ACCOUNT_ID_SETTING) ?? "").trim() || null;
  if (!peer) {
    if (relays.length || runtimes.length || codexAccountId) {
      throw new ProviderRelaySettingsError(`${PROVIDER_RELAYS_SETTING} and ${PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING} need ${PROVIDER_RELAY_PEER_SETTING}.`);
    }
    return null;
  }
  if (!/^srv_[A-Za-z0-9_-]{32,}$/.test(peer)) {
    throw new ProviderRelaySettingsError(`${PROVIDER_RELAY_PEER_SETTING} must be a node ID (srv_…).`);
  }
  const unknownRelay = relays.find((relay) => !RELAYED_PROVIDER_RELAY_IDS.includes(relay));
  if (unknownRelay) throw new ProviderRelaySettingsError(`${PROVIDER_RELAYS_SETTING} names an unknown relay '${unknownRelay}'.`);
  const unknownRuntime = runtimes.find((runtime) => !LOGIN_TOKEN_RUNTIME_KINDS.includes(runtime as LoginTokenRuntimeKind));
  if (unknownRuntime) {
    throw new ProviderRelaySettingsError(`${PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING} names '${unknownRuntime}'; allowed: ${LOGIN_TOKEN_RUNTIME_KINDS.join(", ")}.`);
  }
  if (runtimes.includes("codex_app_server") !== (codexAccountId !== null)) {
    throw new ProviderRelaySettingsError(`${PROVIDER_RELAY_CODEX_ACCOUNT_ID_SETTING} is set exactly when codex_app_server is in ${PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING}.`);
  }
  return Object.freeze({
    codexAccountId,
    relayPeerNodeId: peer,
    relays: new Set(relays),
    loginTokenRuntimes: new Set(runtimes as LoginTokenRuntimeKind[]),
  });
};

let readOnce: { settings: RelayedNodeSettings | null } | null = null;

/**
 * This node's C1, read from the server settings (environment or `.env`) once: configuration fixed before startup,
 * which the process singletons read too (Principle 16's read-only exception). `null`: not relayed.
 */
export const relayedNodeSettings = (): RelayedNodeSettings | null => {
  readOnce ??= { settings: parseRelayedNodeSettings((key) => appConfigProvider.config.get(key)) };
  return readOnce.settings;
};

/** C2 on this node, read per call (the owner may change it while the node runs). */
export const relayLoginTokensEnabled = (): boolean =>
  (appConfigProvider.config.get(PROVIDER_RELAY_LOGIN_TOKENS_SETTING) ?? "").trim().toLowerCase() === "true";
