import type { TransportFailureReason } from "../channel/transport-failure-reason.js";

/** A refused settings change (peer registration, address resolution), with a reason the owner reads in the Nodes tab. */
export type RemoteCollaborationSettingsErrorCode =
  | "REMOTE_COLLABORATION_OFF"
  | "PEER_URL_INVALID"
  | "PEER_UNREACHABLE"
  | "PEER_NOT_AUTOBYTEUS"
  | "PEER_IS_THIS_NODE"
  | "PEER_IDENTITY_MISMATCH"
  | "PEER_ALREADY_REGISTERED"
  | "PEER_NAME_INVALID"
  | "PEER_NAME_TAKEN"
  | "PEER_NOT_FOUND"
  /** autobyteus-290: this node's, or the asked node's, identity is waiting for its data migration. */
  | "NODE_IDENTITY_NOT_MIGRATED";

/** What one address answered when this node looked for another node there (one-nodes-tab DS-005). */
export type PeerAddressAttemptResult = TransportFailureReason | "not_autobyteus" | "different_node" | "identity_pending";
export type PeerAddressAttempt = Readonly<{ address: string; result: PeerAddressAttemptResult }>;

/**
 * What the Nodes page words itself (one-nodes-tab REQ-707, REQ-708): the transport `reason` and the `address` of an
 * unreachable node; `loopbackInContainer` when this node runs in a container and the first address it tried was a
 * loopback address; every address tried when an address was looked for.
 */
export type RemoteCollaborationSettingsErrorDetails = Readonly<{
  reason?: TransportFailureReason;
  address?: string;
  loopbackInContainer?: boolean;
  attempts?: readonly PeerAddressAttempt[];
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
