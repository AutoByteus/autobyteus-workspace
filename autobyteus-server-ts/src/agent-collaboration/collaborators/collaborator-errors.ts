export type CollaboratorMentionErrorCode =
  | "COLLABORATOR_MENTION_INVALID"
  | "COLLABORATOR_MENTION_UNAVAILABLE";

/** A mention that admission rejects; nothing is committed or delivered. */
export class CollaboratorMentionError extends Error {
  constructor(readonly code: CollaboratorMentionErrorCode, message: string, readonly collaboratorName?: string) {
    super(message);
    this.name = "CollaboratorMentionError";
  }
}

/**
 * A mentioned collaborator that cannot be added on send (REQ-008): nothing is added and the
 * message is not posted. `collaboratorName` is the definition name shown in the notice.
 */
export class CollaboratorAddError extends Error {
  readonly code = "COLLABORATOR_ADD_FAILED";
  constructor(readonly collaboratorName: string, readonly reason: string) {
    super(reason);
    this.name = "CollaboratorAddError";
  }
}

/** `delegate_task` to an address that is not mounted and not an available agent of this run. */
export const delegationTargetUnavailableMessage = (address: string): string =>
  `'${address}' is not a mounted Agent or Agent Team or an available agent of this run.`;

/** `send_message_to(address)` to an address that is not a standing instance of the sender's run (CM-4). */
export const messageTargetNotFoundMessage = (address: string): string =>
  `${address} is not in this run. To give work to an outside Agent or Team, use delegate_task, then send_message_to its run ID.`;

/** `delegate_task(address)` to the sender itself, a teammate or its own Team (CM-1). */
export const ownTeamDelegationRefusedMessage = (address: string): string =>
  `${address} is in your own team. Use send_message_to with recipient_address ${address}.`;
