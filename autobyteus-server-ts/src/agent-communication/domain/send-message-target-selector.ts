export type SendMessageTargetSelector =
  | { kind: "recipient_address"; recipientAddress: string }
  | { kind: "target_agent_run_id"; targetAgentRunId: string };

export type SendMessageTargetSelectorValidationResult =
  | { ok: true; target: SendMessageTargetSelector }
  | { ok: false; message: string };

const normalizeRunId = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const preserveLogicalAddress = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const buildSendMessageTargetSelector = (input: {
  recipientAddress?: string | null;
  targetAgentRunId?: string | null;
  toolName?: string | null;
}): SendMessageTargetSelectorValidationResult => {
  const recipientAddress = preserveLogicalAddress(input.recipientAddress);
  const targetAgentRunId = normalizeRunId(input.targetAgentRunId);
  const toolName = input.toolName?.trim() || "send_message_to";

  if (recipientAddress && targetAgentRunId) {
    return {
      ok: false,
      message: `${toolName} takes exactly one of recipient_address or target_agent_run_id, not both. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id.`,
    };
  }
  if (recipientAddress) {
    return { ok: true, target: { kind: "recipient_address", recipientAddress } };
  }
  if (targetAgentRunId) {
    return { ok: true, target: { kind: "target_agent_run_id", targetAgentRunId } };
  }
  return {
    ok: false,
    message: `${toolName} needs one of recipient_address or target_agent_run_id. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run id.`,
  };
};

export const describeSendMessageTargetSelector = (
  target: SendMessageTargetSelector,
): string => target.kind === "recipient_address"
  ? target.recipientAddress
  : target.targetAgentRunId;

export type TeamMessageTargetSelector = SendMessageTargetSelector;
