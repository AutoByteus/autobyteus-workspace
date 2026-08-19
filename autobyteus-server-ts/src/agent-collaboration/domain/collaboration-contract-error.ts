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
  constructor(
    readonly code: CollaborationContractErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CollaborationContractError";
  }
}

export const isCollaborationContractError = (
  error: unknown,
): error is CollaborationContractError =>
  error instanceof CollaborationContractError ||
  (typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "CollaborationContractError" &&
    typeof (error as { code?: unknown }).code === "string");
