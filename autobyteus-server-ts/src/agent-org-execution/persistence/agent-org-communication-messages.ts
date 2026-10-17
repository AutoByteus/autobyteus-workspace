import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

export const AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME = "agent_org_communication_messages.json";
export type AgentOrgCommunicationMessagesFile = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;
