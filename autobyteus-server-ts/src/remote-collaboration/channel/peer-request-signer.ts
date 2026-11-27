import { createHash, randomBytes } from "node:crypto";
import {
  PEER_BODY_SHA256_HEADER,
  PEER_FROM_HEADER,
  PEER_NONCE_HEADER,
  PEER_SIGNATURE_HEADER,
  PEER_TIMESTAMP_HEADER,
  PEER_TO_HEADER,
} from "../../node-access/domain/credential-verification.js";
import type { NodeKey } from "../pairing/node-key.js";

export const sha256Hex = (body: string | Buffer | Uint8Array): string => createHash("sha256").update(body).digest("hex");

/** The hash of an empty body: a GET request or a WebSocket upgrade. */
export const EMPTY_BODY_SHA256 = sha256Hex("");

/** The fields a peer request signs (contract §5, NA-9's fields). */
export type PeerSignedFields = Readonly<{
  fromNodeId: string;
  toNodeId: string;
  /** Milliseconds since the epoch, as decimal text. */
  timestamp: string;
  nonce: string;
  method: string;
  pathWithQuery: string;
  bodySha256: string;
}>;

/** The text the node key signs: `from \n to \n timestamp \n nonce \n METHOD \n path-with-query \n sha256(body)`. */
export const peerSignedText = (fields: PeerSignedFields): string => [
  fields.fromNodeId,
  fields.toNodeId,
  fields.timestamp,
  fields.nonce,
  fields.method.toUpperCase(),
  fields.pathWithQuery,
  fields.bodySha256,
].join("\n");

/**
 * The only producer of peer request headers (autobyteus-661 AR-003, contract §5): every request this node sends a
 * peer, from any sender, is signed here with this node's key. The headers name the sender and the receiver, the
 * moment (ms) and a nonce of 16 random bytes; the signature covers those, the method, the path with its query and the
 * body's hash. The hash also travels on its own header, so the receiving gate checks the signature before it reads the
 * body and then checks the body against the hash as it arrives (NA-9).
 */
export class PeerRequestSigner {
  constructor(private readonly dependencies: Readonly<{
    key: Pick<NodeKey, "sign">;
    now?(): number;
  }>) {}

  async headers(input: Readonly<{
    method: string;
    /** The path with its query, as the receiving node sees it (`PeerConnector` gives it). */
    pathWithQuery: string;
    fromNodeId: string;
    toNodeId: string;
    /** The request body as sent: JSON text, raw bytes (a file piece), or none. */
    body: string | Buffer | Uint8Array | null;
  }>): Promise<Record<string, string>> {
    const fields: PeerSignedFields = {
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      timestamp: String(this.dependencies.now?.() ?? Date.now()),
      nonce: randomBytes(16).toString("base64url"),
      method: input.method,
      pathWithQuery: input.pathWithQuery,
      bodySha256: input.body === null ? EMPTY_BODY_SHA256 : sha256Hex(input.body),
    };
    return {
      [PEER_FROM_HEADER]: fields.fromNodeId,
      [PEER_TO_HEADER]: fields.toNodeId,
      [PEER_TIMESTAMP_HEADER]: fields.timestamp,
      [PEER_NONCE_HEADER]: fields.nonce,
      [PEER_BODY_SHA256_HEADER]: fields.bodySha256,
      [PEER_SIGNATURE_HEADER]: await this.dependencies.key.sign(peerSignedText(fields)),
    };
  }
}
