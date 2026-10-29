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

export type AgentFacingTool = "send_message_to" | "delegate_task";

export class CollaborationContractError extends Error {
  /**
   * `message` is the text for definition and configuration callers. `agentMessages` holds, per tool,
   * the text an agent reads when the same error reaches it through `send_message_to` or
   * `delegate_task` (wording §7.3: the agent's words and a next step that fits that tool); a tool
   * without an entry shows `message`.
   */
  constructor(
    readonly code: CollaborationContractErrorCode,
    message: string,
    readonly agentMessages?: Readonly<Partial<Record<AgentFacingTool, string>>>,
  ) {
    super(message);
    this.name = "CollaborationContractError";
  }
}
