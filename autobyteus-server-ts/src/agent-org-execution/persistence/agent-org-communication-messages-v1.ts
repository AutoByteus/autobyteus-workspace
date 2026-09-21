import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";

export const AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME = "agent_org_communication_messages.json";
export type AgentOrgCommunicationMessagesFileV1 = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent_org";
  orgRunId: string;
  messages: readonly CollaborationCommunicationMessageV1[];
}>;
