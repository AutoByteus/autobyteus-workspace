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
      message: `${toolName} requires exactly one target selector: recipient_address or target_agent_run_id, not both.`,
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
    message: `${toolName} requires exactly one target selector: recipient_address or target_agent_run_id.`,
  };
};

export const describeSendMessageTargetSelector = (
  target: SendMessageTargetSelector,
): string => target.kind === "recipient_address"
  ? target.recipientAddress
  : target.targetAgentRunId;

export type TeamMessageTargetSelector = SendMessageTargetSelector;
