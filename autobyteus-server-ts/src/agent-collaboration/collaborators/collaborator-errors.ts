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

/** `delegate_task` to an address that is neither mounted nor mentioned in this run. */
export const delegationTargetUnavailableMessage = (address: string, hasAnyTarget: boolean): string =>
  hasAnyTarget
    ? `'${address}' is not a mounted Agent or Agent Team or a collaborator of this run; the user can bring one in with @.`
    : "No agents or teams are available to delegate to in this run; the user can bring one in with @.";
