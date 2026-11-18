import type { ClientIdentity, ClientKind } from "./client-identity.js";
import type { NodeAccessRefusal } from "./node-access-refusal.js";

/**
 * The contracts between the gate and the areas that own a credential kind (owner, phone, memory sync source, peer).
 * Each area implements its verifier from memory (no file I/O per request, QR-002) and publishes its revocations.
 */

export type CredentialVerification =
  | Readonly<{ ok: true; identity: ClientIdentity }>
  | Readonly<{ ok: false; refusal: NodeAccessRefusal }>;

/** Verifies a bearer credential of one kind (by its prefix). */
export type BearerCredentialVerifier = Readonly<{
  /** The credential prefix this verifier owns (`own_`, `mra_`, `mhub_`). */
  prefix: string;
  verify(credential: string): CredentialVerification | Promise<CredentialVerification>;
}>;

/** A signed peer request as the gate sees it before its body is read. */
export type PeerSignedRequest = Readonly<{
  method: string;
  /** Path with query, as sent (`request.url`). */
  pathWithQuery: string;
  headers: Readonly<Record<string, string | string[] | undefined>>;
}>;

/** Verifies a peer request's signature headers; the body hash it signed is checked by the gate as the body arrives. */
export type PeerRequestVerifier = Readonly<{
  /** Whether the request carries peer signature headers at all. */
  isSigned(request: PeerSignedRequest): boolean;
  verify(request: PeerSignedRequest): CredentialVerification | Promise<CredentialVerification>;
}>;

/**
 * A revocation an area publishes after its own write: every open socket of the matching clients closes with the
 * refusal (NA-11). `id: null` means every client of that kind (Phone Access turned off).
 */
export type ClientRevocation = Readonly<{
  kind: ClientKind;
  id: string | null;
  refusal: NodeAccessRefusal;
}>;

export type ClientRevocationListener = (revocation: ClientRevocation) => void;

/** An area that publishes revocations; the composition root subscribes the gate. */
export type ClientRevocationSource = Readonly<{
  onClientRevoked(listener: ClientRevocationListener): () => void;
}>;

/**
 * The peer request headers (NA-9, design M-7). Every request a node sends its peer carries all six; the signature is
 * HMAC-SHA256 with the pair's peer secret over the method, path with query, both node IDs, the timestamp, the nonce
 * and the body hash. The gate checks the received body against `PEER_BODY_SHA256_HEADER` before any handler runs.
 */
export const PEER_FROM_HEADER = "x-autobyteus-peer-from";
export const PEER_TO_HEADER = "x-autobyteus-peer-to";
export const PEER_TIMESTAMP_HEADER = "x-autobyteus-peer-timestamp";
export const PEER_NONCE_HEADER = "x-autobyteus-peer-nonce";
export const PEER_BODY_SHA256_HEADER = "x-autobyteus-peer-body-sha256";
export const PEER_SIGNATURE_HEADER = "x-autobyteus-peer-signature";
