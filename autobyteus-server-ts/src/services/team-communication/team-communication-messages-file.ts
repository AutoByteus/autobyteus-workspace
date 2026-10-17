import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

export type TeamCommunicationMessagesFile = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;
export type TeamCommunicationMessagesSnapshot = TeamCommunicationMessagesFile;
