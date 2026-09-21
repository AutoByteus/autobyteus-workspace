export type CollaborationCommunicationMessageV1 = Readonly<{
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly string[];
  createdAt: string;
}>;
