import { Readable } from "node:stream";
import type { IncomingHttpHeaders } from "node:http";
import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import { createServerLogger } from "../../logging/server-app-logger.js";
import {
  buildUpstreamUrl,
  CredentialProxyError,
  type CredentialProxyForwarder,
  type ForwardResponse,
} from "../credential-proxy-forwarder.js";
import { RELAY_CREDENTIAL_KINDS, type RelayCredentialKind } from "../provider-relays/provider-relay-settings.js";
import {
  providerRelayRefusal,
  providerRelayRefusalText,
  RELAY_REPLY_HEADER,
  type ProviderRelayRefusal,
  type ProviderRelayRefusalCode,
} from "../provider-relays/provider-relay-refusals.js";
import type { ProviderRelay, ProviderRelays, RelayCredential, RelayCredentialRoute } from "../provider-relays/provider-relays.js";
import type { ProviderRelayActivityLog } from "./provider-relay-activity-log.js";
import type { RelayLoginRead, RelayLoginTokenReader } from "./relay-login-token-reader.js";

const logger = createServerLogger("credential-proxy.provider-relay-peer");

/** Peer signature headers (and every other AutoByteus header) never travel to a provider. */
const AUTOBYTEUS_HEADER_PREFIX = "x-autobyteus-";

/** One relayed call as the node's peer route received it (C4): the gate already admitted the peer by its signature. */
export type RelayedCallRequest = Readonly<{
  peerNodeId: string;
  relayId: string;
  relayCredentialKind: string;
  method: string;
  /** The provider path after `/<relayId>/<kind>`, as received, with its query (`fromNodeId`/`toNodeId` removed). */
  rawPathAndQuery: string;
  headers: IncomingHttpHeaders;
  body: Buffer | null;
}>;

/** The handler's reply: always marked (`x-autobyteus-relay-reply`), so the relayed node tells it from its gate's. */
export type RelayedCallReply = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Buffer | Readable | string | null;
}>;

type CredentialOutcome = Readonly<{ kind: "found"; credential: RelayCredential }> | ProviderRelayRefusal;

const refusedReply = (refusal: ProviderRelayRefusal): RelayedCallReply => Object.freeze({
  status: refusal.status,
  headers: Object.freeze({ "content-type": "application/json", [RELAY_REPLY_HEADER]: "refused" }),
  body: JSON.stringify(refusal.body),
});

/**
 * The relay node's side of a relayed call (C4, DS-002), in order: the relay, kind and path are known and allowed;
 * a login token needs this node's switch (C2); the declared kind's credential exists (a Codex or Grok login not
 * expired); the call is forwarded with exactly that credential (no swap); one C5 line. Every refusal comes before any
 * provider call. Logs no header value, body, key, token or pass.
 */
export class ProviderRelayPeerHandler {
  constructor(private readonly deps: Readonly<{
    relays: ProviderRelays;
    forwarder: CredentialProxyForwarder;
    management: () => Pick<SecretManagementService, "resolveForUse">;
    logins: Pick<RelayLoginTokenReader, "readCodexLogin" | "readGrokLogin">;
    activity: Pick<ProviderRelayActivityLog, "append">;
    /** C2 now (read per call). */
    loginTokensEnabled: () => boolean;
    now?: () => number;
  }>) {}

  async handle(request: RelayedCallRequest): Promise<RelayedCallReply> {
    const now = this.deps.now ?? Date.now;
    const startedAt = now();
    const record = (outcome: Readonly<{ status: number }> | Readonly<{ error: string }>) => this.deps.activity.append({
      at: new Date(startedAt).toISOString(),
      peerNodeId: request.peerNodeId,
      relayId: request.relayId,
      relayCredentialKind: request.relayCredentialKind,
      method: request.method,
      path: request.rawPathAndQuery.split("?")[0] || "/",
      ...outcome,
      durationMs: now() - startedAt,
    });
    const refuse = async (code: ProviderRelayRefusalCode, message: string): Promise<RelayedCallReply> => {
      await record({ error: code });
      return refusedReply(providerRelayRefusal(code, message));
    };

    const relay = this.deps.relays.get(request.relayId);
    const kind = RELAY_CREDENTIAL_KINDS.find((entry) => entry === request.relayCredentialKind) ?? null;
    if (!relay || !kind) return refuse("PATH_NOT_ALLOWED", providerRelayRefusalText.pathNotAllowed(relay));
    const route = relay.routes[kind];
    if (kind === "loginToken" && !this.deps.loginTokensEnabled()) {
      return refuse("RELAY_LOGIN_TOKENS_OFF", providerRelayRefusalText.loginTokensOff());
    }
    if (!route) return refuse("PATH_NOT_ALLOWED", providerRelayRefusalText.pathNotAllowed(relay));
    try {
      buildUpstreamUrl(route.route, request.method, request.rawPathAndQuery);
    } catch {
      return refuse("PATH_NOT_ALLOWED", providerRelayRefusalText.pathNotAllowed(relay));
    }

    const outcome = await this.credentialOf(relay, kind, route);
    if (!("kind" in outcome)) {
      await record({ error: outcome.body.error.code });
      return refusedReply(outcome);
    }
    const { credential } = outcome;
    const callerHeaders: IncomingHttpHeaders = {};
    for (const [name, value] of Object.entries(request.headers)) {
      if (!name.toLowerCase().startsWith(AUTOBYTEUS_HEADER_PREFIX)) callerHeaders[name] = value;
    }
    let response: ForwardResponse;
    try {
      response = await this.deps.forwarder.forward({
        route: route.route,
        credential: Object.freeze({
          headers: route.attach(credential),
          secrets: Object.freeze([credential.secret, ...(credential.accountId ? [credential.accountId] : [])]),
        }),
        dropHeaders: route.dropFromCaller,
        request: {
          method: request.method,
          rawPathAndQuery: request.rawPathAndQuery,
          headers: callerHeaders,
          body: request.body && request.body.length > 0 ? Readable.from([request.body]) : null,
        },
        // No `proxyRouteBase`: a provider redirect is never followed or rewritten for a peer (its `Location` passes as sent, redacted).
      });
    } catch (error) {
      if (error instanceof CredentialProxyError && error.code === "UPSTREAM_UNREACHABLE") {
        return refuse("UPSTREAM_UNREACHABLE", providerRelayRefusalText.upstreamUnreachable(relay));
      }
      logger.error(`Relayed provider call failed (${error instanceof Error ? error.name : "error"}).`);
      return refuse("PROXY_FAILED", providerRelayRefusalText.proxyFailed());
    }
    await record({ status: response.status });
    return Object.freeze({
      status: response.status,
      headers: Object.freeze({ ...response.headers, [RELAY_REPLY_HEADER]: "forwarded" }),
      body: response.body,
    });
  }

  /** The declared kind's credential (no swap: `apiKey` is never refused because of C2). */
  private async credentialOf(relay: ProviderRelay, kind: RelayCredentialKind, route: RelayCredentialRoute): Promise<CredentialOutcome> {
    const source = route.source;
    if (source.kind === "vault") {
      try {
        const secret = await this.deps.management().resolveForUse(source.consumer);
        return { kind: "found", credential: Object.freeze({ secret: secret.revealToTrustedConsumer(), accountId: null }) };
      } catch {
        return kind === "apiKey"
          ? providerRelayRefusal("RELAY_KEY_NOT_SET", `The relay node has no ${relay.providerName} API key.`)
          : providerRelayRefusal("RELAY_LOGIN_TOKEN_NOT_SET",
            `The relay node has no ${relay.providerName} login token. Its owner stores one from \`claude setup-token\` with \`pnpm secrets:import\` (CLAUDE_CODE_OAUTH_TOKEN).`);
      }
    }
    const runtime = source.kind === "codexLogin" ? "Codex" : "Grok";
    const read: RelayLoginRead = source.kind === "codexLogin"
      ? await this.deps.logins.readCodexLogin()
      : await this.deps.logins.readGrokLogin();
    if (read.kind === "found") return read;
    return read.kind === "expired"
      ? providerRelayRefusal("RELAY_LOGIN_EXPIRED", `The relay node's ${runtime} login has expired: sign in again in ${runtime} on the relay node.`)
      : providerRelayRefusal("RELAY_LOGIN_TOKEN_NOT_SET", `The relay node is not signed in to ${runtime}: sign in in ${runtime} on the relay node.`);
  }
}
