import type { TransportFailureReason } from "../channel/transport-failure-reason.js";

/** A refused settings change (pairing, a peer's address or name), with a reason the owner reads in the Nodes tab. */
export type RemoteCollaborationSettingsErrorCode =
  | "PEER_URL_INVALID"
  | "PEER_UNREACHABLE"
  | "PEER_NOT_AUTOBYTEUS"
  | "PEER_IS_THIS_NODE"
  | "PEER_IDENTITY_MISMATCH"
  | "PEER_NAME_INVALID"
  | "PEER_NAME_TAKEN"
  | "PEER_NOT_FOUND"
  /** autobyteus-661: a peer on the private network is reached by its machine; its address is not typed. */
  | "PEER_ADDRESS_FIXED"
  /** autobyteus-426: the node at the address refuses the host name it was addressed by (its Host gate). */
  | "PEER_HOST_REFUSED"
  /** autobyteus-290: this node's, or the asked node's, identity is waiting for its data migration. */
  | "NODE_IDENTITY_NOT_MIGRATED"
  /** autobyteus-661 contract §3: the other node refused the pair request (its message says why). */
  | "PEER_PAIRING_REFUSED"
  /** autobyteus-661 CR-001: this node already holds that node with another key; Unpair it first. */
  | "PEER_KEY_CONFLICT"
  /** autobyteus-661: no pair request with that ID waits here (answered, withdrawn, or dropped by a restart). */
  | "PAIR_REQUEST_NOT_FOUND";

/**
 * What the Nodes page words itself (one-nodes-tab REQ-707, REQ-708): the transport `reason` and the `address` of an
 * unreachable node; `loopbackInContainer` when this node runs in a container and the address is a loopback address.
 */
export type RemoteCollaborationSettingsErrorDetails = Readonly<{
  reason?: TransportFailureReason;
  address?: string;
  loopbackInContainer?: boolean;
  /** The host name a node refused (`PEER_HOST_REFUSED`). */
  host?: string;
}>;

export class RemoteCollaborationSettingsError extends Error {
  constructor(
    readonly code: RemoteCollaborationSettingsErrorCode,
    message: string,
    readonly details: RemoteCollaborationSettingsErrorDetails = {},
  ) {
    super(message);
    this.name = "RemoteCollaborationSettingsError";
  }
}
