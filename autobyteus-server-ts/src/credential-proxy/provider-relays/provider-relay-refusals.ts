import { providerRelayKeyMissingText } from "./provider-relays.js";

/** The relay node's own reply marking (C4): every reply its relay handler sends carries it. */
export const RELAY_REPLY_HEADER = "x-autobyteus-relay-reply";
export type RelayReplyMarker = "forwarded" | "refused";

/** Refusals of the local relay route and of the relay node's handler (C4), before any provider call. */
export type ProviderRelayRefusalCode =
  // The local route (every node).
  | "NOT_LOOPBACK"
  | "RUN_PASS_INVALID"
  | "RELAY_NOT_ALLOWED"
  | "PATH_NOT_ALLOWED"
  | "RELAY_KEY_NOT_SET"
  | "UPSTREAM_UNREACHABLE"
  | "PROXY_FAILED"
  // The relayed side: no relay node to send to, or it did not take the call.
  | "RELAY_BODY_TOO_LARGE"
  | "RELAY_PEER_UNAVAILABLE"
  | "RELAY_PEER_NOT_ACCEPTED"
  | "RELAY_PEER_REFUSED"
  | "RELAY_PEER_FAILED"
  | "RELAY_PEER_UNREACHABLE"
  // The relay node's handler.
  | "RELAY_LOGIN_TOKENS_OFF"
  | "RELAY_LOGIN_TOKEN_NOT_SET"
  | "RELAY_LOGIN_EXPIRED";

/**
 * Status and type per refusal, in the Anthropic Messages error envelope (the only failure shape every runtime shows
 * the text of): `authentication_error`/`permission_error` are never retried.
 */
const REFUSALS: Readonly<Record<ProviderRelayRefusalCode, Readonly<{ status: number; type: string }>>> = {
  NOT_LOOPBACK: { status: 403, type: "permission_error" },
  RUN_PASS_INVALID: { status: 401, type: "authentication_error" },
  RELAY_NOT_ALLOWED: { status: 403, type: "permission_error" },
  PATH_NOT_ALLOWED: { status: 404, type: "not_found_error" },
  RELAY_KEY_NOT_SET: { status: 403, type: "permission_error" },
  UPSTREAM_UNREACHABLE: { status: 502, type: "api_error" },
  PROXY_FAILED: { status: 500, type: "api_error" },
  RELAY_BODY_TOO_LARGE: { status: 413, type: "request_too_large" },
  RELAY_PEER_UNAVAILABLE: { status: 403, type: "permission_error" },
  RELAY_PEER_NOT_ACCEPTED: { status: 403, type: "permission_error" },
  RELAY_PEER_REFUSED: { status: 403, type: "permission_error" },
  RELAY_PEER_FAILED: { status: 502, type: "api_error" },
  RELAY_PEER_UNREACHABLE: { status: 502, type: "api_error" },
  RELAY_LOGIN_TOKENS_OFF: { status: 403, type: "permission_error" },
  RELAY_LOGIN_TOKEN_NOT_SET: { status: 403, type: "permission_error" },
  RELAY_LOGIN_EXPIRED: { status: 403, type: "permission_error" },
};

/** One refusal as a reply: its status and the envelope with its code and text. */
export type ProviderRelayRefusal = Readonly<{
  status: number;
  body: Readonly<{ type: "error"; error: Readonly<{ type: string; code: ProviderRelayRefusalCode | string; message: string }> }>;
}>;

export const providerRelayRefusal = (code: ProviderRelayRefusalCode, message: string): ProviderRelayRefusal => {
  const { status, type } = REFUSALS[code];
  return Object.freeze({ status, body: Object.freeze({ type: "error", error: Object.freeze({ type, code, message }) }) });
};

/** The provider's name for refusal texts (`this relay` when the relay is unknown). */
type RelayName = Readonly<{ providerName: string }> | null;

/** The texts of the refusals both sides word themselves. */
export const providerRelayRefusalText = {
  notLoopback: () => "Only local calls are accepted.",
  passInvalid: () => "The run pass is not valid: its run has ended, or it never had access.",
  notAllowed: (relay: RelayName) => `This run has no access to ${relay ? `the ${relay.providerName} relay` : "this relay"}.`,
  pathNotAllowed: (relay: RelayName) => `This path is not allowed for ${relay ? `the ${relay.providerName} relay` : "this relay"}.`,
  keyMissing: (relay: RelayName) => (relay ? providerRelayKeyMissingText(relay) : "The API key is not set in AutoByteus."),
  upstreamUnreachable: (relay: RelayName) => `${relay?.providerName ?? "The provider"} could not be reached.`,
  proxyFailed: () => "The call failed in the proxy.",
  bodyTooLarge: () => "The call's body is larger than a relayed call may be (32 MiB).",
  loginTokensOff: () =>
    "The relay node's login-token setting is off, so it does not attach login tokens. It may have changed since this node "
    + "started: create a new sandbox, or ask the relay node's owner about AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS.",
} as const;
