import { validateCollaborationCommunicationMessageArray } from "../../agent-collaboration/execution/communication/collaboration-communication-message-schema.js";
import type { AgentOrgCommunicationMessagesFile } from "./agent-org-communication-messages.js";

export const validateAgentOrgCommunicationMessages = (
  value: unknown,
  expectedOrgRunId?: string,
): AgentOrgCommunicationMessagesFile => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AgentOrg communication messages must be an object.");
  const payload = value as Record<string, unknown>;
  const actual = Object.keys(payload).sort();
  const expected = ["messages", "orgRunId", "schemaVersion", "subjectKind"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("AgentOrg communication messages has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1 || payload.subjectKind !== "agent_org") {
    throw new Error("AgentOrg communication messages requires schemaVersion 1 and subjectKind 'agent_org'.");
  }
  if (typeof payload.orgRunId !== "string" || !payload.orgRunId || payload.orgRunId !== payload.orgRunId.trim()) {
    throw new Error("AgentOrg communication messages orgRunId is invalid.");
  }
  if (expectedOrgRunId && payload.orgRunId !== expectedOrgRunId) {
    throw new Error(`AgentOrg communication root '${payload.orgRunId}' does not match '${expectedOrgRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    subjectKind: "agent_org",
    orgRunId: payload.orgRunId,
    messages: validateCollaborationCommunicationMessageArray(payload.messages),
  });
};
