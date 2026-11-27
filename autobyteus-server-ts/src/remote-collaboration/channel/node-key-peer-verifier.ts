import {
  PEER_BODY_SHA256_HEADER,
  PEER_FROM_HEADER,
  PEER_NONCE_HEADER,
  PEER_SIGNATURE_HEADER,
  PEER_TIMESTAMP_HEADER,
  PEER_TO_HEADER,
  type CredentialVerification,
  type PeerRequestVerifier,
  type PeerSignedRequest,
} from "../../node-access/domain/credential-verification.js";
import { heldBackRefusal, NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import { NODE_IDENTITY_NOT_MIGRATED_TEXT, NodeIdentityNotMigratedError } from "../../remote-access/services/node-identity-service.js";
import { verifyNodeSignature } from "../pairing/node-key.js";
import { peerSignedText } from "./peer-request-signer.js";

/** A request is accepted within this many seconds of its timestamp, either way (NA-9, contract §5). */
export const PEER_SIGNATURE_WINDOW_SECONDS = 300;
const WINDOW_MS = PEER_SIGNATURE_WINDOW_SECONDS * 1000;
/** Nonces are remembered twice the window, so a replay is refused for as long as its timestamp could pass. */
const NONCE_MEMORY_MS = 2 * WINDOW_MS;

const PEER_HEADERS = [
  PEER_FROM_HEADER,
  PEER_TO_HEADER,
  PEER_TIMESTAMP_HEADER,
  PEER_NONCE_HEADER,
  PEER_BODY_SHA256_HEADER,
  PEER_SIGNATURE_HEADER,
] as const;

const single = (value: string | string[] | undefined): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

/** What this node holds of a peer to check its requests: its public key (none: paired before node keys) and machine. */
export type PeerVerificationKey = Readonly<{ publicKey: string | null; machine: string | null }>;

/**
 * The only checker of peer requests (autobyteus-661 AR-002/AR-003, contract §5), the gate's peer credential kind. A
 * request is accepted only when all of these hold: the sender has a peer record here with a public key; it names this
 * node as its receiver; its timestamp is within ±300 s and not before this node started; its nonce is new within twice
 * the window; the signature verifies with the record's key; and the connection's private-network caller is the
 * record's `machine` (no caller for a record paired by plain address, the paired machine otherwise). Every refusal is
 * the same `credentialInvalid`, so a caller learns nothing about which rule failed.
 */
export class NodeKeyPeerVerifier implements PeerRequestVerifier {
  private readonly seenNonces = new Map<string, number>();
  private readonly startedAtMs: number;

  constructor(private readonly dependencies: Readonly<{
    ownNodeId(): Promise<string>;
    /** The peer's key and machine, from memory; `null` when `nodeId` is not a peer of this node. */
    peerKey(nodeId: string): Promise<PeerVerificationKey | null>;
    now?(): number;
  }>) {
    this.startedAtMs = this.nowMs();
  }

  isSigned(request: PeerSignedRequest): boolean {
    return PEER_HEADERS.some((header) => request.headers[header] !== undefined);
  }

  async verify(request: PeerSignedRequest): Promise<CredentialVerification> {
    const invalid: CredentialVerification = { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    const [fromNodeId, toNodeId, timestamp, nonce, bodySha256, signature] = PEER_HEADERS.map((header) => single(request.headers[header]));
    if (!fromNodeId || !toNodeId || !timestamp || !nonce || !bodySha256 || !signature) return invalid;
    if (!/^\d{1,15}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(bodySha256) || !/^[A-Za-z0-9_-]{1,64}$/.test(nonce)
      || !/^[A-Za-z0-9_-]{1,128}$/.test(signature)) return invalid;

    const nowMs = this.nowMs();
    const sentAtMs = Number(timestamp);
    if (Math.abs(nowMs - sentAtMs) > WINDOW_MS || sentAtMs < this.startedAtMs) return invalid;
    let ownNodeId: string;
    try {
      ownNodeId = await this.dependencies.ownNodeId();
    } catch (error) {
      // A node whose identity waits for its migration answers peers with that reason (autobyteus-290 N-910).
      if (error instanceof NodeIdentityNotMigratedError) {
        return { ok: false, refusal: heldBackRefusal("NODE_IDENTITY_NOT_MIGRATED", NODE_IDENTITY_NOT_MIGRATED_TEXT) };
      }
      throw error;
    }
    if (toNodeId !== ownNodeId) return invalid;

    // An unreadable peers file refuses every peer (design § Persisted Data: the rest of the node works).
    const record = await this.dependencies.peerKey(fromNodeId).catch(() => null);
    if (!record?.publicKey) return invalid;
    const text = peerSignedText({ fromNodeId, toNodeId, timestamp, nonce, method: request.method, pathWithQuery: request.pathWithQuery, bodySha256 });
    if (!verifyNodeSignature(record.publicKey, text, signature)) return invalid;
    if ((request.privateNetworkCaller?.machine ?? null) !== record.machine) return invalid;

    this.forgetOldNonces(nowMs);
    const nonceKey = `${fromNodeId}\n${nonce}`;
    if (this.seenNonces.has(nonceKey)) return invalid;
    this.seenNonces.set(nonceKey, nowMs + NONCE_MEMORY_MS);
    return { ok: true, identity: { kind: "peer", nodeId: fromNodeId } };
  }

  private nowMs(): number {
    return this.dependencies.now?.() ?? Date.now();
  }

  private forgetOldNonces(nowMs: number): void {
    for (const [key, expiresAt] of this.seenNonces) {
      if (expiresAt > nowMs) break;
      this.seenNonces.delete(key);
    }
  }
}
