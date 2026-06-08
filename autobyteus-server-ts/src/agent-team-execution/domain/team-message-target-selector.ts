export type TeamMessageTargetSelector =
  | { kind: "recipient_name"; recipientName: string }
  | { kind: "target_agent_run_id"; targetAgentRunId: string };

export type TeamMessageTargetSelectorValidationResult =
  | { ok: true; target: TeamMessageTargetSelector }
  | { ok: false; message: string };

const normalizeOptional = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildTeamMessageTargetSelector = (input: {
  recipientName?: string | null;
  targetAgentRunId?: string | null;
  toolName?: string | null;
}): TeamMessageTargetSelectorValidationResult => {
  const recipientName = normalizeOptional(input.recipientName);
  const targetAgentRunId = normalizeOptional(input.targetAgentRunId);
  const toolName = input.toolName?.trim() || "send_message_to";

  if (recipientName && targetAgentRunId) {
    return {
      ok: false,
      message: `${toolName} requires exactly one target selector: recipient_name or target_agent_run_id, not both.`,
    };
  }
  if (recipientName) {
    return { ok: true, target: { kind: "recipient_name", recipientName } };
  }
  if (targetAgentRunId) {
    return { ok: true, target: { kind: "target_agent_run_id", targetAgentRunId } };
  }
  return {
    ok: false,
    message: `${toolName} requires exactly one target selector: recipient_name or target_agent_run_id.`,
  };
};

export const describeTeamMessageTargetSelector = (
  target: TeamMessageTargetSelector,
): string => target.kind === "recipient_name"
  ? target.recipientName
  : target.targetAgentRunId;
