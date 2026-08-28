type E2eStreamMessage = {
  type: string;
  payload: Record<string, unknown>;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

export const isE2eTeamCommunicationMessage = (
  message: E2eStreamMessage,
  input: {
    senderAgentRunId: string;
    recipientAgentRunId: string;
    content: string;
  },
): boolean => {
  if (message.type !== "TEAM_COMMUNICATION_MESSAGE") {
    return false;
  }

  const projectedMessage = asRecord(message.payload.message);
  return (
    projectedMessage?.sender_agent_run_id === input.senderAgentRunId &&
    projectedMessage.receiver_agent_run_id === input.recipientAgentRunId &&
    projectedMessage.content === input.content
  );
};
