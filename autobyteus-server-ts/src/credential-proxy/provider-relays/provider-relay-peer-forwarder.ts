import type { IncomingHttpHeaders } from "node:http";
import type { Readable } from "node:stream";
import type { PeerRelayClient } from "../../remote-collaboration/channel/peer-relay-client.js";
import {
  forwardableRequestHeaders,
  forwardableResponseHeaders,
  type ForwardResponse,
} from "../credential-proxy-forwarder.js";
import {
  providerRelayRefusal,
  providerRelayRefusalText,
  RELAY_REPLY_HEADER,
  type ProviderRelayRefusal,
} from "./provider-relay-refusals.js";
import type { RelayCredentialKind } from "./provider-relay-settings.js";

/** The largest relayed body (QR-004): a large context, sent whole because the relay node's gate hashes it. */
export const RELAYED_BODY_MAX_BYTES = 32 * 1024 * 1024;

/** The relay node's answer to pass to the runtime, or this side's refusal. */
export type RelayedCallResult =
  | Readonly<{ kind: "reply"; response: ForwardResponse }>
  | Readonly<{ kind: "refused"; refusal: ProviderRelayRefusal }>;

const refused = (refusal: ProviderRelayRefusal): RelayedCallResult => Object.freeze({ kind: "refused", refusal });

/** A runtime's call as the local relay route received it, already checked against its pass and the relay's paths. */
export type RelayedProviderCall = Readonly<{
  relayId: string;
  relayCredentialKind: RelayCredentialKind;
  method: string;
  rawPathAndQuery: string;
  headers: IncomingHttpHeaders;
  body: Readable | null;
}>;

class BodyTooLargeError extends Error {}

const readBody = async (stream: Readable | null): Promise<Buffer | null> => {
  if (!stream) return null;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > RELAYED_BODY_MAX_BYTES) throw new BodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
};

const gateCodeOf = async (body: Readable | null): Promise<{ code: string | null; message: string | null }> => {
  if (!body) return { code: null, message: null };
  try {
    const text = Buffer.concat(await body.toArray()).toString("utf8");
    const answer = JSON.parse(text) as { code?: unknown; message?: unknown };
    return {
      code: typeof answer.code === "string" ? answer.code : null,
      message: typeof answer.message === "string" ? answer.message : null,
    };
  } catch {
    return { code: null, message: null };
  }
};

/**
 * The relayed side of C4 (DS-002): sends a runtime's call to the relay node through `PeerRelayClient` (the pass and
 * every local credential header dropped) and reads where the answer came from. A reply the relay node's handler
 * marked is its answer, passed unchanged (a provider 401 stays a provider 401); an unmarked one is the relay node's
 * gate or server, mapped to one refusal per meaning. Never a fallback to local credentials.
 */
export class ProviderRelayPeerForwarder {
  constructor(private readonly deps: Readonly<{
    /** C1: the relay node's node ID. */
    relayNodeId: string;
    /** The remote collaboration's relay client, read on use (composed after the credential proxy, FU-011). */
    client: () => Pick<PeerRelayClient, "relay">;
  }>) {}

  async forward(call: RelayedProviderCall): Promise<RelayedCallResult> {
    let body: Buffer | null;
    try {
      body = await readBody(call.body);
    } catch (error) {
      if (error instanceof BodyTooLargeError) return refused(providerRelayRefusal("RELAY_BODY_TOO_LARGE", providerRelayRefusalText.bodyTooLarge()));
      throw error;
    }
    const outcome = await this.deps.client().relay({
      relayNodeId: this.deps.relayNodeId,
      relayId: call.relayId,
      relayCredentialKind: call.relayCredentialKind,
      method: call.method,
      rawPathAndQuery: call.rawPathAndQuery,
      headers: forwardableRequestHeaders(call.headers),
      body,
    });
    if (outcome.kind === "notSent") {
      return refused(providerRelayRefusal("RELAY_PEER_UNAVAILABLE", outcome.reason === "remoteCollaborationOff"
        ? "Remote collaboration is off on this node, so it cannot reach its relay node."
        : outcome.reason === "identityPending"
          ? "This node's identity is waiting for its data migration, so it cannot reach its relay node yet."
          : `The relay node (${this.deps.relayNodeId}) is not a paired peer of this node.`));
    }
    if (outcome.kind === "unreachable") {
      return refused(providerRelayRefusal("RELAY_PEER_UNREACHABLE", `The relay node could not be reached (${outcome.detail}).`));
    }
    const marker = outcome.headers.get(RELAY_REPLY_HEADER);
    if (marker === "forwarded" || marker === "refused") {
      return Object.freeze({ kind: "reply", response: Object.freeze({
        status: outcome.status,
        headers: forwardableResponseHeaders(outcome.headers, [RELAY_REPLY_HEADER]),
        body: outcome.body,
      }) });
    }
    // Unmarked: the relay node's gate (NA-13) or server answered before its relay handler ran.
    const gate = await gateCodeOf(outcome.body);
    if (outcome.status === 401) {
      return refused(providerRelayRefusal("RELAY_PEER_NOT_ACCEPTED",
        "The relay node does not accept this node: it is not paired with it, or the pairing was removed."));
    }
    if (outcome.status === 403 && gate.code) {
      return refused(providerRelayRefusal("RELAY_PEER_REFUSED", `The relay node refused the call (${gate.code}): ${gate.message ?? "no reason given"}`));
    }
    if (outcome.status === 503 && gate.code === "NODE_IDENTITY_NOT_MIGRATED") {
      return refused(providerRelayRefusal("RELAY_PEER_UNAVAILABLE", "The relay node's identity is waiting for its data migration."));
    }
    return refused(providerRelayRefusal("RELAY_PEER_FAILED", `The relay node failed before relaying the call (HTTP ${outcome.status}).`));
  }
}
