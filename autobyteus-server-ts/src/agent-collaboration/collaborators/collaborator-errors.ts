export type CollaboratorMentionErrorCode =
  | "COLLABORATOR_MENTION_INVALID"
  | "COLLABORATOR_MENTION_UNAVAILABLE";

/** A mention that admission rejects; nothing is committed or delivered. */
export class CollaboratorMentionError extends Error {
  constructor(readonly code: CollaboratorMentionErrorCode, message: string) {
    super(message);
    this.name = "CollaboratorMentionError";
  }
}

/** `send_message_to` by a collaborator address: messaging never starts anything. */
export const collaboratorAddressMessageHint = (address: string): string =>
  `'${address}' is a collaborator of this run, not a running recipient. Start an instance with delegate_task, `
  + "or message a started instance with send_message_to and its target_agent_run_id.";

/** `delegate_task` to an address that is neither mounted nor mentioned in this run. */
export const delegationTargetUnavailableMessage = (address: string, hasAnyTarget: boolean): string =>
  hasAnyTarget
    ? `'${address}' is not a mounted Agent or Agent Team or a collaborator of this run; the user can bring one in with @.`
    : "No agents or teams are available to delegate to in this run; the user can bring one in with @.";
