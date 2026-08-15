export type TeamCommunicationMessageV1 = Readonly<{
  messageId: string;
  senderAgentRunId: string;
  receiverAgentRunId: string;
  content: string;
  messageType: string;
  referenceFiles: readonly string[];
  createdAt: string;
}>;

export type TeamCommunicationMessagesFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  messages: readonly TeamCommunicationMessageV1[];
}>;

export type TeamCommunicationMessagesSnapshot = TeamCommunicationMessagesFileV1;
