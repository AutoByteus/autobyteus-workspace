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
  `'${address}' is not the address of an available agent or agent team. If you have list_available_agents, it shows the addresses you can use.`;

/** `send_message_to(address)` to an address that is not a standing instance of the sender's run (CM-4). */
export const messageTargetNotFoundMessage = (address: string): string =>
  `No agent or agent team you can talk with has the address ${address}. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id. To have a task done by a new agent, use delegate_task.`;

/** `delegate_task(address)` to the sender itself, a teammate or its own Team (CM-1). */
export const ownTeamDelegationRefusedMessage = (address: string): string =>
  `${address} is in your own team; you can't delegate to it. Talk with it using send_message_to.`;
