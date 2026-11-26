import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import {
  LOGIN_TOKEN_RUNTIME_KINDS,
  PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING,
  PROVIDER_RELAYS_SETTING,
  RELAYED_PROVIDER_RELAY_IDS,
  type LoginTokenRuntimeKind,
} from "../provider-relays/provider-relay-settings.js";
import type { ProviderRelays } from "../provider-relays/provider-relays.js";
import type { RelayLoginTokenReader } from "./relay-login-token-reader.js";

/** The relay each login-token runtime uses. */
const LOGIN_TOKEN_RELAY: Readonly<Record<LoginTokenRuntimeKind, string>> = Object.freeze({
  claude_agent_sdk: "anthropic", codex_app_server: "openai", grok_build: "xai",
});

/**
 * What this node, as a relay node, offers a node it starts now (DEC-109): the relays it holds an API key for, and,
 * only with its login-token switch on (C2), the runtimes whose login token it has. The values of C1's two lists, as
 * start variables (never a credential).
 */
export const readRelayOffer = async (deps: Readonly<{
  relays: ProviderRelays;
  management: () => Pick<SecretManagementService, "getStatusForConsumer">;
  logins: Pick<RelayLoginTokenReader, "readCodexLogin" | "readGrokLogin">;
  loginTokensEnabled: () => boolean;
}>): Promise<Readonly<Record<string, string>>> => {
  const configured = async (relayId: string, kind: "apiKey" | "loginToken"): Promise<boolean> => {
    const source = deps.relays.get(relayId)?.routes[kind]?.source;
    if (!source) return false;
    if (source.kind === "codexLogin") return (await deps.logins.readCodexLogin()).kind === "found";
    if (source.kind === "grokLogin") return (await deps.logins.readGrokLogin()).kind === "found";
    try {
      return await deps.management().getStatusForConsumer(source.consumer) === "CONFIGURED";
    } catch {
      return false;
    }
  };
  const relays: string[] = [];
  for (const relayId of RELAYED_PROVIDER_RELAY_IDS) if (await configured(relayId, "apiKey")) relays.push(relayId);
  const runtimes: string[] = [];
  if (deps.loginTokensEnabled()) {
    for (const runtime of LOGIN_TOKEN_RUNTIME_KINDS) if (await configured(LOGIN_TOKEN_RELAY[runtime], "loginToken")) runtimes.push(runtime);
  }
  return Object.freeze({
    [PROVIDER_RELAYS_SETTING]: relays.join(","),
    [PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES_SETTING]: runtimes.join(","),
  });
};
