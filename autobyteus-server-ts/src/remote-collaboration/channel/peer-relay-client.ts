import { Readable } from "node:stream";
import { NodeIdentityNotMigratedError } from "../../remote-access/services/node-identity-service.js";
import type { PeerNode } from "../domain/peer-node.js";
import type { PeerDirectory } from "../settings/peer-directory.js";
import { fetchOptionsOf, type PeerConnector } from "./peer-connector.js";
import type { PeerRequestSigner } from "./peer-request-signer.js";
import { transportFailureReason } from "./transport-failure-reason.js";

/** The relay node's provider relay route (C4): `<prefix>/<relayId>/<relayCredentialKind><provider path>`. */
export const REMOTE_PROVIDER_RELAYS_PATH = "/rest/remote/provider-relays";

/** One provider call to relay: the provider's method and path, the headers that may travel, the whole body. */
export type PeerRelayCall = Readonly<{
  relayNodeId: string;
  relayId: string;
  relayCredentialKind: string;
  method: string;
  /** The provider path with its query, as the runtime sent it. */
  rawPathAndQuery: string;
  headers: Headers;
  body: Buffer | null;
}>;

/**
 * What the relay node answered, unchanged and streamed (its status, headers and body), or why nothing reached it.
 * Reading what the answer means (the relay's marking) is the caller's.
 */
export type PeerRelayOutcome =
  | Readonly<{ kind: "answered"; status: number; headers: Headers; body: Readable | null }>
  | Readonly<{ kind: "notSent"; reason: "peerNotPaired" | "identityPending" }>
  | Readonly<{ kind: "unreachable"; detail: string }>;

/**
 * The relayed side's transport of a provider call to its relay node (C4, R-F): signed with this node's key (contract
 * §5, the body's hash included) and reached by `PeerConnector` like every peer request, the reply streamed back. Timeouts are the transport's own per phase (connect
 * 10 s; response headers 300 s for a slow first byte; 300 s between body chunks) and there is **no total time-out**:
 * a long streamed turn runs as long as its chunks keep coming (Node's `fetch` defaults, which this client keeps by
 * giving no abort signal).
 */
export class PeerRelayClient {
  constructor(private readonly dependencies: Readonly<{
    peers: Pick<PeerDirectory, "findByNodeId">;
    signer: Pick<PeerRequestSigner, "headers">;
    connector: Pick<PeerConnector, "target">;
    ownNodeId(): Promise<string>;
    fetch?: typeof fetch;
  }>) {}

  async relay(call: PeerRelayCall): Promise<PeerRelayOutcome> {
    const peer: PeerNode | null = await this.dependencies.peers.findByNodeId(call.relayNodeId);
    if (!peer?.paired) return { kind: "notSent", reason: "peerNotPaired" };
    let fromNodeId: string;
    try {
      fromNodeId = await this.dependencies.ownNodeId();
    } catch (error) {
      if (error instanceof NodeIdentityNotMigratedError) return { kind: "notSent", reason: "identityPending" };
      throw error;
    }
    const queryAt = call.rawPathAndQuery.indexOf("?");
    const providerPath = queryAt < 0 ? call.rawPathAndQuery : call.rawPathAndQuery.slice(0, queryAt);
    const query = new URLSearchParams(queryAt < 0 ? "" : call.rawPathAndQuery.slice(queryAt + 1));
    query.set("fromNodeId", fromNodeId);
    query.set("toNodeId", peer.nodeId);
    const routePath = `${REMOTE_PROVIDER_RELAYS_PATH}/${encodeURIComponent(call.relayId)}/${encodeURIComponent(call.relayCredentialKind)}`
      + `${providerPath}?${query.toString()}`;
    const target = await this.dependencies.connector.target(peer, routePath);
    if (target.kind === "unavailable") return { kind: "unreachable", detail: target.detail };
    const hasBody = call.body !== null && call.body.length > 0 && !["GET", "HEAD"].includes(call.method);
    const headers = new Headers(call.headers);
    const signed = await this.dependencies.signer.headers({
      method: call.method, pathWithQuery: target.pathWithQuery, fromNodeId, toNodeId: peer.nodeId, body: hasBody ? call.body : null,
    });
    for (const [name, value] of Object.entries(signed)) headers.set(name, value);
    // An empty body still declares its type so the relay route's parser hashes it (NA-9).
    if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");
    let response: Response;
    try {
      response = await (this.dependencies.fetch ?? fetch)(target.url, {
        ...fetchOptionsOf(target),
        method: call.method,
        headers,
        redirect: "manual",
        ...(hasBody ? { body: new Uint8Array(call.body!) } : {}),
      });
    } catch (error) {
      return { kind: "unreachable", detail: transportFailureReason(error) };
    }
    return {
      kind: "answered",
      status: response.status,
      headers: response.headers,
      body: response.body ? Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream) : null,
    };
  }
}
