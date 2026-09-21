import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";

export type TeamCommunicationMessageV1 = CollaborationCommunicationMessageV1;
export type TeamCommunicationMessagesFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  messages: readonly CollaborationCommunicationMessageV1[];
}>;
export type TeamCommunicationMessagesSnapshot = TeamCommunicationMessagesFileV1;
