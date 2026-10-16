export const COLLABORATION_CONTRACT_ERROR_CODES = [
  "COLLABORATION_ADDRESS_INVALID",
  "COLLABORATION_MEMBER_NAME_INVALID",
  "COLLABORATION_TARGET_NOT_FOUND",
  "COLLABORATION_TRAVERSAL_INVALID",
  "COLLABORATION_TEAM_INGRESS_INVALID",
  "COLLABORATION_SELF_TARGET_REJECTED",
  "COLLABORATION_HANDOFF_SOURCE_INVALID",
  "COLLABORATION_HANDOFF_RULE_INVALID",
  "COLLABORATION_HANDOFF_DUPLICATE",
  "COLLABORATION_CONTEXT_REQUIRED",
] as const;

export type CollaborationContractErrorCode =
  (typeof COLLABORATION_CONTRACT_ERROR_CODES)[number];

export class CollaborationContractError extends Error {
  /**
   * `message` is the text for definition and configuration callers. `agentMessage` is the text an
   * agent reads when the same error reaches it through `send_message_to` or `delegate_task`
   * (wording §7.3: the agent's words and a next step); absent when `message` already serves both.
   */
  constructor(
    readonly code: CollaborationContractErrorCode,
    message: string,
    readonly agentMessage?: string,
  ) {
    super(message);
    this.name = "CollaborationContractError";
  }
}

/** The text of a contract error for an agent: its agent-facing message when it has one. */
export const collaborationErrorTextForAgent = (error: Error): string => {
  const { agentMessage } = error as Error & { agentMessage?: unknown };
  return typeof agentMessage === "string" && agentMessage ? agentMessage : error.message;
};

export const isCollaborationContractError = (
  error: unknown,
): error is CollaborationContractError =>
  error instanceof CollaborationContractError ||
  (typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "CollaborationContractError" &&
    typeof (error as { code?: unknown }).code === "string");
