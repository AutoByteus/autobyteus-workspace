/** A refused settings change (peer registration), with a reason the owner reads in the Nodes tab. */
export type RemoteCollaborationSettingsErrorCode =
  | "REMOTE_COLLABORATION_OFF"
  | "PEER_URL_INVALID"
  | "PEER_UNREACHABLE"
  | "PEER_NOT_AUTOBYTEUS"
  | "PEER_IS_THIS_NODE"
  | "PEER_ALREADY_REGISTERED"
  | "PEER_NAME_INVALID"
  | "PEER_NAME_TAKEN"
  | "PEER_NOT_FOUND";

export class RemoteCollaborationSettingsError extends Error {
  constructor(readonly code: RemoteCollaborationSettingsErrorCode, message: string) {
    super(message);
    this.name = "RemoteCollaborationSettingsError";
  }
}
