import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

export type AgentOrgCommunicationMessagesFile = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;
