import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import { fetchOptionsOf, type PeerConnector, type PeerRoute } from "./peer-connector.js";
import type { PeerRequestSigner } from "./peer-request-signer.js";
import { transportFailureReason, type TransportFailureReason } from "./transport-failure-reason.js";

/** A pairing message answers within this bound (the other node answers at once; nothing waits for its owner). */
export const PEER_PAIRING_TIMEOUT_MS = 20_000;

/** What the other node answered: its HTTP status and its JSON body (`null` when the body is not a JSON object). */
export type PeerPairingAnswer = Readonly<{ status: number; body: Readonly<Record<string, unknown>> | null }>;

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "status" | "json">>;

const UNREACHABLE_TEXT: Readonly<Record<TransportFailureReason, string>> = Object.freeze({
  refused: "nothing answers at that address and port",
  timeout: "it did not answer in time",
  not_found: "its host name cannot be found",
  unreachable: "it cannot be reached from this node",
});

/**
 * The sender of the pairing messages (autobyteus-661 contract §2): `pair`, `pair-accepted` and `pair-rejected` unsigned
 * (the other node is not a peer yet), `pair-confirm` and `unpaired` signed with this node's key (§5). Like every peer
 * sender, it signs only through `PeerRequestSigner` and reaches the other node only through `PeerConnector`. A message
 * that does not arrive is a `PEER_UNREACHABLE` settings error with the classified reason.
 */
export class PeerPairingClient {
  constructor(private readonly dependencies: Readonly<{
    signer: Pick<PeerRequestSigner, "headers">;
    connector: Pick<PeerConnector, "target">;
    timeoutMs?: number;
    fetch?: FetchLike;
  }>) {}

  send(route: PeerRoute, path: string, body: object): Promise<PeerPairingAnswer> {
    return this.post(route, path, body, null);
  }

  /** A signed message from `fromNodeId` to the peer `toNodeId` at `route`. */
  sendSigned(route: PeerRoute, path: string, body: object, nodes: Readonly<{ fromNodeId: string; toNodeId: string }>): Promise<PeerPairingAnswer> {
    return this.post(route, path, body, nodes);
  }

  private async post(route: PeerRoute, path: string, body: object,
    nodes: Readonly<{ fromNodeId: string; toNodeId: string }> | null): Promise<PeerPairingAnswer> {
    const target = await this.dependencies.connector.target(route, path);
    if (target.kind === "unavailable") {
      throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${route.address} could not be reached: ${target.detail}.`, { address: route.address });
    }
    const text = JSON.stringify(body);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (nodes) Object.assign(headers, await this.dependencies.signer.headers({ method: "POST", pathWithQuery: target.pathWithQuery, ...nodes, body: text }));
    let response: Pick<Response, "status" | "json">;
    try {
      response = await (this.dependencies.fetch ?? fetch)(target.url.toString(), {
        ...fetchOptionsOf(target),
        method: "POST", headers, body: text, signal: AbortSignal.timeout(this.dependencies.timeoutMs ?? PEER_PAIRING_TIMEOUT_MS),
      });
    } catch (error) {
      const reason = transportFailureReason(error);
      throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${route.address} could not be reached: ${UNREACHABLE_TEXT[reason]}.`,
        { reason, address: route.address });
    }
    const answer = await response.json().catch(() => null) as unknown;
    return Object.freeze({
      status: response.status,
      body: answer && typeof answer === "object" && !Array.isArray(answer) ? answer as Record<string, unknown> : null,
    });
  }
}
