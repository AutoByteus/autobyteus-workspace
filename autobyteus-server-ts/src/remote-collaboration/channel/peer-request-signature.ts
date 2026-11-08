import { createHash, createHmac, randomBytes } from "node:crypto";
import { secretsEqual } from "../../node-access/domain/credential-secret.js";
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

/** A request is accepted within this many seconds of its timestamp, either way (NA-9). */
export const PEER_SIGNATURE_WINDOW_SECONDS = 300;
/** Nonces are remembered twice the window, so a replay is refused for as long as its timestamp could pass. */
const NONCE_MEMORY_MS = 2 * PEER_SIGNATURE_WINDOW_SECONDS * 1000;

export const sha256Hex = (body: string | Buffer): string => createHash("sha256").update(body).digest("hex");

/** The hash of an empty body: a GET request or a WebSocket upgrade. */
export const EMPTY_BODY_SHA256 = sha256Hex("");

type SignedFields = Readonly<{
  method: string;
  pathWithQuery: string;
  fromNodeId: string;
  toNodeId: string;
  timestamp: string;
  nonce: string;
  bodySha256: string;
}>;

const signatureOf = (secret: string, fields: SignedFields): string =>
  createHmac("sha256", secret)
    .update([
      fields.method.toUpperCase(),
      fields.pathWithQuery,
      fields.fromNodeId,
      fields.toNodeId,
      fields.timestamp,
      fields.nonce,
      fields.bodySha256,
    ].join("\n"))
    .digest("hex");

/**
 * The headers of one request from this node to its peer (NA-9, design DS-005). The secret never travels; a captured
 * request names its receiver and its moment, and its nonce works once.
 */
export const signPeerRequest = (input: Readonly<{
  secret: string;
  method: string;
  pathWithQuery: string;
  fromNodeId: string;
  toNodeId: string;
  body: string | null;
  now?: Date;
}>): Record<string, string> => {
  const fields: SignedFields = {
    method: input.method,
    pathWithQuery: input.pathWithQuery,
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    timestamp: String(Math.floor((input.now ?? new Date()).getTime() / 1000)),
    nonce: randomBytes(16).toString("hex"),
    bodySha256: input.body === null ? EMPTY_BODY_SHA256 : sha256Hex(input.body),
  };
  return {
    [PEER_FROM_HEADER]: fields.fromNodeId,
    [PEER_TO_HEADER]: fields.toNodeId,
    [PEER_TIMESTAMP_HEADER]: fields.timestamp,
    [PEER_NONCE_HEADER]: fields.nonce,
    [PEER_BODY_SHA256_HEADER]: fields.bodySha256,
    [PEER_SIGNATURE_HEADER]: signatureOf(input.secret, fields),
  };
};

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

/**
 * The receiving side of the peer signature: the gate's peer credential kind. It accepts a request only as the named
 * receiver, within ±300 s, not earlier than this process's start, once per nonce, from a paired peer whose secret
 * signed it. A peer without a secret (paired before this model) is refused until it pairs again (NAS-23).
 */
export class PeerRequestSignatureVerifier implements PeerRequestVerifier {
  private readonly seenNonces = new Map<string, number>();
  private readonly startedAtSeconds: number;

  constructor(private readonly dependencies: Readonly<{
    ownNodeId(): Promise<string>;
    /** The peer secret shared with this node, from memory; `null` when it is not a paired peer. */
    peerSecret(nodeId: string): Promise<string | null>;
    now?(): number;
  }>) {
    this.startedAtSeconds = Math.floor(this.nowMs() / 1000);
  }

  isSigned(request: PeerSignedRequest): boolean {
    return PEER_HEADERS.some((header) => request.headers[header] !== undefined);
  }

  async verify(request: PeerSignedRequest): Promise<CredentialVerification> {
    const invalid: CredentialVerification = { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    const [fromNodeId, toNodeId, timestamp, nonce, bodySha256, signature] = PEER_HEADERS.map((header) => single(request.headers[header]));
    if (!fromNodeId || !toNodeId || !timestamp || !nonce || !bodySha256 || !signature) return invalid;
    if (!/^\d{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(bodySha256) || nonce.length > 64) return invalid;

    const nowMs = this.nowMs();
    const seconds = Number(timestamp);
    if (Math.abs(nowMs / 1000 - seconds) > PEER_SIGNATURE_WINDOW_SECONDS || seconds < this.startedAtSeconds) return invalid;
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

    const secret = await this.dependencies.peerSecret(fromNodeId);
    if (!secret) return invalid;
    const expected = signatureOf(secret, { method: request.method, pathWithQuery: request.pathWithQuery, fromNodeId, toNodeId, timestamp, nonce, bodySha256 });
    if (!secretsEqual(expected, signature)) return invalid;

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
