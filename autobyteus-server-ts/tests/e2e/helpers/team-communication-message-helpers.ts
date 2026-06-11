type E2eStreamMessage = {
  type: string;
  payload: Record<string, unknown>;
};

export const isE2eTeamCommunicationMessage = (
  message: E2eStreamMessage,
  input: {
    senderMemberName: string;
    recipientMemberName: string;
    content: string;
  },
): boolean =>
  message.type === "TEAM_COMMUNICATION_MESSAGE" &&
  typeof message.payload.senderRunId === "string" &&
  message.payload.senderRunId.trim().length > 0 &&
  typeof message.payload.receiverRunId === "string" &&
  message.payload.receiverRunId.trim().length > 0 &&
  message.payload.senderMemberName === input.senderMemberName &&
  message.payload.receiverMemberName === input.recipientMemberName &&
  message.payload.content === input.content;
